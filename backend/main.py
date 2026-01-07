import json
import os
from fastapi import FastAPI, Header, Query
from fastapi.middleware.cors import CORSMiddleware
from src.integration.backend_adapter import BackendAdapter

app = FastAPI()
adapter = BackendAdapter()

# Dosya yollarını bulmak için ana dizin
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# React (Frontend) Erişim İzinleri (CORS)
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
# 1. DIGITAL TWIN DATA (Ana Beyin)
# ---------------------------------------------------------
@app.get("/api/digital-twin-data")
def get_digital_twin_data(
    authorization: str = Header(None), 
    company: str = Query(None)
):
    # A. Token Temizliği (Bearer ayrıştırma)
    token = ""
    if authorization and " " in authorization:
        token = authorization.split(" ")[1]

    # B. Dosya Seçimi (Fallback Logic - OTOMASYON)
    # Varsayılan olarak 'default.json' hedeflenir.
    layout_filename = "default.json"
    
    # Eğer özel şirket ismi geldiyse, ona özel dosya var mı bakılır.
    if company:
        safe_name = "".join(x for x in company if x.isalnum()) # Güvenlik için temizle
        specific_path = os.path.join(BASE_DIR, "models", "sensor-layouts", f"{safe_name}.json")
        if os.path.exists(specific_path):
            layout_filename = f"{safe_name}.json"

    # C. Harita (Koordinat) Dosyasını Oku
    mounting_points = {}
    try:
        path = os.path.join(BASE_DIR, "models", "sensor-layouts", layout_filename)
        with open(path, "r") as f:
            data = json.load(f)
            mounting_points = data.get("mounting_points", {})
    except Exception as e:
        print(f"Harita okuma hatası: {e}")

    # ---------------------------------------------------------
    # D. VERİ ÇEKME VE BİRLEŞTİRME (MERGE LOGIC)
    # ---------------------------------------------------------
    
    # 1. Adım: Sensörlerin Konumlarını Öğren (Metadata)
    # Kaynak: [GET] /api/v1/sensors
    sensors_metadata = adapter.get_sensors_metadata(token, company)

    # 2. Adım: Sensörlerin Anlık Değerlerini Öğren (Live)
    # Kaynak: [GET] /api/v1/sensors/latest
    live_values = adapter.get_live_values(token, company)

    # Hızlı erişim için Live verilerini bir sözlüğe (Map) çevirelim
    # Örn: { "sensor_id_1": 100, "sensor_id_2": 24.5 }
    live_map = {}
    for item in live_values:
        s_id = item.get("sensor_id")
        # Değer 'current_value' ya da 'value' olabilir, ikisini de kontrol et
        val = item.get("current_value") or item.get("value") or 0
        if s_id:
            live_map[s_id] = val

    mapped_results = []

    # 3. Adım: Hepsini Konum Haritasında Eşleştir
    for sensor in sensors_metadata:
        s_id = sensor.get("sensor_id")
        
        # Sensörün API'den gelen 'location' bilgisini al (küçük harfe çevir)
        # Örn: "Entrance" -> "entrance"
        loc_name = str(sensor.get("location", "unknown")).lower()

        # EĞER bu lokasyon bizim default.json haritamızda tanımlıysa:
        if loc_name in mounting_points:
            # 1. Koordinatı al (JSON'dan)
            coords = mounting_points[loc_name]
            
            # 2. Canlı değeri al (Live Map'ten), yoksa 0
            current_val = live_map.get(s_id, 0)

            # 3. Paketi oluştur
            mapped_results.append({
                "id": s_id,
                "type": sensor.get("sensor_type", "Generic"),
                "name": sensor.get("sensor_name", s_id),
                "value": current_val,       # <-- Canlı Değer
                "position": coords,         # <-- 3D Koordinat
                "status": "active"
            })

    return mapped_results

# ---------------------------------------------------------
# 2. ŞİRKET LİSTESİ (Dropdown İçin)
# ---------------------------------------------------------
@app.get("/api/companies")
def get_companies_list():
    return adapter.get_companies()

# ---------------------------------------------------------
# 3. ODA AYARLARI
# ---------------------------------------------------------
@app.get("/api/room-config")
def get_room_config():
    path = os.path.join(BASE_DIR, "models", "rooms", "default_room.json")
    with open(path, "r") as f:
        return json.load(f)