# WeatherBet ⛈️

Plataforma de mercados de predicción climática. Apuesta con créditos virtuales sobre el clima de ciudades mexicanas.

## Arquitectura

- **Backend:** Node.js + Express + Supabase
- **Frontend:** React + Vite + Tailwind CSS
- **Base de datos:** Supabase (PostgreSQL)
- **API del clima:** OpenWeatherMap

## Setup rápido

### 1. Base de datos
Ejecuta `backend/schema.sql` en tu proyecto de Supabase.

### 2. Backend
```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales
npm install
npm run dev
```

### 3. Frontend
```bash
cd frontend
cp .env.example .env
# Edita .env con tus credenciales
npm install
npm run dev
```

### 4. Seed data
```bash
cd backend
node seed.js
```

## Características

- 🌡️ Mercados de predicción sobre temperatura, lluvia, viento y humedad
- 💰 Sistema de créditos virtuales con claim diario
- 📊 Odds dinámicos basados en el pool de apuestas
- 🏆 Leaderboard y estadísticas de usuario
- 🤖 Resolución automática con datos reales del clima
- 📱 Diseño responsive mobile-first

## Tech Stack

| Componente | Tecnología |
|-----------|-----------|
| Frontend | React 18, Vite, Tailwind CSS, Lucide Icons |
| Backend | Node.js, Express, node-cron |
| Auth | Supabase Auth |
| DB | Supabase (PostgreSQL + RLS) |
| Weather | OpenWeatherMap API |
