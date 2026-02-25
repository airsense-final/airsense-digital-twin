import React, { useState, useEffect } from "react";

export const DigitalClock = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div
      style={{
        background: "#1e293b",
        color: "#38bdf8",
        padding: "8px 15px",
        borderRadius: "6px",
        border: "1px solid #334155",
        fontFamily: "monospace",
        fontSize: "16px",
        fontWeight: "bold",
        marginRight: "10px",
        letterSpacing: "1px",
      }}
    >
      {currentTime.toLocaleTimeString([], { hour12: false })}
    </div>
  );
};

export const HeatmapLegend = ({
  min,
  max,
  warning,
  unit,
}: {
  min: number;
  max: number;
  warning: number;
  unit: string;
  title?: string;
}) => {
  const safeWarnRatio =
    warning && warning < max && warning > min ? warning / max : 0.75;
  const safeWarnVal =
    warning && warning < max ? warning : (max * 0.75).toFixed(0);

  const warnPercent = safeWarnRatio * 100;
  const normalPercent = warnPercent * 0.6;

  const gradient = `linear-gradient(to top, 
    blue 0%, 
    #22c55e ${normalPercent}%, 
    #fbbf24 ${warnPercent}%, 
    red 100%)`;

  return (
    <div
      style={{
        position: "absolute",
        bottom: "100px",
        right: "20px",
        background: "rgba(15, 23, 42, 0.95)",
        padding: "15px",
        borderRadius: "12px",
        border: "1px solid #475569",
        display: "flex",
        alignItems: "center",
        gap: "15px",
        color: "white",
        zIndex: 20,
        fontFamily: "sans-serif",
        boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)",
      }}
    >
      <div
        style={{
          width: "24px",
          height: "160px",
          background: gradient,
          borderRadius: "12px",
          border: "1px solid white",
        }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          height: "160px",
          fontSize: "12px",
          fontWeight: "bold",
        }}
      >
        <div style={{ color: "#ef4444" }}>
          ▲ {max} {unit} (Critical)
        </div>
        <div style={{ color: "#fbbf24" }}>
          - {safeWarnVal} {unit} (Warning)
        </div>
        <div style={{ color: "#22c55e" }}>
          - {(Number(safeWarnVal) * 0.6).toFixed(0)} {unit} (Normal)
        </div>
        <div style={{ color: "#3b82f6" }}>
          ▼ {min} {unit} (Safe)
        </div>
      </div>
    </div>
  );
};