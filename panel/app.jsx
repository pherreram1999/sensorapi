// Main dashboard app.

const { useState, useEffect, useMemo, useCallback, useRef } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "theme": "dark",
  "accentMode": "by-metric",
  "endpointUrl": "",
  "refreshSec": 10,
  "rangePreset": "24h",
  "showSparklines": true,
  "chartStyle": "smooth",
  "density": "regular"
}/*EDITMODE-END*/;

const METRICS = [
  {
    key: 'temperatura',
    label: 'Temperatura',
    short: 'Temp.',
    unit: '°C',
    color: { dark: '#ff7a59', light: '#e04f2b' },
    accessor: (d) => d.temperatura,
    isFault: (d) => d.dht_error === 1,
    desc: 'Ambiente · DHT',
  },
  {
    key: 'humedad',
    label: 'Humedad',
    short: 'Hum.',
    unit: '%',
    color: { dark: '#5dc9f5', light: '#0f8fc4' },
    accessor: (d) => d.humedad,
    isFault: (d) => d.dht_error === 1,
    desc: 'Relativa · DHT',
  },
  {
    key: 'mq7_co',
    label: 'CO',
    short: 'CO',
    unit: '',
    color: { dark: '#f5cf4a', light: '#b88b00' },
    accessor: (d) => d.mq7_co,
    isFault: () => false,
    desc: 'Monóxido · MQ-7',
  },
  {
    key: 'mq2_gas',
    label: 'Gas Combustible',
    short: 'Gas',
    unit: '',
    color: { dark: '#b48cff', light: '#6c3fe0' },
    accessor: (d) => d.mq2_gas,
    isFault: () => false,
    desc: 'GLP/Humo · MQ-2',
  },
];

const RANGE_PRESETS = [
  { id: '1h',  label: '1 h',  ms: 3600 * 1000 },
  { id: '6h',  label: '6 h',  ms: 6 * 3600 * 1000 },
  { id: '24h', label: '24 h', ms: 24 * 3600 * 1000 },
  { id: '7d',  label: '7 d',  ms: 7 * 24 * 3600 * 1000 },
  { id: 'all', label: 'Todo', ms: Infinity },
];

// Stats helpers
function statsFor(data, accessor) {
  const vals = data.map(accessor).filter(v => Number.isFinite(v) && v !== 0);
  // Note: filtering 0 only when there's a fault flag to avoid skewing avg with fault zeros.
  // We re-compute strict stats too for clarity.
  if (vals.length === 0) return { current: null, min: null, max: null, avg: null, last: null };
  return {
    current: vals[vals.length - 1],
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
  };
}

function statsForRaw(data, metric) {
  // Skip values where the sensor reports fault for that metric
  const acc = metric.accessor;
  const isFault = metric.isFault;
  const vals = data.filter(d => !isFault(d)).map(acc).filter(v => Number.isFinite(v));
  const current = data.length ? acc(data[data.length - 1]) : null;
  if (vals.length === 0) return { current, min: null, max: null, avg: null };
  return {
    current,
    min: Math.min(...vals),
    max: Math.max(...vals),
    avg: vals.reduce((a, b) => a + b, 0) / vals.length,
  };
}

// Delta vs first sample in range
function trendOf(data, metric) {
  const acc = metric.accessor;
  const vs = data.filter(d => !metric.isFault(d)).map(acc).filter(v => Number.isFinite(v));
  if (vs.length < 2) return 0;
  return vs[vs.length - 1] - vs[0];
}

