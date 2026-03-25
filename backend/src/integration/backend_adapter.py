import requests
import json
import asyncio

class BackendAdapter:
    def __init__(self):
        self.base_url = "https://airsenseapi.com" 

    def _get_headers(self, token):
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    async def _make_request(self, method, url, headers=None, params=None, json_data=None):
        loop = asyncio.get_event_loop()
        response = await loop.run_in_executor(
            None, 
            lambda: requests.request(
                method=method, 
                url=url, 
                headers=headers, 
                params=params, 
                json=json_data, 
                verify=False,
                allow_redirects=False # Yönlendirmeleri tamamen kapattık, direkt hedefe vuracağız.
            )
        )
        return response

    async def get_sensors_metadata(self, token, target_company=None):
        # DİKKAT: Sondaki slash (/) KALDIRILDI!
        url = f"{self.base_url}/api/v1/sensors" 
        params = {}

        try:
            print(f"🚀 İstek Atılıyor: {url}")
            response = await self._make_request("GET", url, headers=self._get_headers(token), params=params)
            
            print(f"📡 API STATUS: {response.status_code}")
            
            if response.status_code in [200, 201]:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Metadata Çekilemedi: {e}")
            return []

    async def get_live_values(self, token, target_company=None):
        # DİKKAT: Sondaki slash (/) KALDIRILDI!
        url = f"{self.base_url}/api/v1/sensors/latest" 
        params = {}

        try:
            response = await self._make_request("GET", url, headers=self._get_headers(token), params=params)
            if response.status_code in [200, 201]:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Canlı Veri Çekilemedi: {e}")
            return []

    async def get_companies(self):
        url = f"{self.base_url}/companies"
        try:
            response = await self._make_request("GET", url)
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
            response = await self._make_request("PUT", url, headers=self._get_headers(token), json_data=payload)
            if response.status_code in [200, 204]:
                return True
            return False
        except Exception as e:
            return False

    async def get_thresholds(self, token, target_company=None, scenario=None):
        # DİKKAT: Orijinal kodunda burada slash vardı, onu da kaldırdık!
        url = f"{self.base_url}/api/v1/thresholds"
        params = {}
        try:
            response = await self._make_request("GET", url, headers=self._get_headers(token), params=params)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            return []

    async def close(self):
        pass