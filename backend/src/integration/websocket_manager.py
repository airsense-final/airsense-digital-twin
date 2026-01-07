from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        # Aktif bağlantıları tutan liste
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"🔌 Yeni İstemci Bağlandı. Toplam: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"❌ İstemci Ayrıldı. Kalan: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        # Mesajı bağlı olan herkese gönder
        # (Gerçek projede bağlantı koparsa hata vermemesi için try-except eklenir)
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"⚠️ Gönderim Hatası: {e}")

manager = ConnectionManager()