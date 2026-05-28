// Sample data + synthetic generator for the sensor dashboard.
// The user's payload structure:
//   { id, temperatura, humedad, mq7_co, mq2_gas, dht_error, created_at (ms) }

window.SAMPLE_PAYLOAD = [
  { id: 1, temperatura: 24.5, humedad: 60.2, mq7_co: 0.12, mq2_gas: 0.05, dht_error: 0, created_at: 1779757161366 },
  { id: 2, temperatura: 24.5, humedad: 80.2, mq7_co: 0.12, mq2_gas: 0.05, dht_error: 0, created_at: 1779757194611 },
  { id: 3, temperatura: 0,    humedad: 0,    mq7_co: 2378, mq2_gas: 774,  dht_error: 1, created_at: 1779821019179 },
  { id: 4, temperatura: 0,    humedad: 0,    mq7_co: 2382, mq2_gas: 773,  dht_error: 1, created_at: 1779821030411 },
  { id: 5, temperatura: 0,    humedad: 0,    mq7_co: 2402, mq2_gas: 783,  dht_error: 1, created_at: 1779821041775 },
];

// Build a realistic 24h synthetic stream so the demo looks alive even with no endpoint.
window.buildDemoStream = function buildDemoStream() {
  const now = Date.now();
  const span = 24 * 60 * 60 * 1000; // 24h
  const points = 288; // every 5 minutes
  const out = [];
  for (let i = 0; i < points; i++) {
    const t = now - span + (i / (points - 1)) * span;
    const hour = new Date(t).getHours() + new Date(t).getMinutes() / 60;
    // Diurnal temperature curve 20-29 °C
    const temp = 24.5 + Math.sin(((hour - 6) / 24) * Math.PI * 2) * 4 + (Math.random() - 0.5) * 0.6;
    // Humidity inversely related, 45-78%
    const hum = 62 - Math.sin(((hour - 6) / 24) * Math.PI * 2) * 14 + (Math.random() - 0.5) * 3;
    // CO ppm-ish small baseline + a couple of spikes
    const spike = (i > 110 && i < 125) ? 0.9 : (i > 200 && i < 208) ? 0.45 : 0;
    const co = 0.08 + Math.random() * 0.05 + spike;
    // MQ2 gas, similar story
    const gas = 0.04 + Math.random() * 0.03 + (i > 110 && i < 125 ? 0.6 : 0);
    // Occasional sensor fault
    const fault = (i > 70 && i < 74) ? 1 : 0;
    out.push({
      id: i + 1,
      temperatura: fault ? 0 : +temp.toFixed(2),
      humedad: fault ? 0 : +hum.toFixed(2),
      mq7_co: +co.toFixed(3),
      mq2_gas: +gas.toFixed(3),
      dht_error: fault,
      created_at: Math.round(t),
    });
  }
  return out;
};
