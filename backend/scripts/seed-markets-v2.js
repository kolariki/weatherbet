/**
 * Seed v2 — Delete old markets and create 25+ interesting prediction markets.
 * Run: node scripts/seed-markets-v2.js
 */
const { supabase } = require('../services/supabaseClient.js');

const now = new Date();
const inDays = (d) => new Date(now.getTime() + d * 86400000).toISOString();

const markets = [
  // ⚽ SPORTS — Mundial 2026 (June 11 - July 19)
  {
    question: '¿Argentina llegará a la final del Mundial 2026?',
    description: 'Se resuelve SÍ si Argentina juega la final del Mundial 2026 (19 de julio).',
    category: 'sports',
    resolution_type: 'manual',
    closes_at: inDays(120),
    resolves_at: inDays(135),
  },
  {
    question: '¿Lautaro Martínez será el goleador del Mundial 2026?',
    description: 'Se resuelve SÍ si Lautaro termina como máximo goleador (Bota de Oro).',
    category: 'sports',
    resolution_type: 'manual',
    closes_at: inDays(130),
    resolves_at: inDays(135),
  },
  {
    question: '¿Habrá algún 0-0 en la fase de grupos del Mundial 2026?',
    description: 'Se resuelve SÍ si al menos un partido de fase de grupos termina 0-0.',
    category: 'sports',
    resolution_type: 'manual',
    closes_at: inDays(105),
    resolves_at: inDays(110),
  },
  {
    question: '¿Una selección africana llegará a semifinales del Mundial 2026?',
    description: 'Se resuelve SÍ si cualquier selección de la CAF llega a semis.',
    category: 'sports',
    resolution_type: 'manual',
    closes_at: inDays(125),
    resolves_at: inDays(130),
  },
  {
    question: '¿Mbappé marcará más de 5 goles en el Mundial 2026?',
    description: 'Se resuelve SÍ si Mbappé anota 6 o más goles en todo el torneo.',
    category: 'sports',
    resolution_type: 'manual',
    closes_at: inDays(130),
    resolves_at: inDays(135),
  },
  {
    question: '¿River Plate ganará la Copa Libertadores 2026?',
    description: 'Se resuelve SÍ si River gana la final de la Libertadores 2026.',
    category: 'sports',
    resolution_type: 'manual',
    closes_at: inDays(180),
    resolves_at: inDays(185),
  },
  
  // ₿ CRYPTO
  {
    question: '¿Bitcoin superará los $120,000 USD antes de junio 2026?',
    description: 'Se resuelve SÍ si BTC/USD toca $120,000 en Binance/Coinbase antes del 1/6/2026.',
    category: 'crypto',
    resolution_type: 'manual',
    closes_at: inDays(80),
    resolves_at: inDays(85),
  },
  {
    question: '¿Solana superará los $300 antes de julio 2026?',
    description: 'Se resuelve SÍ si SOL/USD toca $300 en cualquier exchange top.',
    category: 'crypto',
    resolution_type: 'manual',
    closes_at: inDays(100),
    resolves_at: inDays(105),
  },
  {
    question: '¿Se aprobará un ETF de Solana en USA en 2026?',
    description: 'Se resuelve SÍ si la SEC aprueba un ETF spot de Solana antes del 31/12/2026.',
    category: 'crypto',
    resolution_type: 'manual',
    closes_at: inDays(200),
    resolves_at: inDays(205),
  },

  // 🏛️ POLITICS
  {
    question: '¿Trump retirará a USA del Acuerdo de París antes de agosto 2026?',
    description: 'Se resuelve SÍ si USA oficializa su salida del Acuerdo de París.',
    category: 'politics',
    resolution_type: 'manual',
    closes_at: inDays(120),
    resolves_at: inDays(125),
  },
  {
    question: '¿Milei eliminará el cepo cambiario antes de julio 2026?',
    description: 'Se resuelve SÍ si se elimina completamente el cepo al dólar oficial.',
    category: 'politics',
    resolution_type: 'manual',
    closes_at: inDays(100),
    resolves_at: inDays(105),
  },
  {
    question: '¿Habrá un nuevo conflicto armado entre países de la OTAN en 2026?',
    description: 'Se resuelve SÍ si un país miembro de la OTAN entra en un conflicto armado directo nuevo.',
    category: 'politics',
    resolution_type: 'manual',
    closes_at: inDays(200),
    resolves_at: inDays(205),
  },

  // 💻 TECHNOLOGY
  {
    question: '¿OpenAI lanzará GPT-5 antes de septiembre 2026?',
    description: 'Se resuelve SÍ si OpenAI lanza un modelo oficialmente llamado GPT-5 al público.',
    category: 'technology',
    resolution_type: 'manual',
    closes_at: inDays(150),
    resolves_at: inDays(155),
  },
  {
    question: '¿Apple presentará un dispositivo de IA wearable nuevo en la WWDC 2026?',
    description: 'Se resuelve SÍ si Apple presenta un producto wearable nuevo (no Apple Watch/AirPods) con IA.',
    category: 'technology',
    resolution_type: 'manual',
    closes_at: inDays(90),
    resolves_at: inDays(95),
  },
  {
    question: '¿Tesla lanzará el Robotaxi comercialmente antes de diciembre 2026?',
    description: 'Se resuelve SÍ si Tesla pone en operación comercial su servicio de robotaxi.',
    category: 'technology',
    resolution_type: 'manual',
    closes_at: inDays(200),
    resolves_at: inDays(205),
  },

  // 📈 ECONOMY
  {
    question: '¿El dólar blue argentino superará los $1,800 antes de junio 2026?',
    description: 'Se resuelve SÍ si el dólar blue toca $1,800 ARS en cualquier momento.',
    category: 'economy',
    resolution_type: 'manual',
    closes_at: inDays(80),
    resolves_at: inDays(85),
  },
  {
    question: '¿La Fed bajará las tasas de interés en la reunión de junio 2026?',
    description: 'Se resuelve SÍ si la Federal Reserve reduce la federal funds rate en su reunión de junio.',
    category: 'economy',
    resolution_type: 'manual',
    closes_at: inDays(85),
    resolves_at: inDays(87),
  },
  {
    question: '¿Nvidia superará los $200 por acción antes de julio 2026?',
    description: 'Se resuelve SÍ si NVDA toca $200 en el NASDAQ.',
    category: 'economy',
    resolution_type: 'manual',
    closes_at: inDays(100),
    resolves_at: inDays(105),
  },

  // 🎬 ENTERTAINMENT
  {
    question: '¿GTA 6 se retrasará más allá de 2026?',
    description: 'Se resuelve SÍ si Rockstar anuncia oficialmente que GTA 6 no saldrá en 2026.',
    category: 'entertainment',
    resolution_type: 'manual',
    closes_at: inDays(200),
    resolves_at: inDays(205),
  },
  {
    question: '¿La serie de The Last of Us temporada 2 superará los 30M de viewers por episodio?',
    description: 'Se resuelve SÍ si algún episodio de la T2 supera 30 millones de espectadores.',
    category: 'entertainment',
    resolution_type: 'manual',
    closes_at: inDays(90),
    resolves_at: inDays(95),
  },
  {
    question: '¿Bad Bunny lanzará un nuevo álbum antes de agosto 2026?',
    description: 'Se resuelve SÍ si Bad Bunny lanza un álbum de estudio nuevo.',
    category: 'entertainment',
    resolution_type: 'manual',
    closes_at: inDays(120),
    resolves_at: inDays(125),
  },

  // 🔬 SCIENCE
  {
    question: '¿SpaceX logrará recuperar con éxito el booster de Starship en el próximo lanzamiento?',
    description: 'Se resuelve SÍ si el próximo intento de recuperación del Super Heavy es exitoso.',
    category: 'science',
    resolution_type: 'manual',
    closes_at: inDays(60),
    resolves_at: inDays(65),
  },
  {
    question: '¿Se descubrirá un nuevo exoplaneta habitable antes de diciembre 2026?',
    description: 'Se resuelve SÍ si NASA/ESA confirma un nuevo exoplaneta en zona habitable.',
    category: 'science',
    resolution_type: 'manual',
    closes_at: inDays(200),
    resolves_at: inDays(205),
  },

  // ⛈️ WEATHER (auto-resolved)
  {
    question: '¿La temperatura en Buenos Aires superará los 30°C esta semana?',
    description: 'Se resuelve automáticamente con datos de OpenWeatherMap.',
    category: 'weather',
    city: 'Buenos Aires',
    country_code: 'AR',
    metric: 'temp_max',
    operator: '>',
    threshold: 30,
    resolution_type: 'auto',
    closes_at: inDays(5),
    resolves_at: inDays(7),
  },
  {
    question: '¿Lloverá en Córdoba en las próximas 48 horas?',
    description: 'Se resuelve automáticamente. SÍ si llueve más de 1mm.',
    category: 'weather',
    city: 'Córdoba',
    country_code: 'AR',
    metric: 'rain',
    operator: '>',
    threshold: 1,
    resolution_type: 'auto',
    closes_at: inDays(2),
    resolves_at: inDays(3),
  },

  // 🎭 CULTURE
  {
    question: '¿Argentina ganará algún Oscar en la ceremonia 2027?',
    description: 'Se resuelve SÍ si alguna película argentina gana un premio Oscar.',
    category: 'culture',
    resolution_type: 'manual',
    closes_at: inDays(250),
    resolves_at: inDays(255),
  },
];

async function seed() {
  // Delete existing open markets
  console.log('Deleting old markets...');
  const { error: delErr } = await supabase
    .from('markets')
    .delete()
    .eq('status', 'open');
  if (delErr) console.error('Delete error:', delErr.message);

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
