import httpx
import json

class BackendAdapter:
    def __init__(self):
        self.base_url = "https://airsenseapi.com" 
        
        # 1. DÜZELTME: follow_redirects=True ve verify=False eklendi
        self.client = httpx.AsyncClient(
            timeout=15.0, 
            verify=False, 
            follow_redirects=True 
        )

    def _get_headers(self, token):
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    async def get_sensors_metadata(self, token, target_company=None):
        # 2. DÜZELTME: URL'in sonuna / eklendi
        url = f"{self.base_url}/api/v1/sensors/" 
        params = {}
       # if target_company:
        #    params["target_company_name"] = target_company

        try:
            response = await self.client.get(url, headers=self._get_headers(token), params=params)
            if response.status_code in [200, 201]:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Metadata Çekilemedi: {e}")
            return []

    async def get_live_values(self, token, target_company=None):
        # 3. DÜZELTME: URL'in sonuna / eklendi
        url = f"{self.base_url}/api/v1/sensors/latest/" 
        params = {}
        #if target_company:
         #   params["target_company_name"] = target_company

        try:
            response = await self.client.get(url, headers=self._get_headers(token), params=params)
            if response.status_code in [200, 201]:
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
        url = f"{self.base_url}/api/v1/sensors/{sensor_id}/"
        payload = {"location": new_location}

        try:
            response = await self.client.put(url, headers=self._get_headers(token), json=payload)
            if response.status_code in [200, 204]:
                return True
            return False
        except Exception as e:
            print(f"❌ Bağlantı Hatası: {e}")
            return False

    async def close(self):
        await self.client.aclose()

    async def get_thresholds(self, token, target_company=None, scenario=None):
        url = f"{self.base_url}/api/v1/thresholds/"
        params = {}
       # if target_company:
       #     params["target_company_name"] = target_company
        if scenario:
            params["scenario"] = scenario

        try:
            response = await self.client.get(url, headers=self._get_headers(token), params=params)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Threshold Bağlantı Hatası: {e}")
            return []