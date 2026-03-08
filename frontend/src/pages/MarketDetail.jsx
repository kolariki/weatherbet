import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getMarket, placeBet } from '../lib/api';
import { useAuth } from '../contexts/AuthContext';
import OddsBar from '../components/OddsBar';
import toast from 'react-hot-toast';
import {
  ArrowLeft, Clock, MapPin, Coins, Thermometer, CloudRain,
  Wind, Droplets, Eye, Loader2, CheckCircle, XCircle, TrendingUp,
} from 'lucide-react';

const metricLabels = {
  temp_max: 'Temp. Máxima',
  temp_min: 'Temp. Mínima',
  temp: 'Temperatura',
  rain: 'Precipitación',
  wind_speed: 'Vel. del Viento',
  humidity: 'Humedad',
  visibility: 'Visibilidad',
};

const metricUnits = {
  temp_max: '°C',
  temp_min: '°C',
  temp: '°C',
  rain: 'mm',
  wind_speed: 'm/s',
  humidity: '%',
  visibility: 'km',
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

  const countdown = useCountdown(market?.closes_at);

  useEffect(() => {
    fetchMarket();
  }, [id]);

  async function fetchMarket() {
    setLoading(true);
    try {
      const data = await getMarket(id);
      setMarket(data);
    } catch (e) {
      toast.error('Error al cargar mercado');
    } finally {
      setLoading(false);
    }
  }

  async function handleBet() {
    if (!user) {
      navigate('/login');
      return;
    }
    if (amount <= 0) {
      toast.error('Ingresa un monto válido');
      return;
    }
    setBetting(true);
    try {
      const result = await placeBet(id, side, amount);
      toast.success(`¡Apuesta de ${amount} créditos en ${side} realizada!`);
      await refreshProfile();
      await fetchMarket();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setBetting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!market) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400">Mercado no encontrado</p>
      </div>
    );
  }

  const isOpen = market.status === 'open' && new Date(market.closes_at) > new Date();
  const isResolved = market.status === 'resolved';

  // Calculate potential payout
  const currentSidePool = side === 'YES' ? (market.yes_pool || 0) : (market.no_pool || 0);
  const oppositePool = side === 'YES' ? (market.no_pool || 0) : (market.yes_pool || 0);
  const newSidePool = currentSidePool + amount;
  const share = newSidePool > 0 ? amount / newSidePool : 1;
  const potentialWinnings = Math.floor(oppositePool * 0.95 * share) + amount;

  return (
    <div>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Question card */}
          <div className="glass-card p-6">
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-3">
              <MapPin className="w-4 h-4" />
              {market.city}, {market.country_code} 🇲🇽
              {!isResolved && (
                <>
                  <span className="mx-2">·</span>
                  <Clock className="w-4 h-4" />
                  {countdown}
                </>
              )}
            </div>

            <h1 className="text-2xl font-bold text-white mb-4">{market.question}</h1>

            {market.description && (
              <p className="text-gray-400 text-sm mb-4">{market.description}</p>
            )}

            {/* Resolution badge */}
            {isResolved && (
              <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
                market.result ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {market.result ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                Resultado: {market.result ? 'SÍ' : 'NO'}
                {market.resolved_value !== null && (
                  <span className="ml-2 text-gray-300">
                    ({metricLabels[market.metric]}: {market.resolved_value}{metricUnits[market.metric]})
                  </span>
                )}
              </div>
            )}

            {/* Odds */}
            <div className="mt-6">
              <OddsBar
                yesPercentage={market.yes_percentage || 50}
                noPercentage={market.no_percentage || 50}
                size="lg"
              />
            </div>

            {/* Pool stats */}
            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Pool SÍ</p>
                <p className="text-lg font-bold text-emerald-400">{(market.yes_pool || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Pool NO</p>
                <p className="text-lg font-bold text-red-400">{(market.no_pool || 0).toLocaleString()}</p>
              </div>
              <div className="bg-white/5 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-400 mb-1">Pool Total</p>
                <p className="text-lg font-bold text-white">{(market.total_pool || 0).toLocaleString()}</p>
              </div>
            </div>
          </div>

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
                    <span className="bg-white/5 px-3 py-1.5 rounded-lg capitalize">{market.current_weather.description}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Recent positions */}
          {market.recent_positions && market.recent_positions.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="text-sm font-semibold text-gray-300 mb-4">Apuestas recientes</h3>
              <div className="space-y-2">
                {market.recent_positions.map((pos, i) => (
                  <div key={i} className="flex items-center justify-between bg-white/5 rounded-xl px-4 py-2.5 text-sm">
                    <div className="flex items-center gap-3">
                      <span className={`font-bold ${pos.side === 'YES' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pos.side}
                      </span>
                      {pos.is_mine && (
                        <span className="text-[10px] bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full">Tú</span>
                      )}
                    </div>
                    <span className="text-gray-300 font-medium">{pos.amount.toLocaleString()} créditos</span>
                    <span className="text-gray-500 text-xs">
                      {new Date(pos.created_at).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Bet panel */}
        <div className="lg:col-span-1">
          <div className="glass-card p-6 sticky top-24">
            {isOpen ? (
              <>
                <h3 className="text-lg font-bold text-white mb-4">Hacer apuesta</h3>

                {/* Side selector */}
                <div className="grid grid-cols-2 gap-3 mb-5">
                  <button
                    onClick={() => setSide('YES')}
                    className={`py-3 rounded-xl font-bold text-sm transition-all ${
                      side === 'YES'
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/25'
                        : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                    }`}
                  >
                    ✅ SÍ
                  </button>
                  <button
                    onClick={() => setSide('NO')}
                    className={`py-3 rounded-xl font-bold text-sm transition-all ${
                      side === 'NO'
                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/25'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20'
                    }`}
                  >
                    ❌ NO
                  </button>
                </div>

                {/* Amount */}
                <label className="block text-xs text-gray-400 mb-2">Monto</label>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-purple-500/50 mb-3"
                  min="1"
                />

                {/* Quick amounts */}
                <div className="flex gap-2 mb-5">
                  {[50, 100, 250, 500].map((val) => (
                    <button
                      key={val}
                      onClick={() => setAmount(val)}
                      className="flex-1 text-xs py-2 rounded-lg bg-white/5 text-gray-300 hover:bg-white/10 transition-colors font-medium"
                    >
                      +{val}
                    </button>
                  ))}
                  {profile && (
                    <button
                      onClick={() => setAmount(profile.balance_credits)}
                      className="flex-1 text-xs py-2 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors font-medium"
                    >
                      Max
                    </button>
                  )}
                </div>

                {/* Payout preview */}
                <div className="bg-white/5 rounded-xl p-4 mb-5 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Tu apuesta</span>
                    <span className="text-white font-medium">{amount.toLocaleString()} créditos</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Pago potencial</span>
                    <span className="text-emerald-400 font-bold">{potentialWinnings.toLocaleString()} créditos</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Ganancia neta</span>
                    <span className="text-emerald-400 font-medium">+{(potentialWinnings - amount).toLocaleString()}</span>
                  </div>
                </div>

                {/* Bet button */}
                <button
                  onClick={handleBet}
                  disabled={betting || amount <= 0}
                  className={`w-full py-3.5 rounded-xl font-bold text-sm transition-all ${
                    side === 'YES'
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 shadow-lg shadow-emerald-500/25'
                      : 'bg-gradient-to-r from-red-500 to-red-600 hover:from-red-400 hover:to-red-500 shadow-lg shadow-red-500/25'
                  } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {betting ? (
                    <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                  ) : (
                    `Apostar ${amount.toLocaleString()} a ${side}`
                  )}
                </button>

                {profile && (
                  <p className="text-xs text-gray-500 text-center mt-3">
                    Balance: {profile.balance_credits.toLocaleString()} créditos
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-400 font-medium">
                  {isResolved ? 'Este mercado ya fue resuelto' : 'Este mercado está cerrado'}
                </p>
              </div>
            )}

            {/* User position */}
            {market.user_position && (
              <div className="mt-6 pt-6 border-t border-white/5">
                <h4 className="text-sm font-semibold text-gray-300 mb-3">Tu posición</h4>
                <div className="space-y-2">
                  {market.user_position.positions.map((pos, i) => (
                    <div key={i} className="flex justify-between items-center text-sm bg-white/5 rounded-lg px-3 py-2">
                      <span className={`font-bold ${pos.side === 'YES' ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pos.side}
                      </span>
                      <span className="text-white">{pos.amount.toLocaleString()}</span>
                      {pos.won !== null && (
                        <span className={pos.won ? 'text-emerald-400' : 'text-red-400'}>
                          {pos.won ? `+${pos.payout.toLocaleString()}` : 'Perdida'}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
