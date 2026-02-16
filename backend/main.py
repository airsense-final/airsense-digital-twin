import json
import os
import sqlite3
from fastapi import FastAPI, Header, Query, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.integration.backend_adapter import BackendAdapter
import asyncio
from src.integration.websocket_manager import manager 
from typing import Optional

app = FastAPI()
adapter = BackendAdapter()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "twin_data.db")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db_connection()
    conn.execute('''
        CREATE TABLE IF NOT EXISTS sensor_mappings (
            sensor_id TEXT PRIMARY KEY,
            location_key TEXT NOT NULL,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    conn.commit()
    conn.close()

init_db()

def load_mappings_from_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT sensor_id, location_key FROM sensor_mappings')
    rows = cursor.fetchall()
    conn.close()
    return {row['sensor_id']: row['location_key'] for row in rows}

def save_mapping_to_db(sensor_id, location_key):
    conn = get_db_connection()
    conn.execute('''
        INSERT INTO sensor_mappings (sensor_id, location_key) 
        VALUES (?, ?)
        ON CONFLICT(sensor_id) DO UPDATE SET location_key=excluded.location_key
    ''', (sensor_id, location_key))
    conn.commit()
    conn.close()

class MapRequest(BaseModel):
    sensor_id: str
    location_key: str

@app.get("/")
def read_root():
    return {"status": "Digital Twin Engine ONLINE", "db": "SQLite"}

# --- EKLENEN KISIM BAŞLANGICI: Threshold Endpoint ---
@app.get("/api/v1/thresholds/")
async def proxy_get_thresholds(
    request: Request,
    company: Optional[str] = None,
    scenario: Optional[str] = None
):
    # 1. Token'ı Header'dan al
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        raise HTTPException(status_code=401, detail="Token missing")
    
    token = auth_header.split(" ")[1] if " " in auth_header else auth_header

    # 2. Adapter üzerinden Ana Backend'e sor
    thresholds_data = await adapter.get_thresholds(
        token=token, 
        target_company=company, 
        scenario=scenario
    )

    return thresholds_data
# --- EKLENEN KISIM SONU ---

@app.get("/api/digital-twin-data")
async def get_digital_twin_data(authorization: str = Header(None), company: str = Query(None)):
    token = ""
    if authorization:
        clean_auth = authorization.strip()
        token = clean_auth.split(" ")[1] if " " in clean_auth else clean_auth
            
    target_comp = None if (company == "None" or not company) else company

    layout_filename = "default.json"
    if target_comp:
        safe_name = "".join(x for x in target_comp if x.isalnum())
        if os.path.exists(os.path.join(BASE_DIR, "models", "sensor-layouts", f"{safe_name}.json")):
            layout_filename = f"{safe_name}.json"

    mounting_points = {}
    try:
        path = os.path.join(BASE_DIR, "models", "sensor-layouts", layout_filename)
        with open(path, "r") as f:
            data = json.load(f)
            mounting_points = data.get("mounting_points", {})
    except: pass

    sensors_metadata_task = adapter.get_sensors_metadata(token, target_comp)
    live_values_task = adapter.get_live_values(token, target_comp)
    
    sensors_metadata, live_values = await asyncio.gather(sensors_metadata_task, live_values_task)
    
    saved_mappings = load_mappings_from_db()

    live_map = {}
    for item in live_values:
        metadata = item.get("metadata", {})
        s_id = None
        if isinstance(metadata, dict):
            s_id = metadata.get("sensor_id")
        if not s_id:
            s_id = item.get("sensor_id") or item.get("_id")

        val = item.get("value")
        if val is None:
            val = item.get("latest_value") or item.get("current_value") or 0
        if s_id:
            live_map[str(s_id)] = val

    mapped_results = []
    available_slots = list(mounting_points.keys()) 
    used_slots = set()
    processed_ids = set()

    for sensor in sensors_metadata:
        s_id = str(sensor.get("sensor_id"))
        api_raw_loc = str(sensor.get("location", "unknown")).lower()
        db_loc = saved_mappings.get(s_id)
        final_loc = None
        is_manual = False

        if api_raw_loc != "unknown" and api_raw_loc != "" and api_raw_loc in mounting_points:
            final_loc = api_raw_loc
        elif db_loc and db_loc in mounting_points:
            final_loc = db_loc
            is_manual = True

        if final_loc:
            mapped_results.append({
                "id": s_id, "type": sensor.get("sensor_type", "Generic"),
                "name": sensor.get("sensor_name", s_id), "value": live_map.get(s_id, 0),
                "position": mounting_points[final_loc], "location_name": final_loc,
                "is_manual": is_manual, "status": "active"
            })
            used_slots.add(final_loc)
            processed_ids.add(s_id)

    for sensor in sensors_metadata:
        s_id = str(sensor.get("sensor_id"))
        if s_id in processed_ids: continue 
        found_slot = next((slot for slot in available_slots if slot not in used_slots), None)
        if found_slot:
            save_mapping_to_db(s_id, found_slot) 
            used_slots.add(found_slot)
            mapped_results.append({
                "id": s_id, "type": sensor.get("sensor_type", "Unknown"),
                "name": f"{sensor.get('sensor_name', s_id)}", "value": live_map.get(s_id, 0),
                "position": mounting_points[found_slot], "location_name": found_slot,
                "is_manual": True, "status": "active"
            })
    return mapped_results

@app.post("/api/map-sensor")
async def map_sensor_to_location(data: MapRequest, authorization: str = Header(None)):
    token = authorization.split(" ")[1] if authorization and " " in authorization else authorization
    try:
        save_mapping_to_db(data.sensor_id, data.location_key)
        sync_status = "Skipped"
        if token:
            success = await adapter.update_sensor_location(token, data.sensor_id, data.location_key)
            sync_status = "Synced" if success else "Failed"
        return {"status": "success", "message": "Saved", "sync": sync_status}
    except Exception as e: return {"status": "error", "message": str(e)}

@app.get("/api/layout-slots")
def get_layout_slots(company: str = Query(None)):
    layout_filename = "default.json"
    target_comp = None if (company == "None" or not company) else company
    if target_comp:
        safe_name = "".join(x for x in target_comp if x.isalnum())
        if os.path.exists(os.path.join(BASE_DIR, "models", "sensor-layouts", f"{safe_name}.json")):
            layout_filename = f"{safe_name}.json"
    try:
        path = os.path.join(BASE_DIR, "models", "sensor-layouts", layout_filename)
        with open(path, "r") as f:
            data = json.load(f)
            return list(data.get("mounting_points", {}).keys())
    except: return []

@app.get("/api/companies")
async def get_companies_list(): 
    return await adapter.get_companies()

@app.get("/api/room-config")
def get_room_config():
    path = os.path.join(BASE_DIR, "models", "rooms", "default_room.json")
    with open(path, "r") as f: return json.load(f)

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...), company: str = Query(None)):
    target_comp = None if (company == "None" or not company) else company
    await manager.connect(websocket)
    print(f"🔌 WebSocket Bağlantısı Kuruldu. Şirket: {target_comp}")
    
    try:
        while True:
            try:
                live_data = await adapter.get_live_values(token=token, target_company=target_comp)
                if live_data and len(live_data) > 0:
                    await websocket.send_json({
                        "type": "SENSOR_UPDATE", 
                        "data": live_data
                    })
            except Exception as inner_e:
                print(f"⚠️ İletişim koptu: {inner_e}")
                break 

            await asyncio.sleep(1) 

    except WebSocketDisconnect:
        print("❌ İstemci tarayıcıyı kapattı.")
    except Exception as e:
        print(f"⚠️ Beklenmedik WS Hatası: {e}")
    finally:
        manager.disconnect(websocket)