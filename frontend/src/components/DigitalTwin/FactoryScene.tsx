import React, { useEffect, useState, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { MapControls, Html, Text, ContactShadows } from '@react-three/drei';
import axios from 'axios';
import * as THREE from 'three';

// --- URL PARAMETRELERİ ---
const getQueryParams = () => {
  const params = new URLSearchParams(window.location.search);
  return {
    token: params.get("token"),
    role: params.get("role")?.toLowerCase(),
    userCompany: params.get("company")
  };
};

// --- TİPLER ---
interface TwinSensor { 
  id: string; 
  type: string; 
  name: string;
  value: number; 
  position: {x:number, y:number, z:number}; 
  location_name: string; 
  is_manual: boolean;
}
interface Company { id: number; name: string; }

// --- YARDIMCI: SAYI FORMATLA (MAX 4 HANELİ) ---
const formatValue = (val: any) => {
    if (typeof val === 'number') {
        return parseFloat(val.toFixed(4)); 
    }
    return val;
};

// --- KLAVYE KONTROL BİLEŞENİ ---
const KeyboardController = () => {
  const { camera } = useThree();
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: true }));
    const handleKeyUp = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: false }));

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useFrame((state, delta) => {
    const speed = keys['ShiftLeft'] || keys['ShiftRight'] ? 40 : 15; 
    const moveStep = speed * delta;

    if (keys['ArrowUp'] || keys['KeyW']) camera.position.z -= moveStep;
    if (keys['ArrowDown'] || keys['KeyS']) camera.position.z += moveStep;
    if (keys['ArrowLeft'] || keys['KeyA']) camera.position.x -= moveStep;
    if (keys['ArrowRight'] || keys['KeyD']) camera.position.x += moveStep;
  });

  return null;
};

