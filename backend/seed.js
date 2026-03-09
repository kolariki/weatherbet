const { supabase } = require('./services/supabaseClient.js');

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
    question: '¿Temperatura máxima en Buenos Aires > 30°C mañana?',
    description: 'Se resuelve con la temperatura máxima registrada en CABA.',
    city: 'Buenos Aires',
    country_code: 'AR',
    metric: 'temp_max',
    operator: '>',
    threshold: 30,
    category: 'temperature',
    closes_at: tomorrow.toISOString(),
    resolves_at: resolvesAt.toISOString(),
  },
  {
    question: '¿Lloverá en Córdoba mañana? (>1mm)',
    description: 'Se resuelve si la precipitación acumulada supera 1mm en Córdoba.',
    city: 'Cordoba',
    country_code: 'AR',
    metric: 'rain',
    operator: '>',
    threshold: 1,
    category: 'rain',
    closes_at: tomorrow.toISOString(),
    resolves_at: resolvesAt.toISOString(),
  },
  {
    question: '¿Viento > 30 km/h en Mar del Plata mañana?',
    description: 'La costa atlántica es conocida por sus vientos. ¿Superará los 30 km/h?',
    city: 'Mar del Plata',
    country_code: 'AR',
    metric: 'wind_speed',
    operator: '>',
    threshold: 8.3,
    category: 'wind',
    closes_at: tomorrow.toISOString(),
    resolves_at: resolvesAt.toISOString(),
  },
  {
    question: '¿Humedad > 80% en Rosario mañana?',
    description: 'Se resuelve con el porcentaje de humedad relativa en Rosario.',
    city: 'Rosario',
    country_code: 'AR',
    metric: 'humidity',
    operator: '>',
    threshold: 80,
    category: 'humidity',
    closes_at: tomorrow.toISOString(),
    resolves_at: resolvesAt.toISOString(),
  },
  {
    question: '¿Temperatura mínima en Mendoza < 12°C mañana?',
    description: 'Se resuelve con la temperatura mínima registrada en Mendoza.',
    city: 'Mendoza',
    country_code: 'AR',
    metric: 'temp_min',
    operator: '<',
    threshold: 12,
    category: 'temperature',
    closes_at: tomorrow.toISOString(),
    resolves_at: resolvesAt.toISOString(),
  },
  {
    question: '¿Temperatura > 40°C en Resistencia pasado mañana?',
    description: 'El Chaco es una de las zonas más calurosas del país. ¿Llegará a 40°C?',
    city: 'Resistencia',
    country_code: 'AR',
    metric: 'temp_max',
    operator: '>',
    threshold: 40,
    category: 'temperature',
    closes_at: dayAfter.toISOString(),
    resolves_at: resolvesAfter.toISOString(),
  },
  {
    question: '¿Lluvia en Bariloche pasado mañana? (>0.5mm)',
    description: 'La Patagonia andina tiene lluvias frecuentes. ¿Caerá agua?',
    city: 'San Carlos de Bariloche',
    country_code: 'AR',
    metric: 'rain',
    operator: '>',
    threshold: 0.5,
    category: 'rain',
    closes_at: dayAfter.toISOString(),
    resolves_at: resolvesAfter.toISOString(),
  },
  {
    question: '¿Visibilidad > 8km en Tucumán mañana?',
    description: 'Se resuelve con la visibilidad reportada en kilómetros.',
    city: 'San Miguel de Tucuman',
    country_code: 'AR',
    metric: 'visibility',
    operator: '>',
    threshold: 8,
    category: 'other',
    closes_at: tomorrow.toISOString(),
    resolves_at: resolvesAt.toISOString(),
  },
];

async function seed() {
  console.log('🌱 Borrando mercados anteriores...');
  await supabase.from('markets').delete().neq('id', 0);
  
  console.log('🌱 Creando mercados argentinos...');

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
