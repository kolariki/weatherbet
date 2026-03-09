import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { formatUnits, parseUnits, maxUint256 } from 'viem';
import { useAuth } from './AuthContext';
import { BETALL_ABI, CONTRACTS, TARGET_CHAIN_ID } from '../lib/web3Config';

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

const WalletContext = createContext(null);

export function useWallet() {
  return useContext(WalletContext);
}

export function WalletProvider({ children }) {
  const { address, isConnected, chainId } = useAccount();
  const { user, token } = useAuth();
  const [tokenBalance, setTokenBalance] = useState('0');
  const [serverConfig, setServerConfig] = useState(null);
  const [syncing, setSyncing] = useState(false);

  const isCorrectChain = chainId === TARGET_CHAIN_ID;

  // Read on-chain balance via wagmi
  const { data: rawBalance, refetch: refetchBalance } = useReadContract({
    address: CONTRACTS.BETALL,
    abi: BETALL_ABI,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!address && isConnected && CONTRACTS.BETALL !== '0x0000000000000000000000000000000000000000' },
  });

  useEffect(() => {
    if (rawBalance !== undefined) {
      setTokenBalance(formatUnits(rawBalance, 18));
    }
  }, [rawBalance]);

  // Fetch server web3 config
  useEffect(() => {
    fetch(`${API}/wallet/web3-config`)
      .then(r => r.json())
      .then(setServerConfig)
      .catch(() => {});
  }, []);

  // Sync wallet address to backend when connected
  useEffect(() => {
    if (isConnected && address && token) {
      syncWalletToBackend(address);
    }
  }, [isConnected, address, token]);

  async function syncWalletToBackend(walletAddress) {
    try {
      setSyncing(true);
      await fetch(`${API}/wallet/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ wallet_address: walletAddress }),
      });
    } catch (e) {
      console.error('Failed to sync wallet:', e);
    } finally {
      setSyncing(false);
    }
  }

  // Deposit: burn BETALL → get credits
  async function deposit(amount) {
    const res = await fetch(`${API}/wallet/deposit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    refetchBalance();
    return data;
  }

  // Withdraw: spend credits → mint BETALL
  async function withdraw(amount) {
    const res = await fetch(`${API}/wallet/withdraw`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ amount }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    refetchBalance();
    return data;
  }

  const value = {
    // Wallet state
    address,
    isConnected,
    isCorrectChain,
    tokenBalance,
    syncing,
    serverConfig,
    // Actions
    deposit,
    withdraw,
    refetchBalance,
    // Helpers for approval
    contractAddress: CONTRACTS.BETALL,
    minterAddress: serverConfig?.minterAddress || CONTRACTS.MINTER,
    approveAmount: maxUint256,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