// ─── KPI Card ────────────────────────────────────────────────────────────────
function KPICard({ metric, data, color, showSpark }) {
  const stats = statsForRaw(data, metric);
  const trend = trendOf(data, metric);
  const cur = stats.current;
  const isFault = data.length && metric.isFault(data[data.length - 1]);
  const trendUp = trend > 0.0001;
  const trendDown = trend < -0.0001;

  return (
    <div className="kpi">
      <div className="kpi-hd">
        <div className="kpi-dot" style={{ background: color }} />
        <div className="kpi-meta">
          <div className="kpi-label">{metric.label}</div>
          <div className="kpi-desc">{metric.desc}</div>
        </div>
        {isFault ? (
          <span className="kpi-badge fault">FAULT</span>
        ) : (
          <span className={`kpi-trend ${trendUp ? 'up' : trendDown ? 'down' : ''}`}>
            {trendUp ? '▲' : trendDown ? '▼' : '·'}
            {' '}
            {Math.abs(trend) < 0.01 ? '0.00' : fmtNumber(Math.abs(trend))}
          </span>
        )}
      </div>
      <div className="kpi-val">
        <span className="kpi-num">{fmtNumber(cur)}</span>
        {metric.unit && <span className="kpi-unit">{metric.unit}</span>}
      </div>
      {showSpark && (
        <Sparkline
          data={data}
          accessor={(d) => metric.isFault(d) ? null : metric.accessor(d)}
          color={color}
          height={38}
        />
      )}
      <div className="kpi-foot">
        <div><span className="kf-l">MIN</span><span className="kf-v">{fmtNumber(stats.min, metric.unit)}</span></div>
        <div><span className="kf-l">AVG</span><span className="kf-v">{fmtNumber(stats.avg, metric.unit)}</span></div>
        <div><span className="kf-l">MAX</span><span className="kf-v">{fmtNumber(stats.max, metric.unit)}</span></div>
      </div>
    </div>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────────────
function StatusPill({ status, lastUpdate }) {
  const dotCls = status === 'live' ? 'live' : status === 'error' ? 'err' : status === 'demo' ? 'demo' : 'idle';
  const text = status === 'live' ? 'CONECTADO'
            : status === 'error' ? 'ERROR'
            : status === 'demo'  ? 'DEMO'
            : 'INACTIVO';
  return (
    <div className="status">
      <span className={`status-dot ${dotCls}`} />
      <span className="status-text">{text}</span>
      {lastUpdate && <span className="status-ts">· {new Date(lastUpdate).toLocaleTimeString()}</span>}
    </div>
  );
}

// ─── Main App ────────────────────────────────────────────────────────────────
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [rawData, setRawData] = useState(() => window.buildDemoStream());
  const [status, setStatus] = useState('demo');
  const [lastUpdate, setLastUpdate] = useState(Date.now());
  const [range, setRange] = useState(t.rangePreset || '24h');
  const [error, setError] = useState(null);
  const [now, setNow] = useState(Date.now());

  // Tick clock for "actualizado hace X"
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch endpoint if provided
  const fetchData = useCallback(async () => {
    const url = (t.endpointUrl || '').trim();
    if (!url) {
      setStatus('demo');
      return;
    }
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const arr = Array.isArray(json) ? json : (json.data || json.readings || []);
      if (!Array.isArray(arr) || arr.length === 0) throw new Error('Sin datos');
      // Sort by created_at asc
      arr.sort((a, b) => a.created_at - b.created_at);
      setRawData(arr);
      setStatus('live');
      setLastUpdate(Date.now());
      setError(null);
    } catch (e) {
      setStatus('error');
      setError(String(e.message || e));
    }
  }, [t.endpointUrl]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Auto-refresh
  useEffect(() => {
    if (!t.endpointUrl || !t.refreshSec) return;
    const id = setInterval(fetchData, Math.max(2, t.refreshSec) * 1000);
    return () => clearInterval(id);
  }, [fetchData, t.endpointUrl, t.refreshSec]);

  // Theme attr
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', t.theme || 'dark');
  }, [t.theme]);

  // Density attr
  useEffect(() => {
    document.documentElement.setAttribute('data-density', t.density || 'regular');
  }, [t.density]);

  // Range-filter data
  const filtered = useMemo(() => {
    if (!rawData.length) return [];
    const preset = RANGE_PRESETS.find(r => r.id === range) || RANGE_PRESETS[2];
    if (!Number.isFinite(preset.ms)) return rawData;
    const max = rawData[rawData.length - 1].created_at;
    const cutoff = max - preset.ms;
    return rawData.filter(d => d.created_at >= cutoff);
  }, [rawData, range]);

  // Fault summary
  const faultCount = useMemo(
    () => filtered.filter(d => d.dht_error === 1).length,
    [filtered]
  );

  const colorFor = (m) => m.color[t.theme === 'light' ? 'light' : 'dark'];

  const ageSec = Math.max(0, Math.floor((now - lastUpdate) / 1000));
  const ageLabel = ageSec < 60 ? `hace ${ageSec}s` : ageSec < 3600 ? `hace ${Math.floor(ageSec/60)}m` : `hace ${Math.floor(ageSec/3600)}h`;

  const sensorId = filtered.length ? 'sensor-01' : '—';

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-l">
          <div className="brand">
            <span className="brand-mark">●</span>
            <span className="brand-name">Sensor Console</span>
          </div>
          <div className="hdr-sep" />
          <div className="hdr-id">
            <span className="hdr-id-l">NODE</span>
            <span className="hdr-id-v">{sensorId}</span>
          </div>
        </div>
        <div className="hdr-r">
          <div className="range-group">
            {RANGE_PRESETS.map(r => (
              <button key={r.id}
                      className={`range-btn ${range === r.id ? 'active' : ''}`}
                      onClick={() => setRange(r.id)}>{r.label}</button>
            ))}
          </div>
          <StatusPill status={status} lastUpdate={lastUpdate} />
        </div>
      </header>

      {error && status === 'error' && (
        <div className="banner err">
          No se pudo leer el endpoint: <code>{error}</code>. Mostrando datos demo —
          ajusta la URL en Tweaks.
        </div>
      )}
      {status === 'demo' && !error && (
        <div className="banner info">
          Mostrando datos sintéticos de 24 h. Pega tu endpoint JSON en
          <strong> Tweaks → Endpoint</strong> para conectar el sensor real.
        </div>
      )}

      <section className="kpis">
        {METRICS.map(m => (
          <KPICard key={m.key} metric={m} data={filtered}
                   color={colorFor(m)} showSpark={t.showSparklines} />
        ))}
      </section>

      <section className="charts">
        {METRICS.map(m => (
          <article key={m.key} className="chart-card">
            <header className="chart-hd">
              <div className="chart-hd-l">
                <span className="chart-dot" style={{ background: colorFor(m) }} />
                <h3>{m.label}</h3>
                <span className="chart-unit">{m.unit || '—'}</span>
              </div>
              <div className="chart-hd-r">
                <span className="chart-pts">{filtered.length} pts</span>
              </div>
            </header>
            <TimeChart
              data={filtered}
              accessor={(d) => m.isFault(d) ? NaN : m.accessor(d)}
              color={colorFor(m)}
              unit={m.unit}
              label={m.key}
              height={220}
              faultAccessor={m.key === 'temperatura' || m.key === 'humedad' ? (d => d.dht_error === 1) : null}
            />
          </article>
        ))}
      </section>

      <footer className="ftr">
        <div className="ftr-cell">
          <span className="ftr-l">ÚLTIMA LECTURA</span>
          <span className="ftr-v">{ageLabel}</span>
        </div>
        <div className="ftr-cell">
          <span className="ftr-l">MUESTRAS</span>
          <span className="ftr-v">{filtered.length}</span>
        </div>
        <div className="ftr-cell">
          <span className="ftr-l">FALLAS DHT</span>
          <span className={`ftr-v ${faultCount > 0 ? 'warn' : ''}`}>{faultCount}</span>
        </div>
        <div className="ftr-cell">
          <span className="ftr-l">RANGO</span>
          <span className="ftr-v">{(RANGE_PRESETS.find(r => r.id === range) || {}).label}</span>
        </div>
        <div className="ftr-cell">
          <span className="ftr-l">REFRESH</span>
          <span className="ftr-v">{t.endpointUrl ? `${t.refreshSec}s` : 'OFF'}</span>
        </div>
      </footer>

      <TweaksPanel title="Tweaks">
        <TweakSection label="Conexión" />
        <TweakText label="Endpoint URL" value={t.endpointUrl}
                   placeholder="https://api.tu-sensor.dev/readings"
                   onChange={(v) => setTweak('endpointUrl', v)} />
        <TweakSlider label="Refresh" value={t.refreshSec} min={2} max={120} step={1} unit="s"
                     onChange={(v) => setTweak('refreshSec', v)} />
        <TweakButton label="Recargar ahora" onClick={fetchData} />

        <TweakSection label="Tema" />
        <TweakRadio label="Modo" value={t.theme}
                    options={['dark', 'light']}
                    onChange={(v) => setTweak('theme', v)} />
        <TweakRadio label="Densidad" value={t.density}
                    options={['compact', 'regular', 'comfy']}
                    onChange={(v) => setTweak('density', v)} />

        <TweakSection label="Visualización" />
        <TweakToggle label="Sparklines en KPIs" value={t.showSparklines}
                     onChange={(v) => setTweak('showSparklines', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
