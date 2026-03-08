# WeatherBet Backend

API REST para la plataforma de mercados de predicción climática.

## Setup

```bash
cp .env.example .env
# Configura tus credenciales en .env
npm install
npm run dev
```

## Endpoints

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | /api/health | No | Health check |
| GET | /api/markets | No | Listar mercados |
| GET | /api/markets/:id | Opcional | Detalle de mercado |
| POST | /api/markets | Admin | Crear mercado |
| POST | /api/markets/:id/bet | Sí | Apostar |
| GET | /api/wallet | Sí | Balance y transacciones |
| POST | /api/wallet/claim-daily | Sí | Reclamar créditos diarios |
| GET | /api/profile | Sí | Perfil del usuario |
| GET | /api/leaderboard | No | Top 20 jugadores |

## Resolver automático

Cada 30 minutos, el servicio revisa mercados listos para resolverse, consulta OpenWeatherMap y distribuye ganancias automáticamente.
