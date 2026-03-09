import { http, createConfig } from 'wagmi';
import { base, baseSepolia } from 'wagmi/chains';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

// BETALL contract ABI — only the functions the frontend needs
export const BETALL_ABI = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'approve',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'allowance',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: 'owner', type: 'address' },
      { name: 'spender', type: 'address' },
    ],
    outputs: [{ name: '', type: 'uint256' }],
  },
  {
    name: 'totalSupply',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
  },
];

// Contract addresses — update after deployment
export const CONTRACTS = {
  BETALL: import.meta.env.VITE_BETALL_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000',
  MINTER: import.meta.env.VITE_MINTER_ADDRESS || '0x0000000000000000000000000000000000000000',
};

// Target chain
export const TARGET_CHAIN_ID = parseInt(import.meta.env.VITE_CHAIN_ID || '8453');
export const TARGET_CHAIN = TARGET_CHAIN_ID === 84532 ? baseSepolia : base;

// Wagmi + RainbowKit config
export const wagmiConfig = getDefaultConfig({
  appName: 'WeatherBet',
  projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'weatherbet-dev',
  chains: [TARGET_CHAIN],
  transports: {
    [base.id]: http('https://mainnet.base.org'),
    [baseSepolia.id]: http('https://sepolia.base.org'),
  },
});
