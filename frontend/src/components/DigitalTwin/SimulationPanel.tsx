import React from 'react';

interface SimulationPanelProps {
  sensors: any[];
  onAdd: (type: string) => void;
  onRemove: (id: string) => void;
  onScenario: (scenario: 'FIRE' | 'GAS_LEAK' | 'NORMAL') => void;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({ sensors, onAdd, onRemove, onScenario }) => {
  const sensorTypes = [
    "HUMIDITY DHT", "TEMP DHT", "AIR QUALITY MQ", 
    "ALCOHOL MQ", "METHANE MQ", "CO MQ", "CO2 SCD40"
  ];

  return (
    <div style={{
      position: "absolute", top: "20px", left: "20px", width: "280px",
      background: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(15px)",
      borderRadius: "16px", padding: "20px", border: "1px solid #9333ea",
      zIndex: 100, color: "white", boxShadow: "0 15px 35px rgba(0,0,0,0.6)",
      maxHeight: "90vh", display: 'flex', flexDirection: 'column'
    }}>
      <h3 style={{ margin: "0 0 15px 0", color: "#a855f7", fontSize: "18px", borderBottom: "1px solid #334155", paddingBottom: "10px" }}>
        🚀 Sim Engine v1.0
      </h3>

      <div style={{ overflowY: 'auto', flex: 1, paddingRight: '5px' }}>
        <p style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "10px" }}>Add Sensor Node</p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "20px" }}>
          {sensorTypes.map(type => (
            <button key={type} onClick={() => onAdd(type)} style={{ padding: "8px", background: "#1e293b", border: "1px solid #334155", borderRadius: "8px", color: "#e2e8f0", fontSize: "10px", cursor: "pointer" }}>
              + {type.split(' ')[0]}
            </button>
          ))}
        </div>

        <p style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "10px" }}>Active Scenarios</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
          <button onClick={() => onScenario('FIRE')} style={{ padding: "12px", background: "#7f1d1d", color: "#fca5a5", border: "1px solid #dc2626", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>🔥 START FIRE</button>
          <button onClick={() => onScenario('GAS_LEAK')} style={{ padding: "12px", background: "#1e3a8a", color: "#93c5fd", border: "1px solid #2563eb", borderRadius: "10px", cursor: "pointer", fontWeight: "bold" }}>💨 GAS LEAK</button>
          <button onClick={() => onScenario('NORMAL')} style={{ padding: "10px", background: "transparent", color: "#94a3b8", border: "1px solid #334155", borderRadius: "10px", cursor: "pointer" }}>🔄 Reset</button>
        </div>

        <p style={{ fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", marginBottom: "10px" }}>Manage Nodes ({sensors.length})</p>
        <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
          {sensors.map(s => (
            <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px', fontSize: '11px' }}>
              <span>{s.name}</span>
              <button onClick={() => onRemove(s.id)} style={{ background: '#ef4444', border: 'none', color: 'white', borderRadius: '4px', padding: '2px 8px', cursor: 'pointer' }}>Del</button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};