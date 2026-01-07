import React from 'react';
import * as THREE from 'three';

export const FactoryArchitecture = () => {
  const floorSize = 100;
  const wallHeight = 22; 
  const wallThickness = 2;
  const wallColor = "#f3f4f6"; 
  const floorColor = "#9ca3af"; 
  const ceilingColor = "#e5e7eb"; 
  const metalColor = "#4b5563"; 

  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial color={floorColor} roughness={0.6} metalness={0.1} />
      </mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallHeight, 0]} receiveShadow>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial color={ceilingColor} roughness={0.9} side={THREE.DoubleSide}/>
      </mesh>
      
      {/* Duvarlar */}
      <mesh position={[0, wallHeight / 2, -floorSize / 2]} receiveShadow><boxGeometry args={[floorSize, wallHeight, wallThickness]} /><meshStandardMaterial color={wallColor} /></mesh>
      <mesh position={[0, wallHeight / 2, floorSize / 2]} receiveShadow><boxGeometry args={[floorSize, wallHeight, wallThickness]} /><meshStandardMaterial color={wallColor} /></mesh>
      <mesh position={[-floorSize / 2, wallHeight / 2, 0]} receiveShadow><boxGeometry args={[wallThickness, wallHeight, floorSize]} /><meshStandardMaterial color={wallColor} /></mesh>
      <mesh position={[floorSize / 2, wallHeight / 2, 0]} receiveShadow><boxGeometry args={[wallThickness, wallHeight, floorSize]} /><meshStandardMaterial color={wallColor} /></mesh>

      {/* Kolonlar */}
      {[-40, 40].map((x) => ( [-30, 0, 30].map((z) => (
            <group key={`col-${x}-${z}`} position={[x, wallHeight / 2, z]}>
               <mesh castShadow receiveShadow><boxGeometry args={[2.5, wallHeight, 2.5]} /><meshStandardMaterial color={metalColor} metalness={0.6} roughness={0.3} /></mesh>
               <mesh position={[0, -wallHeight/2 + 1, 0]}><boxGeometry args={[3, 2, 3]} /><meshStandardMaterial color="#6b7280" /></mesh>
            </group>
      ))))}

      {/* Tavan Makasları */}
      {[-30, -10, 10, 30].map((zPos) => (
        <group key={`truss-${zPos}`} position={[0, wallHeight - 1.5, zPos]}>
            <mesh castShadow><boxGeometry args={[floorSize, 0.8, 0.8]} /><meshStandardMaterial color={metalColor} metalness={0.7} roughness={0.2} /></mesh>
             {[-40, -20, 0, 20, 40].map(xPos => ( <mesh key={`supp-${xPos}`} position={[xPos, 0.5, 0]} rotation={[0, 0, Math.PI / 4]}><boxGeometry args={[3, 0.4, 0.4]} /><meshStandardMaterial color={metalColor} /></mesh> ))}
        </group>
      ))}

      {/* Borular */}
      <mesh position={[-floorSize / 2 + 4, wallHeight - 4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow><cylinderGeometry args={[2, 2, floorSize, 16]} /><meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} /></mesh>
      
      {/* Depo */}
      <group position={[-45, 2, -45]}><mesh position={[0, 0, 0]} castShadow><boxGeometry args={[5, 4, 5]} /><meshStandardMaterial color="#b45309" /></mesh><mesh position={[6, -1, 0]} castShadow><boxGeometry args={[4, 2, 4]} /><meshStandardMaterial color="#d97706" /></mesh></group>
    </group>
  );
};