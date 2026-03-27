import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";

const FLOOR_LIMIT = 48; // Expanded to push doors to the walls (outward)

const EXITS = [
  { pos: new THREE.Vector3(-FLOOR_LIMIT, 0, 0), rot: [0, Math.PI / 2, 0] }, // Left
  { pos: new THREE.Vector3(FLOOR_LIMIT, 0, 0), rot: [0, -Math.PI / 2, 0] }, // Right
];

interface CrowdSimulationProps {
  isEmergency: boolean;
  hazardPosition: { x: number; y: number; z: number } | null;
  onStatsUpdate: (stats: { alive: number; safe: number; injured: number; dead: number }) => void;
  agentCount: number;
  resetTrigger: number; // NEW: Trigger for reset button
}

export const CrowdSimulation = ({ isEmergency, hazardPosition, onStatsUpdate, agentCount, resetTrigger }: CrowdSimulationProps) => {
  
  // Dynamically create agents based on count and resetTrigger
  const agents = useMemo(() => {
    return Array.from({ length: agentCount }).map((_, i) => ({
      id: i,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * (FLOOR_LIMIT - 5) * 2, // Prevent spawning right at the doors
        0, 
        (Math.random() - 0.5) * (FLOOR_LIMIT - 5) * 2
      ),
      target: new THREE.Vector3(),
      status: "idle" as "idle" | "evacuating" | "injured" | "dead" | "safe",
      speed: 0.25 + Math.random() * 0.15, // Running speed
    }));
  }, [agentCount, resetTrigger]); // Everyone respawns when reset button is pressed

  const groupRefs = useRef<THREE.Group[]>([]);
  let lastUpdate = 0;

  useFrame(({ clock }) => {
    let aliveCount = 0;
    let safeCount = 0;
    let injuredCount = 0;
    let deadCount = 0;

    const hazVec = hazardPosition ? new THREE.Vector3(hazardPosition.x, 0, hazardPosition.z) : null;

    agents.forEach((agent, i) => {
      const agentGroup = groupRefs.current[i];
      if (!agentGroup) return;

      if (agent.status === "dead" || agent.status === "safe") {
        if (agent.status === "dead") deadCount++;
        if (agent.status === "safe") safeCount++;
        return; 
      }

      if (isEmergency && hazVec) {
        const distToHazard = agent.position.distanceTo(hazVec);
        
        if (distToHazard < 10) {
          agent.status = "dead";
          agent.speed = 0;
          agentGroup.rotation.x = Math.PI / 2; // Falling down
          agentGroup.position.y = 0.5;
        } else if (distToHazard < 22) {
          agent.status = "injured";
          agent.speed = 0.05; // Injured flee slowly by limping
        } else if (agent.status !== "injured") {
          agent.status = "evacuating";
        }
      } else if (!isEmergency && agent.status !== "idle") {
        agent.status = "idle";
        agent.speed = 0.25 + Math.random() * 0.15;
        agentGroup.rotation.x = 0; // Stand up
      }

      if (agent.status === "evacuating" || agent.status === "injured") {
        let nearestExit = EXITS[0].pos;
        let minDist = Infinity;
        EXITS.forEach((exit) => {
          const d = agent.position.distanceTo(exit.pos);
          if (d < minDist) {
            minDist = d;
            nearestExit = exit.pos;
          }
        });

        if (minDist < 4) {
          agent.status = "safe";
          agentGroup.visible = false; 
        } else {
          const direction = nearestExit.clone().sub(agent.position).normalize();
          agent.position.add(direction.multiplyScalar(agent.speed));
          agentGroup.lookAt(agent.position.clone().add(direction));
        }
      } else if (agent.status === "idle") {
        agentGroup.visible = true; 
        if (Math.random() < 0.01) {
          agent.target.set(
            (Math.random() - 0.5) * (FLOOR_LIMIT - 5) * 2,
            0,
            (Math.random() - 0.5) * (FLOOR_LIMIT - 5) * 2
          );
        }
        if (agent.position.distanceTo(agent.target) > 1) {
          const direction = agent.target.clone().sub(agent.position).normalize();
          agent.position.add(direction.multiplyScalar(0.04)); // Normal wandering speed
          agentGroup.lookAt(agent.position.clone().add(direction)); 
        }
      }

      agentGroup.position.copy(agent.position);
      if (agent.status === "dead") agentGroup.position.y = 0.5; 
      
      // Update Body Color (Body mesh selected by name="body")
      const bodyMesh = agentGroup.getObjectByName("body") as THREE.Mesh;
      if (bodyMesh) {
        const mat = bodyMesh.material as THREE.MeshStandardMaterial;
        if (agent.status === "dead") mat.color.setHex(0x111111); // Black
        else if (agent.status === "injured") mat.color.setHex(0xef4444); // Red
        else if (agent.status === "evacuating") mat.color.setHex(0xeab308); // Yellow
        else mat.color.setHex(0xf97316); // Normal Body Color (Orange)
      }

      if (agent.status === "idle" || agent.status === "evacuating") aliveCount++;
      if (agent.status === "injured") injuredCount++;
    });

    if (clock.elapsedTime - lastUpdate > 0.5) {
      onStatsUpdate({ alive: aliveCount, safe: safeCount, injured: injuredCount, dead: deadCount });
      lastUpdate = clock.elapsedTime;
    }
  });

  return (
    <group>
      {/* 3D REALISTIC EMERGENCY EXIT DOORS */}
      {EXITS.map((exit, idx) => (
        <group key={`exit-${idx}`} position={exit.pos} rotation={exit.rot as any}>
           {/* Door Frame */}
           <mesh position={[0, 3, 0]}>
             <boxGeometry args={[4.4, 6, 0.4]} />
             <meshStandardMaterial color="#334155" />
           </mesh>
           {/* Left Glass Door Leaf */}
           <mesh position={[-1.05, 3, 0]}>
             <boxGeometry args={[2, 5.8, 0.2]} />
             <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} transparent opacity={0.6} />
           </mesh>
           {/* Right Glass Door Leaf */}
           <mesh position={[1.05, 3, 0]}>
             <boxGeometry args={[2, 5.8, 0.2]} />
             <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} transparent opacity={0.6} />
           </mesh>
           {/* Lighted Sign Box above Door */}
           <mesh position={[0, 6.4, 0.2]}>
             <boxGeometry args={[2.5, 0.8, 0.1]} />
             <meshStandardMaterial color={isEmergency ? "#22c55e" : "#0f172a"} emissive={isEmergency ? "#22c55e" : "#000000"} emissiveIntensity={2} />
           </mesh>
           {/* Signage Text */}
           <Html position={[0, 6.4, 0.3]} center transform distanceFactor={15}>
             <div style={{ color: isEmergency ? 'white' : '#475569', fontWeight: 'bold', fontSize: '32px', fontFamily: 'sans-serif', letterSpacing: '2px', textShadow: isEmergency ? '0 0 15px #22c55e' : 'none' }}>
               EXIT
             </div>
           </Html>
        </group>
      ))}

      {/* REALISTIC WORKER MODEL */}
      {agents.map((agent, i) => (
        <group key={agent.id} ref={(el) => { if (el) groupRefs.current[i] = el; }} position={agent.position}>
          {/* Legs */}
          <mesh position={[-0.25, 1, 0]} castShadow>
            <boxGeometry args={[0.4, 2, 0.4]} />
            <meshStandardMaterial color="#1e3a8a" />
          </mesh>
          <mesh position={[0.25, 1, 0]} castShadow>
            <boxGeometry args={[0.4, 2, 0.4]} />
            <meshStandardMaterial color="#1e3a8a" />
          </mesh>
          {/* Torso (name="body" given for color change) */}
          <mesh name="body" position={[0, 2.8, 0]} castShadow>
            <boxGeometry args={[0.9, 1.6, 0.5]} />
            <meshStandardMaterial color="#f97316" />
          </mesh>
          {/* Reflectors */}
          <mesh position={[0, 3, 0.26]}>
            <boxGeometry args={[0.9, 0.1, 0.05]} />
            <meshStandardMaterial color="#e5e7eb" emissive="#ffffff" emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[0, 2.6, 0.26]}>
            <boxGeometry args={[0.9, 0.1, 0.05]} />
            <meshStandardMaterial color="#e5e7eb" emissive="#ffffff" emissiveIntensity={0.2} />
          </mesh>
          {/* Arms */}
          <mesh position={[-0.6, 2.8, 0]} castShadow>
            <boxGeometry args={[0.3, 1.4, 0.3]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[0.6, 2.8, 0]} castShadow>
            <boxGeometry args={[0.3, 1.4, 0.3]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          {/* Head and Helmet */}
          <mesh position={[0, 3.8, 0]} castShadow>
            <sphereGeometry args={[0.35, 16, 16]} />
            <meshStandardMaterial color="#ffdbac" />
          </mesh>
          <mesh position={[0, 4, 0]} castShadow>
            <sphereGeometry args={[0.4, 16, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
            <meshStandardMaterial color="#fbbf24" metalness={0.5} roughness={0.2} />
          </mesh>
        </group>
      ))}
    </group>
  );
};
