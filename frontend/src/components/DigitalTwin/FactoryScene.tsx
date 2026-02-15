import React, { useEffect, useState, useRef, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { MapControls, ContactShadows, Cylinder } from "@react-three/drei";
import axios from "axios";

import { FactoryArchitecture } from "./FactoryArchitecture";
import { HeatmapLayer } from "./HeatmapLayer";
import { SensorNode } from "./SensorNode";
import layoutConfig from "../../../../backend/models/sensor-layouts/default.json";
import { Float, Sphere } from "@react-three/drei";

import { useSimulation } from "../../hooks/useSimulation";
import { SimulationPanel } from "./SimulationPanel";

const DigitalClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
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
        letterSpacing: "1px",
      }}
    >
      {currentTime.toLocaleTimeString([], { hour12: false })}
    </div>
  );
};

// --- DÜZELTME 1: BU ARTIK DIŞARIDA (GLOBAL) ---
const SENSOR_TYPE_MAP: Record<string, string> = {
  Temperature: "dht11_temp",
  Humidity: "dht11_hum",
  "Methane Sensor": "mq4",
  "CO Sensor": "mq7",
  "Flammable Gas Sensor": "mq9",
  "Air Quality": "mq135",
  "Alcohol Sensor": "mq3",
  "CO2 Sensor": "scd40",
};

// --- DÜZELTME 2: BU ARTIK DIŞARIDA (GLOBAL) ---
const HeatmapLegend = ({ mode }: { mode: "TEMP" | "HUMIDITY" | "GAS" |"GENERAL" }) => {
  const config = {
    TEMP: { min: 0, max: 80, unit: "°C", title: "Sıcaklık" },
    HUMIDITY: { min: 0, max: 100, unit: "%", title: "Nem" },
    GAS: { min: 0, max: 1000, unit: "ppm", title: "Gaz Yoğunluğu" },
    GENERAL: { min: 0, max: 100, unit: "Risk %",title:"Genel Risk" }
  }[mode];

  return (
    <div
      style={{
        position: "absolute",
        bottom: "100px",
        right: "20px",
        background: "rgba(15, 23, 42, 0.9)",
        padding: "15px",
        borderRadius: "12px",
        border: "1px solid #475569",
        display: "flex",
        alignItems: "center",
        gap: "15px",
        color: "white",
        zIndex: 20,
        fontFamily: "sans-serif",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
      }}
    >
      {/* Renk Çubuğu */}
      <div
        style={{
          width: "24px",
          height: "160px",
          background: "linear-gradient(to top, blue, #00ff00, yellow, red)",
          borderRadius: "12px",
          border: "1px solid white",
        }}
      />

      {/* Değerler */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "160px",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        <div style={{ color: "#ef4444" }}>
          ▲ {config.max} {config.unit} (Critical)
        </div>
        <div style={{ color: "#fbbf24" }}>
          - {(config.max * 0.75).toFixed(0)} {config.unit}
        </div>
        <div style={{ color: "#22c55e" }}>
          - {(config.max * 0.5).toFixed(0)} {config.unit} (Normal)
        </div>
        <div style={{ color: "#3b82f6" }}>
          - {(config.max * 0.25).toFixed(0)} {config.unit}
        </div>
        <div style={{ color: "#3b82f6" }}>
          ▼ {config.min} {config.unit} (Safe)
        </div>
      </div>
    </div>
  );
};

// --- ANİMASYONLU, YAYILAN GERÇEKÇİ YANGIN VE DUMAN EFEKTİ ---
const FireEffect = ({
  position,
}: {
  position: { x: number; y: number; z: number };
}) => {
  const smokeRefs = useRef<any[]>([]);
  const fireRef = useRef<any>(null);
  const lightRef = useRef<any>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (fireRef.current) {
      fireRef.current.scale.y =
        1 + Math.sin(t * 15) * 0.2 + Math.cos(t * 10) * 0.1;
      fireRef.current.scale.x = 1 + Math.cos(t * 8) * 0.1;
      fireRef.current.scale.z = 1 + Math.sin(t * 7) * 0.1;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 40 + Math.sin(t * 25) * 15;
    }
    smokeRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const lifeTime = 6;
      const timeOffset = t + i * (lifeTime / smokeRefs.current.length);
      const life = timeOffset % lifeTime;
      const progress = life / lifeTime;
      mesh.position.y = 1 + progress * 15;
      const spread = 2 + Math.pow(progress, 2) * 25;
      mesh.scale.set(spread, spread * 0.5, spread);
      if (mesh.material) {
        mesh.material.opacity = (1 - progress) * 0.6;
      }
    });
  });

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <circleGeometry args={[2.5, 32]} />
        <meshStandardMaterial
          color="#ff3300"
          emissive="#ff2200"
          emissiveIntensity={6}
          transparent
          opacity={0.9}
        />
      </mesh>
      <group ref={fireRef} position={[0, 1.5, 0]}>
        <Sphere args={[1.5, 16, 16]} scale={[1, 2, 1]}>
          <meshStandardMaterial
            color="#fffb00"
            emissive="#ffaa00"
            emissiveIntensity={10}
            transparent
            opacity={0.8}
            depthWrite={false}
          />
        </Sphere>
        <Sphere args={[2.2, 16, 16]} position={[0, 0.5, 0]} scale={[1, 1.5, 1]}>
          <meshStandardMaterial
            color="#ff4400"
            emissive="#ff0000"
            emissiveIntensity={5}
            transparent
            opacity={0.6}
            depthWrite={false}
          />
        </Sphere>
      </group>
      {[...Array(7)].map((_, i) => (
        <Sphere
          key={i}
          ref={(el) => {
            smokeRefs.current[i] = el;
          }}
          args={[1, 16, 16]}
          position={[0, 0, 0]}
        >
          <meshStandardMaterial
            color="#0a0a0a"
            transparent
            opacity={0}
            depthWrite={false}
            roughness={1}
          />
        </Sphere>
      ))}
      <pointLight
        ref={lightRef}
        position={[0, 3, 0]}
        color="#ff3300"
        distance={60}
        castShadow
      />
    </group>
  );
};

