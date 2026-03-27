import json
from pathlib import Path
from loguru import logger
from typing import List, Dict, Optional

class LocationService:
    def __init__(self):
        self.layout_data = {}
        
        # Find backend root directory (backend <- src <- mapping <- location_service.py)
        self.backend_dir = Path(__file__).resolve().parent.parent.parent
        self._load_maps_into_memory()

    def _load_maps_into_memory(self):
        try:
            # path of default.json
            layout_path = self.backend_dir / "models" / "sensor-layouts" / "default.json"

            if layout_path.exists():
                with open(layout_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.layout_data = data.get("mounting_points", {})
                logger.info("🗺️ Map loaded into RAM.")
        except Exception as e:
            logger.error(f"❌ Error loading map: {e}")

    def estimate_anomaly_location(self, active_alerts: List[Dict]) -> Optional[Dict]:
        if not active_alerts:
            return None

        total_weight, weighted_x, weighted_y, weighted_z = 0.0, 0.0, 0.0, 0.0
        valid_sensors = 0

        for alert in active_alerts:
            sensor_id = alert.get("sensor_id")
            weight = alert.get("weight", 0.0) 

            if sensor_id in self.layout_data and weight > 0:
                coords = self.layout_data[sensor_id]
                weighted_x += coords["x"] * weight
                weighted_y += coords["y"] * weight
                weighted_z += coords["z"] * weight
                total_weight += weight
                valid_sensors += 1

        if total_weight == 0:
            return None

        return {
            "x": round(weighted_x / total_weight, 2),
            "y": round(weighted_y / total_weight, 2),
            "z": round(weighted_z / total_weight, 2)
        }