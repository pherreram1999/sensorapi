CREATE TABLE IF NOT EXISTS readings (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  temperatura REAL,
  humedad     REAL,
  mq7_co      REAL,
  mq2_gas     REAL,
  dht_error   INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_readings_created_at
  ON readings (created_at DESC);