const GasLeakEffect = ({
  position,
}: {
  position: { x: number; y: number; z: number };
}) => {
  const jetRefs = useRef<any[]>([]);
  const floorRefs = useRef<any[]>([]);
  const PIPE_HEIGHT = 18;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    jetRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const lifeTime = 1.4;
      const offset = i * (lifeTime / jetRefs.current.length);
      const progress = ((t + offset) % lifeTime) / lifeTime;
      mesh.position.y = PIPE_HEIGHT - progress * PIPE_HEIGHT;
      const spread = 0.5 + progress * 4.5;
      mesh.position.x = Math.sin(i * 132.5) * (progress * 2.5);
      mesh.position.z = Math.cos(i * 123.5) * (progress * 2.5);
      mesh.scale.set(spread, spread * 1.5, spread);
      if (mesh.material) mesh.material.opacity = (1 - progress) * 0.7;
    });
    floorRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const lifeTime = 4.0;
      const offset = i * (lifeTime / floorRefs.current.length);
      const progress = ((t + offset) % lifeTime) / lifeTime;
      mesh.position.y = 0.3;
      const radius = progress * 12;
      const angle = i * ((Math.PI * 2) / floorRefs.current.length);
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius;
      const scale = 5 + progress * 7;
      mesh.scale.set(scale, scale * 0.2, scale);
      if (mesh.material) mesh.material.opacity = (1 - progress) * 0.5;
    });
  });

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh position={[0, PIPE_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.2, 16, 32]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={5}
        />
      </mesh>
      {[...Array(20)].map((_, i) => (
        <Sphere
          key={`jet-${i}`}
          ref={(el) => {
            jetRefs.current[i] = el;
          }}
          args={[0.7, 16, 16]}
        >
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00ff88"
            emissiveIntensity={1}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </Sphere>
      ))}
      {[...Array(15)].map((_, i) => (
        <Sphere
          key={`floor-${i}`}
          ref={(el) => {
            floorRefs.current[i] = el;
          }}
          args={[1.2, 32, 32]}
        >
          <meshStandardMaterial
            color="#10b981"
            emissive="#064e3b"
            emissiveIntensity={0.2}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </Sphere>
      ))}
      <spotLight
        position={[0, PIPE_HEIGHT + 1, 0]}
        target-position={[0, 0, 0]}
        color="#00ff88"
        intensity={150}
        distance={40}
        angle={0.7}
      />
    </group>
  );
};

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

// --- YENİ: SİREN BİLEŞENİ ---
const SirenStrobe = () => {
  const lightRef = useRef<any>(null);
  useFrame(({ clock }) => {
    if (lightRef.current) {
      // Tehlike anı çakar efekti (Hızlı yanıp sönen kırmızı ışık)
      lightRef.current.intensity =
        Math.sin(clock.getElapsedTime() * 15) > 0 ? 30 : 0;
    }
  });
  return (
    <group>
      <pointLight
        ref={lightRef}
        color="#ff0000"
        position={[0, 18, 0]}
        distance={150}
      />
      <pointLight
        ref={lightRef}
        color="#ff0000"
        position={[40, 18, 40]}
        distance={100}
      />
      <pointLight
        ref={lightRef}
        color="#ff0000"
        position={[-40, 18, -40]}
        distance={100}
      />
    </group>
  );
};

