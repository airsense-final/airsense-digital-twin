import React from 'react';
import * as THREE from 'three';

// İşçi Bileşeni (Aynen korundu)
// İşçi Bileşeni (Tip hatası düzeltilmiş hali)
const Worker = ({ 
  position, 
  rotation = [0, 0, 0] 
}: { 
  position: [number, number, number], 
  rotation?: [number, number, number] | any 
}) => (
  <group position={position} rotation={rotation}>
    {/* Geri kalan mesh kodların aynı kalsın... */}
    <mesh position={[-0.25, 1, 0]} castShadow>
      <boxGeometry args={[0.4, 2, 0.4]} />
      <meshStandardMaterial color="#1e3a8a" />
    </mesh>
    <mesh position={[0.25, 1, 0]} castShadow>
      <boxGeometry args={[0.4, 2, 0.4]} />
      <meshStandardMaterial color="#1e3a8a" />
    </mesh>
    <mesh position={[0, 2.8, 0]} castShadow>
      <boxGeometry args={[0.9, 1.6, 0.5]} />
      <meshStandardMaterial color="#f97316" />
    </mesh>
    <mesh position={[0, 3, 0.26]}>
      <boxGeometry args={[0.9, 0.1, 0.05]} />
      <meshStandardMaterial color="#e5e7eb" emissive="#ffffff" emissiveIntensity={0.2} />
    </mesh>
    <mesh position={[0, 2.6, 0.26]}>
      <boxGeometry args={[0.9, 0.1, 0.05]} />
      <meshStandardMaterial color="#e5e7eb" emissive="#ffffff" emissiveIntensity={0.2} />
    </mesh>
    <mesh position={[-0.6, 2.8, 0]} castShadow>
      <boxGeometry args={[0.3, 1.4, 0.3]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
    <mesh position={[0.6, 2.8, 0]} castShadow>
      <boxGeometry args={[0.3, 1.4, 0.3]} />
      <meshStandardMaterial color="#334155" />
    </mesh>
    <mesh position={[0, 3.8, 0]} castShadow>
      <sphereGeometry args={[0.35, 16, 16]} />
      <meshStandardMaterial color="#ffdbac" />
    </mesh>
    <mesh position={[0, 4, 0]} castShadow>
      <sphereGeometry args={[0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
      <meshStandardMaterial color="#fbbf24" metalness={0.5} roughness={0.2} />
    </mesh>
  </group>
);

export const FactoryArchitecture = () => {
  const floorSize = 100;
  const wallHeight = 22; 
  const wallThickness = 2;
  const wallColor = "#f3f4f6"; 
  const floorColor = "#9ca3af"; 
  const ceilingColor = "#e5e7eb"; 
  const metalColor = "#4b5563"; 

  const doorWidth = 15;
  const doorHeight = 12;

  return (
    <group>
      {/* Zemin */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial color={floorColor} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Tavan */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallHeight, 0]} receiveShadow>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial color={ceilingColor} roughness={0.9} side={THREE.DoubleSide}/>
      </mesh>
      
      {/* Yan ve Arka Duvarlar */}
      <mesh position={[0, wallHeight / 2, -floorSize / 2]} receiveShadow><boxGeometry args={[floorSize, wallHeight, wallThickness]} /><meshStandardMaterial color={wallColor} /></mesh>
      <mesh position={[-floorSize / 2, wallHeight / 2, 0]} receiveShadow><boxGeometry args={[wallThickness, wallHeight, floorSize]} /><meshStandardMaterial color={wallColor} /></mesh>
      <mesh position={[floorSize / 2, wallHeight / 2, 0]} receiveShadow><boxGeometry args={[wallThickness, wallHeight, floorSize]} /><meshStandardMaterial color={wallColor} /></mesh>

      {/* ÖN DUVAR VE GELİŞTİRİLMİŞ FABRİKA KAPISI */}
      <group position={[0, 0, floorSize / 2]}>
        <mesh position={[0, (wallHeight + doorHeight) / 2, 0]} receiveShadow>
          <boxGeometry args={[floorSize, wallHeight - doorHeight, wallThickness]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>
        <mesh position={[-(floorSize + doorWidth) / 4, doorHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[(floorSize - doorWidth) / 2, doorHeight, wallThickness]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>
        <mesh position={[(floorSize + doorWidth) / 4, doorHeight / 2, 0]} receiveShadow>
          <boxGeometry args={[(floorSize - doorWidth) / 2, doorHeight, wallThickness]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>

        {/* GERÇEKÇİ KAPI GRUBU */}
        <group position={[0, 0, 0.5]}>
          {/* Kapı Panelleri (Seksiyonel Tasarım) */}
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={`panel-${i}`} position={[0, (doorHeight / 5) * i + (doorHeight / 10), 0]} castShadow>
              <boxGeometry args={[doorWidth - 0.2, (doorHeight / 5) - 0.1, 0.4]} />
              <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
              
              {/* Kapı Pencereleri (Sadece orta panelde) */}
              {i === 2 && [-4, -1.5, 1.5, 4].map((xPos, idx) => (
                <mesh key={`win-${idx}`} position={[xPos, 0, 0.21]}>
                  <boxGeometry args={[1.5, 0.8, 0.05]} />
                  <meshStandardMaterial color="#94a3b8" emissive="#1e293b" metalness={0.9} roughness={0.1} />
                </mesh>
              ))}
            </mesh>
          ))}

          {/* Yan Raylar/Çerçeve */}
          <mesh position={[doorWidth / 2, doorHeight / 2, -0.2]}>
            <boxGeometry args={[0.5, doorHeight, 0.6]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} />
          </mesh>
          <mesh position={[-doorWidth / 2, doorHeight / 2, -0.2]}>
            <boxGeometry args={[0.5, doorHeight, 0.6]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} />
          </mesh>

          {/* Üst Mekanizma Kutusu */}
          <mesh position={[0, doorHeight, -0.1]}>
            <boxGeometry args={[doorWidth + 1, 1, 1]} />
            <meshStandardMaterial color="#4b5563" metalness={0.7} />
          </mesh>

          {/* Kontrol Paneli (Kapının sağında) */}
          <group position={[doorWidth / 2 + 1, 4, 0]}>
            <mesh castShadow>
              <boxGeometry args={[0.6, 1, 0.3]} />
              <meshStandardMaterial color="#d1d5db" />
            </mesh>
            <mesh position={[0, 0.2, 0.16]}>
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshStandardMaterial color="#ef4444" emissive="#ef4444" /> {/* Acil Stop */}
            </mesh>
            <mesh position={[0, -0.2, 0.16]}>
              <sphereGeometry args={[0.1, 8, 8]} />
              <meshStandardMaterial color="#22c55e" emissive="#22c55e" /> {/* Açma Düğmesi */}
            </mesh>
          </group>

          {/* Güvenlik Şeritleri (Zeminde) */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 2]}>
            <planeGeometry args={[doorWidth + 4, 1.5]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.8} />
          </mesh>
          {/* Siyah Çizgiler (Zemin uyarısı için) */}
          {[-8, -4, 0, 4, 8].map((x, idx) => (
            <mesh key={`stripe-${idx}`} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[x, 0.06, 2]}>
               <planeGeometry args={[0.3, 2.2]} />
               <meshStandardMaterial color="#000000" />
            </mesh>
          ))}
        </group>
      </group>

      {/* İŞÇİLERİN YERLEŞTİRİLMESİ (Aynen korundu) */}
      <Worker position={[-10, 0, -20]} rotation={[0, Math.PI / 4, 0]} />
      <Worker position={[35, 0, 10]} rotation={[0, -Math.PI / 2, 0]} />
      <Worker position={[-38, 0, -40]} rotation={[0, Math.PI / 3, 0]} />
      <Worker position={[5, 0, 42]} rotation={[0, Math.PI, 0]} />

      {/* Kolonlar (Aynen korundu) */}
      {[-40, 40].map((x) => ( [-30, 0, 30].map((z) => (
            <group key={`col-${x}-${z}`} position={[x, wallHeight / 2, z]}>
               <mesh castShadow receiveShadow><boxGeometry args={[2.5, wallHeight, 2.5]} /><meshStandardMaterial color={metalColor} metalness={0.6} roughness={0.3} /></mesh>
               <mesh position={[0, -wallHeight/2 + 1, 0]}><boxGeometry args={[3, 2, 3]} /><meshStandardMaterial color="#6b7280" /></mesh>
            </group>
      ))))}

      {/* Tavan Makasları (Aynen korundu) */}
      {[-30, -10, 10, 30].map((zPos) => (
        <group key={`truss-${zPos}`} position={[0, wallHeight - 1.5, zPos]}>
            <mesh castShadow><boxGeometry args={[floorSize, 0.8, 0.8]} /><meshStandardMaterial color={metalColor} metalness={0.7} roughness={0.2} /></mesh>
             {[-40, -20, 0, 20, 40].map(xPos => ( <mesh key={`supp-${xPos}`} position={[xPos, 0.5, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[3, 0.4, 0.4]} /><meshStandardMaterial color={metalColor} /></mesh> ))}
        </group>
      ))}

      {/* Borular (Aynen korundu) */}
      <mesh position={[-floorSize / 2 + 4, wallHeight - 4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[2, 2, floorSize, 16]} /><meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} /></mesh>
      
      {/* Depo (Aynen korundu) */}
      <group position={[-45, 2, -45]}>
        <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[5, 4, 5]} /><meshStandardMaterial color="#b45309" /></mesh>
        <mesh position={[6, -1, 0]} castShadow><boxGeometry args={[4, 2, 4]} /><meshStandardMaterial color="#d97706" /></mesh>
      </group>
    </group>
  );
};