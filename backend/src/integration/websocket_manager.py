from fastapi import WebSocket
from typing import List

class ConnectionManager:
    def __init__(self):
        # List of active connections
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"🔌 New Client Connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"❌ Client Disconnected. Remaining: {len(self.active_connections)}")

    async def broadcast(self, message: dict):
        # Broadcast the message to everyone connected
        # (In a real project, a try-except is added so it won't fail if the connection drops)
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"⚠️ Transmission Error: {e}")

manager = ConnectionManager()