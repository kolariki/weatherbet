/**
 * AMM Service — Logarithmic Market Scoring Rule (LMSR)
 * Used by prediction markets like Polymarket's early version.
 * 
 * Much better than CPMM for binary markets:
 * - Price = probability (0 to 1)
 * - Buying at 50¢ means you get ~2 shares per credit
 * - If price rises to 80¢, your shares are worth more
 * - Each share pays 1 credit if your side wins
 * 
 * Price formula:
 *   price_yes = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
 *   where q = outstanding shares, b = liquidity parameter
 * 
 * Simplified implementation using pool ratios:
 *   Shares received = amount / current_price
 *   Price moves based on total shares outstanding
 */

const INITIAL_LIQUIDITY = 5000; // b parameter — higher = more stable prices
const PLATFORM_FEE = 0.02; // 2%

/**
 * Get prices from shares outstanding
 * Uses softmax: price_yes = e^(yes_shares/b) / (e^(yes_shares/b) + e^(no_shares/b))
 * But we track it simpler: price from pool ratio
 */
function getPrices(yesShares, noShares) {
  // LMSR-style: price based on exponential of shares
  const b = INITIAL_LIQUIDITY;
  const expYes = Math.exp(yesShares / b);
  const expNo = Math.exp(noShares / b);
  const total = expYes + expNo;

  return {
    yes_price: parseFloat((expYes / total).toFixed(4)),
    no_price: parseFloat((expNo / total).toFixed(4)),
    yes_percentage: Math.round((expYes / total) * 100),
    no_percentage: Math.round((expNo / total) * 100),
  };
}

/**
 * Calculate cost to buy N shares of a side
 * LMSR cost function: C(q) = b * ln(e^(q_yes/b) + e^(q_no/b))
 * Cost of buying Δ shares = C(q + Δ) - C(q)
 */
function costFunction(yesShares, noShares) {
  const b = INITIAL_LIQUIDITY;
  return b * Math.log(Math.exp(yesShares / b) + Math.exp(noShares / b));
}

/**
 * Buy shares: user pays credits, gets shares at current price
 * Returns how many shares they get for their credits
 */
function calculateBuy(yesShares, noShares, side, amount) {
  const fee = amount * PLATFORM_FEE;
  const amountAfterFee = amount - fee;

  const pricesBefore = getPrices(yesShares, noShares);
  const currentPrice = side === 'YES' ? pricesBefore.yes_price : pricesBefore.no_price;

  // Binary search for exact shares that cost `amountAfterFee`
  let lo = 0, hi = amountAfterFee / Math.max(currentPrice * 0.5, 0.01);
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const newYes = side === 'YES' ? yesShares + mid : yesShares;
    const newNo = side === 'NO' ? noShares + mid : noShares;
    const cost = costFunction(newYes, newNo) - costFunction(yesShares, noShares);
    if (cost < amountAfterFee) lo = mid;
    else hi = mid;
  }
  const shares = (lo + hi) / 2;

  const newYesShares = side === 'YES' ? yesShares + shares : yesShares;
  const newNoShares = side === 'NO' ? noShares + shares : noShares;
  const pricesAfter = getPrices(newYesShares, newNoShares);
  const avgPrice = shares > 0 ? parseFloat((amount / shares).toFixed(4)) : 0;

  return {
    shares: parseFloat(shares.toFixed(2)),
    fee: parseFloat(fee.toFixed(2)),
    avg_price: avgPrice,
    new_yes_liquidity: parseFloat(newYesShares.toFixed(2)),
    new_no_liquidity: parseFloat(newNoShares.toFixed(2)),
    prices_before: pricesBefore,
    prices_after: pricesAfter,
  };
}

/**
 * Sell shares: user returns shares, gets credits back
 */
function calculateSell(yesShares, noShares, side, sharesToSell) {
  // Cost of removing shares (negative cost = credits out)
  const newYes = side === 'YES' ? yesShares - sharesToSell : yesShares;
  const newNo = side === 'NO' ? noShares - sharesToSell : noShares;

  // Credits out = C(current) - C(after removal)
  const creditsOut = costFunction(yesShares, noShares) - costFunction(newYes, newNo);
  const fee = creditsOut * PLATFORM_FEE;
  const creditsAfterFee = creditsOut - fee;

  const pricesAfter = getPrices(newYes, newNo);

  return {
    credits_out: parseFloat(Math.max(0, creditsAfterFee).toFixed(2)),
    fee: parseFloat(fee.toFixed(2)),
    new_yes_liquidity: parseFloat(newYes.toFixed(2)),
    new_no_liquidity: parseFloat(newNo.toFixed(2)),
    prices_after: pricesAfter,
  };
}

module.exports = {
  INITIAL_LIQUIDITY,
  PLATFORM_FEE,
  getPrices,
  calculateBuy,
  calculateSell,
  costFunction,
};
