import requests
import json

class BackendAdapter:
    def __init__(self):
        self.base_url = "http://127.0.0.1:8000" 

    def _get_headers(self, token):
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def get_sensors_metadata(self, token, target_company=None):
        url = f"{self.base_url}/api/v1/sensors"
        params = {}
        if target_company:
            params["target_company_name"] = target_company

        try:
            response = requests.get(url, headers=self._get_headers(token), params=params, timeout=10)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Metadata Çekilemedi: {e}")
            return []

    def get_live_values(self, token, target_company=None):
        url = f"{self.base_url}/api/v1/sensors/latest"
        params = {}
        if target_company:
            params["target_company_name"] = target_company

        try:
            response = requests.get(url, headers=self._get_headers(token), params=params, timeout=10)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Canlı Veri Çekilemedi: {e}")
            return []

    def get_companies(self):
        url = f"{self.base_url}/companies/"
        try:
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Şirket Listesi Alınamadı: {e}")
            return []

    # --- DÜZELTİLEN KISIM: PUT İLE GÜNCELLEME ---
    def update_sensor_location(self, token, sensor_id, new_location):
        """
        [PUT] /api/v1/sensors/{sensor_id}
        """
        url = f"{self.base_url}/api/v1/sensors/{sensor_id}"
        
        # Swagger resmine göre PUT isteği atıyoruz.
        # NOT: Eğer backend PUT isteğinde diğer alanları (name, type vb.) zorunlu kılıyorsa
        # burası 422 hatası verebilir. Şimdilik sadece location gönderiyoruz.
        payload = {
            "location": new_location
        }

        try:
            print(f"📡 MongoDB Güncelleniyor (PUT): {sensor_id} -> {new_location}")
            response = requests.put(url, headers=self._get_headers(token), json=payload, timeout=5)
            
            if response.status_code in [200, 204]:
                print("✅ Başarılı!")
                return True
            else:
                print(f"⚠️ Güncelleme Başarısız: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Bağlantı Hatası: {e}")
            return False