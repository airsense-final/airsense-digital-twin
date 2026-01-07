import React, { useMemo } from 'react';
import * as THREE from 'three';

// Renk Hesaplama
const getHeatColor = (value: number) => {
    const normalized = Math.min(Math.max(value, 0), 100) / 100;
    const color = new THREE.Color();
    if (normalized < 0.5) {
        color.setHSL(0.3 - (normalized * 0.4), 1.0, 0.5); // Yeşil -> Sarı
    } else {
        color.setHSL(0.1 - ((normalized - 0.5) * 0.2), 1.0, 0.5); // Sarı -> Kırmızı
    }
    return color;
};

export const HeatmapLayer = ({ sensors, visible }: { sensors: any[], visible: boolean }) => {
    if (!visible) return null;
    const floorSize = 100;
    const gridSize = 40; 

    const points = useMemo(() => {
        const tempPoints = [];
        const step = floorSize / gridSize;
        
        for (let x = -floorSize / 2; x < floorSize / 2; x += step) {
            for (let z = -floorSize / 2; z < floorSize / 2; z += step) {
                let totalValue = 0;
                let totalWeight = 0;
                
                sensors.forEach(s => {
                    const dist = Math.sqrt(Math.pow(x - s.position.x, 2) + Math.pow(z - s.position.z, 2));
                    if (dist < 25) { 
                        const weight = 1 / (dist * dist + 0.1);
                        totalValue += s.value * weight;
                        totalWeight += weight;
                    }
                });

                const finalValue = totalWeight > 0 ? totalValue / totalWeight : 0;
                if (totalWeight > 0.001) tempPoints.push({ x, z, value: finalValue });
            }
        }
        return tempPoints;
    }, [sensors, floorSize, visible]);

    return (
        <group position={[0, 0.1, 0]}>
            {points.map((p, i) => (
                <mesh key={i} position={[p.x, 0, p.z]} rotation={[-Math.PI/2, 0, 0]}>
                    <planeGeometry args={[floorSize/gridSize * 0.9, floorSize/gridSize * 0.9]} />
                    <meshBasicMaterial color={getHeatColor(p.value)} transparent opacity={0.6} side={THREE.DoubleSide} />
                </mesh>
            ))}
        </group>
    );
};