import { JournalEntry } from '../store/journalStore';
import { analyzeSetups, analyzeMistakes, analyzeEmotions, analyzeStreaks } from './journalAnalyzer';

export interface AIReviewResult {
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
}

export const generateAIReview = (entries: JournalEntry[]): AIReviewResult => {
  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const suggestions: string[] = [];

  if (entries.length < 3) {
    return {
      strengths: ['Keep trading! AI insights require at least 3 logged journal entries.'],
      weaknesses: ['Insufficient data to identify patterns.'],
      suggestions: ['Journal your emotions, grades, and setup types for every closed trade.'],
    };
  }

  // 1. Analyze Sessions
  const sessionStats: Record<string, { pnl: number; count: number; wins: number }> = {
    'Asian': { pnl: 0, count: 0, wins: 0 },
    'London': { pnl: 0, count: 0, wins: 0 },
    'New York': { pnl: 0, count: 0, wins: 0 },
  };

  entries.forEach((e) => {
    if (sessionStats[e.session]) {
      sessionStats[e.session].pnl += e.pnl;
      sessionStats[e.session].count += 1;
      if (e.pnl > 0) sessionStats[e.session].wins += 1;
    }
  });

  let bestSession = { name: '', pnl: -Infinity, winRate: 0 };
  let worstSession = { name: '', pnl: Infinity, winRate: 0 };

  Object.entries(sessionStats).forEach(([name, s]) => {
    if (s.count > 0) {
      const wr = (s.wins / s.count) * 100;
      if (s.pnl > bestSession.pnl) bestSession = { name, pnl: s.pnl, winRate: wr };
      if (s.pnl < worstSession.pnl) worstSession = { name, pnl: s.pnl, winRate: wr };
    }
  });

  if (bestSession.name && bestSession.pnl > 0) {
    strengths.push(`✓ ${bestSession.name} session performs best (+$${bestSession.pnl.toFixed(2)}, ${bestSession.winRate.toFixed(1)}% WR)`);
  }
  if (worstSession.name && worstSession.pnl < 0) {
    weaknesses.push(`⚠ ${worstSession.name} session underperforms (-$${Math.abs(worstSession.pnl).toFixed(2)})`);
  }

  // 2. Analyze Setups
  const setupStats = analyzeSetups(entries);
  const profitableSetups = setupStats.filter((s) => s.count >= 2 && s.netPnl > 0);
  const losingSetups = setupStats.filter((s) => s.count >= 2 && s.netPnl < 0);

  if (profitableSetups.length > 0) {
    profitableSetups.sort((a, b) => b.profitFactor - a.profitFactor);
    const bestSetup = profitableSetups[0];
    strengths.push(`✓ ${bestSetup.setup} setups have highest Profit Factor (PF = ${bestSetup.profitFactor.toFixed(2)})`);
  }
  if (losingSetups.length > 0) {
    losingSetups.sort((a, b) => a.netPnl - b.netPnl); // Most negative first
    const worstSetup = losingSetups[0];
    weaknesses.push(`⚠ ${worstSetup.setup} setups are unprofitable (-$${Math.abs(worstSetup.netPnl).toFixed(2)})`);
  }

  // 3. Analyze Mistakes
  const mistakeStats = analyzeMistakes(entries);
  const heavyMistakes = mistakeStats.filter((m) => m.count > 0 && m.totalCost < 0);

  if (heavyMistakes.length > 0) {
    heavyMistakes.sort((a, b) => a.totalCost - b.totalCost); // Most expensive first
    const worstMistake = heavyMistakes[0];
    weaknesses.push(`⚠ ${worstMistake.mistake} mistakes cost you the most money (-$${Math.abs(worstMistake.totalCost).toFixed(2)} total cost)`);
    suggestions.push(`Avoid committing ${worstMistake.mistake} mistakes. It is your costliest leak.`);
  }

  // 4. Analyze Emotions
  const emotionStats = analyzeEmotions(entries);
  const badEmotions = emotionStats.filter((em) => em.count >= 2 && em.winRate < 40);
  if (badEmotions.length > 0) {
    badEmotions.sort((a, b) => a.winRate - b.winRate);
    const worstEmotion = badEmotions[0];
    weaknesses.push(`⚠ Trades executed with feeling of "${worstEmotion.emotion}" have a low win rate (${worstEmotion.winRate.toFixed(1)}%)`);
    suggestions.push(`Avoid trading when feeling "${worstEmotion.emotion}". Take a walk or step away from charts.`);
  }

  // 5. Streaks and Suggestion rules
  const streakStats = analyzeStreaks(entries);
  if (streakStats.longestLossStreak >= 3) {
    suggestions.push(`Implement a rule to reduce trade risk sizing by 50% after a losing streak of ${streakStats.longestLossStreak} trades.`);
  }

  // General setups suggestion
  if (profitableSetups.length > 0 && bestSession.name) {
    const focusSetup = profitableSetups[0].setup;
    suggestions.push(`Focus on running ${focusSetup} setups specifically during the ${bestSession.name} session to maximize edge.`);
  } else {
    suggestions.push('Focus on high risk-to-reward setups and cut losing trades quickly.');
  }

  return {
    strengths: strengths.length > 0 ? strengths : ['✓ Stable equity curve performance across trades'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['No severe trading mistakes or leaks identified.'],
    suggestions: suggestions.length > 0 ? suggestions : ['Keep up the disciplined execution and journaling.'],
  };
};
