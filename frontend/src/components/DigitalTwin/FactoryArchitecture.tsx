import * as THREE from 'three';



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

  const windowWidth = 40;
  const windowHeight = 10;

  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial color={floorColor} roughness={0.6} metalness={0.1} />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, wallHeight, 0]} receiveShadow>
        <planeGeometry args={[floorSize, floorSize]} />
        <meshStandardMaterial color={ceilingColor} roughness={0.9} side={THREE.DoubleSide}/>
      </mesh>
      
      {/* Side Walls */}
      <mesh position={[-floorSize / 2, wallHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, floorSize]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>
      <mesh position={[floorSize / 2, wallHeight / 2, 0]} receiveShadow>
        <boxGeometry args={[wallThickness, wallHeight, floorSize]} />
        <meshStandardMaterial color={wallColor} />
      </mesh>

      {/* BACK WALL AND WINDOW DESIGN */}
      <group position={[0, 0, -floorSize / 2]}>
        <mesh position={[0, (wallHeight + (windowHeight + 6)) / 2, 0]} receiveShadow>
          <boxGeometry args={[floorSize, wallHeight - (windowHeight + 6), wallThickness]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>
        <mesh position={[0, 3, 0]} receiveShadow>
          <boxGeometry args={[floorSize, 6, wallThickness]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>
        <mesh position={[-(floorSize + windowWidth) / 4, (windowHeight + 6) / 2 + 3, 0]} receiveShadow>
          <boxGeometry args={[(floorSize - windowWidth) / 2, windowHeight, wallThickness]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>
        <mesh position={[(floorSize + windowWidth) / 4, (windowHeight + 6) / 2 + 3, 0]} receiveShadow>
          <boxGeometry args={[(floorSize - windowWidth) / 2, windowHeight, wallThickness]} />
          <meshStandardMaterial color={wallColor} />
        </mesh>

        {/* GLASS WINDOW */}
        <group position={[0, windowHeight / 2 + 6, 0]}>
          <mesh>
            <boxGeometry args={[windowWidth, windowHeight, 0.2]} />
            <meshStandardMaterial color="#a5f3fc" transparent opacity={0.4} metalness={0.9} roughness={0.1} />
          </mesh>
          {/* Window Frames */}
          <mesh position={[0, windowHeight / 2, 0]}>
            <boxGeometry args={[windowWidth + 0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={metalColor} />
          </mesh>
          <mesh position={[0, -windowHeight / 2, 0]}>
            <boxGeometry args={[windowWidth + 0.5, 0.5, 0.5]} />
            <meshStandardMaterial color={metalColor} />
          </mesh>
          <mesh position={[windowWidth / 2, 0, 0]}>
            <boxGeometry args={[0.5, windowHeight, 0.5]} />
            <meshStandardMaterial color={metalColor} />
          </mesh>
          <mesh position={[-windowWidth / 2, 0, 0]}>
            <boxGeometry args={[0.5, windowHeight, 0.5]} />
            <meshStandardMaterial color={metalColor} />
          </mesh>
          {/* Vertical Mullions */}
          {[-1, 0, 1].map((i) => (
            <mesh key={`window-divider-${i}`} position={[(windowWidth / 4) * i, 0, 0]}>
              <boxGeometry args={[0.3, windowHeight, 0.4]} />
              <meshStandardMaterial color={metalColor} />
            </mesh>
          ))}
        </group>
      </group>

      {/* FRONT WALL AND FACTORY DOOR */}
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

        <group position={[0, 0, 0.5]}>
          {[0, 1, 2, 3, 4].map((i) => (
            <mesh key={`panel-${i}`} position={[0, (doorHeight / 5) * i + (doorHeight / 10), 0]} castShadow>
              <boxGeometry args={[doorWidth - 0.2, (doorHeight / 5) - 0.1, 0.4]} />
              <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
            </mesh>
          ))}
          <mesh position={[doorWidth / 2, doorHeight / 2, -0.2]}>
            <boxGeometry args={[0.5, doorHeight, 0.6]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} />
          </mesh>
          <mesh position={[-doorWidth / 2, doorHeight / 2, -0.2]}>
            <boxGeometry args={[0.5, doorHeight, 0.6]} />
            <meshStandardMaterial color="#1f2937" metalness={0.8} />
          </mesh>
          <mesh position={[0, doorHeight, -0.1]}>
            <boxGeometry args={[doorWidth + 1, 1, 1]} />
            <meshStandardMaterial color="#4b5563" metalness={0.7} />
          </mesh>
          <group position={[doorWidth / 2 + 1, 4, 0]}>
            <mesh castShadow><boxGeometry args={[0.6, 1, 0.3]} /><meshStandardMaterial color="#d1d5db" /></mesh>
            <mesh position={[0, 0.2, 0.16]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#ef4444" emissive="#ef4444" /></mesh>
            <mesh position={[0, -0.2, 0.16]}><sphereGeometry args={[0.1, 8, 8]} /><meshStandardMaterial color="#22c55e" emissive="#22c55e" /></mesh>
          </group>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 2]}>
            <planeGeometry args={[doorWidth + 4, 1.5]} />
            <meshStandardMaterial color="#fbbf24" roughness={0.8} />
          </mesh>
          {[-8, -4, 0, 4, 8].map((x, idx) => (
            <mesh key={`stripe-${idx}`} rotation={[-Math.PI / 2, 0, Math.PI / 4]} position={[x, 0.06, 2]}>
              <planeGeometry args={[0.3, 2.2]} />
              <meshStandardMaterial color="#000000" />
            </mesh>
          ))}
        </group>
      </group>

      {/* Columns */}
      {[-40, 40].map((x) => ( [-30, 0, 30].map((z) => (
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
      ))))}

      {/* Roof Trusses */}
      {[-30, -10, 10, 30].map((zPos) => (
        <group key={`truss-${zPos}`} position={[0, wallHeight - 1.5, zPos]}>
          <mesh castShadow><boxGeometry args={[floorSize, 0.8, 0.8]} /><meshStandardMaterial color={metalColor} metalness={0.7} roughness={0.2} /></mesh>
          {[-40, -20, 0, 20, 40].map(xPos => ( 
            <mesh key={`supp-${xPos}`} position={[xPos, 0.5, 0]} rotation={[0, 0, Math.PI / 4]}>
              <boxGeometry args={[3, 0.4, 0.4]} />
              <meshStandardMaterial color={metalColor} />
            </mesh> 
          ))}
        </group>
      ))}

      {/* Pipes */}
      <mesh position={[-floorSize / 2 + 4, wallHeight - 4, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
        <cylinderGeometry args={[2, 2, floorSize, 16]} />
        <meshStandardMaterial color="#cbd5e1" metalness={0.5} roughness={0.4} />
      </mesh>
      
      {/* Storage */}
      <group position={[-45, 2, -45]}>
        <mesh position={[0, 0, 0]} castShadow><boxGeometry args={[5, 4, 5]} /><meshStandardMaterial color="#b45309" /></mesh>
        <mesh position={[6, -1, 0]} castShadow><boxGeometry args={[4, 2, 4]} /><meshStandardMaterial color="#d97706" /></mesh>
      </group>
    </group>
  );
};
