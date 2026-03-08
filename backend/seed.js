import { supabase } from './services/supabaseClient.js';

const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(18, 0, 0, 0);

const resolvesAt = new Date(tomorrow);
resolvesAt.setHours(23, 0, 0, 0);

const dayAfter = new Date();
dayAfter.setDate(dayAfter.getDate() + 2);
dayAfter.setHours(18, 0, 0, 0);

const resolvesAfter = new Date(dayAfter);
resolvesAfter.setHours(23, 0, 0, 0);

const markets = [
  {
    question: '¿Temperatura máxima en CDMX > 28°C mañana?',
    description: 'Se resuelve con la temperatura máxima registrada en Ciudad de México.',
    city: 'Mexico City',
    country_code: 'MX',
    metric: 'temp_max',
    operator: '>',
    threshold: 28,
    category: 'temperature',
    closes_at: tomorrow.toISOString(),
    resolves_at: resolvesAt.toISOString(),
  },
  {
    question: '¿Lloverá en Cancún mañana? (>1mm)',
    description: 'Se resuelve si la precipitación acumulada supera 1mm.',
    city: 'Cancun',
    country_code: 'MX',
    metric: 'rain',
    operator: '>',
    threshold: 1,
    category: 'rain',
    closes_at: tomorrow.toISOString(),
    resolves_at: resolvesAt.toISOString(),
  },
  {
    question: '¿Viento > 20 km/h en Monterrey mañana?',
    description: 'Se resuelve con la velocidad del viento en Monterrey.',
    city: 'Monterrey',
    country_code: 'MX',
    metric: 'wind_speed',
    operator: '>',
    threshold: 5.5,
    category: 'wind',
    closes_at: tomorrow.toISOString(),
    resolves_at: resolvesAt.toISOString(),
  },
  {
    question: '¿Humedad > 70% en Guadalajara mañana?',
    description: 'Se resuelve con el porcentaje de humedad relativa.',
    city: 'Guadalajara',
    country_code: 'MX',
    metric: 'humidity',
    operator: '>',
    threshold: 70,
    category: 'humidity',
    closes_at: tomorrow.toISOString(),
    resolves_at: resolvesAt.toISOString(),
  },
  {
    question: '¿Temperatura mínima en Tijuana < 10°C mañana?',
    description: 'Se resuelve con la temperatura mínima registrada en Tijuana.',
    city: 'Tijuana',
    country_code: 'MX',
    metric: 'temp_min',
    operator: '<',
    threshold: 10,
    category: 'temperature',
    closes_at: tomorrow.toISOString(),
    resolves_at: resolvesAt.toISOString(),
  },
  {
    question: '¿Temperatura > 35°C en Monterrey pasado mañana?',
    description: 'Monterrey es conocida por su calor extremo. ¿Superará los 35°C?',
    city: 'Monterrey',
    country_code: 'MX',
    metric: 'temp_max',
    operator: '>',
    threshold: 35,
    category: 'temperature',
    closes_at: dayAfter.toISOString(),
    resolves_at: resolvesAfter.toISOString(),
  },
  {
    question: '¿Lluvia en CDMX pasado mañana? (>0.5mm)',
    description: 'Temporada de lluvias en la capital. ¿Caerá agua?',
    city: 'Mexico City',
    country_code: 'MX',
    metric: 'rain',
    operator: '>',
    threshold: 0.5,
    category: 'rain',
    closes_at: dayAfter.toISOString(),
    resolves_at: resolvesAfter.toISOString(),
  },
  {
    question: '¿Visibilidad > 8km en Guadalajara mañana?',
    description: 'Se resuelve con la visibilidad reportada en kilómetros.',
    city: 'Guadalajara',
    country_code: 'MX',
    metric: 'visibility',
    operator: '>',
    threshold: 8,
    category: 'other',
    closes_at: tomorrow.toISOString(),
    resolves_at: resolvesAt.toISOString(),
  },
];

async function seed() {
  console.log('🌱 Seeding markets...');

  for (const market of markets) {
    const { data, error } = await supabase
      .from('markets')
      .insert(market)
      .select()
      .single();

    if (error) {
      console.error(`❌ Error creating market "${market.question}":`, error.message);
    } else {
      console.log(`✅ Created: ${data.question} (ID: ${data.id})`);
    }
  }

  console.log('\n🎉 Seed complete!');
  process.exit(0);
}

seed();
