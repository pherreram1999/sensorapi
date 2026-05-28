import type { Theme, Density } from "../hooks/useTheme";

interface Props {
  theme: Theme;
  onThemeChange: (t: Theme) => void;
  density: Density;
  onDensityChange: (d: Density) => void;
}

const THEMES: { id: Theme; label: string }[] = [
  { id: "dark",  label: "Dark" },
  { id: "light", label: "Light" },
];

const DENSITIES: { id: Density; label: string }[] = [
  { id: "compact", label: "C" },
  { id: "regular", label: "R" },
  { id: "comfy",   label: "+" },
];

export default function ThemeControls({ theme, onThemeChange, density, onDensityChange }: Props) {
  return (
    <div className="theme-controls">
      <div className="range-group">
        {THEMES.map((t) => (
          <button
            key={t.id}
            className={`range-btn${theme === t.id ? " active" : ""}`}
            onClick={() => onThemeChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="range-group">
        {DENSITIES.map((d) => (
          <button
            key={d.id}
            className={`range-btn${density === d.id ? " active" : ""}`}
            onClick={() => onDensityChange(d.id)}
            title={d.id}
          >
            {d.label}
          </button>
        ))}
      </div>
    </div>
  );
}
