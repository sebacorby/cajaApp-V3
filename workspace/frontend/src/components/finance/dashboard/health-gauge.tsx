"use client";

import { useEffect, useState } from "react";

interface HealthGaugeProps {
  value: number; // 0..100
  size?: number;
}

/** Anillo semicircular animado que muestra el score de salud financiera. */
export function HealthGauge({ value, size = 132 }: HealthGaugeProps) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    const target = Math.max(0, Math.min(100, value));
    let raf = 0;
    const start = performance.now();
    const duration = 900;
    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(target * eased);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  const stroke = 10;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // Semicírculo: de 180° a 360° (mitad inferior oculta) -> usamos arco superior
  const startAngle = 180;
  const sweep = 180;
  const angle = startAngle + (display / 100) * sweep;

  const polar = (deg: number) => {
    const rad = (deg * Math.PI) / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  };
  const startPt = polar(startAngle);
  const endPt = polar(angle);
  const largeArc = angle - startAngle > 180 ? 1 : 0;

  const trackEnd = polar(startAngle + sweep);

  const tone =
    value >= 70 ? "emerald" : value >= 45 ? "amber" : "rose";
  const toneColor =
    tone === "emerald" ? "#0d9488" : tone === "amber" ? "#d97706" : "#e11d48";
  const label =
    tone === "emerald" ? "Saludable" : tone === "amber" ? "Atención" : "Crítico";

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 8} viewBox={`0 0 ${size} ${size / 2 + 8}`}>
        <path
          d={`M ${startPt.x} ${startPt.y} A ${r} ${r} 0 0 1 ${trackEnd.x} ${trackEnd.y}`}
          fill="none"
          stroke="oklch(0.92 0.01 155)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${startPt.x} ${startPt.y} A ${r} ${r} 0 ${largeArc} 1 ${endPt.x} ${endPt.y}`}
          fill="none"
          stroke={toneColor}
          strokeWidth={stroke}
          strokeLinecap="round"
        />
      </svg>
      <div className="-mt-7 flex flex-col items-center">
        <span className="text-2xl font-semibold tabular-nums text-foreground">
          {Math.round(display)}
        </span>
        <span
          className="mt-0.5 text-[11px] font-medium"
          style={{ color: toneColor }}
        >
          {label}
        </span>
      </div>
    </div>
  );
}