// --- 🏗️ MİMARİ BİLEŞENLER ---
const DetailedBrightFactory = () => {
  const floorSize = 100;
  const wallHeight = 22; 
  const wallThickness = 2;
  
  const wallColor = "#f3f4f6"; 
  const floorColor = "#9ca3af"; 
  const ceilingColor = "#e5e7eb"; 
  const metalColor = "#4b5563"; 

  return (
    <group>
      {/* 1. ZEMİN */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial color={floorColor} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* 2. TAVAN */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallHeight, 0]} receiveShadow>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial color={ceilingColor} roughness={0.9} side={THREE.DoubleSide}/>
      </mesh>

      {/* 3. DUVARLAR */}
      <mesh position={[0, wallHeight / 2, -floorSize / 2]} receiveShadow>
        <boxGeometry args={[floorSize, wallHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[0, wallHeight / 2, floorSize / 2]} receiveShadow>
        <boxGeometry args={[floorSize, wallHeight, wallThickness]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[-floorSize / 2, wallHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, floorSize]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[floorSize / 2, wallHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, floorSize]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      {/* 4. KOLONLAR */}
      {[-40, 40].map((x) => (
         [-30, 0, 30].map((z) => (
            <group key={`col-${x}-${z}`} position={[x, wallHeight / 2, z]}>
               <mesh castShadow receiveShadow>
                  <boxGeometry args={[2.5, wallHeight, 2.5]} />
                  <meshStandardMaterial color={metalColor} metalness={0.6} roughness={0.3} />
               </mesh>
               <mesh position={[0, -wallHeight/2 + 1, 0]}>
                  <boxGeometry args={[3, 2, 3]} />
                  <meshStandardMaterial color="#6b7280" />
               </mesh>
            </group>
         ))
      ))}

      {/* 5. MAKASLAR */}
      {[-30, -10, 10, 30].map((zPos) => (
        <group key={`truss-${zPos}`} position={[0, wallHeight - 1.5, zPos]}>
            <mesh castShadow>
                <boxGeometry args={[floorSize, 0.8, 0.8]} />
                <meshStandardMaterial color={metalColor} metalness={0.7} roughness={0.2} />
            </mesh>
             {[-40, -20, 0, 20, 40].map(xPos => (
                 <mesh key={`supp-${xPos}`} position={[xPos, 0.5, 0]} rotation={[0, 0, Math.PI / 4]}>
                     <boxGeometry args={[3, 0.4, 0.4]} />
                     <meshStandardMaterial color={metalColor} />
                 </mesh>
             ))}
        </group>
      ))}

      {/* 6. BORULAR */}
      <mesh position={[-floorSize / 2 + 4, wallHeight - 4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[2, 2, floorSize, 16]} />
          <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} />
      </mesh>
      
      {/* 7. DEPO */}
      <group position={[-45, 2, -45]}>
          <mesh position={[0, 0, 0]} castShadow>
              <boxGeometry args={[5, 4, 5]} />
              <meshStandardMaterial color="#b45309" />
          </mesh>
           <mesh position={[6, -1, 0]} castShadow>
              <boxGeometry args={[4, 2, 4]} />
              <meshStandardMaterial color="#d97706" />
          </mesh>
      </group>
    </group>
  );
};

// --- SENSÖR BİLEŞENİ ---
const SensorNode = ({ data, availableSlots, onUpdateLocation, isEditMode, indexOffset }: any) => {
  let color = "#16a34a"; 
  if (data.value > 30) color = "#facc15"; 
  if (data.value > 70) color = "#dc2626"; 
  if (isEditMode && data.is_manual) color = "#2563eb"; 

  const [showPopup, setShowPopup] = useState(false);
  const adjustedX = data.position.x + (indexOffset * 1.5); 
  const adjustedZ = data.position.z + (indexOffset * 0.5);

  return (
    <group position={[adjustedX, data.position.y, adjustedZ]}>
      {/* Kutu */}
      <mesh onClick={() => setShowPopup(!showPopup)} castShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color={color} roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Ayak */}
      <mesh position={[0, -data.position.y / 2, 0]} castShadow>
         <cylinderGeometry args={[0.05, 0.05, data.position.y, 8]} />
         <meshStandardMaterial color="#4b5563" metalness={0.8} />
      </mesh>
      
      {/* Etiket */}
      <Text 
        position={[0, 1.5, 0]} 
        fontSize={0.8} 
        color="#1f2937" 
        anchorX="center" 
        anchorY="middle" 
        outlineWidth={0.05}
        outlineColor="white"
        fontWeight="bold"
      >
        {data.type ? data.type.split(" ")[0] : "Sensor"}
      </Text>

      {/* Popup */}
      {showPopup && (
        <Html position={[0, 2.2, 0]} center zIndexRange={[100, 0]}>
          <div style={{ 
            background: 'white', 
            color: '#1f2937', 
            padding: '8px', 
            borderRadius:'6px', 
            minWidth: '140px',
            textAlign: 'center', 
            border: `2px solid ${color}`, 
            boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
            fontFamily: 'sans-serif'
          }}>
            <div style={{fontWeight:'bold', fontSize:'11px', color:'#6b7280', marginBottom:'2px'}}>{data.name}</div>
            
            <div style={{fontSize:'20px', fontWeight:'bold', margin:'2px 0', color:'#111827'}}>
                {formatValue(data.value)}
            </div>
            
            <div style={{fontSize:'9px', color:'#9ca3af', marginBottom:'6px'}}>{data.location_name}</div>
            
            {isEditMode && (
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
      
      {indexOffset > 0 && (
          <mesh position={[-indexOffset * 1.5, -data.position.y/2, -indexOffset * 0.5]}>
             <cylinderGeometry args={[0.02, 0.02, data.position.y, 4]} />
             <meshStandardMaterial color={color} opacity={0.6} transparent />
          </mesh>
      )}
    </group>
  );
};

// --- ANA SAHNE ---
export const FactoryScene = () => {
  const [sensors, setSensors] = useState<TwinSensor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const controlsRef = useRef<any>(null); 

  const { token, role, userCompany } = getQueryParams();
  
  // Şirket adını URL'den al (Normal kullanıcılar için varsayılan olarak bu kullanılacak ama request'e eklenmeyecek)
  const [selectedCompany, setSelectedCompany] = useState<string>(userCompany || "");

  if (!token) {
    return (
        <div style={{height: '100vh', display:'flex', alignItems:'center', justifyContent:'center', color:'white', flexDirection:'column', background:'#f3f4f6'}}>
            <h1 style={{fontSize:'2rem', color:'#1f2937'}}>⛔ Access Denied</h1>
            <p style={{color:'#4b5563'}}>Please log in via the Dashboard.</p>
        </div>
    )
  }

  const KeyboardMapMover = () => {
    const { camera } = useThree();
    const [keys, setKeys] = useState<{ [key: string]: boolean }>({});

    useEffect(() => {
      const down = (e: KeyboardEvent) => setKeys(k => ({ ...k, [e.code]: true }));
      const up = (e: KeyboardEvent) => setKeys(k => ({ ...k, [e.code]: false }));
      window.addEventListener('keydown', down);
      window.addEventListener('keyup', up);
      return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); }
    }, []);

    useFrame((state, delta) => {
        if (!controlsRef.current) return;
        const speed = (keys['ShiftLeft'] || keys['ShiftRight']) ? 60 : 25; 
        const step = speed * delta;
        
        if (keys['ArrowUp'] || keys['KeyW']) {
            controlsRef.current.target.z -= step;
            camera.position.z -= step;
        }
        if (keys['ArrowDown'] || keys['KeyS']) {
            controlsRef.current.target.z += step;
            camera.position.z += step;
        }
        if (keys['ArrowLeft'] || keys['KeyA']) {
            controlsRef.current.target.x -= step;
            camera.position.x -= step;
        }
        if (keys['ArrowRight'] || keys['KeyD']) {
            controlsRef.current.target.x += step;
            camera.position.x += step;
        }
    });
    return null;
  };

  useEffect(() => {
    if (role === 'superadmin') {
        axios.get('http://127.0.0.1:8001/api/companies').then(res => {
            setCompanies(res.data);
            if (!userCompany && res.data.length > 0) setSelectedCompany(res.data[0].name);
            else if (userCompany) setSelectedCompany(userCompany);
        });
    } else {
        if (userCompany) setSelectedCompany(userCompany);
    }
  }, [role, userCompany]);

  useEffect(() => {
    if(selectedCompany) {
        axios.get('http://127.0.0.1:8001/api/layout-slots', { params: { company: selectedCompany } })
             .then(res => setAvailableSlots(res.data));
    }
  }, [selectedCompany]);

  // --- KRİTİK DÜZELTME BURADA ---
  const fetchSensors = async () => {
    if (!token) return; 
    try {
      const params: any = {};
      
      // SADECE SUPERADMIN İSE ŞİRKET İSMİNİ GÖNDER
      // Diğer rollerde (Manager, Viewer vb.) params boş gider, backend token'dan çözer.
      if (role === 'superadmin' && selectedCompany) {
          params.company = selectedCompany;
      }
      
      const res = await axios.get(`http://127.0.0.1:8001/api/digital-twin-data`, {
        headers: { 'Authorization': `Bearer ${token}` },
        params: params 
      });
      setSensors(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    fetchSensors();
    const interval = setInterval(fetchSensors, 5000); 
    return () => clearInterval(interval);
  }, [selectedCompany, token]);

  const handleUpdateLocation = async (sensorId: string, newLocation: string) => {
    try {
        await axios.post('http://127.0.0.1:8001/api/map-sensor', 
            { sensor_id: sensorId, location_key: newLocation },
            { headers: { 'Authorization': `Bearer ${token}` } } 
        );
        fetchSensors(); 
    } catch (e) { alert("Hata oluştu."); }
  };

  const locationCounts: Record<string, number> = {};
  const getOffset = (locName: string) => {
     if (!locationCounts[locName]) locationCounts[locName] = 0;
     const offset = locationCounts[locName];
     locationCounts[locName]++;
     return offset;
  };

  return (
    <div style={{ width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', background: '#0b1121' }}>
      
      <div style={{ background: '#0b1121', padding: '15px 25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #1e293b', zIndex: 10, boxShadow: '0 4px 10px rgba(0,0,0,0.5)'}}>
        <h2 style={{ color: 'white', margin: 0, fontSize: '20px', display:'flex', alignItems:'center', gap:'10px', fontFamily:'sans-serif' }}>
          🏭 AirSense Digital Twin <span style={{fontSize:'12px', background:'#1e293b', padding:'2px 8px', borderRadius:'10px', color:'#94a3b8'}}>{selectedCompany}</span>
        </h2>
        <div style={{display:'flex', gap:'10px'}}>
          <button 
            onClick={() => setIsEditMode(!isEditMode)}
            style={{ background: isEditMode ? '#2563eb' : '#1e293b', color: 'white', border: '1px solid #334155', padding: '8px 20px', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold', transition:'all 0.2s' }}>
            {isEditMode ? "💾 SAVE & EXIT" : "✏️ EDIT"}
          </button>
          
          {role === 'superadmin' && (
              <select value={selectedCompany} onChange={(e) => setSelectedCompany(e.target.value)} style={{ background: '#1e293b', color: 'white', padding: '8px 12px', borderRadius: '6px', border: '1px solid #334155', cursor:'pointer' }}>
                {companies.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
          )}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative' }}>
        <Canvas shadows camera={{ position: [20, 25, 30], fov: 45 }}>
          
          <color attach="background" args={['#e5e7eb']} /> 
          <fog attach="fog" args={['#e5e7eb', 40, 180]} /> 

          <hemisphereLight intensity={0.8} groundColor="#d1d5db" color="#ffffff" />
          <directionalLight 
            position={[50, 80, 50]} 
            intensity={1.5} 
            castShadow 
            shadow-mapSize-width={2048} 
            shadow-mapSize-height={2048}
            shadow-bias={-0.0001}
          />
          <pointLight position={[0, 18, 0]} intensity={0.5} distance={100} />

          <KeyboardMapMover />

          <MapControls 
              ref={controlsRef} 
              screenSpacePanning={true} 
              dampingFactor={0.05}      
              enableDamping={true}
              minDistance={5}           
              maxDistance={90}          
              maxPolarAngle={Math.PI / 2.1} 
          />
          
          <DetailedBrightFactory />
          <ContactShadows resolution={1024} scale={150} blur={3} opacity={0.4} far={10} color="#000000" />

          {sensors.map(s => {
             const offset = getOffset(s.location_name); 
             return <SensorNode key={s.id} data={s} availableSlots={availableSlots} onUpdateLocation={handleUpdateLocation} isEditMode={isEditMode} indexOffset={offset} />;
          })}
        </Canvas>
        
        <div style={{
            position:'absolute', bottom:'30px', left:'30px', 
            background:'rgba(11, 17, 33, 0.8)', color:'#e5e7eb', padding:'15px', 
            borderRadius:'8px', fontSize:'12px', border:'1px solid #1e293b', backdropFilter:'blur(5px)'
        }}>
            🎮 <b>Controls:</b><br/>
            • <b>Left Click + Drag:</b> Pan Map<br/>
            • <b>Arrow Keys / WASD:</b> Move Forward/Back/Right/Left<br/>
            • <b>Right Click + Drag:</b> Rotate Angle<br/>
            • <b>Shift:</b> Move Fast
        </div>

        {isEditMode && (
            <div style={{
                position:'absolute', bottom:'30px', left:'50%', transform:'translateX(-50%)', 
                background:'rgba(15, 23, 42, 0.95)', color:'white', padding:'10px 30px', 
                borderRadius:'30px', fontSize:'14px', fontWeight:'bold', 
                boxShadow:'0 10px 25px rgba(0,0,0, 0.5)',
                border:'2px solid #334155'
            }}>
                ✏️ EDIT MODE ACTIVE
            </div>
        )}
      </div>
    </div>
  );
};