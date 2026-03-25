import urllib3
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

import requests
import json
import asyncio
from urllib.parse import quote

class BackendAdapter:
    def __init__(self):
        # Ana backend adresi
        self.base_url = "https://airsenseapi.com" 

    def _get_headers(self, token):
        """Header'lara Bearer Token ekler."""
        if not token:
            return {"Content-Type": "application/json"}
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    async def _make_request(self, method, url, headers=None, params=None, json_data=None):
        """Requests kütüphanesini asenkron çalıştırır."""
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

        # 🎯 ŞİRKET GEÇİŞİNİ SAĞLAYAN KRİTİK NOKTA
        # Eğer bir şirket seçildiyse, ismini parametre olarak ekliyoruz.
        if target_company and str(target_company).strip() not in ["None", "null", "undefined", "", "AirSense Root Company"]:
            params["target_company_name"] = str(target_company).strip()

        try:
            # logda ne gönderdiğimizi net görelim
            print(f"🚀 İstek Atılıyor: {url} | Filtre: {params}")
            
            # Parametreleri buraya ekledik ki backend hangi şirketi istediğini anlasın
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
        if target_company and str(target_company).strip() not in ["None", "null", "undefined", "", "AirSense Root Company"]:
            params["target_company_name"] = str(target_company).strip()

        try:
            response = await self._make_request("GET", url, headers=self._get_headers(token), params=params)
            if response.status_code in [200, 201]:
                return response.json()
            return []
        except Exception as e:
            return []

    async def get_thresholds(self, token, target_company=None, scenario=None):
        url = f"{self.base_url}/api/v1/thresholds"
        params = {}
        if target_company and str(target_company).strip() not in ["None", "null", "undefined", "", "AirSense Root Company"]:
            params["target_company_name"] = str(target_company).strip()
            
        try:
            response = await self._make_request("GET", url, headers=self._get_headers(token), params=params)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            return []

    async def get_companies(self, token=None):
        """Sağ üstteki menü için tüm şirket listesini çeker."""
        url = f"{self.base_url}/companies/"
        
        try:
            print(f"🏢 Şirket listesi isteniyor: {url}")
            # 🔑 Token ekledik ki SuperAdmin listeyi görebilsin
            response = await self._make_request("GET", url, headers=self._get_headers(token))
            
            if response.status_code == 200:
                data = response.json()
                # Liste formatını kontrol edip dönüyoruz
                return data if isinstance(data, list) else data.get("companies", [])
            
            print(f"⚠️ Şirketler gelmedi, Status: {response.status_code}")
            return []
        except Exception as e:
            print(f"❌ Şirket Listesi Alınamadı: {e}")
            return []

    async def update_sensor_location(self, token, sensor_id, new_location):
        """Sensörün haritadaki yerini (X, Y, Z) günceller."""
        url = f"{self.base_url}/api/v1/sensors/{sensor_id}"
        payload = {"location": new_location}
        try:
            response = await self._make_request("PUT", url, headers=self._get_headers(token), json_data=payload)
            return response.status_code in [200, 204]
        except Exception as e:
            print(f"❌ Lokasyon güncellenemedi: {e}")
            return False

    async def close(self):
        """Bağlantıları kapatır (Gerekirse)."""
        pass