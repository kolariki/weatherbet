import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getWallet, claimDaily } from '../lib/api';
import toast from 'react-hot-toast';
import { Coins, Gift, Clock, ArrowUpRight, ArrowDownRight, Loader2, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Wallet() {
  const { profile, refreshProfile } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [cooldownText, setCooldownText] = useState('');

  useEffect(() => {
    fetchWallet();
  }, []);

  useEffect(() => {
    if (!wallet?.last_daily_claim) { setCooldownText(''); return; }
    function update() {
      const next = new Date(wallet.last_daily_claim).getTime() + 24 * 60 * 60 * 1000;
      const diff = next - Date.now();
      if (diff <= 0) { setCooldownText(''); return; }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCooldownText(`${h}h ${m}m ${s}s`);
    }
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [wallet?.last_daily_claim]);

  async function fetchWallet() {
    try {
      const data = await getWallet();
      setWallet(data);
    } catch (e) {
      toast.error('Error al cargar billetera');
    } finally {
      setLoading(false);
    }
  }

  async function handleClaim() {
    setClaiming(true);
    try {
      const result = await claimDaily();
      toast.success(result.message);
      await refreshProfile();
      await fetchWallet();
    } catch (e) {
      toast.error(e.message);
    } finally {
      setClaiming(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-500" />
      </div>
    );
  }

  const canClaim = !cooldownText;

  const typeConfig = {
    bet: { icon: ArrowDownRight, color: 'text-red-400', label: 'Apuesta', prefix: '' },
    win: { icon: ArrowUpRight, color: 'text-emerald-400', label: 'Ganancia', prefix: '+' },
    daily_claim: { icon: Gift, color: 'text-purple-400', label: 'Créditos diarios', prefix: '+' },
    refund: { icon: ArrowUpRight, color: 'text-blue-400', label: 'Reembolso', prefix: '+' },
  };

  return (
    <div>
      <h1 className="text-3xl font-bold gradient-text mb-8">Billetera</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Balance card */}
        <div className="glass-card p-8">
          <p className="text-sm text-gray-400 mb-2">Balance actual</p>
          <div className="flex items-center gap-3">
            <Coins className="w-8 h-8 text-yellow-400" />
            <span className="text-4xl font-bold text-white">
              {(wallet?.balance || profile?.balance_credits || 0).toLocaleString()}
            </span>
            <span className="text-gray-400 text-lg">créditos</span>
          </div>
        </div>

        {/* Daily claim card */}
        <div className="glass-card p-8 flex flex-col justify-between">
          <div>
            <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-400" />
              Créditos diarios
            </p>
            <p className="text-2xl font-bold text-purple-400 mb-3">500 créditos/día</p>
          </div>

          {canClaim ? (
            <button
              onClick={handleClaim}
              disabled={claiming}
              className="btn-primary flex items-center justify-center gap-2 w-full"
            >
              {claiming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Gift className="w-4 h-4" />}
              Reclamar créditos
            </button>
          ) : (
            <div className="flex items-center gap-2 text-sm text-gray-400 bg-white/5 rounded-xl px-4 py-3 justify-center">
              <Clock className="w-4 h-4" />
              Próximo reclamo en {cooldownText}
            </div>
          )}
        </div>
      </div>

      {/* Transaction history */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Historial de transacciones</h3>

        {!wallet?.transactions || wallet.transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <p>No hay transacciones aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {wallet.transactions.map((tx) => {
              const config = typeConfig[tx.type] || typeConfig.bet;
              const Icon = config.icon;
              return (
                <div key={tx.id} className="flex items-center gap-4 bg-white/5 rounded-xl px-4 py-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color} bg-white/5`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white font-medium truncate">{tx.description || config.label}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.amount > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </p>
                  </div>
                  {tx.market_id && (
                    <Link
                      to={`/market/${tx.market_id}`}
                      className="text-xs text-purple-400 hover:text-purple-300"
                    >
                      Ver
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
