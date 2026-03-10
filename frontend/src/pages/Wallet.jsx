import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api, getWallet, claimDaily } from '../lib/api';
import toast from 'react-hot-toast';
import { Coins, Gift, Clock, ArrowUpRight, ArrowDownRight, Loader2, Sparkles, Wallet as WalletIcon, CreditCard } from 'lucide-react';
import { Link } from 'react-router-dom';
import WalletConnect from '../components/WalletConnect';
import TokenSwap from '../components/TokenSwap';
import BuyCredits from '../components/BuyCredits';
import { useWallet } from '../contexts/WalletContext';
import { useSearchParams } from 'react-router-dom';

export default function Wallet() {
  const { profile, refreshProfile } = useAuth();
  const walletCtx = useWallet();
  const [wallet, setWallet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [cooldownText, setCooldownText] = useState('');
  const [searchParams, setSearchParams] = useSearchParams();

  // Check for Stripe checkout return
  useEffect(() => {
    const sessionId = searchParams.get('session_id');
    if (sessionId) {
      api(`/stripe/session-status?session_id=${sessionId}`)
        .then((data) => {
          if (data.status === 'complete') {
            toast.success('¡Pago exitoso! Tus créditos fueron acreditados');
            refreshProfile();
            fetchWallet();
          }
        })
        .catch(() => {})
        .finally(() => {
          // Clean URL
          searchParams.delete('session_id');
          setSearchParams(searchParams, { replace: true });
        });
    }
  }, []);

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
        <Loader2 className="w-8 h-8 animate-spin text-[#00b8d4]" />
      </div>
    );
  }

  const canClaim = !cooldownText;

  const typeConfig = {
    bet: { icon: ArrowDownRight, color: 'text-[#f6465d]', label: 'Apuesta', prefix: '' },
    win: { icon: ArrowUpRight, color: 'text-[#2ebd85]', label: 'Ganancia', prefix: '+' },
    daily_claim: { icon: Gift, color: 'text-[#00b8d4]', label: 'Créditos diarios', prefix: '+' },
    refund: { icon: ArrowUpRight, color: 'text-[#00b8d4]', label: 'Reembolso', prefix: '+' },
    purchase: { icon: CreditCard, color: 'text-[#2ebd85]', label: 'Compra', prefix: '+' },
    token_deposit: { icon: ArrowDownRight, color: 'text-[#00b8d4]', label: 'Depósito BETALL', prefix: '+' },
    token_withdraw: { icon: ArrowUpRight, color: 'text-[#00b8d4]', label: 'Retiro BETALL', prefix: '' },
  };

  return (
    <div>
      <h1 className="text-3xl font-bold gradient-text mb-8">Billetera</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Balance card */}
        <div className="glass-card p-8">
          <p className="text-sm text-[#848e9c] mb-2">Balance actual</p>
          <div className="flex items-center gap-3">
            <Coins className="w-8 h-8 text-yellow-400" />
            <span className="text-4xl font-bold text-[#eaecef]">
              {(wallet?.balance || profile?.balance_credits || 0).toLocaleString()}
            </span>
            <span className="text-[#848e9c] text-lg">créditos</span>
          </div>
        </div>

        {/* Daily claim card */}
        <div className="glass-card p-8 flex flex-col justify-between">
          <div>
            <p className="text-sm text-[#848e9c] mb-1 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#00b8d4]" />
              Créditos diarios
            </p>
            <p className="text-2xl font-bold text-[#00b8d4] mb-3">500 créditos/día</p>
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
            <div className="flex items-center gap-2 text-sm text-[#848e9c] bg-[#1e2329] rounded-lg px-4 py-3 justify-center">
              <Clock className="w-4 h-4" />
              Próximo reclamo en {cooldownText}
            </div>
          )}
        </div>
      </div>

      {/* Buy Credits */}
      <div className="glass-card p-6 mb-8">
        <BuyCredits />
      </div>

      {/* BETALL Token Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="glass-card p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-[#eaecef] flex items-center gap-2">
              <WalletIcon className="w-5 h-5 text-[#00b8d4]" />
              BETALL Token
            </h3>
          </div>
          <WalletConnect />
          {walletCtx?.isConnected && (
            <div className="mt-4 bg-[#1e2329] rounded-lg p-4">
              <p className="text-xs text-[#848e9c] mb-1">On-chain balance</p>
              <p className="text-2xl font-bold text-[#00b8d4]">
                {parseFloat(walletCtx.tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })} BETALL
              </p>
            </div>
          )}
        </div>
        <TokenSwap />
      </div>

      {/* Transaction history */}
      <div className="glass-card p-6">
        <h3 className="text-lg font-semibold text-[#eaecef] mb-4">Historial de transacciones</h3>

        {!wallet?.transactions || wallet.transactions.length === 0 ? (
          <div className="text-center py-12 text-[#5e6673]">
            <p>No hay transacciones aún</p>
          </div>
        ) : (
          <div className="space-y-2">
            {wallet.transactions.map((tx) => {
              const config = typeConfig[tx.type] || typeConfig.bet;
              const Icon = config.icon;
              return (
                <div key={tx.id} className="flex items-center gap-4 bg-[#1e2329] rounded-lg px-4 py-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${config.color} bg-[#1e2329] border border-[#2b3139]`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#eaecef] font-medium truncate">{tx.description || config.label}</p>
                    <p className="text-xs text-[#5e6673]">
                      {new Date(tx.created_at).toLocaleDateString('es-AR', {
                        day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-bold ${tx.amount > 0 ? 'text-[#2ebd85]' : 'text-[#f6465d]'}`}>
                      {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()}
                    </p>
                  </div>
                  {tx.market_id && (
                    <Link
                      to={`/market/${tx.market_id}`}
                      className="text-xs text-[#00b8d4] hover:text-[#00e5ff]"
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
