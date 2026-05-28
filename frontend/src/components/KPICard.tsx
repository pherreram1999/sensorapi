import Sparkline from "./Sparkline";
import {
  statsForRaw, trendOf, fmtNumber, moodFor,
  NIBBIT_IMG, NIBBIT_LABEL, type Metric,
} from "../lib/metrics";
import type { Reading } from "../api";

interface Props {
  metric: Metric;
  data: Reading[];
  color: string;
  showSpark?: boolean;
}

export default function KPICard({ metric, data, color, showSpark = true }: Props) {
  const stats = statsForRaw(data, metric);
  const trend = trendOf(data, metric);
  const isFault = data.length > 0 && metric.isFault(data[data.length - 1]);
  const trendUp = trend > 0.0001;
  const trendDown = trend < -0.0001;
  const mood = moodFor(metric, data);

  return (
    <div className={`kpi kpi--${mood}`}>
      <div className="kpi-mood" title={NIBBIT_LABEL[mood]} aria-hidden>
        <img src={NIBBIT_IMG[mood]} alt="" />
      </div>
      <div className="kpi-hd">
        <div className="kpi-dot" style={{ background: color }} />
        <div className="kpi-meta">
          <div className="kpi-label">{metric.label}</div>
          <div className="kpi-desc">{metric.desc}</div>
        </div>
        {isFault ? (
          <span className="kpi-badge fault">FAULT</span>
        ) : (
          <span className={`kpi-trend${trendUp ? " up" : trendDown ? " down" : ""}`}>
            {trendUp ? "▲" : trendDown ? "▼" : "·"}{" "}
            {Math.abs(trend) < 0.01 ? "0.00" : fmtNumber(Math.abs(trend))}
          </span>
        )}
      </div>
      <div className="kpi-val">
        <span className="kpi-num">{fmtNumber(stats.current)}</span>
        {metric.unit && <span className="kpi-unit">{metric.unit}</span>}
      </div>
      {showSpark && (
        <Sparkline
          data={data}
          accessor={(d) => metric.isFault(d) ? null : metric.accessor(d)}
          color={color}
          height={38}
        />
      )}
      <div className="kpi-foot">
        <div><span className="kf-l">MIN</span><span className="kf-v">{fmtNumber(stats.min, metric.unit)}</span></div>
        <div><span className="kf-l">AVG</span><span className="kf-v">{fmtNumber(stats.avg, metric.unit)}</span></div>
        <div><span className="kf-l">MAX</span><span className="kf-v">{fmtNumber(stats.max, metric.unit)}</span></div>
      </div>
    </div>
  );
}
