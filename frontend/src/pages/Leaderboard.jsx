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
        <Loader2 className="w-8 h-8 animate-spin text-[#00b8d4]" />
      </div>
    );
  }

  const medals = ['🥇', '🥈', '🥉'];

  return (
    <div>
      <h1 className="text-3xl font-bold gradient-text mb-2">Ranking</h1>
      <p className="text-[#848e9c] text-sm mb-8">Top jugadores por ganancia total</p>

      {users.length === 0 ? (
        <div className="text-center py-20 text-[#5e6673]">
          <Trophy className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Aún no hay jugadores en el ranking</p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-3 text-xs text-[#5e6673] font-medium border-b border-[#2b3139]">
            <span>#</span>
            <span>Jugador</span>
            <span className="text-right">Apuestas</span>
            <span className="text-right">Victorias</span>
            <span className="text-right">Ganancia</span>
          </div>

          {users.map((user, i) => (
            <div
              key={user.id}
              className={`grid grid-cols-[auto_1fr_auto_auto_auto] gap-4 px-6 py-4 items-center border-b border-[#2b3139] last:border-0 ${
                i < 3 ? 'bg-[#1e2329]/50' : ''
              }`}
            >
              <span className="text-lg w-8">
                {i < 3 ? medals[i] : <span className="text-sm text-[#5e6673]">{i + 1}</span>}
              </span>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00b8d4] to-[#00e5ff] flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                  {user.username?.[0]?.toUpperCase() || '?'}
                </div>
                <span className="text-sm font-medium text-[#eaecef] truncate">{user.username}</span>
              </div>
              <span className="text-sm text-[#848e9c] text-right">{user.total_bets}</span>
              <span className="text-sm text-[#848e9c] text-right">{user.total_wins}</span>
              <span className={`text-sm font-bold text-right ${user.total_profit >= 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                {user.total_profit >= 0 ? '+' : ''}{user.total_profit.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
