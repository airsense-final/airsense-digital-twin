import requests

class BackendAdapter:
    def __init__(self):
        # Senin ana backend adresin (127.0.0.1 kullanımı daha güvenli)
        self.base_url = "http://127.0.0.1:8000" 

    def _get_headers(self, token):
        """Tekrar eden header kodunu önlemek için yardımcı fonksiyon"""
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

    def get_sensors_metadata(self, token, target_company=None):
        """
        [GET] /api/v1/sensors
        GÖREVİ: Sensörlerin 'location' (konum) bilgisini çekmek.
        Bu bilgi 'latest' endpointinde olmadığı için buradan alıyoruz.
        """
        url = f"{self.base_url}/api/v1/sensors"
        params = {}
        if target_company:
            params["target_company_name"] = target_company

        try:
            response = requests.get(url, headers=self._get_headers(token), params=params, timeout=2)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"⚠️ Metadata Hatası: {response.status_code}")
                return []
        except Exception as e:
            print(f"❌ Metadata Çekilemedi: {e}")
            return []

    def get_live_values(self, token, target_company=None):
        """
        [GET] /api/v1/sensors/latest
        GÖREVİ: Sensörlerin anlık 'value' (değer) bilgisini çekmek.
        """
        url = f"{self.base_url}/api/v1/sensors/latest"
        params = {}
        if target_company:
            params["target_company_name"] = target_company

        try:
            response = requests.get(url, headers=self._get_headers(token), params=params, timeout=2)
            if response.status_code == 200:
                return response.json()
            else:
                print(f"⚠️ Canlı Veri Hatası: {response.status_code}")
                return []
        except Exception as e:
            print(f"❌ Canlı Veri Çekilemedi: {e}")
            return []

    def get_companies(self):
        """
        [GET] /companies/
        GÖREVİ: Şirket listesini çekmek (Dropdown için).
        """
        url = f"{self.base_url}/companies/"
        try:
            response = requests.get(url, timeout=2)
            if response.status_code == 200:
                return response.json()
            return []
        except Exception as e:
            print(f"❌ Şirket Listesi Alınamadı: {e}")
            return []