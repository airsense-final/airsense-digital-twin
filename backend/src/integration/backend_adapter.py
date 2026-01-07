import requests

class BackendAdapter:
    def __init__(self):
        # SENİN ANA BACKEND ADRESİN (Port 8000 olduğunu belirtmiştin)
        # Eğer değişirse burayı güncellemen yeterli.
        self.base_url = "http://127.0.0.1:8000" 

    def get_live_sensors(self, token, target_company=None):
        """
        Görevi: Asıl backend'den [GET] /api/v1/sensors/latest verisini çekmek.
        """
        # Endpoint adresini senin ekran görüntüne göre ayarladık
        url = f"{self.base_url}/api/v1/sensors/latest"
        
        # Token'ı header'a ekliyoruz (Yetki için şart)
        headers = { 
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Parametreleri hazırlıyoruz
        params = {}
        if target_company:
            # Senin backend bu parametreyi bekliyor
            params["target_company_name"] = target_company

        try:
            # İsteği at (Timeout: 2 saniye içinde cevap gelmezse pes et)
            response = requests.get(url, headers=headers, params=params, timeout=2)
            
            if response.status_code == 200:
                return response.json()
            else:
                print(f"⚠️ Ana Backend Hata Döndü: {response.status_code}")
                return []
                
        except Exception as e:
            print(f"❌ Ana Backend'e Bağlanılamadı: {e}")
            # Geliştirme yaparken sistem çökmesin diye boş liste dönüyoruz
            return []

    def get_companies(self):
        """
        Görevi: Asıl backend'den [GET] /companies/ listesini çekmek.
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