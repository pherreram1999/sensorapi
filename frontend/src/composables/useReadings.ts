import { ref, watch, onUnmounted } from "vue";
import { fetchReadings, type Reading } from "../api";

export type Preset = "5m" | "15m" | "1h" | "6h" | "24h" | "custom";

const PRESET_MS: Record<Exclude<Preset, "custom">, number> = {
  "5m":  5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h":  60 * 60 * 1000,
  "6h":  6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

export function useReadings(defaultPollMs = 3000) {
  const readings = ref<Reading[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);
  const lastUpdated = ref<Date | null>(null);

  const preset = ref<Preset>("1h");
  const customFrom = ref<number>(Date.now() - 3_600_000);
  const customTo = ref<number>(Date.now());
  const intervalMs = ref(defaultPollMs);
  const paused = ref(false);

  let timer: ReturnType<typeof setInterval> | null = null;
  let abort: AbortController | null = null;

  function getRange(): { from: number; to: number } {
    if (preset.value === "custom") {
      return { from: customFrom.value, to: customTo.value };
    }
    const span = PRESET_MS[preset.value as Exclude<Preset, "custom">];
    const to = Date.now();
    return { from: to - span, to };
  }

  async function poll() {
    if (abort) abort.abort();
    abort = new AbortController();
    loading.value = true;
    error.value = null;
    try {
      const { from, to } = getRange();
      readings.value = await fetchReadings(from, to, abort.signal);
      lastUpdated.value = new Date();
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        error.value = e.message;
      }
    } finally {
      loading.value = false;
    }
  }

  function startPolling() {
    stopPolling();
    if (paused.value) return;
    poll();
    timer = setInterval(poll, intervalMs.value);
  }

  function stopPolling() {
    if (timer !== null) {
      clearInterval(timer);
      timer = null;
    }
  }

  watch([preset, customFrom, customTo, intervalMs, paused], startPolling, {
    immediate: true,
  });

  onUnmounted(() => {
    stopPolling();
    abort?.abort();
  });

  return {
    readings,
    loading,
    error,
    lastUpdated,
    preset,
    customFrom,
    customTo,
    intervalMs,
    paused,
  };
}
