import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMarket, placeBet, getQuote, sellPosition, getSellQuote, getPriceHistory } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import OddsBar from '../components/OddsBar';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Clock, MapPin, Coins, Loader2, CheckCircle, XCircle,
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight,
} from 'lucide-react';

const metricLabels = {
  temp_max: 'Temp. Máxima', temp_min: 'Temp. Mínima', temp: 'Temperatura',
  rain: 'Precipitación', wind_speed: 'Vel. del Viento', humidity: 'Humedad', visibility: 'Visibilidad',
};
const metricUnits = {
  temp_max: '°C', temp_min: '°C', temp: '°C', rain: 'mm',
  wind_speed: 'm/s', humidity: '%', visibility: 'km',
};

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    function update() {
      const diff = new Date(targetDate).getTime() - Date.now();
      if (diff <= 0) { setTimeLeft('Cerrado'); return; }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(d > 0 ? `${d}d ${h}h ${m}m` : h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    }
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [targetDate]);
  return timeLeft;
}

// Simple price chart using SVG
function PriceChart({ data }) {
  if (!data || data.length < 2) return null;

  const width = 600;
  const height = 200;
  const padding = { top: 20, right: 20, bottom: 30, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const prices = data.map(d => d.yes_price * 100);
  const minP = Math.max(0, Math.min(...prices) - 5);
  const maxP = Math.min(100, Math.max(...prices) + 5);
  const range = maxP - minP || 1;

  const points = prices.map((p, i) => {
    const x = padding.left + (i / (prices.length - 1)) * chartW;
    const y = padding.top + chartH - ((p - minP) / range) * chartH;
    return `${x},${y}`;
  }).join(' ');

  // Area fill
  const areaPoints = `${padding.left},${padding.top + chartH} ${points} ${padding.left + chartW},${padding.top + chartH}`;

  // Grid lines
  const gridLines = [25, 50, 75].filter(v => v >= minP && v <= maxP);

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
        {/* Grid */}
        {gridLines.map(v => {
          const y = padding.top + chartH - ((v - minP) / range) * chartH;
          return (
            <g key={v}>
              <line x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke="rgba(255,255,255,0.06)" strokeDasharray="4,4" />
              <text x={padding.left - 8} y={y + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="11">{v}%</text>
            </g>
          );
        })}

        {/* Area gradient */}
        <defs>
          <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={areaPoints} fill="url(#areaGrad)" />

        {/* Line */}
        <polyline points={points} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {/* Current price dot */}
        {(() => {
          const lastX = padding.left + chartW;
          const lastY = padding.top + chartH - ((prices[prices.length - 1] - minP) / range) * chartH;
          return (
            <>
              <circle cx={lastX} cy={lastY} r="4" fill="#10b981" />
              <circle cx={lastX} cy={lastY} r="8" fill="#10b981" opacity="0.3">
                <animate attributeName="r" from="4" to="12" dur="1.5s" repeatCount="indefinite" />
                <animate attributeName="opacity" from="0.4" to="0" dur="1.5s" repeatCount="indefinite" />
              </circle>
            </>
          );
        })()}

        {/* Axes */}
        <text x={padding.left - 8} y={padding.top + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="11">{maxP.toFixed(0)}%</text>
        <text x={padding.left - 8} y={padding.top + chartH + 4} textAnchor="end" fill="rgba(255,255,255,0.3)" fontSize="11">{minP.toFixed(0)}%</text>
      </svg>
    </div>
  );
}

export default function MarketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile, refreshProfile } = useAuth();
  const [market, setMarket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [side, setSide] = useState('YES');
  const [amount, setAmount] = useState(100);
  const [betting, setBetting] = useState(false);
  const [selling, setSelling] = useState(null);
  const [expandedTrade, setExpandedTrade] = useState(null);
  const [quote, setQuote] = useState(null);
  const [priceHistory, setPriceHistory] = useState([]);
  const [sellQuotes, setSellQuotes] = useState({});  // { positionId: credits_out }

  const countdown = useCountdown(market?.closes_at);

  useEffect(() => { fetchMarket(); fetchPriceHistory(); }, [id]);

  // Fetch real sell values for active positions
  useEffect(() => {
    if (!market?.user_position?.positions?.length) return;
    const activePositions = market.user_position.positions.filter(p => p.status === 'active');
    if (!activePositions.length) return;
    Promise.all(activePositions.map(async (pos) => {
      try {
        const shares = pos.shares || pos.amount;
        const q = await getSellQuote(id, pos.side, shares);
        return { id: pos.id, credits_out: q.credits_out };
      } catch { return null; }
    })).then(results => {
      const map = {};
      results.filter(Boolean).forEach(r => { map[r.id] = r.credits_out; });
      setSellQuotes(map);
    });
  }, [market?.user_position?.positions, market?.yes_liquidity]);

  // Fetch quote when amount/side changes
  useEffect(() => {
    if (!amount || amount <= 0 || !market || market.status !== 'open') { setQuote(null); return; }
    const timer = setTimeout(async () => {
      try {
        const q = await getQuote(id, side, amount);
        setQuote(q);
      } catch { setQuote(null); }
    }, 300);
    return () => clearTimeout(timer);
  }, [amount, side, id, market?.yes_liquidity]);

  async function fetchMarket() {
    setLoading(true);
    try { setMarket(await getMarket(id)); }
    catch { toast.error('Error al cargar mercado'); }
    finally { setLoading(false); }
  }

  async function fetchPriceHistory() {
    try { setPriceHistory(await getPriceHistory(id)); }
    catch { /* ignore */ }
  }

  async function handleBet() {
    if (!user) { navigate('/login'); return; }
    if (amount <= 0) { toast.error('Ingresa un monto válido'); return; }
    setBetting(true);
    try {
      await placeBet(id, side, amount);
      toast.success(`¡Compraste ${quote?.shares?.toFixed(1) || '?'} shares de ${side}!`);
      await refreshProfile();
      await fetchMarket();
      await fetchPriceHistory();
    } catch (e) { toast.error(e.message); }
    finally { setBetting(false); }
  }

  async function handleSell(position) {
    setSelling(position.id);
    try {
      const result = await sellPosition(id, position.id);
      toast.success(`¡Vendiste por ${result.credits_received} créditos!`);
      await refreshProfile();
      await fetchMarket();
      await fetchPriceHistory();
    } catch (e) { toast.error(e.message); }
    finally { setSelling(null); }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-purple-500" /></div>;
  if (!market) return <div className="text-center py-20"><p className="text-gray-400">Mercado no encontrado</p></div>;

  const isOpen = market.status === 'open' && new Date(market.closes_at) > new Date();
  const isResolved = market.status === 'resolved';
  const yesPrice = market.yes_price || 0.5;
  const noPrice = market.no_price || 0.5;
  const up = market.user_position && market.user_position.profit_loss > 0;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <MapPin className="w-4 h-4" />
              {market.city}, {market.country_code} {market.country_code === 'AR' ? '🇦🇷' : '🌍'}
              {!isResolved && (<><span className="mx-2">·</span><Clock className="w-4 h-4" />{countdown}</>)}
            </div>
            <h1 className="text-2xl font-bold text-white mb-4">{market.question}</h1>
            {market.description && <p className="text-gray-400 text-sm mb-4">{market.description}</p>}

            {isResolved && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${market.result ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                {market.result ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                Resultado: {market.result ? 'SÍ' : 'NO'}
                {market.resolved_value !== null && <span className="ml-2 text-gray-300">({metricLabels[market.metric]}: {market.resolved_value}{metricUnits[market.metric]})</span>}
              </div>
            )}

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 text-center">
                <p className="text-xs text-emerald-400/60 mb-1">Precio SÍ</p>
                <p className="text-3xl font-black text-emerald-400">{(yesPrice * 100).toFixed(1)}¢</p>
                <p className="text-xs text-gray-400 mt-1">Paga $1 si gana</p>
              </div>
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                <p className="text-xs text-red-400/60 mb-1">Precio NO</p>
                <p className="text-3xl font-black text-red-400">{(noPrice * 100).toFixed(1)}¢</p>
                <p className="text-xs text-gray-400 mt-1">Paga $1 si gana</p>
              </div>
            </div>

            <OddsBar yesPercentage={market.yes_percentage || 50} noPercentage={market.no_percentage || 50} size="lg" />
          </div>

          {/* Price Chart */}
          {priceHistory.length >= 2 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                Historial de Precios (SÍ)
              </h3>
              <PriceChart data={priceHistory} />
              <div className="flex justify-between text-xs text-gray-500 mt-2">
                <span>{new Date(priceHistory[0].created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                <span>{priceHistory.length} trades</span>
                <span>{new Date(priceHistory[priceHistory.length - 1].created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          )}

          {/* Resolution info */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-gray-300 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" />
              Condición de Resolución
            </h3>
            <div className="bg-white/5 rounded-xl p-4">
              <p className="text-sm text-gray-300">
                <span className="font-semibold text-white">{metricLabels[market.metric]}</span>
                {' '}{market.operator}{' '}
                <span className="font-semibold text-purple-400">{market.threshold}{metricUnits[market.metric]}</span>
                {' '}en {market.city}
              </p>
              {market.current_weather && (
                <div className="mt-3 pt-3 border-t border-white/5">
                  <p className="text-xs text-gray-400 mb-2">Clima actual:</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="bg-white/5 px-3 py-1.5 rounded-lg">🌡️ {market.current_weather.temp}°C</span>
                    <span className="bg-white/5 px-3 py-1.5 rounded-lg">💧 {market.current_weather.humidity}%</span>
                    <span className="bg-white/5 px-3 py-1.5 rounded-lg">💨 {market.current_weather.wind_speed} m/s</span>
                    <span className="bg-white/5 px-3 py-1.5 rounded-lg">🌧️ {market.current_weather.rain} mm</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent positions */}
          {market.recent_positions?.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Trades recientes</h3>
              <div className="space-y-2">
                {market.recent_positions.map((pos, i) => {
                  const isExpanded = expandedTrade === i;
                  const fee = pos.amount * 0.02;
                  const isSell = pos.type === 'sell';
                  return (
                    <div key={i}>
                      <div
                        onClick={() => setExpandedTrade(isExpanded ? null : i)}
                        className="flex items-center justify-between bg-white/5 hover:bg-white/10 rounded-xl px-4 py-2.5 text-sm cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${pos.side === 'YES' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pos.side}
                          </span>
                          {isSell && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">VENTA</span>}
                          {pos.is_mine && <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Tú</span>}
                        </div>
                        <span className={`font-medium ${isSell ? 'text-yellow-300' : 'text-gray-300'}`}>
                          {isSell ? '+' : '-'}{pos.amount.toLocaleString()} créditos
                        </span>
                        <span className="text-gray-500 text-xs">{new Date(pos.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {isExpanded && (
                        <div className="mx-2 mt-1 mb-2 bg-white/5 rounded-lg p-3 text-xs space-y-1.5 border border-white/5">
                          <div className="flex justify-between">
                            <span className="text-gray-500">Tipo</span>
                            <span className={`font-bold ${isSell ? 'text-yellow-400' : 'text-emerald-400'}`}>
                              {isSell ? 'Venta de shares' : 'Compra de shares'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Lado</span>
                            <span className={`font-bold ${pos.side === 'YES' ? 'text-emerald-400' : 'text-red-400'}`}>{pos.side}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">{isSell ? 'Créditos recibidos' : 'Créditos gastados'}</span>
                            <span className="text-white font-medium">{pos.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Comisión plataforma (2%)</span>
                            <span className="text-yellow-400">{fee.toFixed(1)}</span>
                          </div>
                          <div className="border-t border-white/5 pt-1.5 flex justify-between">
                            <span className="text-gray-500">Precio SÍ después</span>
                            <span className="text-gray-300">{(pos.yes_price_after * 100).toFixed(1)}¢</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Precio NO después</span>
                            <span className="text-gray-300">{(pos.no_price_after * 100).toFixed(1)}¢</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-500">Fecha</span>
                            <span className="text-gray-300">{new Date(pos.created_at).toLocaleString('es-AR')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Trade + Position */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 space-y-6 max-h-[calc(100vh-7rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10">
          {/* Trade panel */}
          {isOpen && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4">Comprar Shares</h3>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <button onClick={() => setSide('YES')}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${side === 'YES' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'}`}>
                  ✅ SÍ {(yesPrice * 100).toFixed(0)}¢
                </button>
                <button onClick={() => setSide('NO')}
                  className={`py-3 rounded-xl font-bold text-sm transition-all ${side === 'NO' ? 'bg-red-500 text-white shadow-lg shadow-red-500/25' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                  ❌ NO {(noPrice * 100).toFixed(0)}¢
                </button>
              </div>

              <label className="block text-xs text-gray-400 mb-2">Monto (créditos)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-purple-500/50 mb-3" min="1" />

              <div className="flex gap-2 mb-5">
                {[50, 100, 250, 500].map(v => (
                  <button key={v} onClick={() => setAmount(v)} className="flex-1 text-xs py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 font-medium">+{v}</button>
                ))}
                {profile && <button onClick={() => setAmount(profile.balance_credits)} className="flex-1 text-xs py-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 font-medium">Max</button>}
              </div>

              {/* AMM Quote preview */}
              {quote && (
                <div className="bg-white/5 rounded-xl p-4 mb-5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Shares que recibes</span>
                    <span className="text-white font-bold">{quote.shares?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Precio promedio</span>
                    <span className="text-white font-medium">{(quote.avg_price * 100)?.toFixed(1)}¢</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Comisión (2%)</span>
                    <span className="text-yellow-400 font-medium">{quote.fee?.toFixed(1)}</span>
                  </div>
                  <div className="border-t border-white/5 pt-2 flex justify-between text-sm">
                    <span className="text-gray-400">Si ganas recibes</span>
                    <span className="text-emerald-400 font-bold">{Math.floor(quote.shares)} créditos</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Ganancia potencial</span>
                    <span className="text-emerald-400 font-bold">+{(Math.floor(quote.shares) - amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-500">Precio después</span>
                    <span className="text-gray-400">SÍ {(quote.prices_after?.yes_price * 100)?.toFixed(1)}% · NO {(quote.prices_after?.no_price * 100)?.toFixed(1)}%</span>
                  </div>
                </div>
              )}

              <button onClick={handleBet} disabled={betting || amount <= 0}
                className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${side === 'YES' ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 shadow-lg shadow-emerald-500/25' : 'bg-gradient-to-r from-red-500 to-red-600 shadow-lg shadow-red-500/25'} text-white disabled:opacity-50`}>
                {betting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Comprar ${quote?.shares?.toFixed(1) || '?'} shares ${side}`}
              </button>

              {profile && <p className="text-xs text-gray-500 text-center mt-3">Balance: {profile.balance_credits.toLocaleString()} créditos</p>}
            </div>
          )}

          {/* Your Position */}
          {market.user_position && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-purple-400" />
                Tu Posición
              </h3>

              {/* P&L Summary */}
              {(() => {
                // Use real sell quotes if available, otherwise fallback to naive calculation
                const realValue = Object.keys(sellQuotes).length > 0
                  ? market.user_position.positions
                      .filter(p => p.status === 'active')
                      .reduce((sum, p) => sum + (sellQuotes[p.id] || 0), 0)
                  : market.user_position.current_value;
                const realPL = realValue - market.user_position.total_spent;
                const realUp = realPL > 0;
                return (
                <div className={`rounded-xl p-4 mb-4 ${realUp ? 'bg-emerald-500/10 border border-emerald-500/20' : realPL < 0 ? 'bg-red-500/10 border border-red-500/20' : 'bg-white/5 border border-white/10'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Valor de venta</span>
                    <span className="text-xl font-black text-white">{realValue?.toLocaleString(undefined, {maximumFractionDigits: 0})} créditos</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-400">Invertido</span>
                    <span className="text-sm text-gray-300">{market.user_position.total_spent?.toLocaleString()} créditos</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-400">Ganancia/Pérdida</span>
                    <span className={`text-lg font-bold flex items-center gap-1 ${realUp ? 'text-emerald-400' : realPL < 0 ? 'text-red-400' : 'text-gray-300'}`}>
                      {realUp ? <ArrowUpRight className="w-4 h-4" /> : realPL < 0 ? <ArrowDownRight className="w-4 h-4" /> : null}
                      {realPL > 0 ? '+' : ''}{realPL?.toFixed(0)}
                    </span>
                  </div>
                </div>
                );
              })()}

              {/* Individual positions */}
              <div className="space-y-3">
                {market.user_position.positions.map((pos) => {
                  const shares = pos.shares || pos.amount;
                  const currentPrice = pos.side === 'YES' ? yesPrice : noPrice;
                  const currentVal = sellQuotes[pos.id] != null ? sellQuotes[pos.id] : shares * currentPrice;
                  const posProfit = currentVal - pos.amount;

                  return (
                    <div key={pos.id} className="bg-white/5 rounded-xl p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className={`font-bold text-lg ${pos.side === 'YES' ? 'text-emerald-400' : 'text-red-400'}`}>
                            {pos.side}
                          </span>
                          <p className="text-xs text-gray-400">{shares.toFixed(1)} shares @ {(pos.odds_at_entry * 100).toFixed(1)}¢</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-white font-bold">{currentVal.toFixed(0)} créditos</p>
                          <p className={`text-xs font-bold ${posProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                            {posProfit >= 0 ? '+' : ''}{posProfit.toFixed(0)} ({((posProfit / pos.amount) * 100).toFixed(0)}%)
                          </p>
                        </div>
                      </div>

                      {/* Sell button */}
                      {isOpen && pos.status === 'active' && (
                        <button
                          onClick={() => handleSell(pos)}
                          disabled={selling === pos.id}
                          className="w-full mt-2 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-bold hover:bg-yellow-500/20 transition-all disabled:opacity-50"
                        >
                          {selling === pos.id ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Vender ${shares.toFixed(1)} shares`}
                        </button>
                      )}

                      {pos.won !== null && (
                        <div className={`mt-2 text-center text-sm font-bold py-1.5 rounded-lg ${pos.won ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                          {pos.won ? `✅ Ganaste ${pos.payout} créditos` : '❌ Perdida'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Shares summary */}
              {(market.user_position.total_shares_yes > 0 || market.user_position.total_shares_no > 0) && (
                <div className="mt-4 pt-4 border-t border-white/5 grid grid-cols-2 gap-3 text-center">
                  {market.user_position.total_shares_yes > 0 && (
                    <div className="bg-emerald-500/5 rounded-lg p-2">
                      <p className="text-xs text-gray-400">Shares SÍ</p>
                      <p className="text-lg font-bold text-emerald-400">{market.user_position.total_shares_yes.toFixed(1)}</p>
                    </div>
                  )}
                  {market.user_position.total_shares_no > 0 && (
                    <div className="bg-red-500/5 rounded-lg p-2">
                      <p className="text-xs text-gray-400">Shares NO</p>
                      <p className="text-lg font-bold text-red-400">{market.user_position.total_shares_no.toFixed(1)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>{/* close sticky wrapper */}
        </div>
      </div>
    </div>
  );
}
