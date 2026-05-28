// SVG-based time-series + sparkline charts. No external charting dep.

const { useRef, useState, useEffect, useMemo, useLayoutEffect } = React;

// Hook: returns the live width of `ref` (rounded). 0 until first measure.
function useElementWidth(ref) {
  const [w, setW] = useState(0);
  useLayoutEffect(() => {
    if (!ref.current) return;
    const el = ref.current;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) setW(Math.round(entry.contentRect.width));
    });
    ro.observe(el);
    setW(Math.round(el.getBoundingClientRect().width));
    return () => ro.disconnect();
  }, [ref]);
  return w;
}

// Build a smooth path from points using Catmull-Rom-ish bezier.
function smoothPath(pts) {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] || pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] || p2;
    const c1x = p1.x + (p2.x - p0.x) / 6;
    const c1y = p1.y + (p2.y - p0.y) / 6;
    const c2x = p2.x - (p3.x - p1.x) / 6;
    const c2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
  }
  return d;
}

// Nice tick step calculator.
function niceTicks(min, max, count = 4) {
  if (min === max) { min -= 1; max += 1; }
  const range = max - min;
  const step0 = range / count;
  const mag = Math.pow(10, Math.floor(Math.log10(step0)));
  const norm = step0 / mag;
  const step = (norm < 1.5 ? 1 : norm < 3 ? 2 : norm < 7 ? 5 : 10) * mag;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + 1e-9; v += step) ticks.push(+v.toFixed(8));
  return { ticks, start, end, step };
}

