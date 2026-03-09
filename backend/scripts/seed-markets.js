/**
 * Seed script — creates sample markets across all categories.
 * Run: node scripts/seed-markets.js
 */
const { supabase } = require('../services/supabaseClient.js');

const now = new Date();
const inDays = (d) => new Date(now.getTime() + d * 86400000).toISOString();

const markets = [
  // Politics
  {
    question: '¿Milei ganará las elecciones legislativas 2025?',
    description: 'Se resuelve SÍ si La Libertad Avanza obtiene mayoría en la Cámara de Diputados.',
    category: 'politics',
    resolution_type: 'manual',
    closes_at: inDays(30),
    resolves_at: inDays(35),
  },
  {
    question: '¿Trump impondrá nuevos aranceles a China antes de julio 2026?',
    description: 'Se resuelve SÍ si se anuncian aranceles adicionales de al menos 10% sobre importaciones chinas.',
    category: 'politics',
    resolution_type: 'manual',
    closes_at: inDays(60),
    resolves_at: inDays(65),
  },
  // Sports
  {
    question: '¿Boca Juniors ganará la Copa Libertadores 2026?',
    description: 'Se resuelve SÍ si Boca Juniors gana la final.',
    category: 'sports',
    resolution_type: 'manual',
    closes_at: inDays(90),
    resolves_at: inDays(95),
  },
  {
    question: '¿Messi jugará el Mundial 2026?',
    description: 'Se resuelve SÍ si Messi es convocado y juega al menos un partido.',
    category: 'sports',
    resolution_type: 'manual',
    closes_at: inDays(45),
    resolves_at: inDays(50),
  },
  // Crypto
  {
    question: '¿Bitcoin superará los $150,000 USD antes del 1 de julio 2026?',
    description: 'Se resuelve SÍ si BTC/USD toca $150,000 en cualquier exchange principal.',
    category: 'crypto',
    resolution_type: 'manual',
    closes_at: inDays(60),
    resolves_at: inDays(62),
  },
  {
    question: '¿Ethereum flippeará a Bitcoin en market cap en 2026?',
    description: 'Se resuelve SÍ si ETH market cap supera a BTC market cap en cualquier momento de 2026.',
    category: 'crypto',
    resolution_type: 'manual',
    closes_at: inDays(120),
    resolves_at: inDays(125),
  },
  // Entertainment
  {
    question: '¿GTA 6 saldrá antes de diciembre 2026?',
    description: 'Se resuelve SÍ si Rockstar lanza GTA 6 al público antes del 31/12/2026.',
    category: 'entertainment',
    resolution_type: 'manual',
    closes_at: inDays(90),
    resolves_at: inDays(95),
  },
  {
    question: '¿La película de Mario Bros 2 recaudará más de $1B?',
    description: 'Se resuelve SÍ si supera $1 billion en taquilla global.',
    category: 'entertainment',
    resolution_type: 'manual',
    closes_at: inDays(60),
    resolves_at: inDays(65),
  },
  // Economy
  {
    question: '¿El dólar blue superará los $2000 ARS en 2026?',
    description: 'Se resuelve SÍ si el dólar blue toca $2000 en casas de cambio.',
    category: 'economy',
    resolution_type: 'manual',
    closes_at: inDays(90),
    resolves_at: inDays(95),
  },
  {
    question: '¿La Fed bajará las tasas de interés antes de septiembre 2026?',
    description: 'Se resuelve SÍ si la Federal Reserve reduce la tasa de fondos federales.',
    category: 'economy',
    resolution_type: 'manual',
    closes_at: inDays(120),
    resolves_at: inDays(125),
  },
  // Technology
  {
    question: '¿Apple lanzará un iPhone plegable en 2026?',
    description: 'Se resuelve SÍ si Apple anuncia oficialmente un iPhone con pantalla plegable.',
    category: 'technology',
    resolution_type: 'manual',
    closes_at: inDays(120),
    resolves_at: inDays(125),
  },
  {
    question: '¿OpenAI lanzará GPT-5 antes de julio 2026?',
    description: 'Se resuelve SÍ si OpenAI hace disponible GPT-5 al público.',
    category: 'technology',
    resolution_type: 'manual',
    closes_at: inDays(60),
    resolves_at: inDays(65),
  },
  // Science
  {
    question: '¿SpaceX llegará a Marte en 2026?',
    description: 'Se resuelve SÍ si una nave Starship de SpaceX aterriza en Marte.',
    category: 'science',
    resolution_type: 'manual',
    closes_at: inDays(120),
    resolves_at: inDays(125),
  },
  // Weather (auto-resolved)
  {
    question: '¿La temperatura en Buenos Aires superará los 35°C mañana?',
    description: 'Se resuelve automáticamente con datos de OpenWeatherMap.',
    category: 'weather',
    city: 'Buenos Aires',
    country_code: 'AR',
    metric: 'temp_max',
    operator: '>',
    threshold: 35,
    resolution_type: 'auto',
    closes_at: inDays(1),
    resolves_at: inDays(1.5),
  },
  {
    question: '¿Lloverá más de 10mm en Córdoba esta semana?',
    description: 'Se resuelve automáticamente con datos de OpenWeatherMap.',
    category: 'weather',
    city: 'Córdoba',
    country_code: 'AR',
    metric: 'rain',
    operator: '>',
    threshold: 10,
    resolution_type: 'auto',
    closes_at: inDays(5),
    resolves_at: inDays(7),
  },
  // Culture
  {
    question: '¿Argentina ganará más de 5 premios Oscar en 2027?',
    description: 'Se resuelve SÍ si películas argentinas ganan 5+ premios Oscar.',
    category: 'culture',
    resolution_type: 'manual',
    closes_at: inDays(150),
    resolves_at: inDays(155),
  },
];

async function seed() {
  console.log(`Seeding ${markets.length} markets...`);
  
  for (const market of markets) {
    const { data, error } = await supabase
      .from('markets')
      .insert(market)
      .select()
      .single();
    
    if (error) {
      console.error(`❌ ${market.question.slice(0, 50)}:`, error.message);
    } else {
      console.log(`✅ ${data.id}: ${market.question.slice(0, 60)}`);
    }
  }
  
  console.log('Done!');
}

seed();
