# BETALL Token — Crypto Integration Guide

## Architecture Overview

```
┌──────────────┐     ┌──────────────────┐     ┌──────────────┐
│   Frontend   │────▶│   Backend (API)  │────▶│  Base Chain   │
│  React/Vite  │     │   Express.js     │     │  (L2)        │
│  + wagmi     │     │  + ethers.js     │     │              │
│  + RainbowKit│     │  + web3Service   │     │  BETALL.sol  │
└──────────────┘     └──────────────────┘     └──────────────┘
       │                                             │
       └─────── Direct wallet interactions ──────────┘
                (approve, balanceOf)
```

### Dual Mode System
Users can play with **internal credits** (default) OR **BETALL tokens**:
- Credits: free, off-chain, earned via daily claims and gameplay
- BETALL: on-chain ERC-20, depositable/withdrawable, tradeable on DEXs

### Token Flow
1. **Deposit**: User approves BETALL spending → backend calls `gameBurn()` → credits added
2. **Withdraw**: Credits deducted → backend calls `gameMint()` → BETALL sent to wallet
3. **Win**: Backend mints BETALL (or adds credits, user's choice)
4. **Bet**: Backend burns BETALL (or deducts credits)

## Smart Contract — `BETALL.sol`

- **Standard**: ERC-20 (OpenZeppelin v5)
- **Name**: BetAll Token
- **Symbol**: BETALL
- **Decimals**: 18
- **Initial Supply**: 0 (all minted through gameplay)
- **Chain**: Base (8453) / Base Sepolia (84532)

### Roles
| Role | Can Do | Managed By |
|------|--------|------------|
| Owner | Set/revoke game minters | Deployer |
| Game Minter | `gameMint()`, `gameBurn()` | Owner |
| Users | `transfer()`, `approve()`, `burn()` | Self |

### Key Functions
- `gameMint(to, amount)` — Mint tokens (game minter only)
- `gameBurn(from, amount)` — Burn tokens from approved user (game minter only)
- `setGameMinter(account, bool)` — Grant/revoke minter role (owner only)
- Standard ERC-20: `transfer`, `approve`, `transferFrom`, `burn`

## Deployment (Step by Step)

### Prerequisites
- Node.js 18+
- An Ethereum wallet with Base ETH for gas
- Basescan API key (for verification)

### 1. Setup
```bash
cd contracts/
cp .env.example .env
# Edit .env with your PRIVATE_KEY and BASESCAN_API_KEY
npm install
```

### 2. Compile
```bash
npm run compile
```

### 3. Deploy to Testnet
```bash
npm run deploy:testnet
```
Note the contract address from the output.

### 4. Deploy to Mainnet
```bash
npm run deploy:mainnet
```

### 5. Configure Backend
Add to `backend/.env`:
```env
BETALL_CONTRACT_ADDRESS=0x_deployed_address
GAME_MINTER_PRIVATE_KEY=0x_your_minter_key
BASE_RPC_URL=https://mainnet.base.org
CHAIN_ID=8453
```

### 6. Configure Frontend
Add to `frontend/.env`:
```env
VITE_BETALL_CONTRACT_ADDRESS=0x_deployed_address
VITE_MINTER_ADDRESS=0x_minter_wallet_address
VITE_CHAIN_ID=8453
VITE_WALLETCONNECT_PROJECT_ID=your_project_id
```

## Adding Liquidity on Uniswap V3 (Base)

1. Go to [app.uniswap.org](https://app.uniswap.org) and switch to Base network
2. Navigate to **Pool** → **New Position**
3. Select token pair: **BETALL / ETH** (or BETALL / USDC)
4. Paste the BETALL contract address
5. Set fee tier (0.3% recommended for new tokens)
6. Set price range (or Full Range for simplicity)
7. Deposit both tokens and confirm

### Tips
- Start with a small initial liquidity pool
- Use BETALL/USDC for stable pricing
- Consider locking liquidity for trust

## Environment Variables

### Backend (`backend/.env`)
| Variable | Description | Required for Crypto |
|----------|-------------|-------------------|
| `BETALL_CONTRACT_ADDRESS` | Deployed contract address | Yes |
| `GAME_MINTER_PRIVATE_KEY` | Wallet with GAME_MINTER role | Yes |
| `BASE_RPC_URL` | Base RPC endpoint | No (defaults to public) |
| `CHAIN_ID` | 8453 (mainnet) or 84532 (testnet) | No |

### Frontend (`frontend/.env`)
| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_BETALL_CONTRACT_ADDRESS` | Contract address | Yes |
| `VITE_MINTER_ADDRESS` | Game minter wallet | Yes |
| `VITE_CHAIN_ID` | Target chain ID | No |
| `VITE_WALLETCONNECT_PROJECT_ID` | WalletConnect project ID | Yes (production) |

## Security Considerations

1. **Private Key Safety**: The `GAME_MINTER_PRIVATE_KEY` has minting power. Store it in secure env vars, never commit it.
2. **Approval Pattern**: Users must explicitly approve BETALL spending before deposits. The frontend guides this flow.
3. **Rate Limiting**: Consider adding rate limits to mint/burn endpoints to prevent abuse.
4. **Amount Validation**: All amounts are validated server-side. The contract uses SafeMath (built into Solidity 0.8+).
5. **Reentrancy**: The contract follows checks-effects-interactions pattern. OpenZeppelin handles the heavy lifting.
6. **Owner Key**: The contract owner can set game minters. Use a multisig or hardware wallet for the owner address in production.
7. **Audit**: The contract is intentionally simple (~60 lines). Consider a professional audit before mainnet launch with significant value.

## Testnet vs Mainnet

| | Base Sepolia (Testnet) | Base (Mainnet) |
|---|---|---|
| Chain ID | 84532 | 8453 |
| RPC | https://sepolia.base.org | https://mainnet.base.org |
| Explorer | sepolia.basescan.org | basescan.org |
| ETH | Free (faucet) | Real value |
| Use for | Development, testing | Production |

### Getting Testnet ETH
1. Go to [faucet.quicknode.com/base/sepolia](https://faucet.quicknode.com/base/sepolia)
2. Or bridge Sepolia ETH via [bridge.base.org](https://bridge.base.org)

## Database Migration

Add `wallet_address` column to the `profiles` table:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS wallet_address TEXT;
CREATE INDEX IF NOT EXISTS idx_profiles_wallet ON profiles (wallet_address);
```

## File Structure

```
weatherbet/
├── contracts/                    # Smart contract project
│   ├── contracts/BETALL.sol      # ERC-20 token contract
│   ├── scripts/deploy.js         # Deployment script
│   ├── hardhat.config.js         # Hardhat configuration
│   ├── package.json
│   └── .env.example
├── backend/
│   ├── services/web3Service.js   # ethers.js mint/burn/balance
│   └── routes/wallet.js          # Updated with crypto endpoints
├── frontend/
│   ├── src/lib/web3Config.js     # wagmi + contract config
│   ├── src/contexts/WalletContext.jsx  # Web3 state management
│   ├── src/components/WalletConnect.jsx # RainbowKit connect button
│   └── src/components/TokenSwap.jsx    # Deposit/withdraw UI
└── docs/BETALL_CRYPTO.md         # This file
```
