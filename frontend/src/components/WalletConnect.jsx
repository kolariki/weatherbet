import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '../contexts/WalletContext';
import { Coins } from 'lucide-react';

/**
 * Wallet connect button with BETALL balance display.
 * Drops into the navbar or any component.
 */
export default function WalletConnect({ compact = false }) {
  const { tokenBalance, isConnected, isCorrectChain } = useWallet();

  return (
    <div className="flex items-center gap-3">
      {isConnected && isCorrectChain && parseFloat(tokenBalance) > 0 && (
        <div className="flex items-center gap-1.5 bg-purple-500/10 border border-purple-500/20 rounded-xl px-3 py-1.5 text-sm">
          <Coins className="w-3.5 h-3.5 text-purple-400" />
          <span className="font-bold text-purple-300">
            {parseFloat(tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          {!compact && <span className="text-purple-400/60 text-xs">BETALL</span>}
        </div>
      )}
      <ConnectButton
        chainStatus="icon"
        accountStatus={compact ? 'avatar' : 'address'}
        showBalance={false}
      />
    </div>
  );
}
