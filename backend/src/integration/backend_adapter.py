import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

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
                allow_redirects=False
            )
        )
        return response

    async def get_sensors_metadata(self, token, target_company=None):
        url = f"{self.base_url}/api/v1/sensors" 
        params = {}

        # 🎯 SUPER ADMIN İÇİN: Eğer bir şirket seçildiyse parametre ekle
        if target_company and str(target_company).strip() not in ["None", "null", "undefined", ""]:
            params["target_company_name"] = str(target_company).strip()

        try:
            print(f"🚀 İstek Atılıyor: {url} | Params: {params}")
            # params=params ekledik; boşsa zaten etkisizdir.
            response = await self._make_request("GET", url, headers=self._get_headers(token), params=params)
            
            print(f"📡 API STATUS: {response.status_code}")
            
            if response.status_code in [200, 201]:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Metadata Çekilemedi: {e}")
            return []

    async def get_live_values(self, token, target_company=None):
        url = f"{self.base_url}/api/v1/sensors/latest" 
        params = {}
        if target_company and str(target_company).strip() not in ["None", "null", "undefined", ""]:
            params["target_company_name"] = str(target_company).strip()

        try:
            response = await self._make_request("GET", url, headers=self._get_headers(token), params=params)
            if response.status_code in [200, 201]:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Canlı Veri Çekilemedi: {e}")
            return []

    async def get_companies(self, token=None): # 🔑 Token desteği eklendi
        # Linkte api yok dediğin için direkt bağladık
        url = f"{self.base_url}/companies"
        
        # 🔑 Şirket listesi için de yetki gerekebilir
        headers = self._get_headers(token) if token else {}
        
        try:
            print(f"🏢 Şirket listesi isteniyor: {url}")
            response = await self._make_request("GET", url, headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                # Backend listeyi direkt mi yoksa bir key içinde mi dönüyor kontrolü
                return data if isinstance(data, list) else data.get("companies", [])
            return []
        except Exception as e:
            print(f"❌ Şirket Listesi Alınamadı: {e}")
            return []

    async def update_sensor_location(self, token, sensor_id, new_location):
        url = f"{self.base_url}/api/v1/sensors/{sensor_id}"
        payload = {"location": new_location}
        try:
            response = await self._make_request("PUT", url, headers=self._get_headers(token), json_data=payload)
            return response.status_code in [200, 204]
        except Exception as e:
            return False

    async def get_thresholds(self, token, target_company=None, scenario=None):
        url = f"{self.base_url}/api/v1/thresholds"
        params = {}
        if target_company and str(target_company).strip() not in ["None", "null", "undefined", ""]:
            params["target_company_name"] = str(target_company).strip()

        try:
            response = await self._make_request("GET", url, headers=self._get_headers(token), params=params)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            return []

    async def close(self):
        pass