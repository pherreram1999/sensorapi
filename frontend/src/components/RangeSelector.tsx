import type { Preset } from "../hooks/useReadings";

interface Props {
  preset: Preset;
  onPresetChange: (p: Preset) => void;
  customFrom: number;
  onCustomFromChange: (v: number) => void;
  customTo: number;
  onCustomToChange: (v: number) => void;
}

const PRESETS: { id: Preset; label: string }[] = [
  { id: "5m",     label: "5 m" },
  { id: "15m",    label: "15 m" },
  { id: "1h",     label: "1 h" },
  { id: "6h",     label: "6 h" },
  { id: "24h",    label: "24 h" },
  { id: "custom", label: "Custom" },
];

function toDatetimeLocal(ms: number): string {
  const d = new Date(ms - new Date().getTimezoneOffset() * 60_000);
  return d.toISOString().slice(0, 16);
}

function fromDatetimeLocal(s: string): number {
  return new Date(s).getTime();
}

export default function RangeSelector({
  preset, onPresetChange,
  customFrom, onCustomFromChange,
  customTo, onCustomToChange,
}: Props) {
  return (
    <div className="toolbar">
      <div className="range-group">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            className={`range-btn${preset === p.id ? " active" : ""}`}
            onClick={() => onPresetChange(p.id)}
          >
            {p.label}
          </button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="custom-range">
          <input
            type="datetime-local"
            value={toDatetimeLocal(customFrom)}
            onChange={(e) => onCustomFromChange(fromDatetimeLocal(e.target.value))}
          />
          <span>→</span>
          <input
            type="datetime-local"
            value={toDatetimeLocal(customTo)}
            onChange={(e) => onCustomToChange(fromDatetimeLocal(e.target.value))}
          />
        </div>
      )}
    </div>
  );
}
