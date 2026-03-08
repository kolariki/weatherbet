import { supabase } from './supabaseClient.js';

const API_KEY = process.env.OPENWEATHER_API_KEY;
const BASE_URL = 'https://api.openweathermap.org/data/2.5';

const cache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

export async function getWeatherData(city, countryCode = 'MX') {
  const cacheKey = `${city}-${countryCode}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  try {
    const query = `${city},${countryCode}`;
    const res = await fetch(
      `${BASE_URL}/weather?q=${encodeURIComponent(query)}&units=metric&appid=${API_KEY}`
    );

    if (!res.ok) {
      throw new Error(`OpenWeatherMap API error: ${res.status} ${res.statusText}`);
    }

    const raw = await res.json();

    const weatherData = {
      temp: raw.main.temp,
      temp_min: raw.main.temp_min,
      temp_max: raw.main.temp_max,
      humidity: raw.main.humidity,
      wind_speed: raw.wind.speed,
      rain: raw.rain ? raw.rain['1h'] || raw.rain['3h'] || 0 : 0,
      visibility: raw.visibility ? raw.visibility / 1000 : 10,
      description: raw.weather?.[0]?.description || '',
      icon: raw.weather?.[0]?.icon || '',
      feels_like: raw.main.feels_like,
      pressure: raw.main.pressure,
      clouds: raw.clouds?.all || 0,
    };

    // Cache in memory
    cache.set(cacheKey, { data: weatherData, timestamp: Date.now() });

    // Save snapshot to DB
    const metrics = ['temp', 'temp_min', 'temp_max', 'humidity', 'wind_speed', 'rain', 'visibility'];
    const snapshots = metrics.map((metric) => ({
      city,
      country_code: countryCode,
      metric,
      value: weatherData[metric],
      raw_data: raw,
      api_source: 'openweathermap',
    }));

    await supabase.from('weather_snapshots').insert(snapshots).throwOnError().catch(() => {});

    return weatherData;
  } catch (error) {
    console.error(`Error fetching weather for ${city}, ${countryCode}:`, error.message);
    throw error;
  }
}

export function evaluateCondition(value, operator, threshold) {
  switch (operator) {
    case '>': return value > threshold;
    case '<': return value < threshold;
    case '>=': return value >= threshold;
    case '<=': return value <= threshold;
    case '=': return Math.abs(value - threshold) < 0.5;
    default: return false;
  }
}
