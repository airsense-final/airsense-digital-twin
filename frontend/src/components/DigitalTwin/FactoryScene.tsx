import React, { useEffect, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import axios from 'axios';

// --- TİP TANIMLAMALARI ---
interface TwinSensor { id: string; type: string; value: number; position: {x:number, y:number, z:number}; }
interface Company { id: number; name: string; }

// --- 3D KUTU BİLEŞENİ (Sensör) ---
const SensorNode = ({ data }: { data: TwinSensor }) => {
  // Alarm Mantığı: Değer 100'ü geçerse Kırmızı, yoksa Yeşil
  const color = data.value > 100 ? "#ef4444" : "#22c55e"; 
  
  return (
    <group position={[data.position.x, data.position.y, data.position.z]}>
      {/* Kutu */}
      <mesh>
        <boxGeometry args={[1.5, 1.5, 1.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      
      {/* Etiket (Sensör Adı ve Değeri) */}
      <Html distanceFactor={15}>
        <div style={{ 
          background: 'rgba(0,0,0,0.8)', 
          color: 'white', 
          padding: '6px', 
          borderRadius:'4px', 
          fontSize: '11px', 
          fontFamily: 'sans-serif',
          width: '90px',
          textAlign: 'center',
          border: data.value > 100 ? '1px solid red' : '1px solid #444'
        }}>
          <strong style={{display:'block', marginBottom:'2px'}}>{data.type}</strong>
          <span style={{fontSize:'14px', fontWeight:'bold'}}>{data.value}</span>
        </div>
      </Html>
    </group>
  );
};

// --- ANA SAHNE ---
export const FactoryScene = () => {
  const [sensors, setSensors] = useState<TwinSensor[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompany, setSelectedCompany] = useState<string>("");

  // Kendi sistemindeki Token anahtarını buraya yaz!
  // Eğer localStorage'da 'token' ise 'token' yaz. 'access_token' ise onu yaz.
  const token = localStorage.getItem('access_token') || localStorage.getItem('token'); 

  // 1. GÖREV (Task 5): Şirket Listesini Çek ve Dropdown'ı Doldur
  useEffect(() => {
    // Python Portu: 8001
    axios.get('http://127.0.0.1:8001/api/companies')
      .then(res => {
         setCompanies(res.data);
         // Listede şirket varsa ilkini otomatik seç (Kullanıcı boş ekran görmesin)
         if(res.data.length > 0) {
           setSelectedCompany(res.data[0].name);
         }
      })
      .catch(e => console.error("❌ Şirket listesi çekilemedi:", e));
  }, []);

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
      
      {/* --- ÜST PANEL (TASK 5: Şirket Seçici) --- */}
      <div style={{ 
        background: '#1f2937', 
        padding: '15px 20px', 
        borderRadius: '12px', 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between',
        boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
        border: '1px solid #374151'
      }}>
        <h2 style={{ color: 'white', margin: 0, fontSize: '18px', fontFamily: 'sans-serif' }}>
          🏭 Digital Twin Monitor
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <label style={{ color: '#9ca3af', fontSize: '14px', fontFamily: 'sans-serif' }}>Şirket Seç:</label>
          <select 
            value={selectedCompany}
            onChange={(e) => setSelectedCompany(e.target.value)}
            style={{
              background: '#374151',
              color: 'white',
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid #4b5563',
              fontSize: '14px',
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {/* Eğer hiç şirket yoksa */}
            {companies.length === 0 && <option disabled>Yükleniyor...</option>}
            
            {/* Şirketleri Listele */}
            {companies.map(c => (
              <option key={c.id} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* --- ALT PANEL (3D Sahne - Task 6'da detaylanacak) --- */}
      <div style={{ 
        width: '100%', 
        height: '600px', 
        background: '#111827', 
        borderRadius: '12px', 
        overflow: 'hidden', 
        position: 'relative',
        boxShadow: '0 10px 15px rgba(0,0,0,0.5)',
        border: '1px solid #374151'
      }}>
        <Canvas camera={{ position: [20, 30, 30], fov: 45 }}>
          <ambientLight intensity={0.5} />
          <pointLight position={[10, 20, 10]} intensity={1} />
          <OrbitControls maxPolarAngle={Math.PI / 2.1} />
          
          {/* Zemin */}
          <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -0.5, 0]}>
             <planeGeometry args={[60, 60]} />
             <meshStandardMaterial color="#374151" />
             <gridHelper args={[60, 30, "#6b7280", "#4b5563"]} rotation={[-Math.PI/2, 0, 0]} />
          </mesh>

          {/* Sensörler (Şimdilik boş, Task 6-7 de dolacak) */}
          {sensors.map(s => <SensorNode key={s.id} data={s} />)}

        </Canvas>
        
        {/* Sol Alt Bilgi */}
        <div style={{ position: 'absolute', bottom: '15px', left: '20px', color: '#9ca3af', fontSize: '12px', fontFamily: 'sans-serif' }}>
          Viewing Data for: <span style={{ color: 'white', fontWeight: 'bold' }}>{selectedCompany || "None"}</span>
        </div>
      </div>
    </div>
  );
};