import { useEffect, useRef } from "react";
import * as THREE from "three";

// --- COLOR SCALE GENERATOR ---
const getColorForValue = (value: number, min: number, max: number) => {
  let t = (value - min) / (max - min);
  t = Math.max(0, Math.min(1, t)); 
  const hue = (1 - t) * 240; 
  return `hsla(${hue}, 100%, 50%, 0.6)`; 
};

interface HeatmapProps {
  sensors: any[];
  visible: boolean;
  mode: 'TEMP' | 'HUMIDITY' | 'GAS' | 'GENERAL'; // 'GENERAL' mode added
  minRange: number;
  maxRange: number;
}

export const HeatmapLayer = ({ sensors, visible, mode, minRange, maxRange }: HeatmapProps) => {
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const FLOOR_SIZE = 100; 
  const RESOLUTION = 64;  
  const RADIUS_LIMIT = 25; 

  useEffect(() => {
    if (!visible || sensors.length === 0) return;

    const canvas = document.createElement('canvas');
    canvas.width = RESOLUTION;
    canvas.height = RESOLUTION;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, RESOLUTION, RESOLUTION);

    // --- 1. SENSOR FILTERING ---
    const activeSensors = sensors.filter(s => {
        const type = (s.sensor_type || s.type || "").toLowerCase();
        
        if (mode === 'GENERAL') return true; // Take ALL in General mode
        if (mode === 'TEMP') return type.includes('temp');
        if (mode === 'HUMIDITY') return type.includes('hum');
        if (mode === 'GAS') return !type.includes('temp') && !type.includes('hum');
        return false;
    });

    if (activeSensors.length === 0) return;

    // --- 2. IDW ALGORITHM ---
    for (let y = 0; y < RESOLUTION; y++) {
      for (let x = 0; x < RESOLUTION; x++) {
        const worldX = (x / RESOLUTION) * FLOOR_SIZE - (FLOOR_SIZE / 2);
        const worldZ = (y / RESOLUTION) * FLOOR_SIZE - (FLOOR_SIZE / 2);

        let numerator = 0;
        let denominator = 0;
        let minDist = Infinity;

        for (const s of activeSensors) {
          const dist = Math.sqrt(Math.pow(worldX - s.position.x, 2) + Math.pow(worldZ - s.position.z, 2));

          // --- VALUE NORMALIZATION (CRITICAL PART) ---
          let sensorValue = s.value || 0;

          // CORRECTION HERE: Convert to percentage in GAS mode as well, not just GENERAL.
          // Because different gases (CO vs Methane) have different thresholds.
          if (mode === 'GENERAL' || mode === 'GAS') {
             // If sensor doesn't have its own critical limit (from Backend), use a default
             const type = (s.sensor_type || "").toLowerCase();
             let limit = 1000; // Default for gases

             if (type.includes('temp')) limit = 80;
             else if (type.includes('hum')) limit = 100;
             
             // Use specific threshold if available (Backend data)
             if (s.thresholds?.critical) limit = s.thresholds.critical;

             // Convert to percentage (0 - 100)
             sensorValue = (sensorValue / limit) * 100;
             if (sensorValue > 100) sensorValue = 100; 
          }

          if (dist < 0.5) { 
            numerator = sensorValue;
            denominator = 1;
            minDist = 0;
            break;
          }

          const weight = 1 / (dist * dist);
          numerator += sensorValue * weight;
          denominator += weight;
          if (dist < minDist) minDist = dist;
        }

        const estimatedValue = denominator !== 0 ? numerator / denominator : minRange;

        if (minDist < RADIUS_LIMIT) {
            ctx.fillStyle = getColorForValue(estimatedValue, minRange, maxRange);
            ctx.fillRect(x, y, 1, 1);
        }
      }
    }

    if (textureRef.current) {
      textureRef.current.image = canvas;
      textureRef.current.needsUpdate = true;
    } else {
        const tex = new THREE.CanvasTexture(canvas);
        tex.minFilter = THREE.LinearFilter;
        tex.magFilter = THREE.LinearFilter;
        textureRef.current = tex;
    }

  }, [sensors, visible, mode, minRange, maxRange]);

  if (!visible || !textureRef.current) return null;

  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]} receiveShadow>
      <planeGeometry args={[FLOOR_SIZE, FLOOR_SIZE]} />
      <meshBasicMaterial map={textureRef.current} transparent opacity={0.6} depthWrite={false} side={THREE.DoubleSide} />
    </mesh>
  );
};
