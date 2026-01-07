import json
import os
import sqlite3
from fastapi import FastAPI, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from src.integration.backend_adapter import BackendAdapter

app = FastAPI()
adapter = BackendAdapter()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_FILE = os.path.join(BASE_DIR, "twin_data.db") # Veritabanı Dosyası

# React İzinleri
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- VERİTABANI KURULUMU (SQLite) ---
def get_db_connection():
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Uygulama açılırken tablo yoksa oluşturur"""
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

# Başlangıçta DB'yi kontrol et
init_db()

# --- YARDIMCI FONKSİYONLAR ---
def load_mappings_from_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT sensor_id, location_key FROM sensor_mappings')
    rows = cursor.fetchall()
    conn.close()
    return {row['sensor_id']: row['location_key'] for row in rows}

def save_mapping_to_db(sensor_id, location_key):
    conn = get_db_connection()
    # Varsa güncelle, yoksa ekle (Upsert)
    conn.execute('''
        INSERT INTO sensor_mappings (sensor_id, location_key) 
        VALUES (?, ?)
        ON CONFLICT(sensor_id) DO UPDATE SET location_key=excluded.location_key
    ''', (sensor_id, location_key))
    conn.commit()
    conn.close()

# Request Modeli
class MapRequest(BaseModel):
    sensor_id: str
    location_key: str

@app.get("/")
def read_root():
    return {"status": "Digital Twin Engine ONLINE", "db": "SQLite"}

# ---------------------------------------------------------
# 1. DIGITAL TWIN DATA (Ana Mantık)
# ---------------------------------------------------------
@app.get("/api/digital-twin-data")
def get_digital_twin_data(
    authorization: str = Header(None), 
    company: str = Query(None)
):
    # --- A. TOKEN OKUMA ---
    token = ""
    if authorization:
        clean_auth = authorization.strip()
        if " " in clean_auth:
            parts = clean_auth.split(" ")
            if len(parts) > 1:
                token = parts[1] # "Bearer <TOKEN>"
            else:
                token = clean_auth 
        else:
            token = clean_auth
            
    print(f"🔍 [DEBUG] Token: {token[:10]}... | Company: {company}")

    # --- B. HARİTA YÜKLEME ---
    layout_filename = "default.json"
    if company:
        safe_name = "".join(x for x in company if x.isalnum())
        if os.path.exists(os.path.join(BASE_DIR, "models", "sensor-layouts", f"{safe_name}.json")):
            layout_filename = f"{safe_name}.json"

    mounting_points = {}
    try:
        path = os.path.join(BASE_DIR, "models", "sensor-layouts", layout_filename)
        with open(path, "r") as f:
            data = json.load(f)
            mounting_points = data.get("mounting_points", {})
    except:
        pass

    # --- C. VERİLERİ ÇEKME ---
    sensors_metadata = adapter.get_sensors_metadata(token, company)
    live_values = adapter.get_live_values(token, company)
    saved_mappings = load_mappings_from_db()

    # --- D. CANLI VERİ HARİTALAMA ---
    live_map = {}
    for item in live_values:
        # 1. ID'yi bul
        s_id = item.get("sensor_id")
        if not s_id and "metadata" in item:
            s_id = item["metadata"].get("sensor_id")
        
        # 2. Değeri bul
        val = item.get("value")
        if val is None:
             val = item.get("latest_value") or item.get("current_value") or 0
        
        if s_id: 
            live_map[s_id] = val

    mapped_results = []
    available_slots = list(mounting_points.keys()) 
    used_slots = set()
    processed_ids = set()

    # --- E. KONUMLANDIRMA MANTIĞI ---

    # ADIM 1: Yeri Belli Olanları Yerleştir (API > DB)
    for sensor in sensors_metadata:
        s_id = sensor.get("sensor_id")
        
        # Kaynaklar
        api_raw_loc = str(sensor.get("location", "unknown")).lower()
        db_loc = saved_mappings.get(s_id)
        
        final_loc = None
        is_manual = False

        # KARAR: API'de geçerli bir yer varsa (Unknown değilse) KRAL odur.
        if api_raw_loc != "unknown" and api_raw_loc != "" and api_raw_loc in mounting_points:
            final_loc = api_raw_loc
            is_manual = False 
            
        # KARAR: API yoksa, SQLite'da elle atanmış yere bak.
        elif db_loc and db_loc in mounting_points:
            final_loc = db_loc
            is_manual = True

        if final_loc:
            mapped_results.append({
                "id": s_id,
                "type": sensor.get("sensor_type", "Generic"),
                "name": sensor.get("sensor_name", s_id),
                "value": live_map.get(s_id, 0),
                "position": mounting_points[final_loc],
                "location_name": final_loc,
                "is_manual": is_manual, 
                "status": "active"
            })
            used_slots.add(final_loc)
            processed_ids.add(s_id)

    # ADIM 2: Auto-Assign (Bilinmeyenleri Yerleştir ve Kaydet)
    for sensor in sensors_metadata:
        s_id = sensor.get("sensor_id")
        if s_id in processed_ids: continue 

        # Boş yer bul
        found_slot = None
        for slot in available_slots:
            if slot not in used_slots:
                found_slot = slot
                used_slots.add(slot) 
                break
        
        if found_slot:
            # Bulunan yeri veritabanına kaydet (Kalıcılık için)
            save_mapping_to_db(s_id, found_slot) 

            mapped_results.append({
                "id": s_id,
                "type": sensor.get("sensor_type", "Unknown"),
                "name": f"{sensor.get('sensor_name', s_id)}",
                "value": live_map.get(s_id, 0),
                "position": mounting_points[found_slot],
                "location_name": found_slot,
                "is_manual": True, # Kayıtlı olduğu için manuel sayılır
                "status": "active"
            })

    print(f"✅ [SONUÇ] Frontend'e {len(mapped_results)} sensör gönderiliyor.")
    return mapped_results

# --- GÜNCELLENEN KAYIT ENDPOINT'İ (MONGODB SYNC) ---
@app.post("/api/map-sensor")
def map_sensor_to_location(
    data: MapRequest, 
    authorization: str = Header(None)
):
    # 1. Token'ı al
    token = ""
    if authorization:
        clean_auth = authorization.strip()
        if " " in clean_auth:
            token = clean_auth.split(" ")[1]
        else:
            token = clean_auth

    try:
        # A. Önce Yerel Cache'e (SQLite) Kaydet
        save_mapping_to_db(data.sensor_id, data.location_key)
        
        # B. Token varsa Ana Backend'e (MongoDB) PUT isteği at
        sync_status = "Skipped"
        if token:
            success = adapter.update_sensor_location(token, data.sensor_id, data.location_key)
            sync_status = "Synced" if success else "Failed"
            
        return {"status": "success", "message": "Saved", "sync": sync_status}

    except Exception as e:
        return {"status": "error", "message": str(e)}

# --- MEVCUT SLOTLARI VEREN ENDPOINT ---
@app.get("/api/layout-slots")
def get_layout_slots(company: str = Query(None)):
    layout_filename = "default.json"
    if company:
        safe_name = "".join(x for x in company if x.isalnum())
        if os.path.exists(os.path.join(BASE_DIR, "models", "sensor-layouts", f"{safe_name}.json")):
            layout_filename = f"{safe_name}.json"
    
    path = os.path.join(BASE_DIR, "models", "sensor-layouts", layout_filename)
    try:
        with open(path, "r") as f:
            data = json.load(f)
            return list(data.get("mounting_points", {}).keys())
    except:
        return []

@app.get("/api/companies")
def get_companies_list(): return adapter.get_companies()

@app.get("/api/room-config")
def get_room_config():
    path = os.path.join(BASE_DIR, "models", "rooms", "default_room.json")
    with open(path, "r") as f:
        return json.load(f)