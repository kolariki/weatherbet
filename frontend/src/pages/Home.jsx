import { useState, useEffect } from 'react';
import { getMarkets } from '../lib/api';
import MarketCard from '../components/MarketCard';
import { Loader2, CloudOff, TrendingUp, Clock, Flame, Sparkles } from 'lucide-react';

const categories = [
  { key: 'all', label: 'Todos', emoji: '🌐' },
  { key: 'politics', label: 'Política', emoji: '🏛️' },
  { key: 'sports', label: 'Deportes', emoji: '⚽' },
  { key: 'crypto', label: 'Crypto', emoji: '₿' },
  { key: 'entertainment', label: 'Entretenimiento', emoji: '🎬' },
  { key: 'economy', label: 'Economía', emoji: '📈' },
  { key: 'technology', label: 'Tecnología', emoji: '💻' },
  { key: 'science', label: 'Ciencia', emoji: '🔬' },
  { key: 'weather', label: 'Clima', emoji: '⛈️' },
  { key: 'culture', label: 'Cultura', emoji: '🎭' },
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
          <span className="gradient-text">Mercados de Predicciones</span>
        </h1>
        <p className="text-[#848e9c] text-sm lg:text-base">
          Predecí el futuro. Ganá por tener razón.
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
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                category === cat.key
                  ? 'bg-[#00b8d4]/10 text-[#00b8d4] border border-[#00b8d4]/30'
                  : 'bg-[#1e2329] text-[#848e9c] hover:bg-[#2b3139] border border-transparent'
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
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  sort === opt.key
                    ? 'bg-[#1e2329] text-[#eaecef] border border-[#2b3139]'
                    : 'text-[#5e6673] hover:text-[#848e9c]'
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
          <Loader2 className="w-8 h-8 animate-spin text-[#00b8d4]" />
        </div>
      ) : markets.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh] text-center">
          <CloudOff className="w-16 h-16 text-[#5e6673] mb-4" />
          <h3 className="text-lg font-semibold text-[#848e9c] mb-2">No hay mercados disponibles</h3>
          <p className="text-sm text-[#5e6673]">Vuelve pronto — se crean nuevos mercados todos los días</p>
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
