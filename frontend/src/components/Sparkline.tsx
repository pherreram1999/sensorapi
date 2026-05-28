import { useRef, useLayoutEffect, useState } from "react";
import { smoothPath } from "../lib/metrics";
import type { Reading } from "../api";

interface Props {
  data: Reading[];
  accessor: (d: Reading) => number | null;
  color: string;
  height?: number;
}

export default function Sparkline({ data, accessor, color, height = 36 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) setW(Math.round(e.contentRect.width));
    });
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, []);

  const values = data.map(accessor).filter((v): v is number => v !== null && Number.isFinite(v));
  let path = "", area = "";
  if (w > 0 && values.length >= 2) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pts = data
      .map((d, i) => {
        const v = accessor(d);
        const x = (i / (data.length - 1)) * w;
        const y = v !== null && Number.isFinite(v)
          ? height - 4 - ((v - min) / range) * (height - 8)
          : null;
        return { x, y };
      })
      .filter((p): p is { x: number; y: number } => p.y !== null);
    path = smoothPath(pts);
    area = `${path} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`;
  }

  const gradId = `sg-${color.replace("#", "")}`;

  return (
    <div ref={ref} className="spark" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
          <defs>
            <linearGradient id={gradId} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#${gradId})`} />
          <path d={path} fill="none" stroke={color} strokeWidth={1.5}
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}
