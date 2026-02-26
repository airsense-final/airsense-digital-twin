import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { MapControls, ContactShadows } from "@react-three/drei";
import axios from "axios";

import { FactoryArchitecture } from "./FactoryArchitecture";
import { HeatmapLayer } from "./HeatmapLayer";
import { SensorNode } from "./SensorNode";
import layoutConfig from "../../../../backend/models/sensor-layouts/default.json";
import { useSimulation } from "../../hooks/useSimulation";
import { SimulationPanel } from "./SimulationPanel";

import { DigitalClock, HeatmapLegend } from "./SceneUI";
import { FireEffect, GasLeakEffect, SirenStrobe } from "./SceneEffects";
import { KeyboardMapMover } from "./SceneControls";
import { CrowdSimulation } from "./CrowdSimulation";

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

const getQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    token: params.get("token"),
    role: params.get("role")?.toLowerCase(),
    userCompany: params.get("company"),
    scenario: params.get("scenario"),
  };
};

export const FactoryScene = () => {
  const [sensors, setSensors] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);
  const [thresholds, setThresholds] = useState<any[]>([]); 
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [heatmapMode, setHeatmapMode] = useState<"TEMP" | "HUMIDITY" | "GAS" | "GENERAL">("GENERAL");
  const [crowdStats, setCrowdStats] = useState({ alive: 5, safe: 0, injured: 0, dead: 0 });

  const [agentCount, setAgentCount] = useState<number>(5);
  const [resetTrigger, setResetTrigger] = useState<number>(0); // YENİ: Reset state'i
  const [showReport, setShowReport] = useState(false);
  const [finalReport, setFinalReport] = useState<any>(null);

  const {
    isSimulating, simSensors, simMode, simCenter,
    startSimulation, stopSimulation, addVirtualSensor, removeVirtualSensor, runScenario,
  } = useSimulation(sensors);

  const heatmapConfig = useMemo(() => {
    const config: any = {
      TEMP: { min: 0, max: 80, warning: 60, unit: "°C" },
      HUMIDITY: { min: 0, max: 100, warning: 70, unit: "%" },
      GAS: { min: 0, max: 100, warning: 75, unit: "Risk %" },
      GENERAL: { min: 0, max: 100, warning: 75, unit: "Risk %" },
    };

    if (thresholds.length > 0) {
      let maxTemp = 0, warnTemp = 0;
      let maxHum = 0, warnHum = 0;

      thresholds.forEach((t) => {
        const type = t.sensor_type?.toLowerCase() || "";
        const crit = t.critical_max;
        const warn = t.warning_max; 

        if (crit) {
          if (type.includes("temp")) {
            if (crit < 200) {
              maxTemp = Math.max(maxTemp, crit);
              if (warn) warnTemp = Math.max(warnTemp, warn);
            }
          } else if (type.includes("hum")) {
            maxHum = Math.max(maxHum, crit);
            if (warn) warnHum = Math.max(warnHum, warn);
          }
        }
      });

      if (maxTemp > 0) {
        config.TEMP.max = maxTemp;
        if (warnTemp > 0) config.TEMP.warning = warnTemp;
      }
      if (maxHum > 0) {
        config.HUMIDITY.max = maxHum;
        if (warnHum > 0) config.HUMIDITY.warning = warnHum;
      }
    }
    return config;
  }, [thresholds]);

  const enrichSensorsWithThresholds = useCallback(
    (rawSensors: any[], thresholdList: any[]) => {
      return rawSensors.map((sensor) => {
        const mappedType = SENSOR_TYPE_MAP[sensor.sensor_type] || sensor.sensor_type?.toLowerCase() || "";
        const scenario = sensor.scenario || "indoor_small";

        const matchingThreshold = thresholdList.find(
          (t) => t.sensor_type === mappedType && t.scenario === scenario && t.company_id === sensor.company_id
        );

        const limits = matchingThreshold
          ? { warning: matchingThreshold.warning_max || 9999, critical: matchingThreshold.critical_max || 9999 }
          : { warning: 50000, critical: 50000 };

        let status = "normal";
        const val = sensor.value ?? 0;
        if (val >= limits.critical) status = "critical";
        else if (val >= limits.warning) status = "warning";

        return { ...sensor, thresholds: limits, status: status };
      });
    },
    []
  );

  const displaySensors = useMemo(() => {
    if (isSimulating) return simSensors;
    return enrichSensorsWithThresholds(sensors, thresholds);
  }, [isSimulating, simSensors, sensors, thresholds, enrichSensorsWithThresholds]);

  const controlsRef = useRef<any>(null);
  const { token, role, userCompany, scenario } = getQueryParams();
  const [selectedCompany, setSelectedCompany] = useState<string>(userCompany || "");

  if (!token)
    return (
      <div style={{ height: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "white", background: "#0f172a" }}>
        <h1>⛔ Access Denied</h1>
      </div>
    );

  useEffect(() => {
    if (role === "superadmin") {
      axios.get("http://127.0.0.1:8001/api/companies").then((res) => {
        setCompanies(res.data);
        if (!userCompany && res.data.length > 0) setSelectedCompany(res.data[0].name);
      });
    } else if (userCompany) {
      setSelectedCompany(userCompany);
    }
  }, [role, userCompany]);

  useEffect(() => {
    const fetchInitialData = async () => {
      if (!token) return;
      try {
        const config = { headers: { Authorization: `Bearer ${token}` } };
        const params: any = {};
        if (role === "superadmin" && selectedCompany) {
          params.company = selectedCompany;
          if (scenario) params.scenario = scenario;
        }

        const thRes = await axios.get(`http://127.0.0.1:8001/api/v1/thresholds/`, { ...config, params });
        setThresholds(thRes.data);

        const res = await axios.get(`http://127.0.0.1:8001/api/digital-twin-data`, {
          headers: { Authorization: `Bearer ${token}` },
          params: params,
        });
        setSensors(res.data);
      } catch (e) {
        console.error("Initial Fetch Error:", e);
      }
    };

    fetchInitialData();

    if (selectedCompany) {
      axios
        .get("http://127.0.0.1:8001/api/layout-slots", { params: { company: selectedCompany } })
        .then((res) => setAvailableSlots(res.data));
    }

    let ws: WebSocket | null = null;
    if (token) {
      const companyParam = role === "superadmin" && selectedCompany ? `&company=${encodeURIComponent(selectedCompany)}` : "";
      const wsUrl = `ws://127.0.0.1:8001/ws?token=${encodeURIComponent(token)}${companyParam}`;

      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
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
                  if (newVal !== sensor.value || match.timestamp !== sensor.timestamp) {
                    return { ...sensor, value: newVal, timestamp: match.timestamp };
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
        if (ws && ws.readyState === WebSocket.OPEN) ws.close();
      };
    }
  }, [selectedCompany, token, role, scenario]);

  const handleUpdateLocation = async (sensorId: string, newLocation: string) => {
    try {
      const response = await axios.post(
        "http://127.0.0.1:8001/api/map-sensor",
        { sensor_id: sensorId, location_key: newLocation },
        { headers: { Authorization: `Bearer ${token}` } }
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
                position: newCoords ? { x: newCoords.x, y: newCoords.y, z: newCoords.z } : sensor.position,
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
    setSensors((prev) => prev.map((s) => (s.id === sensorId ? { ...s, value: newValue } : s)));
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
      if (simMode !== "NORMAL") {
          setFinalReport({ mode: simMode, stats: { ...crowdStats } });
          setShowReport(true);
      }
    } else {
      startSimulation();
      setIsEditMode(false);
    }
  };

  return (
    <div style={{ width: "100%", height: "100vh", display: "flex", flexDirection: "column", background: "#0f172a", position: "relative" }}>
      <div style={{ background: "#0f172a", padding: "15px 25px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #1e293b", zIndex: 10 }}>
        <h2 style={{ color: "white", margin: 0, fontSize: "20px", fontFamily: "sans-serif" }}>
          🏭 AirSense Twin <span style={{ fontSize: "12px", background: "#1e293b", padding: "2px 8px", borderRadius: "10px", color: "#94a3b8" }}>{selectedCompany || "Default"}</span>
        </h2>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          <DigitalClock />
          
          {/* İŞÇİ SAYISI VE RESET BUTONU */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#1e293b', padding: '6px 12px', borderRadius: '6px', border: '1px solid #334155' }}>
             <span style={{ color: '#94a3b8', fontSize: '14px', fontWeight: 'bold' }}>👷 Workers:</span>
             <input 
               type="number" 
               value={agentCount} 
               onChange={(e) => setAgentCount(Number(e.target.value))}
               disabled={isSimulating}
               style={{ width: '45px', background: 'transparent', color: 'white', border: 'none', fontWeight: 'bold', outline: 'none' }}
             />
             <button 
               onClick={() => setResetTrigger(prev => prev + 1)}
               title="İşçileri Resetle"
               style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', marginLeft: '5px' }}
             >
               🔄 RESET
             </button>
          </div>

          <button onClick={toggleSimulation} style={{ background: isSimulating ? "#9333ea" : "#1e293b", color: "white", border: "1px solid #334155", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
            {isSimulating ? "🛑 STOP SIMULATION" : "🧪 SIMULATION"}
          </button>
          <button onClick={() => setShowHeatmap(!showHeatmap)} style={{ background: showHeatmap ? "#ea580c" : "#1e293b", color: "white", border: "1px solid #334155", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
            🔥 HEATMAP
          </button>
          <button onClick={() => { setIsEditMode(!isEditMode); if (isSimulating) stopSimulation(); }} style={{ background: isEditMode ? "#2563eb" : "#1e293b", color: "white", border: "1px solid #334155", padding: "8px 20px", borderRadius: "6px", cursor: "pointer", fontWeight: "bold" }}>
            {isEditMode ? "💾 SAVE" : "✏️ EDIT"}
          </button>
          {role === "superadmin" && (
            <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} style={{ background: "#1e293b", color: "white", padding: "8px 12px", borderRadius: "6px", border: "1px solid #334155" }}>
              {companies.map((c) => (<option key={c.id} value={c.name}>{c.name}</option>))}
            </select>
          )}
        </div>
      </div>

      <div style={{ flex: 1, position: "relative" }}>
        
        {/* OLAY YERİ RAPORU MODALI */}
        {showReport && finalReport && (
          <div style={{
            position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 1000,
            background: "rgba(15, 23, 42, 0.95)", padding: "30px", borderRadius: "12px", border: "2px solid #3b82f6", width: "400px", color: "white", fontFamily: "sans-serif", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.8)"
          }}>
            <h2 style={{ margin: "0 0 15px 0", color: "#3b82f6", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>
              📋 Incident Report
            </h2>
            <p style={{ margin: "0 0 20px 0", color: "#94a3b8" }}>Simulation Type: <b>{finalReport.mode}</b></p>
            
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "16px" }}>
              <span>Total Workers:</span> <b>{agentCount}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "16px" }}>
              <span>✅ Safe (Evacuated):</span> <b style={{ color: "#22c55e" }}>{finalReport.stats.safe}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", fontSize: "16px" }}>
              <span>🤕 Injured:</span> <b style={{ color: "#f97316" }}>{finalReport.stats.injured}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "25px", fontSize: "16px" }}>
              <span>☠️ Casualties:</span> <b style={{ color: "#ef4444" }}>{finalReport.stats.dead}</b>
            </div>

            <button 
              onClick={() => setShowReport(false)}
              style={{ width: "100%", padding: "10px", background: "#3b82f6", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "bold", fontSize: "16px" }}
            >
              CLOSE REPORT
            </button>
          </div>
        )}

        {isSimulating && simMode !== "NORMAL" && (
          <div style={{ position: "absolute", top: "15%", left: "50%", transform: "translate(-50%, -50%)", zIndex: 100, background: "rgba(220, 38, 38, 0.85)", color: "white", padding: "20px 40px", borderRadius: "12px", fontSize: "28px", fontWeight: "bold", border: "3px solid white", boxShadow: "0 0 20px rgba(255,0,0,0.5)", pointerEvents: "none", textAlign: "center" }}>
            🚨 EMERGENCY: {simMode} DETECTED! 🚨
            <div style={{ fontSize: "14px", marginTop: "5px" }}>Immediate Action Required In Affected Zones</div>
          </div>
        )}

        {/* --- GÖRÜNÜR HALE GETİRİLEN TAHLİYE İSTATİSTİKLERİ UI --- */}
        {isSimulating && simMode !== "NORMAL" && (
          <div style={{
            position: "absolute", top: "160px", right: "20px", zIndex: 200, // Z-index artırıldı, biraz daha aşağı alındı
            background: "rgba(15, 23, 42, 0.95)", padding: "18px", borderRadius: "8px",
            border: "2px solid #3b82f6", width: "240px", color: "white", fontFamily: "sans-serif",
            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
          }}>
            <h4 style={{ margin: "0 0 10px 0", borderBottom: "1px solid #475569", paddingBottom: "5px", color: "#38bdf8", fontSize: "16px" }}>
              🏃‍♂️ EVACUATİON STATUS
            </h4>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
              <span>🏃 Evacuating:</span> <b style={{ color: "#eab308" }}>{crowdStats.alive}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
              <span>✅ Safe:</span> <b style={{ color: "#22c55e" }}>{crowdStats.safe}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px", fontSize: "14px" }}>
              <span>🤕 Injured:</span> <b style={{ color: "#f97316" }}>{crowdStats.injured}</b>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
              <span>☠️ Casualties:</span> <b style={{ color: "#ef4444" }}>{crowdStats.dead}</b>
            </div>
          </div>
        )}

        {displaySensors.some((s) => s.status === "critical") && (
          <div style={{ position: "absolute", right: "20px", top: "100px", zIndex: 100, background: "rgba(15, 23, 42, 0.9)", padding: "15px", borderRadius: "8px", border: "2px solid #ef4444", width: "220px" }}>
            <h4 style={{ color: "#ef4444", margin: "0 0 10px 0", borderBottom: "1px solid #ef4444", paddingBottom: "5px" }}>⚠️ CRITICAL NODES</h4>
            {displaySensors.filter((s) => s.status === "critical").map((s) => (
              <div key={s.id} style={{ color: "white", fontSize: "12px", marginBottom: "8px", display: "flex", justifyContent: "space-between" }}>
                <span>{s.name}:</span><b style={{ color: "#f87171" }}>{s.value?.toFixed(1)}</b>
              </div>
            ))}
          </div>
        )}

        {showHeatmap && (
          <div style={{ position: "absolute", top: "70px", right: "20px", zIndex: 20 }}>
            <select onChange={(e) => setHeatmapMode(e.target.value as any)} value={heatmapMode} style={{ padding: "8px", background: "#334155", color: "#38bdf8", borderRadius: "6px", border: "1px solid #475569", fontWeight: "bold", cursor: "pointer" }}>
              <option value="GENERAL">🌍 General Risk Map</option>
              <option value="TEMP">🌡️ Temperature Map</option>
              <option value="HUMIDITY">💧 Humidity Map</option>
              <option value="GAS">☠️ Gas/Hazard Map</option>
            </select>
          </div>
        )}

        {showHeatmap && (
          <HeatmapLegend
            min={heatmapConfig[heatmapMode].min}
            max={heatmapConfig[heatmapMode].max}
            warning={heatmapConfig[heatmapMode].warning}
            unit={heatmapConfig[heatmapMode].unit}
          />
        )}

        {isSimulating && (
          <SimulationPanel sensors={displaySensors} onAdd={(type) => addVirtualSensor(type)} onRemove={removeVirtualSensor} onScenario={runScenario} />
        )}

        <Canvas shadows camera={{ position: [20, 14, 30], fov: 45 }} frameloop="always">
          <color attach="background" args={["#e5e7eb"]} />
          <fog attach="fog" args={["#e5e7eb", 40, 180]} />

          <hemisphereLight intensity={isSimulating && simMode !== "NORMAL" ? 0.3 : 0.8} groundColor="#d1d5db" color="#ffffff" />
          <directionalLight position={[50, 80, 50]} intensity={isSimulating && simMode !== "NORMAL" ? 0.5 : 1.5} castShadow />

          {isSimulating && simMode !== "NORMAL" && <SirenStrobe />}

          <pointLight position={[0, 18, 0]} intensity={0.5} />
          <KeyboardMapMover controlsRef={controlsRef} />
          <MapControls ref={controlsRef} makeDefault screenSpacePanning={true} dampingFactor={0.1} minDistance={5} maxDistance={90} />

          {isSimulating && (simMode === "FIRE" || simMode === "GAS_LEAK") && (
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]} onDoubleClick={(e: any) => { e.stopPropagation(); runScenario(simMode, { x: e.point.x, y: 0.5, z: e.point.z }); }}>
              <planeGeometry args={[500, 500]} />
              <meshBasicMaterial visible={false} />
            </mesh>
          )}

          <FactoryArchitecture />

          <HeatmapLayer
            sensors={displaySensors}
            visible={showHeatmap}
            mode={heatmapMode as any}
            minRange={heatmapConfig[heatmapMode as keyof typeof heatmapConfig].min}
            maxRange={heatmapConfig[heatmapMode as keyof typeof heatmapConfig].max}
          />

          <CrowdSimulation 
            isEmergency={isSimulating && simMode !== "NORMAL"}
            hazardPosition={simCenter}
            onStatsUpdate={setCrowdStats}
            agentCount={agentCount} 
            resetTrigger={resetTrigger} // YENİ: Prop geçirildi
          />

          {isSimulating && simCenter && simMode === "FIRE" && <FireEffect position={simCenter} />}
          {isSimulating && simCenter && simMode === "GAS_LEAK" && <GasLeakEffect position={simCenter} />}

          <ContactShadows resolution={1024} scale={150} blur={3} opacity={0.4} far={10} color="#000000" />

          {displaySensors.map((s) => (
            <SensorNode key={s.id} data={s} availableSlots={availableSlots} onUpdateLocation={handleUpdateLocation} onSimulateValue={handleSimulateValue} isEditMode={isEditMode} isSimulationMode={isSimulating} indexOffset={getOffset(s.location_name)} />
          ))}
        </Canvas>
        <div style={{ position: "absolute", bottom: "30px", left: "30px", background: "rgba(15, 23, 42, 0.8)", color: "#e5e7eb", padding: "15px", borderRadius: "8px", fontSize: "12px", border: "1px solid #334155" }}>
          🎮 <b>Controls:</b><br />• Left Click: Pan | Right Click: Rotate<br />• Double Click: Move Fire/Gas Leak (In Simulation)<br />• WASD: Move | Shift: Fast
        </div>
      </div>
    </div>
  );
};