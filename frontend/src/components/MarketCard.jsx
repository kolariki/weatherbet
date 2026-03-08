import { useNavigate } from 'react-router-dom';
import { Clock, Users, Coins, MapPin, Thermometer, CloudRain, Wind, Eye, Droplets } from 'lucide-react';
import OddsBar from './OddsBar';
import { useState, useEffect } from 'react';

const categoryIcons = {
  temperature: Thermometer,
  rain: CloudRain,
  wind: Wind,
  humidity: Droplets,
  visibility: Eye,
  other: Eye,
};

const categoryColors = {
  temperature: 'text-orange-400 bg-orange-400/10 border-orange-400/20',
  rain: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  wind: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20',
  humidity: 'text-teal-400 bg-teal-400/10 border-teal-400/20',
  visibility: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  other: 'text-gray-400 bg-gray-400/10 border-gray-400/20',
};

const categoryLabels = {
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
      className="glass-card p-5 cursor-pointer hover:border-white/10 hover:shadow-lg hover:shadow-purple-500/5 transition-all duration-300 group"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${colorClass}`}>
          <Icon className="w-3 h-3" />
          {categoryLabels[market.category] || 'Otro'}
        </span>
        {isResolved ? (
          <span className={`text-xs font-bold px-2.5 py-1 rounded-lg ${market.result ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
            {market.result ? '✅ SÍ' : '❌ NO'}
          </span>
        ) : isClosed ? (
          <span className="text-xs font-medium text-yellow-400 bg-yellow-400/10 px-2.5 py-1 rounded-lg">
            Cerrado
          </span>
        ) : null}
      </div>

      {/* Question */}
      <h3 className="text-sm font-semibold text-white mb-3 leading-snug group-hover:text-purple-300 transition-colors line-clamp-2">
        {market.question}
      </h3>

      {/* City + Countdown */}
      <div className="flex items-center justify-between text-xs text-gray-400 mb-4">
        <span className="flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {market.city} 🇲🇽
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
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/5">
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Coins className="w-3 h-3" />
          {(market.total_pool || 0).toLocaleString()} créditos
        </span>
        <span className="flex items-center gap-1 text-xs text-gray-400">
          <Users className="w-3 h-3" />
          {market.total_positions || 0} apuestas
        </span>
      </div>
    </div>
  );
}
