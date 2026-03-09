/**
 * AMM Service — Constant Product Market Maker (CPMM)
 * 
 * Similar to Polymarket/Uniswap. Each market has two virtual liquidity pools:
 * - yes_liquidity (virtual tokens for YES)
 * - no_liquidity (virtual tokens for NO)
 * 
 * Invariant: yes_liquidity * no_liquidity = K (constant)
 * 
 * Price of YES = no_liquidity / (yes_liquidity + no_liquidity)
 * Price of NO  = yes_liquidity / (yes_liquidity + no_liquidity)
 * 
 * When someone buys YES shares:
 * 1. They add credits to the YES pool
 * 2. The AMM calculates how many YES shares they get (maintaining K)
 * 3. YES price goes up, NO price goes down
 * 
 * Initial state: yes_liquidity = 1000, no_liquidity = 1000 → 50/50
 */

const INITIAL_LIQUIDITY = 1000; // Starting virtual liquidity per side
const PLATFORM_FEE = 0.02; // 2% fee on trades

/**
 * Get current prices for a market
 */
function getPrices(yesLiq, noLiq) {
  const total = yesLiq + noLiq;
  return {
    yes_price: parseFloat((noLiq / total).toFixed(4)),
    no_price: parseFloat((yesLiq / total).toFixed(4)),
    yes_percentage: Math.round((noLiq / total) * 100),
    no_percentage: Math.round((yesLiq / total) * 100),
  };
}

/**
 * Calculate shares received for a given amount of credits
 * Uses constant product formula: x * y = k
 * 
 * When buying YES:
 *   - Credits go into the no_liquidity pool (buying removes from yes pool)
 *   - new_no = no_liquidity + amount_after_fee
 *   - new_yes = k / new_no
 *   - shares = yes_liquidity - new_yes
 */
function calculateBuy(yesLiq, noLiq, side, amount) {
  const fee = amount * PLATFORM_FEE;
  const amountAfterFee = amount - fee;
  const k = yesLiq * noLiq;

  let shares, newYesLiq, newNoLiq;

  if (side === 'YES') {
    // Credits added to NO pool, shares come from YES pool
    newNoLiq = noLiq + amountAfterFee;
    newYesLiq = k / newNoLiq;
    shares = yesLiq - newYesLiq;
  } else {
    // Credits added to YES pool, shares come from NO pool
    newYesLiq = yesLiq + amountAfterFee;
    newNoLiq = k / newYesLiq;
    shares = noLiq - newNoLiq;
  }

  const pricesBefore = getPrices(yesLiq, noLiq);
  const pricesAfter = getPrices(newYesLiq, newNoLiq);

  // Average price paid per share
  const avgPrice = shares > 0 ? parseFloat((amount / shares).toFixed(4)) : 0;

  return {
    shares: parseFloat(shares.toFixed(2)),
    fee: parseFloat(fee.toFixed(2)),
    avg_price: avgPrice,
    new_yes_liquidity: parseFloat(newYesLiq.toFixed(2)),
    new_no_liquidity: parseFloat(newNoLiq.toFixed(2)),
    prices_before: pricesBefore,
    prices_after: pricesAfter,
  };
}

/**
 * Calculate credits received for selling shares
 * Reverse of buy: shares go back into pool, credits come out
 */
function calculateSell(yesLiq, noLiq, side, shares) {
  const k = yesLiq * noLiq;

  let creditsOut, newYesLiq, newNoLiq;

  if (side === 'YES') {
    // YES shares go back to YES pool, credits come from NO pool
    newYesLiq = yesLiq + shares;
    newNoLiq = k / newYesLiq;
    creditsOut = noLiq - newNoLiq;
  } else {
    // NO shares go back to NO pool, credits come from YES pool
    newNoLiq = noLiq + shares;
    newYesLiq = k / newNoLiq;
    creditsOut = yesLiq - newYesLiq;
  }

  const fee = creditsOut * PLATFORM_FEE;
  const creditsAfterFee = creditsOut - fee;

  const pricesAfter = getPrices(newYesLiq, newNoLiq);

  return {
    credits_out: parseFloat(creditsAfterFee.toFixed(2)),
    fee: parseFloat(fee.toFixed(2)),
    new_yes_liquidity: parseFloat(newYesLiq.toFixed(2)),
    new_no_liquidity: parseFloat(newNoLiq.toFixed(2)),
    prices_after: pricesAfter,
  };
}

/**
 * Calculate potential payout if market resolves in your favor
 * Each share is worth 1 credit if you win, 0 if you lose
 */
function calculatePotentialPayout(shares) {
  return parseFloat(shares.toFixed(2));
}

module.exports = {
  INITIAL_LIQUIDITY,
  PLATFORM_FEE,
  getPrices,
  calculateBuy,
  calculateSell,
  calculatePotentialPayout,
};
