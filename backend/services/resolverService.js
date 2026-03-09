const cron = require('node-cron');
const { supabase } = require('./supabaseClient.js');
const { getWeatherData, evaluateCondition } = require('./weatherService.js');

function startResolver() {
  cron.schedule('*/30 * * * *', async () => {
    console.log('[Resolver] Running market resolution check...');
    await resolveMarkets();
  });
  console.log('[Resolver] Scheduled — runs every 30 minutes');
}

async function resolveMarkets() {
  try {
    const now = new Date().toISOString();
    const { data: markets, error } = await supabase
      .from('markets')
      .select('*')
      .eq('status', 'open')
      .lte('resolves_at', now);

    if (error) { console.error('[Resolver] Error:', error.message); return; }
    if (!markets || markets.length === 0) { console.log('[Resolver] No markets to resolve'); return; }

    for (const market of markets) {
      try { await resolveMarket(market); }
      catch (err) { console.error(`[Resolver] Error market ${market.id}:`, err.message); }
    }
  } catch (err) { console.error('[Resolver] Fatal:', err.message); }
}

async function resolveMarket(market) {
  console.log(`[Resolver] Resolving #${market.id}: ${market.question}`);

  const weather = await getWeatherData(market.city, market.country_code);
  const actualValue = weather[market.metric];

  if (actualValue === undefined || actualValue === null) {
    console.error(`[Resolver] No metric "${market.metric}" for ${market.city}`);
    return;
  }

  const result = evaluateCondition(actualValue, market.operator, market.threshold);
  console.log(`[Resolver] #${market.id}: ${market.metric}=${actualValue} ${market.operator} ${market.threshold} → ${result}`);

  // Update market status
  await supabase
    .from('markets')
    .update({ status: 'resolved', result, resolved_value: actualValue, resolved_at: new Date().toISOString() })
    .eq('id', market.id);

  // Get active positions
  const { data: positions } = await supabase
    .from('positions')
    .select('*')
    .eq('market_id', market.id)
    .eq('status', 'active');

  if (!positions || positions.length === 0) return;

  const winningSide = result ? 'YES' : 'NO';

  for (const pos of positions) {
    const isWinner = pos.side === winningSide;
    // AMM resolution: each winning share = 1 credit, losing share = 0
    const shares = pos.shares || pos.amount;
    const payout = isWinner ? Math.floor(shares) : 0;

    // Update position
    await supabase
      .from('positions')
      .update({ won: isWinner, payout, status: 'resolved' })
      .eq('id', pos.id);

    if (isWinner) {
      // Credit winner: payout = number of shares they hold
      const { data: profile } = await supabase
        .from('profiles')
        .select('balance_credits, total_wins, total_profit')
        .eq('id', pos.user_id)
        .single();

      if (profile) {
        const profit = payout - pos.amount; // shares received - credits paid
        await supabase
          .from('profiles')
          .update({
            balance_credits: profile.balance_credits + payout,
            total_wins: profile.total_wins + 1,
            total_profit: profile.total_profit + profit,
          })
          .eq('id', pos.user_id);
      }

      await supabase.from('transactions').insert({
        user_id: pos.user_id,
        type: 'win',
        amount: payout,
        market_id: market.id,
        description: `Ganaste ${payout} créditos (${shares.toFixed(1)} shares ${pos.side}) en: ${market.question}`,
      });
    } else {
      // Update loser stats
      const { data: profile } = await supabase
        .from('profiles')
        .select('total_profit')
        .eq('id', pos.user_id)
        .single();

      if (profile) {
        await supabase
          .from('profiles')
          .update({ total_profit: profile.total_profit - pos.amount })
          .eq('id', pos.user_id);
      }

      await supabase.from('transactions').insert({
        user_id: pos.user_id,
        type: 'loss',
        amount: 0,
        market_id: market.id,
        description: `Perdiste ${pos.amount} créditos (${shares.toFixed(1)} shares ${pos.side}) en: ${market.question}`,
      });
    }
  }

  const winners = positions.filter(p => p.side === winningSide);
  console.log(`[Resolver] #${market.id}: ${winningSide} wins. ${winners.length}/${positions.length} ganadores.`);
}

module.exports = { startResolver, resolveMarkets };
