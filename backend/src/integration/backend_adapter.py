import httpx
import json

class BackendAdapter:
    def __init__(self):
        self.base_url = "https://airsenseapi.com" 
        # PERFORMANS DÜZELTMESİ: Tek bir asenkron client oluşturuyoruz
        # Bu sayede her seferinde yeni bağlantı kurma maliyetinden kurtuluyoruz.
        self.client = httpx.AsyncClient(timeout=10.0)

    def _get_headers(self, token):
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    # Artık her metodda 'async with' kullanmaya gerek yok, self.client'ı kullanıyoruz.
    async def get_sensors_metadata(self, token, target_company=None):
        url = f"{self.base_url}/api/v1/sensors"
        params = {}
        if target_company:
            params["target_company_name"] = target_company

        try:
            response = await self.client.get(url, headers=self._get_headers(token), params=params)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Metadata Çekilemedi: {e}")
            return []

    async def get_live_values(self, token, target_company=None):
        url = f"{self.base_url}/api/v1/sensors/latest"
        params = {}
        if target_company:
            params["target_company_name"] = target_company

        try:
            response = await self.client.get(url, headers=self._get_headers(token), params=params)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Canlı Veri Çekilemedi: {e}")
            return []

    async def get_companies(self):
        url = f"{self.base_url}/companies/"
        try:
            response = await self.client.get(url)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Şirket Listesi Alınamadı: {e}")
            return []

    async def update_sensor_location(self, token, sensor_id, new_location):
        url = f"{self.base_url}/api/v1/sensors/{sensor_id}"
        payload = {"location": new_location}

        try:
            print(f"📡 MongoDB Güncelleniyor (PUT): {sensor_id} -> {new_location}")
            response = await self.client.put(url, headers=self._get_headers(token), json=payload)
            if response.status_code in [200, 204]:
                print("✅ Başarılı!")
                return True
            else:
                print(f"⚠️ Güncelleme Başarısız: {response.status_code} - {response.text}")
                return False
        except Exception as e:
            print(f"❌ Bağlantı Hatası: {e}")
            return False

    # Uygulama kapanırken client'ı temiz bir şekilde kapatmak için:
    async def close(self):
        await self.client.aclose()

    async def get_thresholds(self, token, target_company=None, scenario=None):
        url = f"{self.base_url}/api/v1/thresholds/"
        params = {}
        
        # Sadece Super Admin bu parametreleri kullanabilir, 
        # ama adapter esnek olmalı, parametre varsa göndeririz.
        if target_company:
            params["target_company_name"] = target_company
        if scenario:
            params["scenario"] = scenario

        try:
            # Backend'e isteği atıyoruz
            response = await self.client.get(url, headers=self._get_headers(token), params=params)
            
            if response.status_code == 200:
                print(f"✅ Thresholds Çekildi: {len(response.json())} adet kural.")
                return response.json()
            else:
                print(f"⚠️ Threshold Hatası: {response.status_code} - {response.text}")
                return []
        except Exception as e:
            print(f"❌ Threshold Bağlantı Hatası: {e}")
            return []