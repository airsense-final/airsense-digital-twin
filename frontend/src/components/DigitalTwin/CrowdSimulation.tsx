import React, { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Html } from "@react-three/drei";

const FLOOR_LIMIT = 48; // Kapıları duvarlara (dışa) itmek için genişlettik

const EXITS = [
  { pos: new THREE.Vector3(-FLOOR_LIMIT, 0, 0), rot: [0, Math.PI / 2, 0] }, // Sol
  { pos: new THREE.Vector3(FLOOR_LIMIT, 0, 0), rot: [0, -Math.PI / 2, 0] }, // Sağ
];

interface CrowdSimulationProps {
  isEmergency: boolean;
  hazardPosition: { x: number; y: number; z: number } | null;
  onStatsUpdate: (stats: { alive: number; safe: number; injured: number; dead: number }) => void;
  agentCount: number;
  resetTrigger: number; // YENİ: Reset butonu için tetikleyici
}

export const CrowdSimulation = ({ isEmergency, hazardPosition, onStatsUpdate, agentCount, resetTrigger }: CrowdSimulationProps) => {
  
  // Ajanları kullanıcı sayısına ve resetTrigger'a göre dinamik oluştur
  const agents = useMemo(() => {
    return Array.from({ length: agentCount }).map((_, i) => ({
      id: i,
      position: new THREE.Vector3(
        (Math.random() - 0.5) * (FLOOR_LIMIT - 5) * 2, // Kapıların dibinde doğmasınlar
        0, 
        (Math.random() - 0.5) * (FLOOR_LIMIT - 5) * 2
      ),
      target: new THREE.Vector3(),
      status: "idle" as "idle" | "evacuating" | "injured" | "dead" | "safe",
      speed: 0.25 + Math.random() * 0.15, // Koşma hızı
    }));
  }, [agentCount, resetTrigger]); // Reset butonu basılınca herkes yeniden doğar

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
          agentGroup.rotation.x = Math.PI / 2; // Yere düşme
          agentGroup.position.y = 0.5;
        } else if (distToHazard < 22) {
          agent.status = "injured";
          agent.speed = 0.05; // Yaralılar topallayarak yavaş kaçar
        } else if (agent.status !== "injured") {
          agent.status = "evacuating";
        }
      } else if (!isEmergency && agent.status !== "idle") {
        agent.status = "idle";
        agent.speed = 0.25 + Math.random() * 0.15;
        agentGroup.rotation.x = 0; // Ayağa kalk
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
          agent.position.add(direction.multiplyScalar(0.04)); // Normal gezinme hızı
          agentGroup.lookAt(agent.position.clone().add(direction)); 
        }
      }

      agentGroup.position.copy(agent.position);
      if (agent.status === "dead") agentGroup.position.y = 0.5; 
      
      // Gövde Rengini Güncelleme (Gövde mesh'i name="body" ile seçiliyor)
      const bodyMesh = agentGroup.getObjectByName("body") as THREE.Mesh;
      if (bodyMesh) {
        const mat = bodyMesh.material as THREE.MeshStandardMaterial;
        if (agent.status === "dead") mat.color.setHex(0x111111); // Siyah
        else if (agent.status === "injured") mat.color.setHex(0xef4444); // Kırmızı
        else if (agent.status === "evacuating") mat.color.setHex(0xeab308); // Sarı
        else mat.color.setHex(0xf97316); // Normal Gövde Rengi (Turuncu)
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
      {/* 3D GERÇEKÇİ ACİL ÇIKIŞ KAPILARI */}
      {EXITS.map((exit, idx) => (
        <group key={`exit-${idx}`} position={exit.pos} rotation={exit.rot as any}>
           {/* Kapı Kasası */}
           <mesh position={[0, 3, 0]}>
             <boxGeometry args={[4.4, 6, 0.4]} />
             <meshStandardMaterial color="#334155" />
           </mesh>
           {/* Sol Camlı Kapı Kanadı */}
           <mesh position={[-1.05, 3, 0]}>
             <boxGeometry args={[2, 5.8, 0.2]} />
             <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} transparent opacity={0.6} />
           </mesh>
           {/* Sağ Camlı Kapı Kanadı */}
           <mesh position={[1.05, 3, 0]}>
             <boxGeometry args={[2, 5.8, 0.2]} />
             <meshStandardMaterial color="#94a3b8" metalness={0.8} roughness={0.2} transparent opacity={0.6} />
           </mesh>
           {/* Kapı Üstü Işıklı Tabela Kasası */}
           <mesh position={[0, 6.4, 0.2]}>
             <boxGeometry args={[2.5, 0.8, 0.1]} />
             <meshStandardMaterial color={isEmergency ? "#22c55e" : "#0f172a"} emissive={isEmergency ? "#22c55e" : "#000000"} emissiveIntensity={2} />
           </mesh>
           {/* Tabela Yazısı */}
           <Html position={[0, 6.4, 0.3]} center transform distanceFactor={15}>
             <div style={{ color: isEmergency ? 'white' : '#475569', fontWeight: 'bold', fontSize: '32px', fontFamily: 'sans-serif', letterSpacing: '2px', textShadow: isEmergency ? '0 0 15px #22c55e' : 'none' }}>
               EXIT
             </div>
           </Html>
        </group>
      ))}

      {/* GERÇEKÇİ İŞÇİ MODELİ (SENİN KODUNUN AYNISI EKLENDİ) */}
      {agents.map((agent, i) => (
        <group key={agent.id} ref={(el) => { if (el) groupRefs.current[i] = el; }} position={agent.position}>
          {/* Bacaklar */}
          <mesh position={[-0.25, 1, 0]} castShadow>
            <boxGeometry args={[0.4, 2, 0.4]} />
            <meshStandardMaterial color="#1e3a8a" />
          </mesh>
          <mesh position={[0.25, 1, 0]} castShadow>
            <boxGeometry args={[0.4, 2, 0.4]} />
            <meshStandardMaterial color="#1e3a8a" />
          </mesh>
          {/* Gövde (Renk değişimi için name="body" verildi) */}
          <mesh name="body" position={[0, 2.8, 0]} castShadow>
            <boxGeometry args={[0.9, 1.6, 0.5]} />
            <meshStandardMaterial color="#f97316" />
          </mesh>
          {/* Reflektörler */}
          <mesh position={[0, 3, 0.26]}>
            <boxGeometry args={[0.9, 0.1, 0.05]} />
            <meshStandardMaterial color="#e5e7eb" emissive="#ffffff" emissiveIntensity={0.2} />
          </mesh>
          <mesh position={[0, 2.6, 0.26]}>
            <boxGeometry args={[0.9, 0.1, 0.05]} />
            <meshStandardMaterial color="#e5e7eb" emissive="#ffffff" emissiveIntensity={0.2} />
          </mesh>
          {/* Kollar */}
          <mesh position={[-0.6, 2.8, 0]} castShadow>
            <boxGeometry args={[0.3, 1.4, 0.3]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          <mesh position={[0.6, 2.8, 0]} castShadow>
            <boxGeometry args={[0.3, 1.4, 0.3]} />
            <meshStandardMaterial color="#334155" />
          </mesh>
          {/* Kafa ve Baret */}
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