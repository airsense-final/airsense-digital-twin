# 🌐 AirSense Digital Twin Engine

![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=for-the-badge&logo=fastapi)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react)
![Three.js](https://img.shields.io/badge/Three.js-000000?style=for-the-badge&logo=three.js)
![Simulation](https://img.shields.io/badge/Simulation-Engine-red?style=for-the-badge)

AirSense Digital Twin is a sophisticated simulation and monitoring engine that transforms physical environmental data into a 3D digital duplicate. It bridges the gap between IoT hardware and real-time visualization, providing critical insights through advanced incident simulations.

---

## 🚀 Key Features

* **Real-Time Synchronization:** Instant 3D reflection of sensor data (Temperature, Humidity, Gases) via WebSockets.
* **Dynamic Sensor Mapping:** A custom SQLite-based mapping system to assign physical sensors to 3D coordinates.
* **Private Network Access (PNA) Compliance:** Built-in security middleware to handle communication between public origins (Netlify) and local backends.

---

## 🎮 Advanced Simulation Suite

This engine goes beyond monitoring by offering a powerful simulation layer for emergency planning:

### 🔥 Fire & Emergency Simulation
* Trigger virtual fire events at any 3D coordinate.
* Test alarm triggers and visual feedback systems within the digital environment.

### 💨 Dynamic Gas Leak Modeling
* Simulate gas plumes (CO, CH₄, Alcohol) with varying intensities.
* Visualize dispersion patterns to identify high-risk zones and sensor coverage gaps.

### 🏃 Crowd Simulation & Evacuation
* **Agent-Based Modeling:** Simulate human occupancy and movement within the 3D space.
* **Evacuation Planning:** Analyze crowd flow during simulated fire or gas leak incidents to optimize exit routes.

---

## 🛠️ Technical Architecture

### **Backend (Python / FastAPI)**
* **Simulation Core:** Handles the math for gas diffusion and agent-based crowd movements.
* **Adapter Pattern:** Standardizes data from both real sensors and simulated events.
* **Database:** SQLite for persistent storage of sensor-to-room mappings.

### **Frontend (React / Three.js)**
* **3D Viewer:** High-performance canvas rendering real-time data and particle effects (fire/smoke).
* **Scenario Manager:** Interactive dashboard to trigger and monitor simulation events.

---

## 📂 Project Structure

* `backend/` - FastAPI server, simulation logic, and SQLite DB.
* `frontend/` - React application and Three.js 3D scene components.
* `tests/` - Tests for digital twin.

---

## ⚙️ Installation

### 1. Backend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```

### 2. Frontend Setup
```bash
cd backend
pip install -r requirements.txt
python main.py
```

---

## 📄 License
Part of the AirSense IoT Platform - Internal Use
