interface Props {
  paused: boolean;
  onPausedChange: (v: boolean) => void;
  intervalMs: number;
  onIntervalMsChange: (v: number) => void;
}

export default function PollControls({ paused, onPausedChange, intervalMs, onIntervalMsChange }: Props) {
  const intervalSec = Math.round(intervalMs / 1000);

  return (
    <div className="poll-controls">
      <button
        className={`poll-btn${paused ? " paused" : ""}`}
        onClick={() => onPausedChange(!paused)}
      >
        {paused ? "▶ Reanudar" : "⏸ Pausar"}
      </button>
      <div className="poll-interval">
        <input
          type="number"
          min={1}
          max={60}
          value={intervalSec}
          onChange={(e) => {
            const v = Math.max(1, Math.min(60, Number(e.target.value)));
            onIntervalMsChange(v * 1000);
          }}
        />
        <span>s</span>
      </div>
    </div>
  );
}
