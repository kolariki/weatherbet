import { useState, useEffect } from 'react';
import { getLeaderboard } from '../lib/api';
import { Trophy, Medal, Loader2, TrendingUp, Coins } from 'lucide-react';

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getLeaderboard();
        setUsers(data);
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

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div>
      <h1 className="text-3xl font-bold gradient-text mb-2">Ranking</h1>
      <p className="text-gray-400 text-sm mb-8">Top jugadores por ganancia total</p>

      {users.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Aún no hay jugadores en el ranking</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 text-xs text-gray-500 font-medium border-b border-white/5">
            <span>#</span>
            <span>Jugador</span>
            <span className="text-right">Apuestas</span>
            <span className="text-right">Victorias</span>
            <span className="text-right">Ganancia</span>
          </div>

          {users.map((user, i) => (
            <div
              key={user.id}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-4 items-center border-b border-white/5 last:border-0 ${
                i < 3 ? 'bg-white/[0.02]' : ''
              }`}
            >
              <span className="text-lg w-8">
                {i < 3 ? medals[i] : <span className="text-sm text-gray-500">{i + 1}</span>}
              </span>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {user.username?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="text-sm font-medium text-white truncate">{user.username}</span>
              </div>
              <span className="text-sm text-gray-400 text-right">{user.total_bets}</span>
              <span className="text-sm text-gray-400 text-right">{user.total_wins}</span>
              <span className={`text-sm font-bold text-right ${user.total_profit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {user.total_profit >= 0 ? '+' : ''}{user.total_profit.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
