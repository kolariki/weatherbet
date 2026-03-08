const cron = require('node-cron');
const { supabase } = require('./supabaseClient.js');
const { getWeatherData, evaluateCondition } = require('./weatherService.js');

function startResolver() {
  // Run every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Resolver] Running market resolution check...');
    await resolveMarkets();
  });

  console.log('[Resolver] Scheduled — runs every 30 minutes');
}

async function resolveMarkets() {
  try {
    const now = new Date().toISOString();

    // Find markets ready to resolve
    const { data: markets, error } = await supabase
      .from('markets')
      .select('*')
      .eq('status', 'open')
      .lte('resolves_at', now);

    if (error) {
      console.error('[Resolver] Error fetching markets:', error.message);
      return;
    }

    if (!markets || markets.length === 0) {
      console.log('[Resolver] No markets to resolve');
      return;
    }

    for (const market of markets) {
      try {
        await resolveMarket(market);
      } catch (err) {
        console.error(`[Resolver] Error resolving market ${market.id}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[Resolver] Fatal error:', err.message);
  }
}

async function resolveMarket(market) {
  console.log(`[Resolver] Resolving market #${market.id}: ${market.question}`);

  // Fetch weather data
  const weather = await getWeatherData(market.city, market.country_code);
  const actualValue = weather[market.metric];

  if (actualValue === undefined || actualValue === null) {
    console.error(`[Resolver] Could not get metric "${market.metric}" for ${market.city}`);
    return;
  }

  const result = evaluateCondition(actualValue, market.operator, market.threshold);
  console.log(`[Resolver] Market #${market.id}: ${market.metric}=${actualValue} ${market.operator} ${market.threshold} → ${result}`);

  // Update market
  await supabase
    .from('markets')
    .update({
      status: 'resolved',
      result,
      resolved_value: actualValue,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', market.id);

  // Get all positions for this market
  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('market_id', market.id);

  if (!positions || positions.length === 0) return;

  const winningSide = result ? 'YES' : 'NO';
  const losingSide = result ? 'NO' : 'YES';

  const winners = positions.filter((p) => p.side === winningSide);
  const losers = positions.filter((p) => p.side === losingSide);

  const losingPool = losers.reduce((sum, p) => sum + p.amount, 0);
  const winningPool = winners.reduce((sum, p) => sum + p.amount, 0);

  // 5% commission on losing pool
  const distributablePool = Math.floor(losingPool * 0.95);

  // Mark losers
  for (const loser of losers) {
    await supabase
      .from('positions')
      .update({ won: false, payout: 0 })
      .eq('id', loser.id);
  }

  // Distribute to winners proportionally
  for (const winner of winners) {
    const share = winningPool > 0 ? winner.amount / winningPool : 0;
    const winnings = Math.floor(distributablePool * share);
    const totalPayout = winner.amount + winnings; // Return original bet + winnings

    // Update position
    await supabase
      .from('positions')
      .update({ won: true, payout: totalPayout })
      .eq('id', winner.id);

    // Credit user balance
    await supabase.rpc('increment_balance', {
      user_id: winner.user_id,
      amount: totalPayout,
    }).catch(async () => {
      // Fallback: manual update
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance_credits, total_wins, total_profit')
        .eq('id', winner.user_id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({
            balance_credits: profile.balance_credits + totalPayout,
            total_wins: profile.total_wins + 1,
            total_profit: profile.total_profit + winnings,
          })
          .eq('id', winner.user_id);
      }
    });

    // Create win transaction
    await supabase.from('transactions').insert({
      user_id: winner.user_id,
      type: 'win',
      amount: totalPayout,
      market_id: market.id,
      description: `Ganaste ${totalPayout} créditos en: ${market.question}`,
    });
  }

  // Update loss stats for losers
  for (const loser of losers) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('total_profit')
      .eq('id', loser.user_id)
      .single();

    if (profile) {
      await supabase
        .from('profiles')
        .update({
          total_profit: profile.total_profit - loser.amount,
        })
        .eq('id', loser.user_id);
    }
  }

  console.log(`[Resolver] Market #${market.id} resolved: ${winningSide} wins. ${winners.length} winners, ${losers.length} losers.`);
}

module.exports = { startResolver, resolveMarkets };
