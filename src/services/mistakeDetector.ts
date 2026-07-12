import { JournalEntry } from '../store/journalStore';

export interface DetectedMistake {
  name: string;
  description: string;
  cost: number;
  count: number;
  suggestion: string;
}

export const detectJournalMistakes = (entries: JournalEntry[]): DetectedMistake[] => {
  const mistakesList: DetectedMistake[] = [];
  if (entries.length === 0) return [];

  // Sort chronologically
  const sorted = [...entries].sort(
    (a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
  );

  // Helper values
  const wins = sorted.filter((e) => e.pnl > 0);
  const losses = sorted.filter((e) => e.pnl < 0);
  
  const avgWinDuration = wins.length > 0 ? wins.reduce((acc, w) => acc + w.durationMs, 0) / wins.length : 0;
  const avgLossDuration = losses.length > 0 ? losses.reduce((acc, l) => acc + l.durationMs, 0) / losses.length : 0;

  // 1. Overtrading detection
  // Count trades per day
  const dailyCounts: Record<string, number> = {};
  sorted.forEach((e) => {
    const day = new Date(e.closeTime).toDateString();
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  });
  const overtradingDays = Object.entries(dailyCounts).filter(([_, count]) => count > 5);
  if (overtradingDays.length > 0) {
    const cost = sorted.filter((e) => {
      const day = new Date(e.closeTime).toDateString();
      return dailyCounts[day] > 5;
    }).reduce((acc, e) => acc + (e.pnl < 0 ? e.pnl : 0), 0);

    mistakesList.push({
      name: 'Overtrading',
      description: `You executed more than 5 trades on ${overtradingDays.length} day(s).`,
      cost: Math.abs(cost),
      count: overtradingDays.length,
      suggestion: 'Set a hard daily limit of 3 trades. Once reached, close your platform and walk away.',
    });
  }

  // 2. Revenge trading detection
  // A trade opened within 30 minutes of a losing trade
  let revengeCount = 0;
  let revengeCost = 0;
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (prev.pnl < 0) {
      const diffMs = new Date(curr.openTime).getTime() - new Date(prev.closeTime).getTime();
      if (diffMs > 0 && diffMs < 30 * 60 * 1000) {
        revengeCount++;
        if (curr.pnl < 0) revengeCost += Math.abs(curr.pnl);
      }
    }
  }
  if (revengeCount > 0) {
    mistakesList.push({
      name: 'Revenge Trading',
      description: `Detected ${revengeCount} trade(s) opened within 30 minutes of a previous loss.`,
      cost: revengeCost,
      count: revengeCount,
      suggestion: 'Establish a "cool-down" rule. After any loss, wait at least 1 hour before scanning for new setups.',
    });
  }

  // 3. FOMO
  const fomoTrades = sorted.filter((e) => e.emotion === 'FOMO');
  if (fomoTrades.length > 0) {
    const cost = fomoTrades.reduce((acc, e) => acc + (e.pnl < 0 ? Math.abs(e.pnl) : 0), 0);
    mistakesList.push({
      name: 'FOMO (Fear Of Missing Out)',
      description: `You logged ${fomoTrades.length} trade(s) with FOMO emotion status.`,
      cost,
      count: fomoTrades.length,
      suggestion: 'Trade only pre-defined limit orders. If you miss the entry price, wait for a pullback or skip the setup entirely.',
    });
  }

  // 4. Holding losers too long
  // Losses duration significantly longer than wins
  if (avgLossDuration > avgWinDuration * 1.5 && losses.length > 0) {
    const cost = losses.reduce((acc, e) => acc + Math.abs(e.pnl), 0);
    mistakesList.push({
      name: 'Holding Losers Too Long',
      description: `Average losing hold time (${(avgLossDuration / 60000).toFixed(0)}m) is significantly longer than winning hold time (${(avgWinDuration / 60000).toFixed(0)}m).`,
      cost,
      count: losses.length,
      suggestion: 'Strictly define your Stop Loss before clicking buy/sell. Move stop loss to breakeven or close immediately at invalidation.',
    });
  }

  // 5. Cutting winners early
  // Winning trades with very short holding times
  const earlyCutWins = wins.filter((w) => w.durationMs < avgWinDuration * 0.5);
  if (earlyCutWins.length > 0) {
    mistakesList.push({
      name: 'Cutting Winners Early',
      description: `Closed ${earlyCutWins.length} winning trade(s) prematurely compared to your average win duration.`,
      cost: 0, // no direct loss but opportunity cost
      count: earlyCutWins.length,
      suggestion: 'Trust your Take Profit targets. Implement a trailing stop or close 50% partials rather than closing the entire position in panic.',
    });
  }

  // 6. Large position sizing
  const quantities = sorted.map((e) => e.quantity);
  const avgQty = quantities.reduce((acc, q) => acc + q, 0) / (quantities.length || 1);
  const oversizedTrades = sorted.filter((e) => e.quantity > avgQty * 2);
  if (oversizedTrades.length > 0) {
    const cost = oversizedTrades.reduce((acc, e) => acc + (e.pnl < 0 ? Math.abs(e.pnl) : 0), 0);
    mistakesList.push({
      name: 'Large Position Sizing',
      description: `Executed ${oversizedTrades.length} trade(s) with size exceeding double your average quantity.`,
      cost,
      count: oversizedTrades.length,
      suggestion: 'Strictly calculate position size based on a fixed risk percentage (e.g. 1% of account balance) rather than scaling in arbitrarily.',
    });
  }

  // 7. Poor risk reward
  const poorRrTrades = sorted.filter((e) => {
    // If trade entry exits are close or approximated RR is poor
    const expectedLoss = e.entryPrice * 0.01; // dummy estimation
    const expectedGain = e.pnl > 0 ? e.pnl / e.quantity : 0;
    return e.pnl < 0 && Math.abs(e.pnl) > expectedLoss * 2;
  });
  if (poorRrTrades.length > 0) {
    mistakesList.push({
      name: 'Poor Risk Reward',
      description: `Logged ${poorRrTrades.length} trade(s) where losses exceeded calculated targets.`,
      cost: poorRrTrades.reduce((acc, e) => acc + Math.abs(e.pnl), 0),
      count: poorRrTrades.length,
      suggestion: 'Aim for a minimum risk-reward ratio of 1:2 on all trades. Do not execute setups with poor reward-to-risk space.',
    });
  }

  return mistakesList;
};
