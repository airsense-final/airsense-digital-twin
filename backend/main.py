import json
import os
from fastapi import FastAPI, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from src.integration.backend_adapter import BackendAdapter

app = FastAPI()
adapter = BackendAdapter()

# Main directory to find file paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# React (Frontend) Access Permissions (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"status": "Digital Twin Engine ONLINE", "port": "Running on assigned port"}

# ---------------------------------------------------------
# 1. DIGITAL TWIN DATA (Main Brain)
# ---------------------------------------------------------
@app.get("/api/digital-twin-data")
def get_digital_twin_data(
    authorization: str = Header(None), 
    company: str = Query(None)
):
    # A. Token Cleanup (Bearer parsing)
    token = ""
    if authorization and " " in authorization:
        token = authorization.split(" ")[1]

    # B. File Selection (Fallback Logic - AUTOMATION)
    # Targets 'default.json' by default.
    layout_filename = "default.json"
    
    # Checks if a specific file exists if a custom company name is provided.
    if company:
        safe_name = "".join(x for x in company if x.isalnum()) # Sanitize for security
        specific_path = os.path.join(BASE_DIR, "models", "sensor-layouts", f"{safe_name}.json")
        if os.path.exists(specific_path):
            layout_filename = f"{safe_name}.json"

    # C. Read Map (Coordinate) File
    mounting_points = {}
    try:
        path = os.path.join(BASE_DIR, "models", "sensor-layouts", layout_filename)
        with open(path, "r") as f:
            data = json.load(f)
            mounting_points = data.get("mounting_points", {})
    except Exception as e:
        print(f"Harita okuma hatası: {e}")

    # ---------------------------------------------------------
    # D. DATA FETCHING AND MERGING (MERGE LOGIC)
    # ---------------------------------------------------------
    
    # Step 1: Learn Sensor Locations (Metadata)
    # Source: [GET] /api/v1/sensors
    sensors_metadata = adapter.get_sensors_metadata(token, company)

    # Step 2: Learn Instant Sensor Values (Live)
    # Source: [GET] /api/v1/sensors/latest
    live_values = adapter.get_live_values(token, company)

    # Convert Live data to a dictionary (Map) for fast access
    # Ex: { "sensor_id_1": 100, "sensor_id_2": 24.5 }
    live_map = {}
    for item in live_values:
        s_id = item.get("sensor_id")
        # Value can be 'current_value' or 'value', check both
        val = item.get("current_value") or item.get("value") or 0
        if s_id:
            live_map[s_id] = val

    mapped_results = []

    # Step 3: Map Them All on the Location Map
    for sensor in sensors_metadata:
        s_id = sensor.get("sensor_id")
        
        # Get 'location' info from Sensor API (convert to lowercase)
        # Ex: "Entrance" -> "entrance"
        loc_name = str(sensor.get("location", "unknown")).lower()

        # IF this location is defined in our default.json map:
        if loc_name in mounting_points:
            # 1. Get coordinate (from JSON)
            coords = mounting_points[loc_name]
            
            # 2. Get live value (from Live Map), otherwise 0
            current_val = live_map.get(s_id, 0)

            # 3. Create the package
            mapped_results.append({
                "id": s_id,
                "type": sensor.get("sensor_type", "Generic"),
                "name": sensor.get("sensor_name", s_id),
                "value": current_val,       # <-- Live Value
                "position": coords,         # <-- 3D Coordinate
                "status": "active"
            })

    return mapped_results

# ---------------------------------------------------------
# 2. COMPANY LIST (For Dropdown)
# ---------------------------------------------------------
@app.get("/api/companies")
def get_companies_list():
    return adapter.get_companies()

# ---------------------------------------------------------
# 3. ROOM SETTINGS
# ---------------------------------------------------------
@app.get("/api/room-config")
def get_room_config():
    path = os.path.join(BASE_DIR, "models", "rooms", "default_room.json")
    with open(path, "r") as f:
        return json.load(f)