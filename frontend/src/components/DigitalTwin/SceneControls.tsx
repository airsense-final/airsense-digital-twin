import React, { useState, useEffect } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export const KeyboardMapMover = ({ controlsRef }: { controlsRef: any }) => {
  const { camera } = useThree();
  const [keys, setKeys] = useState<{ [key: string]: boolean }>({});
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: true }));
    const up = (e: KeyboardEvent) => setKeys((k) => ({ ...k, [e.code]: false }));
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useFrame((state, delta) => {
    if (!controlsRef.current) return;
    const speed = keys["ShiftLeft"] || keys["ShiftRight"] ? 60 : 25;
    const step = speed * delta;
    if (keys["ArrowUp"] || keys["KeyW"]) {
      controlsRef.current.target.z -= step;
      camera.position.z -= step;
    }
    if (keys["ArrowDown"] || keys["KeyS"]) {
      controlsRef.current.target.z += step;
      camera.position.z += step;
    }
    if (keys["ArrowLeft"] || keys["KeyA"]) {
      controlsRef.current.target.x -= step;
      camera.position.x -= step;
    }
    if (keys["ArrowRight"] || keys["KeyD"]) {
      controlsRef.current.target.x += step;
      camera.position.x += step;
    }
  });
  return null;
};