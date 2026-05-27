<script setup lang="ts">
import { computed } from "vue";
import { useReadings } from "./composables/useReadings";
import RangeSelector from "./components/RangeSelector.vue";
import PollControls from "./components/PollControls.vue";
import SensorChart from "./components/SensorChart.vue";
import type { Reading } from "./api";

const {
  readings, loading, error, lastUpdated,
  preset, customFrom, customTo, intervalMs, paused,
} = useReadings(3000);

type SensorField = "temperatura" | "humedad" | "mq7_co" | "mq2_gas";

function pts(field: SensorField) {
  return readings.value.map(r => ({ t: r.created_at, v: r[field] as number | null }));
}

function lastVal(field: SensorField): number | null {
  for (let i = readings.value.length - 1; i >= 0; i--) {
    const v = readings.value[i][field];
    if (v !== null && v !== undefined) return v as number;
  }
  return null;
}

const errorPoints = computed(() =>
  readings.value.filter(r => r.dht_error).map(r => r.created_at)
);

const lastStr = computed(() =>
  lastUpdated.value ? lastUpdated.value.toLocaleTimeString() : "—"
);

const isLive = computed(() => !paused.value && !error.value);

const kpis = computed(() => [
  { label: "Temperature", unit: "°C",  color: "#f59e0b", field: "temperatura" as SensorField },
  { label: "Humidity",    unit: "%",   color: "#06b6d4", field: "humedad"     as SensorField },
  { label: "CO (MQ-7)",  unit: "ppm", color: "#ef4444", field: "mq7_co"      as SensorField },
  { label: "Gas (MQ-2)", unit: "ppm", color: "#8b5cf6", field: "mq2_gas"     as SensorField },
]);
</script>

<template>
  <div class="app">

    <!-- ───── Header ───── -->
    <header class="header" role="banner">
      <div class="header-start">
        <!-- Activity icon (Lucide-style SVG) -->
        <svg class="logo-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
             fill="none" stroke="currentColor" stroke-width="2"
             stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
        </svg>
        <div class="header-text">
          <h1>Sensor Dashboard</h1>
          <p class="header-sub">Environmental monitoring</p>
        </div>
      </div>

      <div class="header-end">
        <span
          class="live-dot"
          :class="{ active: isLive }"
          :title="isLive ? 'Live' : 'Paused'"
          aria-hidden="true"
        />
        <span v-if="loading"    class="badge badge-warning" role="status" aria-live="polite">Updating…</span>
        <span v-else-if="error" class="badge badge-danger"  role="alert"  aria-live="assertive">{{ error }}</span>
        <span v-else            class="badge badge-success" role="status"  aria-live="polite">{{ lastStr }}</span>
      </div>
    </header>

    <!-- ───── Toolbar ───── -->
    <div class="toolbar" role="toolbar" aria-label="Dashboard controls">
      <div class="toolbar-group">
        <span class="toolbar-label" id="range-label">Range</span>
        <RangeSelector
          aria-labelledby="range-label"
          v-model:preset="preset"
          v-model:customFrom="customFrom"
          v-model:customTo="customTo"
        />
      </div>
      <div class="toolbar-sep" aria-hidden="true" />
      <PollControls v-model:intervalMs="intervalMs" v-model:paused="paused" />
    </div>

    <!-- ───── KPI cards ───── -->
    <section class="kpi-row" aria-label="Current sensor readings">
      <div
        v-for="kpi in kpis"
        :key="kpi.field"
        class="kpi-card"
        :style="{ '--kpi-accent': kpi.color }"
      >
        <div class="kpi-label">{{ kpi.label }}</div>
        <div class="kpi-value">
          <span class="kpi-number">
            {{ lastVal(kpi.field) !== null ? lastVal(kpi.field)!.toFixed(1) : "—" }}
          </span>
          <span class="kpi-unit">{{ kpi.unit }}</span>
        </div>
        <div v-if="kpi.field === 'temperatura' && errorPoints.length" class="kpi-err-badge">
          {{ errorPoints.length }} err
        </div>
      </div>
    </section>

    <!-- ───── Charts grid ───── -->
    <main class="charts-grid">
      <SensorChart
        label="Temperature" unit="°C" color="#f59e0b"
        :points="pts('temperatura')" :errorPoints="errorPoints"
      />
      <SensorChart
        label="Humidity" unit="%" color="#06b6d4"
        :points="pts('humedad')"
      />
      <SensorChart
        label="CO (MQ-7)" unit="ppm" color="#ef4444"
        :points="pts('mq7_co')"
      />
      <SensorChart
        label="Gas (MQ-2)" unit="ppm" color="#8b5cf6"
        :points="pts('mq2_gas')"
      />
    </main>

    <!-- ───── DHT error banner ───── -->
    <div v-if="errorPoints.length" class="alert-banner" role="alert" aria-live="polite">
      <svg class="alert-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
           fill="none" stroke="currentColor" stroke-width="2"
           stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
        <line x1="12" y1="9" x2="12" y2="13"/>
        <line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
      {{ errorPoints.length }} DHT sensor error(s) in the selected time range
    </div>

  </div>
