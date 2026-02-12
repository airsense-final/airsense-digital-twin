import { useState, useCallback, useEffect } from "react";

export const useSimulation = (realSensors: any[]) => {
  const [isSimulating, setIsSimulating] = useState(false);
  const [simSensors, setSimSensors] = useState<any[]>([]);

  const [simMode, setSimMode] = useState<"FIRE" | "GAS_LEAK" | "NORMAL">(
    "NORMAL",
  );
  const [simCenter, setSimCenter] = useState<{
    x: number;
    y: number;
    z: number;
  } | null>(null);

  // --- PROFESYONEL FİZİK MOTORU ---
  useEffect(() => {
    if (!isSimulating) return;

    const interval = setInterval(() => {
      setSimSensors((prevSensors) =>
        prevSensors.map((s) => {
          const type = (s.sensor_type || s.type || "").toUpperCase();
          const effectiveCenter = simCenter || { x: 0, y: 0.5, z: 0 };

          const dist = Math.sqrt(
            Math.pow(s.position.x - effectiveCenter.x, 2) +
              Math.pow(s.position.z - effectiveCenter.z, 2),
          );

          const heatMult = simCenter ? Math.exp(-dist / 8) : 0.05;
          const gasMult = simCenter ? Math.exp(-dist / 15) : 0.05;
          const smokeMult = simCenter ? Math.exp(-dist / 20) : 0.05;

          const isTemp = type.includes("TEMP");
          const isHum = type.includes("HUMIDITY");
          const isCO2 = type.includes("CO2") || type.includes("SCD");
          const isCO = type === "CO MQ" || type.includes("CO ");
          const isMethane = type.includes("METHANE") || type.includes("MQ4");
          const isAlcohol = type.includes("ALCOHOL");
          const isAir = type.includes("AIR QUALITY");

          let base = 0;
          let minLim = 0;
          let maxLim = 100;
          let noiseVol = 0.5;

          if (isTemp) {
            base = 22.0;
            minLim = -20;
            maxLim = 1000;
            noiseVol = 0.2;
          } else if (isHum) {
            base = 45.0;
            minLim = 0;
            maxLim = 100;
            noiseVol = 0.5;
          } else if (isCO2) {
            base = 410;
            minLim = 300;
            maxLim = 50000;
            noiseVol = 2.0;
          } else if (isCO) {
            base = 0.5;
            minLim = 0;
            maxLim = 5000;
            noiseVol = 0.1;
          } else if (isMethane) {
            base = 0;
            minLim = 0;
            maxLim = 50000;
            noiseVol = 0.0;
          } else if (isAlcohol) {
            base = 0;
            minLim = 0;
            maxLim = 2000;
            noiseVol = 0.0;
          } else if (isAir) {
            base = 15;
            minLim = 0;
            maxLim = 500;
            noiseVol = 1.0;
          }

          let currentValue = s.value !== undefined ? s.value : base;
          let change = (Math.random() - 0.5) * noiseVol;

          if (simMode === "FIRE") {
            if (isTemp) change += (Math.random() * 15 + 5) * heatMult;
            if (isHum) change -= (Math.random() * 3 + 1) * heatMult;
            if (isCO2) change += (Math.random() * 200 + 100) * gasMult;
            if (isCO) change += (Math.random() * 30 + 10) * gasMult;
            if (isAir) change += (Math.random() * 20 + 5) * smokeMult;
          } else if (simMode === "GAS_LEAK") {
            // Mevcut Metan ve Alkol artışları
            if (isMethane) change += (Math.random() * 500 + 100) * gasMult;
            if (isAlcohol) change += (Math.random() * 50 + 10) * gasMult;
            if (isAir) change += (Math.random() * 5 + 1) * smokeMult;
            if (isTemp) change -= Math.random() * 0.5 * heatMult;

            // --- YENİ: CO2 ETKİSİ ---
            // Gaz sızıntısı ortamdaki hava kalitesini bozduğu için CO2 sensörleri de
            // (özellikle endüstriyel tip değilse) yukarı yönlü sapma yapar.
            if (isCO2) {
              change += (Math.random() * 150 + 50) * gasMult; // CO2 değerini 50-200 ppm arası artırır
            }
          }
          if (simMode === "NORMAL") {
            const recoveryRate = isTemp ? 0.05 : 0.02;
            change += (base - currentValue) * recoveryRate;
          } else {
            change += (base - currentValue) * 0.005;
          }

          let newValue = currentValue + change;
          newValue = Math.max(minLim, Math.min(maxLim, newValue));

          let isCritical = false;
          let isWarning = false;

          if (isTemp) {
            isCritical = newValue > 65;
            isWarning = newValue > 40;
          } else if (isHum) {
            isCritical = newValue < 15 || newValue > 85;
            isWarning = newValue < 25 || newValue > 70;
          } else if (isCO2) {
            isCritical = newValue > 2500;
            isWarning = newValue > 1000;
          } else if (isCO) {
            isCritical = newValue > 100;
            isWarning = newValue > 35;
          } else if (isMethane) {
            isCritical = newValue > 2000;
            isWarning = newValue > 500;
          } else if (isAir) {
            isCritical = newValue > 200;
            isWarning = newValue > 100;
          } else {
            isCritical = newValue > 100;
            isWarning = newValue > 50;
          }

          return {
            ...s,
            value: newValue,
            timestamp: new Date().toISOString(),
            status: isCritical ? "critical" : isWarning ? "warning" : "active",
          };
        }),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, [isSimulating, simMode, simCenter]);

  return {
    isSimulating,
    simSensors,
    simMode,
    simCenter,
    startSimulation: useCallback(() => {
      const clonedSensors = JSON.parse(JSON.stringify(realSensors));

      const readySensors = clonedSensors.map((s: any) => {
        const type = (s.sensor_type || s.type || "").toUpperCase();
        if (type.includes("TEMP")) s.value = 22.0;
        else if (type.includes("HUMIDITY")) s.value = 45.0;
        else if (type.includes("CO2") || type.includes("SCD")) s.value = 410.0;
        else if (type.includes("AIR")) s.value = 15.0;
        else if (type.includes("CO ") || type === "CO MQ") s.value = 0.5;
        else if (type.includes("METHANE") || type.includes("ALCOHOL"))
          s.value = 0.1;
        else s.value = 0;
        return s;
      });

      setSimSensors(readySensors);
      setIsSimulating(true);
      setSimMode("NORMAL");
      setSimCenter(null);
    }, [realSensors]),
    stopSimulation: useCallback(() => {
      setIsSimulating(false);
      setSimSensors([]);
      setSimCenter(null);
    }, []),
    runScenario: useCallback(
      (
        scenarioType: "FIRE" | "GAS_LEAK" | "NORMAL",
        centerCoords?: { x: number; y: number; z: number },
      ) => {
        setSimMode(scenarioType);
        if (centerCoords) setSimCenter(centerCoords);
      },
      [],
    ),
    addVirtualSensor: useCallback((type: string) => {
      let val = 0;
      if (type.includes("TEMP")) val = 22.0;
      else if (type.includes("HUMIDITY")) val = 45.0;
      else if (type.includes("CO2")) val = 410.0;
      else if (type.includes("AIR")) val = 15.0;
      else if (type === "CO MQ") val = 0.5;

      const newNode = {
        id: `sim-${Date.now()}`,
        name: `SIM ${type}`,
        sensor_type: type,
        value: val,
        position: {
          x: Math.random() * 30 - 15,
          y: 1.5,
          z: Math.random() * 30 - 15,
        },
        timestamp: new Date().toISOString(),
        isVirtual: true,
        location_name: "Simulated Area",
      };
      setSimSensors((prev) => [...prev, newNode]);
    }, []),
    // EKSİK OLAN FONKSİYON EKLENDİ
    removeVirtualSensor: useCallback((id: string) => {
      setSimSensors((prev) => prev.filter((s) => s.id !== id));
    }, []),
  };
};
