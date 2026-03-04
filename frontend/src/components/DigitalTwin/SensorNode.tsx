import { useState, memo, useEffect, useRef } from 'react';
import { Html, Text } from '@react-three/drei';

const formatValue = (val: any) => {
    if (typeof val === 'number') return parseFloat(val.toFixed(4)); 
    return val;
};

// --- TİTREMEYİ VE SIÇRAMAYI ÖNLEYEN SAAT MOTORU ---
const LiveTimestamp = ({ utcString }: { utcString: string }) => {
    const [displayTime, setDisplayTime] = useState("--:--:--");
    const timeRef = useRef<Date | null>(null);

    useEffect(() => {
        if (!utcString) return;
        
        let normalizedStr = utcString;
        if (!normalizedStr.endsWith('Z') && !normalizedStr.includes('+')) normalizedStr += 'Z';
        const newServerDate = new Date(new Date(normalizedStr).getTime() + (3 * 60 * 60 * 1000));

        if (!timeRef.current || Math.abs(timeRef.current.getTime() - newServerDate.getTime()) > 2000) {
            timeRef.current = newServerDate;
        }
    }, [utcString]);

    useEffect(() => {
        const timer = setInterval(() => {
            if (timeRef.current) {
                timeRef.current = new Date(timeRef.current.getTime() + 1000);
                setDisplayTime(
                    `${timeRef.current.getUTCHours().toString().padStart(2, '0')}:${timeRef.current.getUTCMinutes().toString().padStart(2, '0')}:${timeRef.current.getUTCSeconds().toString().padStart(2, '0')}`
                );
            }
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    return <>{displayTime}</>;
};

// React.memo ile sarmaladık: Sadece verisi gerçekten değişen sensör render olur.
export const SensorNode = memo(({ data, availableSlots, onUpdateLocation, onSimulateValue, isEditMode, isSimulationMode, indexOffset }: any) => {
  const [showPopup, setShowPopup] = useState(false);

  // Durum rengi hesaplamaları
  let statusColor = "#16a34a"; 
  if (data.value > 30) statusColor = "#facc15"; 
  if (data.value > 70) statusColor = "#dc2626"; 
  if (isEditMode && data.is_manual) statusColor = "#2563eb"; 
  if (isSimulationMode) statusColor = "#a855f7"; 

  const verticalGap = 1.2;
  const adjustedY = data.position.y + (indexOffset * verticalGap);

  return (
    <group position={[data.position.x, adjustedY, data.position.z]}>
      
      {/* 1. SENSÖR ANA GÖVDESİ */}
      <group onClick={() => setShowPopup(!showPopup)}>
        <mesh castShadow>
          <boxGeometry args={[1.2, 0.7, 1.2]} />
          <meshStandardMaterial color="#334155" roughness={0.4} metalness={0.7} />
        </mesh>

        <mesh position={[0, 0, 0.61]}>
          <boxGeometry args={[0.9, 0.4, 0.05]} />
          <meshStandardMaterial color="#1e293b" metalness={0.9} roughness={0.1} />
        </mesh>

        <mesh position={[0.4, 0.2, 0.62]}>
          <sphereGeometry args={[0.08, 16, 16]} />
          <meshStandardMaterial 
            color={statusColor} 
            emissive={statusColor} 
            emissiveIntensity={1.5} 
          />
        </mesh>

        <mesh position={[-0.4, 0.35, -0.4]}>
          <cylinderGeometry args={[0.03, 0.03, 0.8, 8]} />
          <meshStandardMaterial color="#1f2937" metalness={1} />
        </mesh>
        <mesh position={[-0.4, 0.75, -0.4]}>
          <sphereGeometry args={[0.05, 8, 8]} />
          <meshStandardMaterial color="#1f2937" />
        </mesh>
      </group>

      {/* 2. MONTAJ APARATI VE DİREK */}
      <mesh position={[0, -0.45, 0]}>
        <cylinderGeometry args={[0.2, 0.3, 0.2, 16]} />
        <meshStandardMaterial color="#475569" metalness={0.8} />
      </mesh>

      <mesh position={[0, -adjustedY / 2 - 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.07, 0.07, adjustedY, 12]} />
          <meshStandardMaterial color="#94a3b8" metalness={0.9} roughness={0.2} />
      </mesh>

      <Text 
        position={[0, 1.8, 0]} 
        fontSize={0.6} 
        color="#ffffff" 
        anchorX="center" 
        anchorY="middle" 
        outlineWidth={0.04} 
        outlineColor="#1e293b" 
        fontWeight="bold"
      >
          {data.type ? data.type.split(" ")[0].toUpperCase() : "IOT NODE"}
      </Text>

      {/* 3. POPUP UI */}
      {showPopup && (
        <Html position={[0, 2.5, 0]} center zIndexRange={[100, 0]}>
          <div style={{ 
            background: 'rgba(255, 255, 255, 0.95)', 
            backdropFilter: 'blur(8px)',
            color: '#1f2937', 
            padding: '12px', 
            borderRadius:'12px', 
            minWidth: '180px', 
            textAlign: 'center', 
            border: `2px solid ${statusColor}`, 
            boxShadow: '0 10px 30px rgba(0,0,0,0.4)', 
            fontFamily: 'Inter, sans-serif' 
          }}>
            <div style={{fontWeight:'bold', fontSize:'11px', color:'#64748b', textTransform:'uppercase', letterSpacing:'1px'}}>{data.name}</div>
            
            {isSimulationMode ? (
                <div style={{margin:'8px 0'}}>
                    {/* DÜZELTME 1: Simülasyon modunda da değişen veriyi kocaman gösteriyoruz */}
                    <div style={{fontSize:'28px', fontWeight:'800', margin:'4px 0', color:'#a855f7'}}>
                        {formatValue(data.value)}
                    </div>
                    
                    <label style={{fontSize:'10px', display:'block', color:'#a855f7', fontWeight:'bold'}}>SET SIM VALUE:</label>
                    {/* DÜZELTME 2: defaultValue yerine value kullandık. Artık hep güncel! */}
                    <input 
                        type="number" 
                        value={formatValue(data.value)} 
                        style={{width:'80%', padding:'5px', border:'2px solid #a855f7', borderRadius:'6px', textAlign:'center', fontWeight:'bold'}} 
                        onChange={(e) => onSimulateValue(data.id, parseFloat(e.target.value))} 
                    />
                </div>
            ) : (
                <>
                  <div style={{fontSize:'28px', fontWeight:'800', margin:'4px 0', color:'#0f172a'}}>{formatValue(data.value)}</div>
                  <div style={{fontSize:'12px', color:'#ef4444', marginBottom:'8px', fontWeight:'600', display:'flex', alignItems:'center', justifyContent:'center', gap:'4px'}}>
                    <span style={{fontSize:'16px'}}>⏱</span> 
                    <LiveTimestamp utcString={data.timestamp} />
                  </div>
                </>
            )}

            <div style={{fontSize:'10px', color:'#94a3b8', background:'#f1f5f9', padding:'4px', borderRadius:'4px'}}>{data.location_name}</div>
            
            {isEditMode && !isSimulationMode && (
              <div style={{marginTop:'10px', borderTop:'1px solid #e2e8f0', paddingTop:'8px'}}>
                <select style={{background: '#ffffff', color:'#1f2937', fontSize:'11px', width:'100%', padding:'5px', borderRadius:'6px', border:'1px solid #cbd5e1'}} value={data.location_name} onChange={(e) => onUpdateLocation(data.id, e.target.value)}>
                  {availableSlots.map((slot: string) => <option key={slot} value={slot}>{slot}</option>)}
                </select>
              </div>
            )}
            <button onClick={() => setShowPopup(false)} style={{marginTop:'10px', fontSize:'11px', background:'#334155', color:'white', border:'none', borderRadius:'6px', padding:'8px', cursor:'pointer', width:'100%', fontWeight:'bold', letterSpacing:'1px'}}>CLOSE</button>
          </div>
        </Html>
      )}

      {indexOffset > 0 && (
        <mesh position={[0, -(indexOffset * verticalGap) / 2, 0]}>
          <cylinderGeometry args={[0.08, 0.08, indexOffset * verticalGap, 8]} />
          <meshStandardMaterial color={statusColor} opacity={0.5} transparent />
        </mesh>
      )}
    </group>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.data.value === nextProps.data.value &&
    prevProps.data.timestamp === nextProps.data.timestamp &&
    prevProps.data.position.x === nextProps.data.position.x &&
    prevProps.data.position.y === nextProps.data.position.y &&
    prevProps.isEditMode === nextProps.isEditMode &&
    prevProps.isSimulationMode === nextProps.isSimulationMode &&
    prevProps.indexOffset === nextProps.indexOffset
  );
});