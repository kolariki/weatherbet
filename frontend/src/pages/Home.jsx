import { useState, useEffect } from 'react';
import { getMarkets } from '../lib/api';
import MarketCard from '../components/MarketCard';
import { Loader2, CloudOff, TrendingUp, Clock, Flame, Sparkles } from 'lucide-react';

const categories = [
  { key: 'all', label: 'Todos', emoji: '🌍' },
  { key: 'temperature', label: 'Temperatura', emoji: '🌡️' },
  { key: 'rain', label: 'Lluvia', emoji: '🌧️' },
  { key: 'wind', label: 'Viento', emoji: '💨' },
  { key: 'humidity', label: 'Humedad', emoji: '💧' },
  { key: 'other', label: 'Otros', emoji: '🔮' },
];

const sortOptions = [
  { key: 'closing', label: 'Cierra pronto', icon: Clock },
  { key: 'popular', label: 'Popular', icon: Flame },
  { key: 'newest', label: 'Reciente', icon: Sparkles },
];

export default function Home() {
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('all');
  const [sort, setSort] = useState('closing');

  useEffect(() => {
    fetchMarkets();
  }, [category, sort]);

  async function fetchMarkets() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (category !== 'all') params.set('category', category);
      if (sort !== 'closing') params.set('sort', sort);
      const data = await getMarkets(params.toString());
      setMarkets(data);
    } catch (e) {
      console.error('Error fetching markets:', e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Hero */}
      <div className="mb-8">
        <h1 className="text-3xl lg:text-4xl font-bold mb-2">
          <span className="gradient-text">Mercados de Predicción</span> ⛈️
        </h1>
        <p className="text-gray-400 text-sm lg:text-base">
          Apuesta sobre el clima de ciudades mexicanas con créditos virtuales
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {/* Category tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 flex-1">
          {categories.map((cat) => (
            <button
              key={cat.key}
              onClick={() => setCategory(cat.key)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                category === cat.key
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-white/5 text-gray-400 hover:bg-white/10 border border-transparent'
              }`}
            >
              <span>{cat.emoji}</span>
              {cat.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="flex gap-2">
          {sortOptions.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                onClick={() => setSort(opt.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                  sort === opt.key
                    ? 'bg-white/10 text-white border border-white/10'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                <Icon className="w-3 h-3" />
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
        </div>
      ) : markets.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <CloudOff className="w-16 h-16 text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-400 mb-2">No hay mercados disponibles</h3>
          <p className="text-sm text-gray-500">Vuelve pronto — se crean nuevos mercados todos los días</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {markets.map((market) => (
            <MarketCard key={market.id} market={market} />
          ))}
        </div>
      )}
    </div>
  );
}
