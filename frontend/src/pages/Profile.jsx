import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getProfile } from '../lib/api';
import { Link } from 'react-router-dom';
import { User, Target, Trophy, TrendingUp, Percent, Loader2, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function Profile() {
  const { profile: authProfile } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getProfile();
        setProfile(data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  if (!profile) return <p className="text-gray-400">Error al cargar perfil</p>;

  const stats = [
    { label: 'Total Apuestas', value: profile.total_bets, icon: Target, color: 'text-blue-400' },
    { label: 'Victorias', value: profile.total_wins, icon: Trophy, color: 'text-emerald-400' },
    { label: 'Win Rate', value: `${profile.win_rate}%`, icon: Percent, color: 'text-purple-400' },
    {
      label: 'Ganancia Total',
      value: `${profile.total_profit >= 0 ? '+' : ''}${profile.total_profit.toLocaleString()}`,
      icon: TrendingUp,
      color: profile.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="glass-card p-8 mb-8 flex items-center gap-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-2xl font-bold shadow-lg shadow-purple-500/25">
          {profile.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{profile.username}</h1>
          <p className="text-sm text-gray-400">{profile.email}</p>
          <p className="text-xs text-gray-500 mt-1">
            Miembro desde {new Date(profile.created_at).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' })}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="glass-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`w-4 h-4 ${stat.color}`} />
                <span className="text-xs text-gray-400">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent bets */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Apuestas recientes</h3>
        {!profile.recent_bets || profile.recent_bets.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>Aún no has realizado apuestas</p>
            <Link to="/" className="text-purple-400 hover:text-purple-300 text-sm mt-2 inline-block">
              Explorar mercados →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.recent_bets.map((bet) => (
              <Link
                key={bet.id}
                to={`/market/${bet.market_id}`}
                className="flex items-center gap-4 bg-white/5 rounded-xl px-4 py-3 hover:bg-white/10 transition-colors"
              >
                <span className={`font-bold text-sm ${bet.side === 'YES' ? 'text-emerald-400' : 'text-red-400'}`}>
                  {bet.side}
                </span>
                <span className="flex-1 text-sm text-white truncate">
                  {bet.markets?.question || `Mercado #${bet.market_id}`}
                </span>
                <span className="text-sm text-gray-300 font-medium">{bet.amount.toLocaleString()}</span>
                {bet.won !== null && (
                  <span className={`text-xs font-bold ${bet.won ? 'text-emerald-400' : 'text-red-400'}`}>
                    {bet.won ? `+${bet.payout.toLocaleString()}` : 'Perdida'}
                  </span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
