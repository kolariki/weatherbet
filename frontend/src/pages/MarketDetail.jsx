import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMarket, placeBet, getQuote, sellPosition, getSellQuote, getPriceHistory } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import OddsBar from '../components/OddsBar';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Clock, MapPin, Coins, Loader2, CheckCircle, XCircle,
  TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight, Wallet,
} from 'lucide-react';
import PriceChart from '../components/PriceChart';
import { useWallet } from '../contexts/WalletContext';

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
  const [sellQuotes, setSellQuotes] = useState({});

  const { isConnected: walletConnected, tokenBalance } = useWallet() || {};
  const countdown = useCountdown(market?.closes_at);

  useEffect(() => { fetchMarket(); fetchPriceHistory(); }, [id]);

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
      toast.success(`Compraste ${quote?.shares?.toFixed(1) || '?'} shares de ${side}`);
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
      toast.success(`Vendiste por ${result.credits_received} créditos`);
      await refreshProfile();
      await fetchMarket();
      await fetchPriceHistory();
    } catch (e) { toast.error(e.message); }
    finally { setSelling(null); }
  }

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="w-8 h-8 animate-spin text-[#00b8d4]" /></div>;
  if (!market) return <div className="text-center py-20"><p className="text-[#848e9c]">Mercado no encontrado</p></div>;

  const isOpen = market.status === 'open' && new Date(market.closes_at) > new Date();
  const isResolved = market.status === 'resolved';
  const yesPrice = market.yes_price || 0.5;
  const noPrice = market.no_price || 0.5;

  return (
    <div>
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-[#848e9c] hover:text-[#eaecef] mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Volver
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 text-sm text-[#848e9c] mb-3">
              <MapPin className="w-4 h-4" />
              {market.city}, {market.country_code} {market.country_code === 'AR' ? '🇦🇷' : '🌍'}
              {!isResolved && (<><span className="mx-2">·</span><Clock className="w-4 h-4" />{countdown}</>)}
            </div>
            <h1 className="text-2xl font-bold text-[#eaecef] mb-4">{market.question}</h1>
            {market.description && <p className="text-[#848e9c] text-sm mb-4">{market.description}</p>}

            {isResolved && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold ${market.result ? 'bg-[#2ebd85]/20 text-[#2ebd85]' : 'bg-[#f6465d]/20 text-[#f6465d]'}`}>
                {market.result ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                Resultado: {market.result ? 'SÍ' : 'NO'}
                {market.resolved_value !== null && <span className="ml-2 text-[#848e9c]">({metricLabels[market.metric]}: {market.resolved_value}{metricUnits[market.metric]})</span>}
              </div>
            )}

            {/* Prices */}
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="bg-[#2ebd85]/10 border border-[#2ebd85]/20 rounded-lg p-4 text-center">
                <p className="text-xs text-[#2ebd85]/60 mb-1">Precio SÍ</p>
                <p className="text-3xl font-black text-[#2ebd85]">{(yesPrice * 100).toFixed(1)}¢</p>
                <p className="text-xs text-[#848e9c] mt-1">Paga $1 si gana</p>
              </div>
              <div className="bg-[#f6465d]/10 border border-[#f6465d]/20 rounded-lg p-4 text-center">
                <p className="text-xs text-[#f6465d]/60 mb-1">Precio NO</p>
                <p className="text-3xl font-black text-[#f6465d]">{(noPrice * 100).toFixed(1)}¢</p>
                <p className="text-xs text-[#848e9c] mt-1">Paga $1 si gana</p>
              </div>
            </div>

            <OddsBar yesPercentage={market.yes_percentage || 50} noPercentage={market.no_percentage || 50} size="lg" />
          </div>

          {/* Price Chart */}
          {priceHistory.length >= 2 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-[#848e9c] mb-4 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#00b8d4]" />
                Historial de Precios
              </h3>
              <PriceChart data={priceHistory} height={typeof window !== 'undefined' && window.innerWidth < 768 ? 220 : 350} />
            </div>
          )}

          {/* Resolution info */}
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-[#848e9c] mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#00b8d4]" />
              Condición de Resolución
            </h3>
            <div className="bg-[#1e2329] rounded-lg p-4">
              <p className="text-sm text-[#848e9c]">
                <span className="font-semibold text-[#eaecef]">{metricLabels[market.metric]}</span>
                {' '}{market.operator}{' '}
                <span className="font-semibold text-[#00b8d4]">{market.threshold}{metricUnits[market.metric]}</span>
                {' '}en {market.city}
              </p>
              {market.current_weather && (
                <div className="mt-3 pt-3 border-t border-[#2b3139]">
                  <p className="text-xs text-[#5e6673] mb-2">Clima actual:</p>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="bg-[#1e2329] border border-[#2b3139] px-3 py-1.5 rounded-lg text-[#848e9c]">🌡️ {market.current_weather.temp}°C</span>
                    <span className="bg-[#1e2329] border border-[#2b3139] px-3 py-1.5 rounded-lg text-[#848e9c]">💧 {market.current_weather.humidity}%</span>
                    <span className="bg-[#1e2329] border border-[#2b3139] px-3 py-1.5 rounded-lg text-[#848e9c]">💨 {market.current_weather.wind_speed} m/s</span>
                    <span className="bg-[#1e2329] border border-[#2b3139] px-3 py-1.5 rounded-lg text-[#848e9c]">🌧️ {market.current_weather.rain} mm</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent positions */}
          {(() => {
            const myTrades = (market.recent_positions || []).filter(p => p.is_mine);
            const allTrades = market.recent_positions || [];
            return (<>
          {myTrades.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-[#848e9c] mb-4">Mis Trades</h3>
              <div className="space-y-2">
                {myTrades.map((pos, i) => {
                  const isExpanded = expandedTrade === `my-${i}`;
                  const fee = pos.amount * 0.02;
                  const isSell = pos.type === 'sell';
                  return (
                    <div key={i}>
                      <div
                        onClick={() => setExpandedTrade(isExpanded ? null : `my-${i}`)}
                        className="flex items-center justify-between bg-[#1e2329] hover:bg-[#2b3139] rounded-lg px-4 py-2.5 text-sm cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <span className={`font-bold ${pos.side === 'YES' ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                            {pos.side}
                          </span>
                          {isSell && <span className="text-[10px] bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full">VENTA</span>}
                        </div>
                        <span className={`font-medium ${isSell ? 'text-yellow-300' : 'text-[#848e9c]'}`}>
                          {isSell ? '+' : '-'}{pos.amount.toLocaleString()} créditos
                        </span>
                        <span className="text-[#5e6673] text-xs">{new Date(pos.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                      {isExpanded && (
                        <div className="mx-2 mt-1 mb-2 bg-[#1e2329] rounded-lg p-3 text-xs space-y-1.5 border border-[#2b3139]">
                          <div className="flex justify-between">
                            <span className="text-[#5e6673]">Tipo</span>
                            <span className={`font-bold ${isSell ? 'text-yellow-400' : 'text-[#2ebd85]'}`}>
                              {isSell ? 'Venta de shares' : 'Compra de shares'}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#5e6673]">Lado</span>
                            <span className={`font-bold ${pos.side === 'YES' ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>{pos.side}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#5e6673]">{isSell ? 'Créditos recibidos' : 'Créditos gastados'}</span>
                            <span className="text-[#eaecef] font-medium">{pos.amount.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#5e6673]">Comisión plataforma (2%)</span>
                            <span className="text-yellow-400">{fee.toFixed(1)}</span>
                          </div>
                          <div className="border-t border-[#2b3139] pt-1.5 flex justify-between">
                            <span className="text-[#5e6673]">Precio SÍ después</span>
                            <span className="text-[#848e9c]">{(pos.yes_price_after * 100).toFixed(1)}¢</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#5e6673]">Precio NO después</span>
                            <span className="text-[#848e9c]">{(pos.no_price_after * 100).toFixed(1)}¢</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#5e6673]">Fecha</span>
                            <span className="text-[#848e9c]">{new Date(pos.created_at).toLocaleString('es-AR')}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {allTrades.length > 0 && (
            <div className="glass-card p-4 mt-4">
              <h3 className="text-xs font-semibold text-[#5e6673] mb-3 uppercase tracking-wider">Libro de operaciones</h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {allTrades.map((t, i) => {
                  const isSell = t.type === 'sell';
                  return (
                    <div key={i} className="flex items-center justify-between px-2 py-1.5 text-[11px] rounded-lg hover:bg-[#1e2329]">
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${t.side === 'YES' ? 'text-[#2ebd85]/70' : 'text-[#f6465d]/70'}`}>{t.side}</span>
                        {isSell && <span className="text-yellow-500/60 text-[9px]">SELL</span>}
                      </div>
                      <span className="text-[#5e6673]">{t.amount.toLocaleString()}</span>
                      <span className="text-[#5e6673]">{new Date(t.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          </>);
          })()}
        </div>

        {/* Sidebar: Trade + Position */}
        <div className="lg:col-span-1">
          <div className="lg:sticky lg:top-20 space-y-6 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          {/* Trade panel */}
          {isOpen && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-[#eaecef] mb-4">Comprar Shares</h3>

              <div className="grid grid-cols-2 gap-3 mb-5">
                <button onClick={() => setSide('YES')}
                  className={`py-3 rounded-lg font-bold text-sm transition-all ${side === 'YES' ? 'bg-[#2ebd85] text-white' : 'bg-[#2ebd85]/10 text-[#2ebd85] border border-[#2ebd85]/20'}`}>
                  SÍ {(yesPrice * 100).toFixed(0)}¢
                </button>
                <button onClick={() => setSide('NO')}
                  className={`py-3 rounded-lg font-bold text-sm transition-all ${side === 'NO' ? 'bg-[#f6465d] text-white' : 'bg-[#f6465d]/10 text-[#f6465d] border border-[#f6465d]/20'}`}>
                  NO {(noPrice * 100).toFixed(0)}¢
                </button>
              </div>

              <label className="block text-xs text-[#848e9c] mb-2">Monto (créditos)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                className="w-full bg-[#1e2329] border border-[#2b3139] rounded-lg px-4 py-3 text-[#eaecef] text-lg font-bold focus:outline-none focus:border-[#00b8d4]/50 mb-3" min="1" />

              <div className="flex gap-2 mb-5">
                {[50, 100, 250, 500].map(v => (
                  <button key={v} onClick={() => setAmount(v)} className="flex-1 text-xs py-2 rounded-lg bg-[#1e2329] text-[#848e9c] hover:bg-[#2b3139] font-medium">+{v}</button>
                ))}
                {profile && <button onClick={() => setAmount(profile.balance_credits)} className="flex-1 text-xs py-2 rounded-lg bg-[#00b8d4]/10 text-[#00b8d4] hover:bg-[#00b8d4]/20 font-medium">Max</button>}
              </div>

              {/* AMM Quote preview */}
              {quote && (
                <div className="bg-[#1e2329] rounded-lg p-4 mb-5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[#848e9c]">Shares que recibes</span>
                    <span className="text-[#eaecef] font-bold">{quote.shares?.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#848e9c]">Precio promedio</span>
                    <span className="text-[#eaecef] font-medium">{(quote.avg_price * 100)?.toFixed(1)}¢</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#848e9c]">Comisión (2%)</span>
                    <span className="text-yellow-400 font-medium">{quote.fee?.toFixed(1)}</span>
                  </div>
                  <div className="border-t border-[#2b3139] pt-2 flex justify-between text-sm">
                    <span className="text-[#848e9c]">Si ganas recibes</span>
                    <span className="text-[#2ebd85] font-bold">{Math.floor(quote.shares)} créditos</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-[#848e9c]">Ganancia potencial</span>
                    <span className="text-[#2ebd85] font-bold">+{(Math.floor(quote.shares) - amount).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-[#5e6673]">Precio después</span>
                    <span className="text-[#848e9c]">SÍ {(quote.prices_after?.yes_price * 100)?.toFixed(1)}% · NO {(quote.prices_after?.no_price * 100)?.toFixed(1)}%</span>
                  </div>
                </div>
              )}

              <button onClick={handleBet} disabled={betting || amount <= 0}
                className={`w-full py-3.5 rounded-lg font-bold text-sm transition-all ${side === 'YES' ? 'bg-[#2ebd85]' : 'bg-[#f6465d]'} text-white disabled:opacity-50`}>
                {betting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : `Comprar ${quote?.shares?.toFixed(1) || '?'} shares ${side}`}
              </button>

              {profile && (
                <div className="text-xs text-[#5e6673] text-center mt-3 space-y-1">
                  <p>Balance: {profile.balance_credits.toLocaleString()} créditos</p>
                  {walletConnected && parseFloat(tokenBalance) > 0 && (
                    <p className="flex items-center justify-center gap-1 text-[#00b8d4]">
                      <Wallet className="w-3 h-3" />
                      {parseFloat(tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 0 })} BETALL
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Your Position */}
          {market.user_position && (
            <div className="glass-card p-6">
              <h3 className="text-lg font-bold text-[#eaecef] mb-4 flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-[#00b8d4]" />
                Tu Posición
              </h3>

              {(() => {
                const realValue = Object.keys(sellQuotes).length > 0
                  ? market.user_position.positions
                      .filter(p => p.status === 'active')
                      .reduce((sum, p) => sum + (sellQuotes[p.id] || 0), 0)
                  : market.user_position.current_value;
                const realPL = realValue - market.user_position.total_spent;
                const realUp = realPL > 0;
                return (
                <div className={`rounded-lg p-4 mb-4 ${realUp ? 'bg-[#2ebd85]/10 border border-[#2ebd85]/20' : realPL < 0 ? 'bg-[#f6465d]/10 border border-[#f6465d]/20' : 'bg-[#1e2329] border border-[#2b3139]'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[#848e9c]">Valor de venta</span>
                    <span className="text-xl font-black text-[#eaecef]">{realValue?.toLocaleString(undefined, {maximumFractionDigits: 0})} créditos</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-[#848e9c]">Invertido</span>
                    <span className="text-sm text-[#848e9c]">{market.user_position.total_spent?.toLocaleString()} créditos</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-[#848e9c]">Ganancia/Pérdida</span>
                    <span className={`text-lg font-bold flex items-center gap-1 ${realUp ? 'text-[#2ebd85]' : realPL < 0 ? 'text-[#f6465d]' : 'text-[#848e9c]'}`}>
                      {realUp ? <ArrowUpRight className="w-4 h-4" /> : realPL < 0 ? <ArrowDownRight className="w-4 h-4" /> : null}
                      {realPL > 0 ? '+' : ''}{realPL?.toFixed(0)}
                    </span>
                  </div>
                </div>
                );
              })()}

              <div className="space-y-3">
                {market.user_position.positions.map((pos) => {
                  const shares = pos.shares || pos.amount;
                  const currentPrice = pos.side === 'YES' ? yesPrice : noPrice;
                  const currentVal = sellQuotes[pos.id] != null ? sellQuotes[pos.id] : shares * currentPrice;
                  const posProfit = currentVal - pos.amount;

                  return (
                    <div key={pos.id} className="bg-[#1e2329] rounded-lg p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <span className={`font-bold text-lg ${pos.side === 'YES' ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                            {pos.side}
                          </span>
                          <p className="text-xs text-[#848e9c]">{shares.toFixed(1)} shares @ {(pos.odds_at_entry * 100).toFixed(1)}¢</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-[#eaecef] font-bold">{currentVal.toFixed(0)} créditos</p>
                          <p className={`text-xs font-bold ${posProfit >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                            {posProfit >= 0 ? '+' : ''}{posProfit.toFixed(0)} ({((posProfit / pos.amount) * 100).toFixed(0)}%)
                          </p>
                        </div>
                      </div>

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
                        <div className={`mt-2 text-center text-sm font-bold py-1.5 rounded-lg ${pos.won ? 'bg-[#2ebd85]/20 text-[#2ebd85]' : 'bg-[#f6465d]/20 text-[#f6465d]'}`}>
                          {pos.won ? `Ganaste ${pos.payout} créditos` : 'Perdida'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {(market.user_position.total_shares_yes > 0 || market.user_position.total_shares_no > 0) && (
                <div className="mt-4 pt-4 border-t border-[#2b3139] grid grid-cols-2 gap-3 text-center">
                  {market.user_position.total_shares_yes > 0 && (
                    <div className="bg-[#2ebd85]/5 rounded-lg p-2">
                      <p className="text-xs text-[#848e9c]">Shares SÍ</p>
                      <p className="text-lg font-bold text-[#2ebd85]">{market.user_position.total_shares_yes.toFixed(1)}</p>
                    </div>
                  )}
                  {market.user_position.total_shares_no > 0 && (
                    <div className="bg-[#f6465d]/5 rounded-lg p-2">
                      <p className="text-xs text-[#848e9c]">Shares NO</p>
                      <p className="text-lg font-bold text-[#f6465d]">{market.user_position.total_shares_no.toFixed(1)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}
