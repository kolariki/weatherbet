import { useState } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { useAuth } from '../contexts/AuthContext';
import { useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, maxUint256 } from 'viem';
import { BETALL_ABI } from '../lib/web3Config';
import toast from 'react-hot-toast';
import { ArrowDownUp, Loader2, Wallet, ExternalLink } from 'lucide-react';

/**
 * Deposit (BETALL → Credits) and Withdraw (Credits → BETALL) UI.
 */
export default function TokenSwap() {
  const { isConnected, isCorrectChain, tokenBalance, contractAddress, minterAddress, deposit, withdraw, refetchBalance } = useWallet();
  const { profile, refreshProfile } = useAuth();
  const [mode, setMode] = useState('deposit'); // 'deposit' | 'withdraw'
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  // Approval transaction
  const { writeContract: approve, data: approveTxHash } = useWriteContract();
  const { isLoading: approving } = useWaitForTransactionReceipt({ hash: approveTxHash });

  if (!isConnected) {
    return (
      <div className="glass-card p-6 text-center">
        <Wallet className="w-8 h-8 text-gray-500 mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Connect your wallet to deposit/withdraw BETALL tokens</p>
      </div>
    );
  }

  if (!isCorrectChain) {
    return (
      <div className="glass-card p-6 text-center">
        <p className="text-yellow-400 text-sm">Please switch to the Base network</p>
      </div>
    );
  }

  async function handleApprove() {
    try {
      approve({
        address: contractAddress,
        abi: BETALL_ABI,
        functionName: 'approve',
        args: [minterAddress, maxUint256],
      });
      toast.success('Approval transaction sent!');
    } catch (e) {
      toast.error('Approval failed: ' + e.message);
    }
  }

  async function handleAction() {
    const numAmount = parseFloat(amount);
    if (!numAmount || numAmount <= 0) {
      toast.error('Enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'deposit') {
        const result = await deposit(numAmount);
        toast.success(result.message);
      } else {
        const result = await withdraw(numAmount);
        toast.success(result.message);
      }
      await refreshProfile();
      setAmount('');
    } catch (e) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const maxAmount = mode === 'deposit'
    ? parseFloat(tokenBalance)
    : (profile?.balance_credits || 0);

  return (
    <div className="glass-card p-6">
      <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
        <ArrowDownUp className="w-5 h-5 text-purple-400" />
        BETALL ↔ Credits
      </h3>

      {/* Mode toggle */}
      <div className="grid grid-cols-2 gap-2 mb-5">
        <button
          onClick={() => setMode('deposit')}
          className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
            mode === 'deposit'
              ? 'bg-emerald-500 text-white'
              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
          }`}
        >
          Deposit BETALL
        </button>
        <button
          onClick={() => setMode('withdraw')}
          className={`py-2.5 rounded-xl font-bold text-sm transition-all ${
            mode === 'withdraw'
              ? 'bg-purple-500 text-white'
              : 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
          }`}
        >
          Withdraw BETALL
        </button>
      </div>

      {/* Balances */}
      <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">BETALL Balance</p>
          <p className="text-white font-bold">{parseFloat(tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-white/5 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500 mb-1">Credits</p>
          <p className="text-white font-bold">{(profile?.balance_credits || 0).toLocaleString()}</p>
        </div>
      </div>

      {/* Amount input */}
      <div className="mb-4">
        <label className="block text-xs text-gray-400 mb-2">
          {mode === 'deposit' ? 'BETALL to deposit' : 'Credits to withdraw'}
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0"
            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-lg font-bold focus:outline-none focus:border-purple-500/50"
            min="1"
          />
          <button
            onClick={() => setAmount(String(Math.floor(maxAmount)))}
            className="px-4 py-3 rounded-xl bg-white/5 text-gray-300 hover:bg-white/10 text-sm font-medium"
          >
            Max
          </button>
        </div>
      </div>

      {/* Conversion info */}
      {amount && parseFloat(amount) > 0 && (
        <div className="bg-white/5 rounded-xl p-3 mb-4 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">You {mode === 'deposit' ? 'spend' : 'spend'}</span>
            <span className="text-white font-medium">
              {parseFloat(amount).toLocaleString()} {mode === 'deposit' ? 'BETALL' : 'credits'}
            </span>
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-gray-400">You receive</span>
            <span className="text-emerald-400 font-bold">
              {Math.floor(parseFloat(amount)).toLocaleString()} {mode === 'deposit' ? 'credits' : 'BETALL'}
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-2">Rate: 1 BETALL = 1 credit</p>
        </div>
      )}

      {/* Approve button (deposit only) */}
      {mode === 'deposit' && (
        <button
          onClick={handleApprove}
          disabled={approving}
          className="w-full py-2.5 rounded-xl bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-sm font-bold hover:bg-yellow-500/20 transition-all mb-3 disabled:opacity-50"
        >
          {approving ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : '1. Approve BETALL spending'}
        </button>
      )}

      {/* Action button */}
      <button
        onClick={handleAction}
        disabled={loading || !amount || parseFloat(amount) <= 0}
        className={`w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-50 ${
          mode === 'deposit'
            ? 'bg-gradient-to-r from-emerald-500 to-emerald-600'
            : 'bg-gradient-to-r from-purple-500 to-purple-600'
        }`}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin mx-auto" />
        ) : mode === 'deposit' ? (
          `${mode === 'deposit' ? '2. ' : ''}Deposit ${amount || '0'} BETALL`
        ) : (
          `Withdraw ${amount || '0'} BETALL`
        )}
      </button>
    </div>
  );
}
