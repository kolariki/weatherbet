const { Router } = require('express');
const { supabase } = require('../services/supabaseClient.js');
const { requireAuth } = require('./auth.js');
const web3Service = require('../services/web3Service.js');

const router = Router();

// GET /api/wallet
router.get('/', requireAuth, async (req, res) => {
  try {
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*, markets(question)')
      .eq('user_id', req.user.id)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    res.json({
      balance: req.profile.balance_credits,
      last_daily_claim: req.profile.last_daily_claim,
      transactions: transactions || [],
    });
  } catch (error) {
    console.error('Wallet error:', error);
    res.status(500).json({ error: 'Error al obtener billetera' });
  }
});

// POST /api/wallet/claim-daily
router.post('/claim-daily', requireAuth, async (req, res) => {
  try {
    const profile = req.profile;
    const now = new Date();
    const DAILY_AMOUNT = 500;
    const COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

    if (profile.last_daily_claim) {
      const lastClaim = new Date(profile.last_daily_claim);
      const elapsed = now.getTime() - lastClaim.getTime();

      if (elapsed < COOLDOWN_MS) {
        const remainingMs = COOLDOWN_MS - elapsed;
        const remainingHours = Math.ceil(remainingMs / (60 * 60 * 1000));
        return res.status(400).json({
          error: `Ya reclamaste tus créditos diarios. Vuelve en ${remainingHours} horas`,
          next_claim_at: new Date(lastClaim.getTime() + COOLDOWN_MS).toISOString(),
        });
      }
    }

    // Update balance and claim time
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        balance_credits: profile.balance_credits + DAILY_AMOUNT,
        last_daily_claim: now.toISOString(),
      })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    // Create transaction
    await supabase.from('transactions').insert({
      user_id: req.user.id,
      type: 'daily_claim',
      amount: DAILY_AMOUNT,
      description: 'Créditos diarios reclamados',
    });

    res.json({
      message: `¡Reclamaste ${DAILY_AMOUNT} créditos!`,
      new_balance: profile.balance_credits + DAILY_AMOUNT,
      next_claim_at: new Date(now.getTime() + COOLDOWN_MS).toISOString(),
    });
  } catch (error) {
    console.error('Daily claim error:', error);
    res.status(500).json({ error: 'Error al reclamar créditos diarios' });
  }
});

// ─── BETALL Token Endpoints ──────────────────────────────────────────────────

// POST /api/wallet/connect — save user's wallet address to their profile
router.post('/connect', requireAuth, async (req, res) => {
  try {
    const { wallet_address } = req.body;
    if (!wallet_address || !/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
      return res.status(400).json({ error: 'Invalid Ethereum address' });
    }

    const { error } = await supabase
      .from('profiles')
      .update({ wallet_address: wallet_address.toLowerCase() })
      .eq('id', req.user.id);

    if (error) throw error;
    res.json({ message: 'Wallet connected', wallet_address });
  } catch (error) {
    console.error('Wallet connect error:', error);
    res.status(500).json({ error: 'Error connecting wallet' });
  }
});

// GET /api/wallet/balance — get on-chain BETALL balance
router.get('/balance', requireAuth, async (req, res) => {
  try {
    if (!web3Service.isConfigured()) {
      return res.json({ balance: '0', configured: false });
    }

    const walletAddr = req.profile.wallet_address || req.query.address;
    if (!walletAddr) {
      return res.json({ balance: '0', connected: false });
    }

    const { balance } = await web3Service.getBalance(walletAddr);
    const { allowance } = await web3Service.getAllowance(walletAddr);

    res.json({
      balance,
      allowance,
      wallet_address: walletAddr,
      minter_address: web3Service.getMinterAddress(),
      contract_address: process.env.BETALL_CONTRACT_ADDRESS,
      configured: true,
      connected: true,
    });
  } catch (error) {
    console.error('Token balance error:', error);
    res.status(500).json({ error: 'Error fetching token balance' });
  }
});

// POST /api/wallet/deposit — user deposits BETALL to get in-game credits
// User must have approved the game minter to spend their tokens first
router.post('/deposit', requireAuth, async (req, res) => {
  try {
    if (!web3Service.isConfigured()) {
      return res.status(400).json({ error: 'Crypto not configured' });
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const walletAddr = req.profile.wallet_address;
    if (!walletAddr) {
      return res.status(400).json({ error: 'No wallet connected' });
    }

    // Burn tokens from user's wallet (requires approval)
    const { txHash } = await web3Service.burnTokens(walletAddr, amount);

    // Credit the user's in-game balance (1 BETALL = 1 credit)
    const creditsToAdd = Math.floor(amount);
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ balance_credits: req.profile.balance_credits + creditsToAdd })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    // Log transaction
    await supabase.from('transactions').insert({
      user_id: req.user.id,
      type: 'token_deposit',
      amount: creditsToAdd,
      description: `Deposited ${amount} BETALL → ${creditsToAdd} credits (tx: ${txHash.slice(0, 10)}...)`,
    });

    res.json({
      message: `Deposited ${creditsToAdd} credits`,
      txHash,
      new_balance: req.profile.balance_credits + creditsToAdd,
    });
  } catch (error) {
    console.error('Deposit error:', error);
    res.status(500).json({ error: error.message || 'Deposit failed' });
  }
});

// POST /api/wallet/withdraw — mint BETALL to user's wallet from credits
router.post('/withdraw', requireAuth, async (req, res) => {
  try {
    if (!web3Service.isConfigured()) {
      return res.status(400).json({ error: 'Crypto not configured' });
    }

    const { amount } = req.body;
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    const walletAddr = req.profile.wallet_address;
    if (!walletAddr) {
      return res.status(400).json({ error: 'No wallet connected' });
    }

    const creditsToRemove = Math.floor(amount);
    if (req.profile.balance_credits < creditsToRemove) {
      return res.status(400).json({ error: 'Insufficient credits' });
    }

    // Deduct credits first
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ balance_credits: req.profile.balance_credits - creditsToRemove })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    // Mint tokens to user's wallet
    const { txHash } = await web3Service.mintTokens(walletAddr, creditsToRemove);

    // Log transaction
    await supabase.from('transactions').insert({
      user_id: req.user.id,
      type: 'token_withdraw',
      amount: -creditsToRemove,
      description: `Withdrew ${creditsToRemove} credits → ${creditsToRemove} BETALL (tx: ${txHash.slice(0, 10)}...)`,
    });

    res.json({
      message: `Withdrew ${creditsToRemove} BETALL`,
      txHash,
      new_balance: req.profile.balance_credits - creditsToRemove,
    });
  } catch (error) {
    console.error('Withdraw error:', error);
    res.status(500).json({ error: error.message || 'Withdrawal failed' });
  }
});

// GET /api/wallet/web3-config — public endpoint for frontend config
router.get('/web3-config', (req, res) => {
  res.json({
    configured: web3Service.isConfigured(),
    contractAddress: process.env.BETALL_CONTRACT_ADDRESS || null,
    minterAddress: web3Service.isConfigured() ? web3Service.getMinterAddress() : null,
    chainId: parseInt(process.env.CHAIN_ID || '8453'),
  });
});

module.exports = router;
