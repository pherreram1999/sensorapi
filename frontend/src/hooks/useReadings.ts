import { useState, useEffect, useRef, useCallback } from "react";
import { fetchReadings, type Reading } from "../api";

export type Preset = "5m" | "15m" | "1h" | "6h" | "24h" | "custom";

const PRESET_MS: Record<Exclude<Preset, "custom">, number> = {
  "5m":  5 * 60 * 1000,
  "15m": 15 * 60 * 1000,
  "1h":  60 * 60 * 1000,
  "6h":  6 * 60 * 60 * 1000,
  "24h": 24 * 60 * 60 * 1000,
};

export interface ReadingsState {
  readings: Reading[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  preset: Preset;
  setPreset: (p: Preset) => void;
  customFrom: number;
  setCustomFrom: (v: number) => void;
  customTo: number;
  setCustomTo: (v: number) => void;
  intervalMs: number;
  setIntervalMs: (v: number) => void;
  paused: boolean;
  setPaused: (v: boolean) => void;
  refetch: () => void;
}

export function useReadings(defaultPollMs = 3000): ReadingsState {
  const [readings, setReadings] = useState<Reading[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [preset, setPreset] = useState<Preset>("1h");
  const [customFrom, setCustomFrom] = useState(() => Date.now() - 3_600_000);
  const [customTo, setCustomTo] = useState(() => Date.now());
  const [intervalMs, setIntervalMs] = useState(defaultPollMs);
  const [paused, setPaused] = useState(false);

  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const getRange = useCallback((): { from: number; to: number } => {
    if (preset === "custom") return { from: customFrom, to: customTo };
    const span = PRESET_MS[preset as Exclude<Preset, "custom">];
    const to = Date.now();
    return { from: to - span, to };
  }, [preset, customFrom, customTo]);

  const poll = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getRange();
      const rows = await fetchReadings(from, to, abortRef.current.signal);
      setReadings(rows);
      setLastUpdated(new Date());
    } catch (e: unknown) {
      if (e instanceof Error && e.name !== "AbortError") {
        setError(e.message);
      }
    } finally {
      setLoading(false);
    }
  }, [getRange]);

  useEffect(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (paused) {
      poll();
      return;
    }
    poll();
    timerRef.current = setInterval(poll, intervalMs);
    return () => {
      if (timerRef.current !== null) clearInterval(timerRef.current);
      abortRef.current?.abort();
    };
  }, [poll, intervalMs, paused]);

  return {
    readings,
    loading,
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
    refetch: poll,
  };
}
