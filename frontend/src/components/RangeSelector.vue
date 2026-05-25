<script setup lang="ts">
import { computed } from "vue";
import type { Preset } from "../composables/useReadings";

const props = defineProps<{
  preset: Preset;
  customFrom: number;
  customTo: number;
}>();

const emit = defineEmits<{
  (e: "update:preset", v: Preset): void;
  (e: "update:customFrom", v: number): void;
  (e: "update:customTo", v: number): void;
}>();

const PRESETS: { value: Preset; label: string }[] = [
  { value: "5m",     label: "5m" },
  { value: "15m",    label: "15m" },
  { value: "1h",     label: "1h" },
  { value: "6h",     label: "6h" },
  { value: "24h",    label: "24h" },
  { value: "custom", label: "Custom" },
];

function toLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocal(s: string): number {
  return new Date(s).getTime();
}

const fromInput = computed({
  get: () => toLocal(props.customFrom),
  set: (v: string) => emit("update:customFrom", fromLocal(v)),
});

const toInput = computed({
  get: () => toLocal(props.customTo),
  set: (v: string) => emit("update:customTo", fromLocal(v)),
});
</script>

<template>
  <div class="range-selector" role="group" aria-label="Time range">
    <!-- Preset buttons -->
    <div class="preset-group">
      <button
        v-for="p in PRESETS"
        :key="p.value"
        :class="['preset-btn', { active: preset === p.value }]"
        :aria-pressed="preset === p.value"
        @click="emit('update:preset', p.value)"
      >
        {{ p.label }}
      </button>
    </div>

    <!-- Custom date pickers -->
    <div v-if="preset === 'custom'" class="custom-range" role="group" aria-label="Custom date range">
      <label class="date-label" for="range-from">
        <span class="date-label-text">From</span>
        <input id="range-from" type="datetime-local" v-model="fromInput" class="date-input" />
      </label>
      <span class="date-sep" aria-hidden="true">→</span>
      <label class="date-label" for="range-to">
        <span class="date-label-text">To</span>
        <input id="range-to" type="datetime-local" v-model="toInput" class="date-input" />
      </label>
    </div>
  </div>
</template>

<style scoped>
.range-selector {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
}

.preset-group {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.preset-btn {
  min-height: 36px;
  padding: 6px 14px;
  border: 1px solid var(--c-border);
  border-radius: var(--r-sm);
  background: var(--c-surface);
  cursor: pointer;
  font-size: 0.82rem;
  font-family: 'Fira Sans', sans-serif;
  font-weight: 500;
  color: var(--c-text-secondary);
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
  touch-action: manipulation;
  user-select: none;
}

.preset-btn:hover:not(.active) {
  background: var(--c-bg);
  border-color: var(--c-secondary);
  color: var(--c-primary);
}

.preset-btn:focus-visible {
  outline: 2px solid var(--c-secondary);
  outline-offset: 2px;
}

.preset-btn.active {
  background: var(--c-primary);
  color: #fff;
  border-color: var(--c-primary);
  box-shadow: 0 1px 4px rgba(30,64,175,.35);
}

/* Touch: larger targets on mobile */
@media (max-width: 639px) {
  .preset-btn { min-height: 44px; padding: 8px 16px; }
}

/* Custom range */
.custom-range {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--sp-2);
}

.date-sep {
  color: var(--c-text-muted);
  font-size: 0.85rem;
}
@media (max-width: 480px) { .date-sep { display: none; } }

.date-label {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.date-label-text {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--c-text-muted);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.date-input {
  height: 36px;
  padding: 0 var(--sp-2);
  border: 1px solid var(--c-border);
  border-radius: var(--r-sm);
  font-size: 0.82rem;
  font-family: 'Fira Code', monospace;
  color: var(--c-text);
  background: var(--c-surface);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
  touch-action: manipulation;
}

.date-input:focus {
  outline: none;
  border-color: var(--c-secondary);
  box-shadow: 0 0 0 3px rgba(59,130,246,.15);
}

@media (max-width: 639px) {
  .date-input { height: 44px; }
}
</style>
