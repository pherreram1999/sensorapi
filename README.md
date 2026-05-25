# soc8

Dashboard en tiempo real para lecturas de sensores ambientales. Recibe datos desde dispositivos IoT y los visualiza en gráficas interactivas.

**Stack:** Bun · TypeScript · Vue 3 · Vite · Chart.js · libSQL (SQLite / Turso)

---

## Sensores soportados

| Campo | Descripción |
|---|---|
| `temperatura` | Temperatura en °C (DHT) |
| `humedad` | Humedad relativa % (DHT) |
| `mq7_co` | Concentración de CO — sensor MQ-7 |
| `mq2_gas` | Gas inflamable / humo — sensor MQ-2 |
| `dht_error` | `true` si el sensor DHT reportó error de lectura |

---

## Requisitos previos

- [Bun](https://bun.sh) ≥ 1.3
- Docker + Docker Compose (para correr en contenedor)
- Base de datos libSQL: archivo local **o** instancia [Turso](https://turso.tech)

---

## Configuración

Copia `.env.example` y completa los valores:

```bash
cp .env.example .env
```

### Variables de entorno

| Variable | Requerida | Default | Descripción |
|---|---|---|---|
| `DATABASE_URL` | ✅ | — | `file:data/soc8.db` (local) o `libsql://<db>.<org>.turso.io` |
| `DATABASE_AUTH_TOKEN` | Solo Turso | — | Token de autenticación Turso |
| `API_SECRET_KEY` | ✅ | — | Clave para proteger el endpoint de ingesta |
| `PORT` | No | `8080` | Puerto del servidor |
| `HOST` | No | `0.0.0.0` | Bind address |
| `DEFAULT_POLL_MS` | No | `3000` | Intervalo de polling del dashboard (ms) |

#### Base de datos local (SQLite)

```env
DATABASE_URL=file:data/soc8.db
API_SECRET_KEY=cambia-esto
```

#### Base de datos remota (Turso)

```env
DATABASE_URL=libsql://<db-name>-<org>.turso.io
DATABASE_AUTH_TOKEN=<token>
API_SECRET_KEY=cambia-esto
```

---

## Desarrollo local

```bash
# Instalar dependencias
bun install
cd frontend && bun install && cd ..

# Levantar servidor (aplica migraciones automáticamente)
bun server/index.ts

# Levantar frontend con hot-reload (en otra terminal)
cd frontend && bun run dev
```

El frontend dev proxy redirige `/api/*` al servidor en `localhost:8080`.

---

## Docker

### Con Docker Compose (recomendado)

```bash
# 1. Crear .env con las variables requeridas
cp .env.example .env

# 2. Construir e iniciar
docker compose up --build

# 3. Detener
docker compose down
```

El servicio queda disponible en `http://localhost:8080`.

> Los datos persisten en `./data/` gracias al bind mount configurado en `docker-compose.yml`.  
> Para base de datos local, usa `DATABASE_URL=file:/app/data/soc8.db` en el `.env`.

### Build manual

```bash
docker build -t soc8 .
docker run -p 8080:8080 --env-file .env -v $(pwd)/data:/app/data soc8
```

---

## API

### `GET /api/health`

```json
{ "status": "ok" }
```

### `GET /api/readings`

Retorna lecturas ordenadas por tiempo. Sin parámetros devuelve la última hora.

| Query param | Default | Descripción |
|---|---|---|
| `from` | `now - 1h` | Timestamp Unix en ms |
| `to` | `now` | Timestamp Unix en ms |
| `limit` | `5000` | Máximo 5000 |

```json
{
  "rows": [
    {
      "id": 1,
      "temperatura": 24.5,
      "humedad": 60.2,
      "mq7_co": 0.12,
      "mq2_gas": 0.05,
      "dht_error": false,
      "created_at": 1716638400000
    }
  ],
  "count": 1
}
```

### `POST /api/readings`

Requiere autenticación via header:

```
X-API-Key: <API_SECRET_KEY>
# o bien
Authorization: Bearer <API_SECRET_KEY>
```

**Body:**

```json
{
  "temperatura": 24.5,
  "humedad": 60.2,
  "mq7_co": 0.12,
  "mq2_gas": 0.05,
  "dht_error": false
}
```

Todos los campos numéricos aceptan `null` (lectura no disponible). `dht_error` es booleano requerido.

**Respuesta `201`:**

```json
{ "id": 42, "created_at": 1716638400000 }
```

#### Ejemplo con curl

```bash
curl -X POST http://localhost:8080/api/readings \
  -H "Content-Type: application/json" \
  -H "X-API-Key: tu-clave-secreta" \
  -d '{"temperatura":24.5,"humedad":60.2,"mq7_co":0.12,"mq2_gas":0.05,"dht_error":false}'
```

---

## Estructura del proyecto

```
soc8/
├── server/
│   ├── index.ts          # Servidor Bun + rutas
│   ├── auth.ts           # Middleware API key
│   ├── config.ts         # Variables de entorno
│   ├── db.ts             # Cliente libSQL + migraciones
│   ├── migrations/
│   │   └── 001_init.sql  # Schema inicial
│   └── routes/
│       ├── health.ts
│       └── readings.ts
├── frontend/
│   └── src/
│       ├── App.vue
│       └── components/
│           ├── SensorChart.vue
│           ├── RangeSelector.vue
│           └── PollControls.vue
├── Dockerfile
├── docker-compose.yml
└── .env.example
```
