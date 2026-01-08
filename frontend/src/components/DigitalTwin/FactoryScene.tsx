import React, { useEffect, useState, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MapControls, ContactShadows } from "@react-three/drei";
import axios from "axios";

import { FactoryArchitecture } from "./FactoryArchitecture";
import { HeatmapLayer } from "./HeatmapLayer";
import { SensorNode } from "./SensorNode";

const getQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    token: params.get("token"),
    role: params.get("role")?.toLowerCase(),
    userCompany: params.get("company"),
  };
};

const KeyboardMapMover = ({ controlsRef }: { controlsRef: any }) => {
  const { camera } = useThree();
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  useEffect(() => {
    const down = (e: KeyboardEvent) =>
      setKeys((k) => ({ ...k, [e.code]: true }));
    const up = (e: KeyboardEvent) =>
      setKeys((k) => ({ ...k, [e.code]: false }));
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);
  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    const speed = keys["ShiftLeft"] || keys["ShiftRight"] ? 60 : 25;
    const step = speed * delta;
    if (keys["ArrowUp"] || keys["KeyW"]) {
      controlsRef.current.target.z -= step;
      camera.position.z -= step;
    }
    if (keys["ArrowDown"] || keys["KeyS"]) {
      controlsRef.current.target.z += step;
      camera.position.z += step;
    }
    if (keys["ArrowLeft"] || keys["KeyA"]) {
      controlsRef.current.target.x -= step;
      camera.position.x -= step;
    }
    if (keys["ArrowRight"] || keys["KeyD"]) {
      controlsRef.current.target.x += step;
      camera.position.x += step;
    }
  });
  return null;
};