function fmtTime(ts, span) {
  const d = new Date(ts);
  if (span <= 6 * 3600 * 1000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (span <= 36 * 3600 * 1000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' +
         d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtNumber(n, unit) {
  if (n === null || n === undefined || isNaN(n)) return '—';
  const abs = Math.abs(n);
  let s;
  if (abs >= 1000) s = n.toFixed(0);
  else if (abs >= 100) s = n.toFixed(1);
  else if (abs >= 10) s = n.toFixed(1);
  else if (abs >= 1) s = n.toFixed(2);
  else s = n.toFixed(3);
  return unit ? `${s}${unit}` : s;
}

// ─── Sparkline (used inside KPI cards) ────────────────────────────────────────
function Sparkline({ data, accessor, color, height = 36 }) {
  const ref = useRef(null);
  const w = useElementWidth(ref);
  const values = data.map(accessor).filter((v) => Number.isFinite(v));
  let path = '', area = '';
  if (w > 0 && values.length >= 2) {
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const pts = data.map((d, i) => {
      const v = accessor(d);
      const x = (i / (data.length - 1)) * w;
      const y = Number.isFinite(v)
        ? height - 4 - ((v - min) / range) * (height - 8)
        : null;
      return { x, y };
    }).filter(p => p.y !== null);
    path = smoothPath(pts);
    area = `${path} L ${pts[pts.length - 1].x} ${height} L ${pts[0].x} ${height} Z`;
  }
  return (
    <div ref={ref} className="spark" style={{ height }}>
      {w > 0 && (
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
          <defs>
            <linearGradient id={`sg-${color.replace('#','')}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.35" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={area} fill={`url(#sg-${color.replace('#','')})`} />
          <path d={path} fill="none" stroke={color} strokeWidth="1.5"
                strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </div>
  );
}

// ─── Time-series chart ───────────────────────────────────────────────────────
function TimeChart({ data, accessor, color, unit, label, height = 220, faultAccessor }) {
  const ref = useRef(null);
  const w = useElementWidth(ref);
  const [hover, setHover] = useState(null); // index

  const padL = 44, padR = 14, padT = 14, padB = 26;
  const innerW = Math.max(0, w - padL - padR);
  const innerH = height - padT - padB;

  const valid = useMemo(
    () => data.map((d, i) => ({ d, i, v: accessor(d) })).filter(p => Number.isFinite(p.v)),
    [data, accessor]
  );

  const { ticks, start: yMin, end: yMax } = useMemo(() => {
    const vals = valid.map(p => p.v);
    if (vals.length === 0) return { ticks: [0, 1], start: 0, end: 1 };
    return niceTicks(Math.min(...vals), Math.max(...vals), 4);
  }, [valid]);

  const tMin = data.length ? data[0].created_at : 0;
  const tMax = data.length ? data[data.length - 1].created_at : 1;
  const tSpan = Math.max(1, tMax - tMin);

  const x = (ts) => padL + ((ts - tMin) / tSpan) * innerW;
  const y = (v)  => padT + (1 - (v - yMin) / (yMax - yMin || 1)) * innerH;

  const pts = valid.map(p => ({ x: x(p.d.created_at), y: y(p.v), v: p.v, ts: p.d.created_at, i: p.i }));
  const line = smoothPath(pts);
  const areaD = pts.length >= 2
    ? `${line} L ${pts[pts.length - 1].x} ${padT + innerH} L ${pts[0].x} ${padT + innerH} Z`
    : '';

  // Time ticks
  const xTicks = useMemo(() => {
    if (!data.length) return [];
    const count = Math.max(3, Math.min(6, Math.floor(innerW / 90)));
    const arr = [];
    for (let i = 0; i < count; i++) arr.push(tMin + (i / (count - 1)) * tSpan);
    return arr;
  }, [tMin, tSpan, innerW, data.length]);

  // Fault bands
  const faultBands = useMemo(() => {
    if (!faultAccessor || !data.length) return [];
    const bands = [];
    let curStart = null;
    for (let i = 0; i < data.length; i++) {
      const fault = faultAccessor(data[i]);
      if (fault && curStart === null) curStart = data[i].created_at;
      if ((!fault || i === data.length - 1) && curStart !== null) {
        const end = fault ? data[i].created_at : data[i - 1]?.created_at || curStart;
        bands.push([curStart, end]);
        curStart = null;
      }
    }
    return bands;
  }, [data, faultAccessor]);

  const onMove = (e) => {
    if (!pts.length) return;
    const rect = ref.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    let best = 0, bestDx = Infinity;
    for (const p of pts) {
      const dx = Math.abs(p.x - mx);
      if (dx < bestDx) { best = p.i; bestDx = dx; }
    }
    setHover(best);
  };

  const hoverPt = hover != null ? pts.find(p => p.i === hover) : null;

  return (
    <div ref={ref} className="tchart" style={{ height }}
         onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
      {w > 0 && (
        <svg width={w} height={height} viewBox={`0 0 ${w} ${height}`}>
          <defs>
            <linearGradient id={`tg-${label}`} x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="0.28" />
              <stop offset="100%" stopColor={color} stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Fault bands */}
          {faultBands.map(([s, e], i) => (
            <rect key={i} x={x(s)} y={padT} width={Math.max(2, x(e) - x(s))} height={innerH}
                  fill="var(--fault-band)" />
          ))}

          {/* Y grid + labels */}
          {ticks.map((t, i) => (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={y(t)} y2={y(t)} stroke="var(--grid)" strokeWidth="1" />
              <text x={padL - 8} y={y(t)} textAnchor="end" dominantBaseline="middle"
                    className="axis-label">{fmtNumber(t)}</text>
            </g>
          ))}

          {/* X labels */}
          {xTicks.map((t, i) => (
            <text key={i} x={x(t)} y={height - 8} textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
                  className="axis-label">{fmtTime(t, tSpan)}</text>
          ))}

          {/* Area + line */}
          <path d={areaD} fill={`url(#tg-${label})`} />
          <path d={line} fill="none" stroke={color} strokeWidth="1.75"
                strokeLinecap="round" strokeLinejoin="round" />

          {/* Hover */}
          {hoverPt && (
            <g>
              <line x1={hoverPt.x} x2={hoverPt.x} y1={padT} y2={padT + innerH}
                    stroke="var(--fg-dim)" strokeDasharray="2 3" strokeWidth="1" />
              <circle cx={hoverPt.x} cy={hoverPt.y} r="4" fill="var(--bg)" stroke={color} strokeWidth="2" />
            </g>
          )}
        </svg>
      )}
      {hoverPt && (
        <div className="tooltip" style={{
          left: Math.min(w - 150, Math.max(0, hoverPt.x - 70)),
          top: Math.max(0, hoverPt.y - 56),
        }}>
          <div className="tt-v" style={{ color }}>{fmtNumber(hoverPt.v, unit)}</div>
          <div className="tt-t">{fmtTime(hoverPt.ts, tSpan)}</div>
        </div>
      )}
    </div>
  );
}

Object.assign(window, { Sparkline, TimeChart, fmtNumber, fmtTime, niceTicks });
