import { useNavigate } from 'react-router-dom';
import { Clock, Users, Coins, MapPin, Thermometer, CloudRain, Wind, Eye, Droplets, Landmark, Trophy, Bitcoin, Tv, TrendingUp, Cpu, FlaskConical, Cloud, Drama } from 'lucide-react';
import OddsBar from './OddsBar';
import { useState, useEffect } from 'react';

const categoryIcons = {
  temperature: Thermometer,
  rain: CloudRain,
  wind: Wind,
  humidity: Droplets,
  weather: Cloud,
  politics: Landmark,
  sports: Trophy,
  crypto: Bitcoin,
  entertainment: Tv,
  economy: TrendingUp,
  technology: Cpu,
  science: FlaskConical,
  culture: Drama,
  visibility: Eye,
  other: Eye,
};

const categoryColors = {
  politics: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  sports: 'text-green-400 bg-green-400/10 border-green-400/20',
  crypto: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  entertainment: 'text-pink-400 bg-pink-400/10 border-pink-400/20',
  economy: 'text-yellow-400 bg-yellow-400/10 border-yellow-400/20',
  technology: 'text-[#00b8d4] bg-[#00b8d4]/10 border-[#00b8d4]/20',
  science: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  weather: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  culture: 'text-rose-400 bg-rose-400/10 border-rose-400/20',
  temperature: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  rain: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  wind: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  humidity: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  visibility: 'text-[#00b8d4] bg-[#00b8d4]/10 border-[#00b8d4]/20',
  other: 'text-[#848e9c] bg-[#848e9c]/10 border-[#848e9c]/20',
};

const categoryLabels = {
  politics: 'Política',
  sports: 'Deportes',
  crypto: 'Crypto',
  entertainment: 'Entretenimiento',
  economy: 'Economía',
  technology: 'Tecnología',
  science: 'Ciencia',
  weather: 'Clima',
  culture: 'Cultura',
  temperature: 'Temperatura',
  rain: 'Lluvia',
  wind: 'Viento',
  humidity: 'Humedad',
  visibility: 'Visibilidad',
  other: 'Otro',
};

function useCountdown(targetDate) {
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    function update() {
      const now = new Date().getTime();
      const target = new Date(targetDate).getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft('Cerrado');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (days > 0) {
        setTimeLeft(`${days}d ${hours}h ${minutes}m`);
      } else if (hours > 0) {
        setTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${minutes}m ${seconds}s`);
      }
    }

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);

  return timeLeft;
}

export default function MarketCard({ market }) {
  const navigate = useNavigate();
  const countdown = useCountdown(market.closes_at);
  const Icon = categoryIcons[market.category] || Eye;
  const colorClass = categoryColors[market.category] || categoryColors.other;

  const isResolved = market.status === 'resolved';
  const isClosed = market.status === 'closed' || new Date(market.closes_at) <= new Date();

  return (
    <div
      onClick={() => navigate(`/market/${market.id}`)}
      className="glass-card p-5 cursor-pointer hover:border-[#00b8d4]/40 transition-all duration-300 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${colorClass}`}>
          <Icon className="w-3 h-3" />
          {categoryLabels[market.category] || 'Otro'}
        </span>
        {isResolved ? (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${market.result ? 'bg-[#2ebd85]/20 text-[#2ebd85]' : 'bg-[#f6465d]/20 text-[#f6465d]'}`}>
            {market.result ? '✅ SÍ' : '❌ NO'}
          </span>
        ) : isClosed ? (
          <span className="text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-lg">
            Cerrado
          </span>
        ) : null}
      </div>

      {/* Question */}
      <h3 className="text-sm font-semibold text-[#eaecef] mb-3 leading-snug group-hover:text-[#00b8d4] transition-colors line-clamp-2">
        {market.question}
      </h3>

      {/* City + Countdown */}
      <div className="flex items-center justify-between text-xs text-[#848e9c] mb-4">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {market.city} {market.country_code === 'AR' ? '🇦🇷' : market.country_code === 'MX' ? '🇲🇽' : '🌍'}
        </span>
        {!isResolved && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {countdown}
          </span>
        )}
      </div>

      {/* Odds Bar */}
      <OddsBar
        yesPercentage={market.yes_percentage || 50}
        noPercentage={market.no_percentage || 50}
        size="md"
      />

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[#2b3139]">
        <span className="flex items-center gap-1 text-xs text-[#848e9c]">
          <Coins className="w-3 h-3" />
          {(market.total_pool || 0).toLocaleString()} créditos
        </span>
        <span className="flex items-center gap-1 text-xs text-[#848e9c]">
          <Users className="w-3 h-3" />
          {market.total_positions || 0} apuestas
        </span>
      </div>
    </div>
  );
}