</template>

<style scoped>
/* ── Layout ── */
.app {
  min-height: 100dvh;
  display: flex;
  flex-direction: column;
}

/* ── Header ── */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  padding: var(--sp-3) var(--sp-4);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--sp-3);
  box-shadow: var(--shadow-sm);
}

.header-start {
  display: flex;
  align-items: center;
  gap: var(--sp-3);
  min-width: 0;
}

.logo-icon {
  width: 28px;
  height: 28px;
  color: var(--c-primary);
  flex-shrink: 0;
}

.header-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

h1 {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--c-text);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-sub {
  font-size: 0.72rem;
  color: var(--c-text-muted);
  display: none;
}
@media (min-width: 540px) { .header-sub { display: block; } }

.header-end {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-shrink: 0;
}

/* Live pulse dot */
.live-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--c-text-muted);
  transition: background 0.3s ease;
  flex-shrink: 0;
}
.live-dot.active {
  background: var(--c-live);
  animation: pulse-live 2s ease-in-out infinite;
}

/* Status badges */
.badge {
  font-size: 0.75rem;
  font-weight: 500;
  padding: 3px 10px;
  border-radius: 20px;
  white-space: nowrap;
}
.badge-success { background: var(--c-success-bg); color: #166534; }
.badge-warning  { background: var(--c-warning-bg); color: #713f12; }
.badge-danger   { background: var(--c-danger-bg);  color: #991b1b; }

/* ── Toolbar ── */
.toolbar {
  background: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  padding: var(--sp-2) var(--sp-4);
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2) var(--sp-4);
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  flex-wrap: wrap;
}

.toolbar-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.07em;
  white-space: nowrap;
}

.toolbar-sep {
  width: 1px;
  height: 24px;
  background: var(--c-border);
  flex-shrink: 0;
}
@media (max-width: 639px) { .toolbar-sep { display: none; } }

/* ── KPI Row ── */
.kpi-row {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: var(--sp-3);
  padding: var(--sp-4);
}
@media (min-width: 640px) {
  .kpi-row { grid-template-columns: repeat(4, 1fr); }
}

.kpi-card {
  background: var(--c-surface);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-sm);
  padding: var(--sp-4);
  border-top: 3px solid var(--kpi-accent, var(--c-primary));
  display: flex;
  flex-direction: column;
  gap: var(--sp-1);
  position: relative;
  transition: box-shadow 0.2s ease, transform 0.15s ease;
}
.kpi-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

.kpi-label {
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.kpi-value {
  display: flex;
  align-items: baseline;
  gap: var(--sp-1);
  margin-top: var(--sp-1);
}

.kpi-number {
  font-family: 'Fira Code', monospace;
  font-size: 1.65rem;
  font-weight: 600;
  color: var(--c-text);
  line-height: 1;
  font-variant-numeric: tabular-nums;
}

.kpi-unit {
  font-size: 0.8rem;
  color: var(--c-text-muted);
  font-weight: 400;
}

.kpi-err-badge {
  position: absolute;
  top: var(--sp-2);
  right: var(--sp-2);
  background: var(--c-danger-bg);
  color: var(--c-danger);
  font-size: 0.65rem;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 20px;
}

/* ── Charts grid ── */
.charts-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: var(--sp-4);
  padding: 0 var(--sp-4) var(--sp-4);
  flex: 1;
}
@media (min-width: 640px) {
  .charts-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (min-width: 1280px) {
  .charts-grid { padding: 0 var(--sp-6) var(--sp-6); gap: var(--sp-5); }
}

/* ── Alert banner ── */
.alert-banner {
  display: flex;
  align-items: center;
  gap: var(--sp-2);
  margin: 0 var(--sp-4) var(--sp-4);
  background: var(--c-warning-bg);
  border: 1px solid #fcd34d;
  border-radius: var(--r-sm);
  padding: var(--sp-3) var(--sp-4);
  font-size: 0.875rem;
  color: #78350f;
  line-height: 1.4;
}
.alert-icon {
  width: 18px;
  height: 18px;
  color: var(--c-warning);
  flex-shrink: 0;
}
</style>
