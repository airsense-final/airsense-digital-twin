import React, { useState } from 'react';
import { Html, Text } from '@react-three/drei';

const formatValue = (val: any) => {
    if (typeof val === 'number') return parseFloat(val.toFixed(4)); 
    return val;
};

export const SensorNode = ({ data, availableSlots, onUpdateLocation, onSimulateValue, isEditMode, isSimulationMode, indexOffset }: any) => {
  let color = "#16a34a"; 
  if (data.value > 30) color = "#facc15"; 
  if (data.value > 70) color = "#dc2626"; 
  if (isEditMode && data.is_manual) color = "#2563eb"; 
  if (isSimulationMode) color = "#a855f7"; 

  const [showPopup, setShowPopup] = useState(false);
  const adjustedX = data.position.x + (indexOffset * 1.5); 
  const adjustedZ = data.position.z + (indexOffset * 0.5);

  return (
    <group position={[adjustedX, data.position.y, adjustedZ]}>
      <mesh onClick={() => setShowPopup(!showPopup)} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
      </mesh>
      <mesh position={[0, -data.position.y / 2, 0]} castShadow><cylinderGeometry args={[0.05, 0.05, data.position.y, 8]} /><meshStandardMaterial color="#4b5563" metalness={0.8} /></mesh>
      <Text position={[0, 1.5, 0]} fontSize={0.8} color="#1f2937" anchorX="center" anchorY="middle" outlineWidth={0.05} outlineColor="white" fontWeight="bold">{data.type ? data.type.split(" ")[0] : "Sensor"}</Text>

      {showPopup && (
        <Html position={[0, 2.2, 0]} center zIndexRange={[100, 0]}>
          <div style={{ background: 'white', color: '#1f2937', padding: '8px', borderRadius:'6px', minWidth: '160px', textAlign: 'center', border: `2px solid ${color}`, boxShadow: '0 4px 10px rgba(0,0,0,0.2)', fontFamily: 'sans-serif' }}>
            <div style={{fontWeight:'bold', fontSize:'11px', color:'#6b7280', marginBottom:'2px'}}>{data.name}</div>
            
            {isSimulationMode ? (
                <div style={{margin:'5px 0'}}>
                    <label style={{fontSize:'9px', display:'block', color:'#a855f7'}}>Simülasyon Değeri:</label>
                    <input type="number" defaultValue={data.value} style={{width:'80%', padding:'2px', border:'1px solid #a855f7', borderRadius:'4px', textAlign:'center', fontWeight:'bold'}} onChange={(e) => onSimulateValue(data.id, parseFloat(e.target.value))} />
                </div>
            ) : (
                <div style={{fontSize:'20px', fontWeight:'bold', margin:'2px 0', color:'#111827'}}>{formatValue(data.value)}</div>
            )}

            <div style={{fontSize:'9px', color:'#9ca3af', marginBottom:'6px'}}>{data.location_name}</div>
            
            {isEditMode && !isSimulationMode && (
              <div style={{marginTop:'5px', borderTop:'1px solid #e5e7eb', paddingTop:'5px'}}>
                <select style={{background: '#f3f4f6', color:'#1f2937', fontSize:'10px', width:'100%', padding:'3px', borderRadius:'4px', border:'1px solid #d1d5db'}} value={data.location_name} onChange={(e) => onUpdateLocation(data.id, e.target.value)}>
                  {availableSlots.map((slot: string) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </div>
            )}
            <button onClick={() => setShowPopup(false)} style={{marginTop:'6px', fontSize:'10px', background:'#ef4444', color:'white', border:'none', borderRadius:'4px', padding:'4px 8px', cursor:'pointer', width:'100%', fontWeight:'bold'}}>CLOSE</button>
          </div>
        </Html>
      )}
      {indexOffset > 0 && (<mesh position={[-indexOffset * 1.5, -data.position.y/2, -indexOffset * 0.5]}><cylinderGeometry args={[0.02, 0.02, data.position.y, 4]} /><meshStandardMaterial color={color} opacity={0.6} transparent /></mesh>)}
    </group>
  );
};