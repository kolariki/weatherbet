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
        <Loader2 className="w-8 h-8 animate-spin text-[#00b8d4]" />
      </div>
    );
  }

  if (!profile) return <p className="text-[#848e9c]">Error al cargar perfil</p>;

  const stats = [
    { label: 'Total Apuestas', value: profile.total_bets, icon: Target, color: 'text-[#00b8d4]' },
    { label: 'Victorias', value: profile.total_wins, icon: Trophy, color: 'text-[#2ebd85]' },
    { label: 'Win Rate', value: `${profile.win_rate}%`, icon: Percent, color: 'text-[#00b8d4]' },
    {
      label: 'Ganancia Total',
      value: `${profile.total_profit >= 0 ? '+' : ''}${profile.total_profit.toLocaleString()}`,
      icon: TrendingUp,
      color: profile.total_profit >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]',
    },
  ];

  return (
    <div>
      {/* Header */}
      <div className="glass-card p-8 mb-8 flex items-center gap-6">
        <div className="w-16 h-16 rounded-lg bg-gradient-to-br from-[#00b8d4] to-[#00e5ff] flex items-center justify-center text-2xl font-bold text-white">
          {profile.username?.[0]?.toUpperCase() || '?'}
        </div>
        <div>
          <h1 className="text-2xl font-bold text-[#eaecef]">{profile.username}</h1>
          <p className="text-sm text-[#848e9c]">{profile.email}</p>
          <p className="text-xs text-[#5e6673] mt-1">
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
                <span className="text-xs text-[#848e9c]">{stat.label}</span>
              </div>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          );
        })}
      </div>

      {/* Recent bets */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[#eaecef] mb-4">Apuestas recientes</h3>
        {!profile.recent_bets || profile.recent_bets.length === 0 ? (
          <div className="text-center py-12 text-[#5e6673]">
            <p>Aún no has realizado apuestas</p>
            <Link to="/" className="text-[#00b8d4] hover:text-[#00e5ff] text-sm mt-2 inline-block">
              Explorar mercados →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            {profile.recent_bets.map((bet) => (
              <Link
                key={bet.id}
                to={`/market/${bet.market_id}`}
                className="flex items-center gap-4 bg-[#1e2329] rounded-lg px-4 py-3 hover:bg-[#2b3139] transition-colors"
              >
                <span className={`font-bold text-sm ${bet.side === 'YES' ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                  {bet.side}
                </span>
                <span className="flex-1 text-sm text-[#eaecef] truncate">
                  {bet.markets?.question || `Mercado #${bet.market_id}`}
                </span>
                <span className="text-sm text-[#848e9c] font-medium">{bet.amount.toLocaleString()}</span>
                {bet.won !== null && (
                  <span className={`text-xs font-bold ${bet.won ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
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
