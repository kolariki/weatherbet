/**
 * Web3 Service — ethers.js v6 integration for BETALL token operations.
 * Uses a GAME_MINTER wallet to mint/burn tokens on the BETALL contract.
 */
const { ethers } = require('ethers');

// Minimal ABI — only the functions we call
const BETALL_ABI = [
  "function balanceOf(address account) view returns (uint256)",
  "function gameMint(address to, uint256 amount)",
  "function gameBurn(address from, uint256 amount)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function totalSupply() view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
  "event GameMint(address indexed to, uint256 amount)",
  "event GameBurn(address indexed from, uint256 amount)",
];

let _provider = null;
let _signer = null;
let _contract = null;

function getProvider() {
  if (!_provider) {
    const rpcUrl = process.env.BASE_RPC_URL || 'https://mainnet.base.org';
    _provider = new ethers.JsonRpcProvider(rpcUrl);
  }
  return _provider;
}

function getSigner() {
  if (!_signer) {
    const pk = process.env.GAME_MINTER_PRIVATE_KEY;
    if (!pk) throw new Error('GAME_MINTER_PRIVATE_KEY not set');
    _signer = new ethers.Wallet(pk, getProvider());
  }
  return _signer;
}

function getContract(signerOrProvider) {
  const addr = process.env.BETALL_CONTRACT_ADDRESS;
  if (!addr) throw new Error('BETALL_CONTRACT_ADDRESS not set');
  return new ethers.Contract(addr, BETALL_ABI, signerOrProvider || getProvider());
}

/**
 * Mint BETALL tokens to a user's wallet (called when user wins / earns).
 * @param {string} walletAddress - recipient
 * @param {number} amount - human-readable amount (e.g. 100 = 100 BETALL)
 * @returns {{ txHash: string }}
 */
async function mintTokens(walletAddress, amount) {
  const contract = getContract(getSigner());
  const weiAmount = ethers.parseUnits(String(amount), 18);
  const tx = await contract.gameMint(walletAddress, weiAmount);
  const receipt = await tx.wait();
  console.log(`[web3] Minted ${amount} BETALL to ${walletAddress} — tx: ${receipt.hash}`);
  return { txHash: receipt.hash };
}

/**
 * Burn BETALL tokens from a user's wallet (called when user places a bet).
 * Requires prior ERC-20 approval from the user to the game minter address.
 * @param {string} walletAddress - token holder
 * @param {number} amount - human-readable amount
 * @returns {{ txHash: string }}
 */
async function burnTokens(walletAddress, amount) {
  const contract = getContract(getSigner());
  const weiAmount = ethers.parseUnits(String(amount), 18);
  const tx = await contract.gameBurn(walletAddress, weiAmount);
  const receipt = await tx.wait();
  console.log(`[web3] Burned ${amount} BETALL from ${walletAddress} — tx: ${receipt.hash}`);
  return { txHash: receipt.hash };
}

/**
 * Get on-chain BETALL balance for a wallet.
 * @param {string} walletAddress
 * @returns {{ balance: string, balanceRaw: string }}
 */
async function getBalance(walletAddress) {
  const contract = getContract(getProvider());
  const raw = await contract.balanceOf(walletAddress);
  return {
    balance: ethers.formatUnits(raw, 18),
    balanceRaw: raw.toString(),
  };
}

/**
 * Check allowance the user has granted to the game minter.
 */
async function getAllowance(walletAddress) {
  const contract = getContract(getProvider());
  const minterAddr = getSigner().address;
  const raw = await contract.allowance(walletAddress, minterAddr);
  return {
    allowance: ethers.formatUnits(raw, 18),
    allowanceRaw: raw.toString(),
  };
}

/**
 * Get the game minter wallet address (for frontend approval target).
 */
function getMinterAddress() {
  return getSigner().address;
}

/**
 * Check if web3 is configured (contract address + private key present).
 */
function isConfigured() {
  return !!(process.env.BETALL_CONTRACT_ADDRESS && process.env.GAME_MINTER_PRIVATE_KEY);
}

module.exports = {
  mintTokens,
  burnTokens,
  getBalance,
  getAllowance,
  getMinterAddress,
  isConfigured,
  BETALL_ABI,
};
