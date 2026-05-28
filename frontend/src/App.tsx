import { useMemo } from "react";
import { useReadings } from "./hooks/useReadings";
import { useTheme } from "./hooks/useTheme";
import { METRICS, fmtNumber } from "./lib/metrics";
import KPICard from "./components/KPICard";
import TimeChart from "./components/TimeChart";
import StatusPill from "./components/StatusPill";
import RangeSelector from "./components/RangeSelector";
import PollControls from "./components/PollControls";
import ThemeControls from "./components/ThemeControls";

const PRESET_MS: Record<string, number> = {
  "5m":  5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h":  60 * 60 * 1000,
  "6h":  6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

export default function App() {
  const {
    readings,
    error,
    lastUpdated,
    preset,
    setPreset,
    customFrom,
    setCustomFrom,
    customTo,
    setCustomTo,
    intervalMs,
    setIntervalMs,
    paused,
    setPaused,
  } = useReadings(3000);

  const { theme, setTheme, density, setDensity } = useTheme();

  const colorFor = (m: (typeof METRICS)[0]) => m.color[theme === "light" ? "light" : "dark"];

  const status = error ? "error" : readings.length > 0 ? "live" : "idle";

  const filtered = useMemo(() => {
    if (!readings.length) return readings;
    if (preset === "custom") {
      return readings.filter((d) => d.created_at >= customFrom && d.created_at <= customTo);
    }
    const span = PRESET_MS[preset];
    if (!span) return readings;
    const max = readings[readings.length - 1].created_at;
    return readings.filter((d) => d.created_at >= max - span);
  }, [readings, preset, customFrom, customTo]);

  const faultCount = useMemo(
    () => filtered.filter((d) => d.dht_error).length,
    [filtered]
  );

  const ageSec = lastUpdated ? Math.max(0, Math.floor((Date.now() - lastUpdated.getTime()) / 1000)) : null;
  const ageLabel = ageSec === null
    ? "—"
    : ageSec < 60 ? `hace ${ageSec}s`
    : ageSec < 3600 ? `hace ${Math.floor(ageSec / 60)}m`
    : `hace ${Math.floor(ageSec / 3600)}h`;

  const presetLabel: Record<string, string> = {
    "5m": "5 m", "15m": "15 m", "1h": "1 h", "6h": "6 h", "24h": "24 h", "custom": "Custom",
  };

  const sensorId = readings.length ? "sensor-01" : "—";

  return (
    <div className="app">
      <header className="hdr">
        <div className="hdr-l">
          <div className="brand">
            <span className="brand-mark">
              <img src="/Icon.webp" alt="Nibbit" />
            </span>
            <span className="brand-name">
              <span className="brand-title">Nibbit</span>
              <span className="brand-sub">Sensor Console</span>
            </span>
          </div>
          <div className="hdr-sep" />
          <div className="hdr-id">
            <span className="hdr-id-l">NODE</span>
            <span className="hdr-id-v">{sensorId}</span>
          </div>
        </div>
        <div className="hdr-r">
          <RangeSelector
            preset={preset}
            onPresetChange={setPreset}
            customFrom={customFrom}
            onCustomFromChange={setCustomFrom}
            customTo={customTo}
            onCustomToChange={setCustomTo}
          />
          <PollControls
            paused={paused}
            onPausedChange={setPaused}
            intervalMs={intervalMs}
            onIntervalMsChange={setIntervalMs}
          />
          <ThemeControls
            theme={theme}
            onThemeChange={setTheme}
            density={density}
            onDensityChange={setDensity}
          />
          <StatusPill status={status} lastUpdated={lastUpdated} />
        </div>
      </header>

      {error && (
        <div className="banner err">
          Error al obtener datos: <code>{error}</code>
        </div>
      )}

      <section className="kpis">
        {METRICS.map((m) => (
          <KPICard
            key={m.key as string}
            metric={m}
            data={filtered}
            color={colorFor(m)}
            showSpark
          />
        ))}
      </section>

      <section className="charts">
        {METRICS.map((m) => (
          <article key={m.key as string} className="chart-card">
            <header className="chart-hd">
              <div className="chart-hd-l">
                <span className="chart-dot" style={{ background: colorFor(m) }} />
                <h3>{m.label}</h3>
                <span className="chart-unit">{m.unit || "—"}</span>
              </div>
              <div className="chart-hd-r">
                <span className="chart-pts">{filtered.length} pts</span>
              </div>
            </header>
            <TimeChart
              data={filtered}
              accessor={(d) => m.isFault(d) ? null : m.accessor(d)}
              color={colorFor(m)}
              unit={m.unit}
              label={m.key as string}
              height={220}
              faultAccessor={
                m.key === "temperatura" || m.key === "humedad"
                  ? (d) => d.dht_error
                  : null
              }
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
          <span className={`ftr-v${faultCount > 0 ? " warn" : ""}`}>{faultCount}</span>
        </div>
        <div className="ftr-cell">
          <span className="ftr-l">RANGO</span>
          <span className="ftr-v">{presetLabel[preset] ?? preset}</span>
        </div>
        <div className="ftr-cell">
          <span className="ftr-l">REFRESH</span>
          <span className="ftr-v">{paused ? "OFF" : `${Math.round(intervalMs / 1000)}s`}</span>
        </div>
      </footer>
    </div>
  );
}
