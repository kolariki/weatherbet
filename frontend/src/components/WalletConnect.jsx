import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useWallet } from '../contexts/WalletContext';
import { Coins } from 'lucide-react';

export default function WalletConnect({ compact = false }) {
  const { tokenBalance, isConnected, isCorrectChain } = useWallet();

  return (
    <div className="flex items-center gap-3">
      {isConnected && isCorrectChain && parseFloat(tokenBalance) > 0 && (
        <div className="flex items-center gap-1.5 bg-[#00b8d4]/10 border border-[#00b8d4]/20 rounded-lg px-3 py-1.5 text-sm">
          <Coins className="w-3.5 h-3.5 text-[#00b8d4]" />
          <span className="font-bold text-[#00e5ff]">
            {parseFloat(tokenBalance).toLocaleString(undefined, { maximumFractionDigits: 0 })}
          </span>
          {!compact && <span className="text-[#00b8d4]/60 text-xs">BETALL</span>}
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
