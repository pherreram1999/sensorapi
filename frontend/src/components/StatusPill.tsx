interface Props {
  status: "live" | "error" | "idle";
  lastUpdated: Date | null;
}

export default function StatusPill({ status, lastUpdated }: Props) {
  const dotCls = status === "live" ? "live" : status === "error" ? "err" : "idle";
  const text = status === "live" ? "CONECTADO" : status === "error" ? "ERROR" : "INACTIVO";
  return (
    <div className="status">
      <span className={`status-dot ${dotCls}`} />
      <span className="status-text">{text}</span>
      {lastUpdated && (
        <span className="status-ts">· {lastUpdated.toLocaleTimeString()}</span>
      )}
    </div>
  );
}