export const FactoryScene = () => {
  const [sensors, setSensors] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSimulationMode, setIsSimulationMode] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  
  // --- YENI: SAAT ICIN STATE ---
  const [currentTime, setCurrentTime] = useState(new Date());

  const controlsRef = useRef<any>(null);
  const { token, role, userCompany } = getQueryParams();
  const [selectedCompany, setSelectedCompany] = useState<string>(
    userCompany || ""
  );

  // --- YENI: SAAT GUNCELLEME MEKANIZMASI ---
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  if (!token)
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          background: "#0f172a",
        }}
      >
        <h1>⛔ Access Denied</h1>
      </div>
    );

  useEffect(() => {
    if (role === "superadmin") {
      axios.get("http://127.0.0.1:8001/api/companies").then((res) => {
        setCompanies(res.data);
        if (!userCompany && res.data.length > 0)
          setSelectedCompany(res.data[0].name);
      });
    } else if (userCompany) {
      setSelectedCompany(userCompany);
    }
  }, [role, userCompany]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!token) return;
      try {
        const params: any = {};
        if (role === "superadmin" && selectedCompany)
          params.company = selectedCompany;
        const res = await axios.get(
          `http://127.0.0.1:8001/api/digital-twin-data`,
          {
            headers: { Authorization: `Bearer ${token}` },
            params: params,
          }
        );
        console.log(
          "📍 Yüklenen Sensörler:",
          res.data.map((s: any) => s.id)
        );
        setSensors(res.data);
      } catch (e) {
        console.error("Initial Fetch Error:", e);
      }
    };

    fetchInitialData();

    if (selectedCompany) {
      axios
        .get("http://127.0.0.1:8001/api/layout-slots", {
          params: { company: selectedCompany },
        })
        .then((res) => setAvailableSlots(res.data));
    }

    let ws: WebSocket | null = null;

    if (token) {
      const companyParam =
        role === "superadmin" && selectedCompany
          ? `&company=${encodeURIComponent(selectedCompany)}`
          : "";
      const wsUrl = `ws://127.0.0.1:8001/ws?token=${encodeURIComponent(
        token
      )}${companyParam}`;

      ws = new WebSocket(wsUrl);

      ws.onopen = () => console.log("✅ WebSocket Bağlandı: Canlı akış aktif");

      ws.onmessage = (event) => {
        if (isSimulationMode) return;

        try {
          const message = JSON.parse(event.data);
          if (message.type === "SENSOR_UPDATE" && Array.isArray(message.data)) {
            setSensors((prevSensors) => {
              return prevSensors.map((sensor) => {
                const match = message.data.find((u: any) => {
                  const incomingId = u.metadata?.sensor_id || u.sensor_id || u._id;
                  return String(incomingId) === String(sensor.id);
                });

                if (match) {
                  const newVal = match.value ?? match.latest_value ?? match.current_value;
                  const newTimestamp = match.timestamp;

                  if (newVal !== sensor.value || newTimestamp !== sensor.timestamp) {
                    return { ...sensor, value: newVal, timestamp: newTimestamp };
                  }
                }
                return sensor;
              });
            });
          }
        } catch (e) {
          console.error("Parse hatası:", e);
        }
      };

      ws.onerror = (err) => console.error("🔌 WebSocket Hatası:", err);
      ws.onclose = () => console.log("🔌 WebSocket Bağlantısı Kesildi");

      return () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          console.log("🧹 WebSocket temizleniyor...");
          ws.close();
        }
      };
    }
  }, [selectedCompany, token, role, isSimulationMode]);

  const handleUpdateLocation = async (
    sensorId: string,
    newLocation: string
  ) => {
    try {
      await axios.post(
        "http://127.0.0.1:8001/api/map-sensor",
        { sensor_id: sensorId, location_key: newLocation },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSensors((prev) =>
        prev.map((s) =>
          s.id === sensorId ? { ...s, location_name: newLocation } : s
        )
      );
    } catch (e) {
      alert("Error updating location.");
    }
  };

  const handleSimulateValue = (sensorId: string, newValue: number) => {
    setSensors((prev) =>
      prev.map((s) => (s.id === sensorId ? { ...s, value: newValue } : s))
    );
  };

  const locationCounts: Record<string, number> = {};
  const getOffset = (locName: string) => {
    const offset = locationCounts[locName] || 0;
    locationCounts[locName] = offset + 1;
    return offset;
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
      }}
    >
      <div
        style={{
          background: "#0f172a",
          padding: "15px 25px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: "1px solid #1e293b",
          zIndex: 10,
        }}
      >
        <h2
          style={{
            color: "white",
            margin: 0,
            fontSize: "20px",
            fontFamily: "sans-serif",
          }}
        >
          🏭 AirSense Twin{" "}
          <span
            style={{
              fontSize: "12px",
              background: "#1e293b",
              padding: "2px 8px",
              borderRadius: "10px",
              color: "#94a3b8",
            }}
          >
            {selectedCompany || "Default"}
          </span>
        </h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          
          {/* SAAT BILEŞENI (Butonlardan hemen önce, sağ üst grup içinde) */}
          <div
            style={{
              background: "#1e293b",
              color: "#38bdf8",
              padding: "8px 15px",
              borderRadius: "6px",
              border: "1px solid #334155",
              fontFamily: "monospace",
              fontSize: "16px",
              fontWeight: "bold",
              marginRight: "10px",
              letterSpacing: "1px"
            }}
          >
            {currentTime.toLocaleTimeString([], { hour12: false })}
          </div>

          <button
            onClick={() => {
              setIsSimulationMode(!isSimulationMode);
              setIsEditMode(false);
            }}
            style={{
              background: isSimulationMode ? "#9333ea" : "#1e293b",
              color: "white",
              border: "1px solid #334155",
              padding: "8px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {isSimulationMode ? "🧪 SIMULATION ACTIVE" : "🧪 SIMULATION"}
          </button>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            style={{
              background: showHeatmap ? "#ea580c" : "#1e293b",
              color: "white",
              border: "1px solid #334155",
              padding: "8px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            🔥 HEATMAP
          </button>
          <button
            onClick={() => {
              setIsEditMode(!isEditMode);
              setIsSimulationMode(false);
            }}
            style={{
              background: isEditMode ? "#2563eb" : "#1e293b",
              color: "white",
              border: "1px solid #334155",
              padding: "8px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {isEditMode ? "💾 SAVE" : "✏️ EDIT"}
          </button>
          {role === "superadmin" && (
            <select
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
              style={{
                background: "#1e293b",
                color: "white",
                padding: "8px 12px",
                borderRadius: "6px",
                border: "1px solid #334155",
              }}
            >
              {companies.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        <Canvas shadows camera={{ position: [20, 25, 30], fov: 45 }}>
          <color attach="background" args={["#e5e7eb"]} />
          <fog attach="fog" args={["#e5e7eb", 40, 180]} />
          <hemisphereLight
            intensity={0.8}
            groundColor="#d1d5db"
            color="#ffffff"
          />
          <directionalLight
            position={[50, 80, 50]}
            intensity={1.5}
            castShadow
          />
          <pointLight position={[0, 18, 0]} intensity={0.5} />

          <KeyboardMapMover controlsRef={controlsRef} />
          <MapControls
            ref={controlsRef}
            screenSpacePanning={true}
            dampingFactor={0.05}
            minDistance={5}
            maxDistance={90}
          />

          <FactoryArchitecture />
          <HeatmapLayer sensors={sensors} visible={showHeatmap} />
          <ContactShadows
            resolution={1024}
            scale={150}
            blur={3}
            opacity={0.4}
            far={10}
            color="#000000"
          />

          {sensors.map((s) => (
            <SensorNode
              key={s.id}
              data={s}
              availableSlots={availableSlots}
              onUpdateLocation={handleUpdateLocation}
              onSimulateValue={handleSimulateValue}
              isEditMode={isEditMode}
              isSimulationMode={isSimulationMode}
              indexOffset={getOffset(s.location_name)}
            />
          ))}
        </Canvas>

        <div
          style={{
            position: "absolute",
            bottom: "30px",
            left: "30px",
            background: "rgba(15, 23, 42, 0.8)",
            color: "#e5e7eb",
            padding: "15px",
            borderRadius: "8px",
            fontSize: "12px",
            border: "1px solid #334155",
          }}
        >
          🎮 <b>Controls:</b>
          <br />• Left Click: Pan | Right Click: Rotate
          <br />• WASD: Move | Shift: Fast
        </div>
      </div>
    </div>
  );
};