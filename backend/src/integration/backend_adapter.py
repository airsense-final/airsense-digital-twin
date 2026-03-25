import httpx
import json

class BackendAdapter:
    def __init__(self):
        # Eğer Ana Backend'in yönlendirme yapıyorsa (307), 
        # Token yolda düşmesin diye Client'ı buna göre ayarlıyoruz.
        self.base_url = "https://airsenseapi.com" 
        self.client = httpx.AsyncClient(timeout=15.0, verify=False, follow_redirects=True)

    def _get_headers(self, token):
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    async def get_sensors_metadata(self, token, target_company=None):
        url = f"{self.base_url}/api/v1/sensors/" 
        params = {}
        # if target_company:
        #     params["target_company_name"] = target_company

        try:
            headers = self._get_headers(token)
            
            # httpx'in redirect sırasında header'ları düşürmesini engellemek için
            # request nesnesini manuel oluşturup gönderiyoruz.
            request = self.client.build_request("GET", url, headers=headers, params=params)
            response = await self.client.send(request, follow_redirects=True)
            
            print(f"📡 API STATUS: {response.status_code}")
            
            if response.status_code in [200, 201]:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Metadata Çekilemedi: {e}")
            return []

    async def get_live_values(self, token, target_company=None):
        url = f"{self.base_url}/api/v1/sensors/latest/" 
        params = {}
        # if target_company:
        #     params["target_company_name"] = target_company

        try:
            headers = self._get_headers(token)
            request = self.client.build_request("GET", url, headers=headers, params=params)
            response = await self.client.send(request, follow_redirects=True)
            
            if response.status_code in [200, 201]:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Canlı Veri Çekilemedi: {e}")
            return []

    async def get_companies(self):
        url = f"{self.base_url}/companies/"
        try:
            response = await self.client.get(url, follow_redirects=True)
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
            headers = self._get_headers(token)
            request = self.client.build_request("PUT", url, headers=headers, json=payload)
            response = await self.client.send(request, follow_redirects=True)
            if response.status_code in [200, 204]:
                return True
            return False
        except Exception as e:
            return False

    async def close(self):
        await self.client.aclose()

    async def get_thresholds(self, token, target_company=None, scenario=None):
        url = f"{self.base_url}/api/v1/thresholds/"
        params = {}
        try:
            headers = self._get_headers(token)
            request = self.client.build_request("GET", url, headers=headers, params=params)
            response = await self.client.send(request, follow_redirects=True)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            return []