<script setup lang="ts">
import { computed } from "vue";
import { Line } from "vue-chartjs";
import type { ChartData, ChartOptions } from "chart.js";

const props = defineProps<{
  label: string;
  unit: string;
  color: string;
  points: { t: number; v: number | null }[];
  errorPoints?: number[];
}>();

const isEmpty = computed(() => props.points.length === 0);

const lastValue = computed<number | null>(() => {
  for (let i = props.points.length - 1; i >= 0; i--) {
    if (props.points[i].v !== null) return props.points[i].v;
  }
  return null;
});

const chartData = computed<ChartData<"line">>(() => ({
  datasets: [
    {
      label: `${props.label} (${props.unit})`,
      data: props.points.map(p => ({ x: p.t as any, y: p.v as any })),
      borderColor: props.color,
      backgroundColor: props.color + "1a",
      borderWidth: 2,
      pointRadius: 0,
      pointHoverRadius: 4,
      tension: 0.35,
      fill: true,
      spanGaps: false,
    },
  ],
}));

const chartOptions: ChartOptions<"line"> = {
  responsive: true,
  maintainAspectRatio: false,
  animation: false,
  interaction: { mode: "index", intersect: false },
  plugins: {
    legend: { display: false },
    tooltip: {
      backgroundColor: "#0f172a",
      titleColor: "#94a3b8",
      bodyColor: "#f1f5f9",
      padding: 10,
      cornerRadius: 8,
      callbacks: {
        label: ctx =>
          ctx.parsed.y !== null && ctx.parsed.y !== undefined
            ? `${ctx.parsed.y.toFixed(2)} ${props.unit}`
            : "—",
      },
    },
  },
  scales: {
    x: {
      type: "time",
      time: {
        tooltipFormat: "HH:mm:ss",
        displayFormats: {
          second: "HH:mm:ss",
          minute: "HH:mm",
          hour: "HH:mm",
        },
      },
      ticks: { maxTicksLimit: 6, color: "#94a3b8", font: { size: 11 } },
      grid: { color: "#f1f5f9" },
      border: { display: false },
    },
    y: {
      ticks: {
        color: "#94a3b8",
        font: { family: "'Fira Code', monospace", size: 11 },
        maxTicksLimit: 5,
      },
      grid: { color: "#f1f5f9" },
      border: { display: false },
    },
  },
};
</script>

<template>
  <section
    class="chart-card"
    :style="{ '--card-accent': color }"
    :aria-label="`${label} sensor chart`"
  >
    <!-- Card header -->
    <div class="chart-header">
      <div class="chart-title-row">
        <h2 class="chart-label">{{ label }}</h2>
        <span class="chart-unit">{{ unit }}</span>
      </div>
      <div class="chart-stat" aria-label="Latest value">
        <span class="chart-stat-num">
          {{ lastValue !== null ? lastValue.toFixed(1) : "—" }}
        </span>
      </div>
    </div>

    <!-- Chart or empty state -->
    <div class="chart-body" v-if="!isEmpty" role="img" :aria-label="`${label} over time`">
      <Line :data="chartData" :options="chartOptions" />
    </div>
    <div v-else class="chart-empty" role="status">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
           stroke="currentColor" stroke-width="1.5" stroke-linecap="round"
           stroke-linejoin="round" aria-hidden="true">
        <line x1="3" y1="12" x2="21" y2="12"/>
        <polyline points="8 8 3 12 8 16"/>
        <polyline points="16 8 21 12 16 16"/>
      </svg>
      No data in selected range
    </div>

    <!-- DHT error strip -->
    <div
      v-if="errorPoints && errorPoints.length"
      class="error-strip"
      :aria-label="`${errorPoints.length} DHT sensor error(s)`"
    >
      <span
        v-for="t in errorPoints"
        :key="t"
        class="error-dot"
        role="img"
        :title="`DHT error at ${new Date(t).toLocaleTimeString()}`"
        :aria-label="`DHT error at ${new Date(t).toLocaleTimeString()}`"
      />
    </div>
  </section>
</template>

<style scoped>
.chart-card {
  background: var(--c-surface);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-sm);
  padding: var(--sp-4);
  display: flex;
  flex-direction: column;
  gap: var(--sp-3);
  border-top: 3px solid var(--card-accent, var(--c-primary));
  transition: box-shadow 0.2s ease, transform 0.15s ease;
}
.chart-card:hover {
  box-shadow: var(--shadow-md);
  transform: translateY(-1px);
}

/* Header */
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--sp-2);
}

.chart-title-row {
  display: flex;
  align-items: baseline;
  gap: var(--sp-1);
  flex-wrap: wrap;
}

.chart-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--c-text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.chart-unit {
  font-size: 0.7rem;
  color: var(--c-text-muted);
}

.chart-stat-num {
  font-family: 'Fira Code', monospace;
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--c-text);
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

/* Chart area */
.chart-body {
  height: 170px;
  position: relative;
}
@media (min-width: 640px)  { .chart-body { height: 190px; } }
@media (min-width: 1024px) { .chart-body { height: 210px; } }

/* Empty state */
.chart-empty {
  height: 170px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--sp-2);
  color: var(--c-text-muted);
  font-size: 0.85rem;
  background: var(--c-bg);
  border-radius: var(--r-sm);
}
.chart-empty svg { width: 28px; height: 28px; opacity: 0.5; }
@media (min-width: 640px)  { .chart-empty { height: 190px; } }
@media (min-width: 1024px) { .chart-empty { height: 210px; } }

/* Error strip */
.error-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
  padding-top: var(--sp-1);
}

.error-dot {
  display: inline-block;
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--c-danger);
  cursor: help;
  transition: transform 0.15s;
}
.error-dot:hover { transform: scale(1.5); }
</style>
