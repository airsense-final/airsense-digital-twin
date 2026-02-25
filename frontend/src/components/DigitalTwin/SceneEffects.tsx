import React, { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Sphere } from "@react-three/drei";

export const FireEffect = ({ position }: { position: { x: number; y: number; z: number } }) => {
  const smokeRefs = useRef<any[]>([]);
  const fireRef = useRef<any>(null);
  const lightRef = useRef<any>(null);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    if (fireRef.current) {
      fireRef.current.scale.y = 1 + Math.sin(t * 15) * 0.2 + Math.cos(t * 10) * 0.1;
      fireRef.current.scale.x = 1 + Math.cos(t * 8) * 0.1;
      fireRef.current.scale.z = 1 + Math.sin(t * 7) * 0.1;
    }
    if (lightRef.current) {
      lightRef.current.intensity = 40 + Math.sin(t * 25) * 15;
    }
    smokeRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const lifeTime = 6;
      const timeOffset = t + i * (lifeTime / smokeRefs.current.length);
      const life = timeOffset % lifeTime;
      const progress = life / lifeTime;
      mesh.position.y = 1 + progress * 15;
      const spread = 2 + Math.pow(progress, 2) * 25;
      mesh.scale.set(spread, spread * 0.5, spread);
      if (mesh.material) {
        mesh.material.opacity = (1 - progress) * 0.6;
      }
    });
  });

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
        <circleGeometry args={[2.5, 32]} />
        <meshStandardMaterial color="#ff3300" emissive="#ff2200" emissiveIntensity={6} transparent opacity={0.9} />
      </mesh>
      <group ref={fireRef} position={[0, 1.5, 0]}>
        <Sphere args={[1.5, 16, 16]} scale={[1, 2, 1]}>
          <meshStandardMaterial color="#fffb00" emissive="#ffaa00" emissiveIntensity={10} transparent opacity={0.8} depthWrite={false} />
        </Sphere>
        <Sphere args={[2.2, 16, 16]} position={[0, 0.5, 0]} scale={[1, 1.5, 1]}>
          <meshStandardMaterial color="#ff4400" emissive="#ff0000" emissiveIntensity={5} transparent opacity={0.6} depthWrite={false} />
        </Sphere>
      </group>
      {[...Array(7)].map((_, i) => (
        <Sphere key={i} ref={(el) => { smokeRefs.current[i] = el; }} args={[1, 16, 16]} position={[0, 0, 0]}>
          <meshStandardMaterial color="#0a0a0a" transparent opacity={0} depthWrite={false} roughness={1} />
        </Sphere>
      ))}
      <pointLight ref={lightRef} position={[0, 3, 0]} color="#ff3300" distance={60} castShadow />
    </group>
  );
};

export const GasLeakEffect = ({ position }: { position: { x: number; y: number; z: number } }) => {
  const jetRefs = useRef<any[]>([]);
  const floorRefs = useRef<any[]>([]);
  const PIPE_HEIGHT = 18;

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime();
    jetRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const lifeTime = 1.4;
      const offset = i * (lifeTime / jetRefs.current.length);
      const progress = ((t + offset) % lifeTime) / lifeTime;
      mesh.position.y = PIPE_HEIGHT - progress * PIPE_HEIGHT;
      const spread = 0.5 + progress * 4.5;
      mesh.position.x = Math.sin(i * 132.5) * (progress * 2.5);
      mesh.position.z = Math.cos(i * 123.5) * (progress * 2.5);
      mesh.scale.set(spread, spread * 1.5, spread);
      if (mesh.material) mesh.material.opacity = (1 - progress) * 0.7;
    });
    floorRefs.current.forEach((mesh, i) => {
      if (!mesh) return;
      const lifeTime = 4.0;
      const offset = i * (lifeTime / floorRefs.current.length);
      const progress = ((t + offset) % lifeTime) / lifeTime;
      mesh.position.y = 0.3;
      const radius = progress * 12;
      const angle = i * ((Math.PI * 2) / floorRefs.current.length);
      mesh.position.x = Math.cos(angle) * radius;
      mesh.position.z = Math.sin(angle) * radius;
      const scale = 5 + progress * 7;
      mesh.scale.set(scale, scale * 0.2, scale);
      if (mesh.material) mesh.material.opacity = (1 - progress) * 0.5;
    });
  });

  return (
    <group position={[position.x, 0, position.z]}>
      <mesh position={[0, PIPE_HEIGHT, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.8, 0.2, 16, 32]} />
        <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={5} />
      </mesh>
      {[...Array(20)].map((_, i) => (
        <Sphere key={`jet-${i}`} ref={(el) => { jetRefs.current[i] = el; }} args={[0.7, 16, 16]}>
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1} transparent opacity={0} depthWrite={false} />
        </Sphere>
      ))}
      {[...Array(15)].map((_, i) => (
        <Sphere key={`floor-${i}`} ref={(el) => { floorRefs.current[i] = el; }} args={[1.2, 32, 32]}>
          <meshStandardMaterial color="#10b981" emissive="#064e3b" emissiveIntensity={0.2} transparent opacity={0} depthWrite={false} />
        </Sphere>
      ))}
      <spotLight position={[0, PIPE_HEIGHT + 1, 0]} target-position={[0, 0, 0]} color="#00ff88" intensity={150} distance={40} angle={0.7} />
    </group>
  );
};

export const SirenStrobe = () => {
  const lightRef = useRef<any>(null);
  useFrame(({ clock }) => {
    if (lightRef.current) {
      lightRef.current.intensity = Math.sin(clock.getElapsedTime() * 15) > 0 ? 30 : 0;
    }
  });
  return (
    <group>
      <pointLight ref={lightRef} color="#ff0000" position={[0, 18, 0]} distance={150} />
      <pointLight ref={lightRef} color="#ff0000" position={[40, 18, 40]} distance={100} />
      <pointLight ref={lightRef} color="#ff0000" position={[-40, 18, -40]} distance={100} />
    </group>
  );
};