export const FactoryScene = () => {
  const [sensors, setSensors] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<any[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
 // Tip tanımına 'GENERAL' eklendi ve varsayılan mod yapıldı
  const [heatmapMode, setHeatmapMode] = useState<'TEMP' | 'HUMIDITY' | 'GAS' | 'GENERAL'>('GENERAL');

  const {
    isSimulating,
    simSensors,
    simMode,
    simCenter,
    startSimulation,
    stopSimulation,
    addVirtualSensor,
    removeVirtualSensor,
    runScenario,
  } = useSimulation(sensors);

  const displaySensors = isSimulating ? simSensors : sensors;

  const controlsRef = useRef<any>(null);
  const { token, role, userCompany } = getQueryParams();
  const [selectedCompany, setSelectedCompany] = useState<string>(
    userCompany || "",
  );

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
          },
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
        token,
      )}${companyParam}`;

      ws = new WebSocket(wsUrl);

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          if (message.type === "SENSOR_UPDATE" && Array.isArray(message.data)) {
            setSensors((prevSensors) => {
              return prevSensors.map((sensor) => {
                const match = message.data.find((u: any) => {
                  const incomingId =
                    u.metadata?.sensor_id || u.sensor_id || u._id;
                  return String(incomingId) === String(sensor.id);
                });

                if (match) {
                  const newVal =
                    match.value ?? match.latest_value ?? match.current_value;
                  const newTimestamp = match.timestamp;

                  if (
                    newVal !== sensor.value ||
                    newTimestamp !== sensor.timestamp
                  ) {
                    return {
                      ...sensor,
                      value: newVal,
                      timestamp: newTimestamp,
                    };
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

      return () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    }
  }, [selectedCompany, token, role]);

  const handleUpdateLocation = async (
    sensorId: string,
    newLocation: string,
  ) => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:8001/api/map-sensor",
        { sensor_id: sensorId, location_key: newLocation },
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (response.status === 200) {
        const mountingPoints = layoutConfig.mounting_points as any;
        const newCoords = mountingPoints[newLocation];

        setSensors((prevSensors) => {
          return prevSensors.map((sensor) => {
            if (String(sensor.id) === String(sensorId)) {
              return {
                ...sensor,
                location_name: newLocation,
                position: newCoords
                  ? {
                      x: newCoords.x,
                      y: newCoords.y,
                      z: newCoords.z,
                    }
                  : sensor.position,
              };
            }
            return sensor;
          });
        });
      }
    } catch (e) {
      console.error("Güncelleme hatası:", e);
    }
  };

  const handleSimulateValue = (sensorId: string, newValue: number) => {
    setSensors((prev) =>
      prev.map((s) => (s.id === sensorId ? { ...s, value: newValue } : s)),
    );
  };

  const locationCounts: Record<string, number> = {};
  const getOffset = (locName: string) => {
    const offset = locationCounts[locName] || 0;
    locationCounts[locName] = offset + 1;
    return offset;
  };

  const toggleSimulation = () => {
    if (isSimulating) {
      stopSimulation();
    } else {
      startSimulation();
      setIsEditMode(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "#0f172a",
        position: "relative",
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
          <DigitalClock />

          <button
            onClick={toggleSimulation}
            style={{
              background: isSimulating ? "#9333ea" : "#1e293b",
              color: "white",
              border: "1px solid #334155",
              padding: "8px 20px",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: "bold",
            }}
          >
            {isSimulating ? "🛑 STOP SIMULATION" : "🧪 SIMULATION"}
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
              if (isSimulating) stopSimulation();
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
        {/* --- YENİ: MERKEZİ UYARI UI --- */}
        {isSimulating && simMode !== "NORMAL" && (
          <div
            style={{
              position: "absolute",
              top: "15%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              zIndex: 100,
              background: "rgba(220, 38, 38, 0.85)",
              color: "white",
              padding: "20px 40px",
              borderRadius: "12px",
              fontSize: "28px",
              fontWeight: "bold",
              border: "3px solid white",
              boxShadow: "0 0 20px rgba(255,0,0,0.5)",
              pointerEvents: "none",
              textAlign: "center",
            }}
          >
            🚨 EMERGENCY: {simMode} DETECTED! 🚨
            <div style={{ fontSize: "14px", marginTop: "5px" }}>
              Immediate Action Required In Affected Zones
            </div>
          </div>
        )}

        {/* --- YENİ: KRİTİK SENSÖR LİSTESİ UI --- */}
        {isSimulating &&
          displaySensors.some((s) => s.status === "critical") && (
            <div
              style={{
                position: "absolute",
                right: "20px",
                top: "100px",
                zIndex: 100,
                background: "rgba(15, 23, 42, 0.9)",
                padding: "15px",
                borderRadius: "8px",
                border: "2px solid #ef4444",
                width: "220px",
              }}
            >
              <h4
                style={{
                  color: "#ef4444",
                  margin: "0 0 10px 0",
                  borderBottom: "1px solid #ef4444",
                  paddingBottom: "5px",
                }}
              >
                ⚠️ CRITICAL NODES
              </h4>
              {displaySensors
                .filter((s) => s.status === "critical")
                .map((s) => (
                  <div
                    key={s.id}
                    style={{
                      color: "white",
                      fontSize: "12px",
                      marginBottom: "8px",
                      display: "flex",
                      justifyContent: "space-between",
                    }}
                  >
                    <span>{s.name}:</span>
                    <b style={{ color: "#f87171" }}>{s.value?.toFixed(1)}</b>
                  </div>
                ))}
            </div>
          )}

        {/* --- UI: HEATMAP SEÇİCİ --- */}
        {showHeatmap && (
          <div
            style={{
              position: "absolute",
              top: "70px",
              right: "20px",
              zIndex: 20,
            }}
          >
            <select
              onChange={(e) => setHeatmapMode(e.target.value as any)}
              value={heatmapMode}
              style={{
                padding: "8px",
                background: "#334155",
                color: "#38bdf8",
                borderRadius: "6px",
                border: "1px solid #475569",
                fontWeight: "bold",
                cursor: "pointer",
              }}
            >
              <option value="GENERAL">🌍 General Risk Map</option>
              <option value="TEMP">🌡️ Temperature Map</option>
              <option value="HUMIDITY">💧 Humidity Map</option>
              <option value="GAS">☠️ Gas/Hazard Map</option>
            </select>
          </div>
        )}

        {/* --- UI: HEATMAP LEGEND (ARTIK TANIMLI) --- */}
        {showHeatmap && <HeatmapLegend mode={heatmapMode} />}

        {isSimulating && (
          <SimulationPanel
            sensors={displaySensors}
            onAdd={(type) => addVirtualSensor(type)}
            onRemove={removeVirtualSensor}
            onScenario={runScenario}
          />
        )}
        <Canvas
          shadows
          camera={{ position: [20, 14, 30], fov: 45 }}
          frameloop="always"
        >
          <color attach="background" args={["#e5e7eb"]} />
          <fog attach="fog" args={["#e5e7eb", 40, 180]} />

          {/* TEHLİKE ANINDA ANA IŞIKLARI LOŞLAŞTIR */}
          <hemisphereLight
            intensity={isSimulating && simMode !== "NORMAL" ? 0.3 : 0.8}
            groundColor="#d1d5db"
            color="#ffffff"
          />
          <directionalLight
            position={[50, 80, 50]}
            intensity={isSimulating && simMode !== "NORMAL" ? 0.5 : 1.5}
            castShadow
          />

          {/* YENİ: TEHLİKE ANINDA ÇAKAN SİREN IŞIKLARI */}
          {isSimulating && simMode !== "NORMAL" && <SirenStrobe />}

          <pointLight position={[0, 18, 0]} intensity={0.5} />
          <KeyboardMapMover controlsRef={controlsRef} />
          <MapControls
            ref={controlsRef}
            makeDefault
            screenSpacePanning={true}
            dampingFactor={0.1}
            minDistance={5}
            maxDistance={90}
          />

          {isSimulating && (simMode === "FIRE" || simMode === "GAS_LEAK") && (
            <mesh
              rotation={[-Math.PI / 2, 0, 0]}
              position={[0, 0.1, 0]}
              onDoubleClick={(e: any) => {
                e.stopPropagation();
                runScenario(simMode, { x: e.point.x, y: 0.5, z: e.point.z });
              }}
            >
              <planeGeometry args={[500, 500]} />
              <meshBasicMaterial visible={false} />
            </mesh>
          )}

          <FactoryArchitecture />
          <HeatmapLayer
            sensors={displaySensors}
            visible={showHeatmap}
            mode={heatmapMode}
            minRange={heatmapMode === "GAS" ? 0 : 0}
            maxRange={
              heatmapMode === "GAS"
                ? 1000
                : heatmapMode === "HUMIDITY"
                  ? 100
                  : 80
            }
          />
          {isSimulating && simCenter && simMode === "FIRE" && (
            <FireEffect position={simCenter} />
          )}
          {isSimulating && simCenter && simMode === "GAS_LEAK" && (
            <GasLeakEffect position={simCenter} />
          )}

          <ContactShadows
            resolution={1024}
            scale={150}
            blur={3}
            opacity={0.4}
            far={10}
            color="#000000"
          />

          {displaySensors.map((s) => (
            <SensorNode
              key={s.id}
              data={s}
              availableSlots={availableSlots}
              onUpdateLocation={handleUpdateLocation}
              onSimulateValue={handleSimulateValue}
              isEditMode={isEditMode}
              isSimulationMode={isSimulating}
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
          <br />• Double Click: Move Fire/Gas Leak (In Simulation)
          <br />• WASD: Move | Shift: Fast
        </div>
      </div>
    </div>
  );
};
