import { JournalEntry, GradeType, EmotionType, SetupType, MistakeType } from '../store/journalStore';

export interface GradeStat {
  grade: GradeType;
  count: number;
  winRate: number;
  avgPnl: number;
}

export interface EmotionStat {
  emotion: EmotionType;
  count: number;
  winRate: number;
  avgPnl: number;
}

export interface SetupStat {
  setup: SetupType;
  count: number;
  winRate: number;
  netPnl: number;
  profitFactor: number;
  avgRR: number;
}

export interface MistakeStat {
  mistake: MistakeType;
  count: number;
  lossesCaused: number; // Sum of losses when mistake committed
  avgLoss: number;
  totalCost: number; // Net PnL of these trades
}

export interface StreakStats {
  currentWinStreak: number;
  currentLossStreak: number;
  longestWinStreak: number;
  longestLossStreak: number;
  bestWeek: { weekStr: string; pnl: number };
  worstWeek: { weekStr: string; pnl: number };
}

// Convert Grade to score for averaging
const GRADE_SCORES: Record<GradeType, number> = {
  'A+': 5.0,
  'A': 4.0,
  'B': 3.0,
  'C': 2.0,
  'F': 0.0
};

const SCORE_TO_GRADE = (score: number): GradeType => {
  if (score >= 4.5) return 'A+';
  if (score >= 3.5) return 'A';
  if (score >= 2.5) return 'B';
  if (score >= 1.5) return 'C';
  return 'F';
};

export const analyzeGrades = (entries: JournalEntry[]): {
  averageGrade: GradeType;
  averageScore: number;
  distribution: Record<GradeType, number>;
  stats: GradeStat[];
} => {
  const distribution: Record<GradeType, number> = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0, 'F': 0 };
  const groups: Record<GradeType, { pnl: number; trades: number; wins: number }> = {
    'A+': { pnl: 0, trades: 0, wins: 0 },
    'A': { pnl: 0, trades: 0, wins: 0 },
    'B': { pnl: 0, trades: 0, wins: 0 },
    'C': { pnl: 0, trades: 0, wins: 0 },
    'F': { pnl: 0, trades: 0, wins: 0 },
  };

  let totalScore = 0;
  let count = 0;

  entries.forEach((e) => {
    distribution[e.grade] += 1;
    totalScore += GRADE_SCORES[e.grade];
    count += 1;

    const grp = groups[e.grade];
    grp.pnl += e.pnl;
    grp.trades += 1;
    if (e.pnl > 0) grp.wins += 1;
  });

  const averageScore = count > 0 ? totalScore / count : 3.0;
  const averageGrade = SCORE_TO_GRADE(averageScore);

  const stats = (Object.keys(groups) as GradeType[]).map((g) => {
    const grp = groups[g];
    return {
      grade: g,
      count: grp.trades,
      winRate: grp.trades > 0 ? (grp.wins / grp.trades) * 100 : 0,
      avgPnl: grp.trades > 0 ? grp.pnl / grp.trades : 0,
    };
  });

  return { averageGrade, averageScore, distribution, stats };
};

export const analyzeEmotions = (entries: JournalEntry[]): EmotionStat[] => {
  const emotions: EmotionType[] = ['Confident', 'Fear', 'Greed', 'Revenge', 'FOMO', 'Hesitation', 'Neutral'];
  const groups = emotions.reduce((acc, emot) => {
    acc[emot] = { pnl: 0, trades: 0, wins: 0 };
    return acc;
  }, {} as Record<EmotionType, { pnl: number; trades: number; wins: number }>);

  entries.forEach((e) => {
    if (groups[e.emotion]) {
      groups[e.emotion].pnl += e.pnl;
      groups[e.emotion].trades += 1;
      if (e.pnl > 0) groups[e.emotion].wins += 1;
    }
  });

  return emotions.map((emot) => {
    const grp = groups[emot];
    return {
      emotion: emot,
      count: grp.trades,
      winRate: grp.trades > 0 ? (grp.wins / grp.trades) * 100 : 0,
      avgPnl: grp.trades > 0 ? grp.pnl / grp.trades : 0,
    };
  });
};

export const analyzeSetups = (entries: JournalEntry[]): SetupStat[] => {
  const setups: SetupType[] = ['Breakout', 'Pullback', 'Trend Continuation', 'Reversal', 'ICT', 'SMC', 'Scalping', 'Swing', 'None'];
  const groups = setups.reduce((acc, setup) => {
    acc[setup] = { pnl: 0, trades: 0, wins: 0, grossWins: 0, grossLosses: 0, winsList: [] as number[], lossesList: [] as number[] };
    return acc;
  }, {} as Record<SetupType, { pnl: number; trades: number; wins: number; grossWins: number; grossLosses: number; winsList: number[]; lossesList: number[] }>);

  entries.forEach((e) => {
    const grp = groups[e.setupType];
    if (grp) {
      grp.pnl += e.pnl;
      grp.trades += 1;
      if (e.pnl > 0) {
        grp.wins += 1;
        grp.grossWins += e.pnl;
        grp.winsList.push(e.pnl);
      } else {
        grp.grossLosses += Math.abs(e.pnl);
        grp.lossesList.push(Math.abs(e.pnl));
      }
    }
  });

  return setups.map((setup) => {
    const grp = groups[setup];
    const winRate = grp.trades > 0 ? (grp.wins / grp.trades) * 100 : 0;
    const profitFactor = grp.grossLosses > 0 ? grp.grossWins / grp.grossLosses : grp.grossWins > 0 ? 99.9 : 0;
    const avgWin = grp.winsList.length > 0 ? grp.winsList.reduce((a, b) => a + b, 0) / grp.winsList.length : 0;
    const avgLoss = grp.lossesList.length > 0 ? grp.lossesList.reduce((a, b) => a + b, 0) / grp.lossesList.length : 0;
    const avgRR = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 99.9 : 0;

    return {
      setup,
      count: grp.trades,
      winRate,
      netPnl: grp.pnl,
      profitFactor,
      avgRR,
    };
  });
};

export const analyzeMistakes = (entries: JournalEntry[]): MistakeStat[] => {
  const mistakes: MistakeType[] = [
    'Early Entry', 'Late Entry', 'No SL', 'Overtrading', 
    'Revenge Trading', 'FOMO', 'Wrong Bias', 'Ignored Trend', 'News Trading'
  ];

  const groups = mistakes.reduce((acc, m) => {
    acc[m] = { count: 0, lossesCaused: 0, totalCost: 0 };
    return acc;
  }, {} as Record<MistakeType, { count: number; lossesCaused: number; totalCost: number }>);

  entries.forEach((e) => {
    e.mistakes.forEach((m) => {
      const grp = groups[m];
      if (grp) {
        grp.count += 1;
        grp.totalCost += e.pnl;
        if (e.pnl < 0) {
          grp.lossesCaused += Math.abs(e.pnl);
        }
      }
    });
  });

  return mistakes.map((m) => {
    const grp = groups[m];
    return {
      mistake: m,
      count: grp.count,
      lossesCaused: grp.lossesCaused,
      avgLoss: grp.count > 0 ? grp.lossesCaused / grp.count : 0,
      totalCost: grp.totalCost,
    };
  });
};

export const analyzeStreaks = (entries: JournalEntry[]): StreakStats => {
  if (entries.length === 0) {
    return {
      currentWinStreak: 0,
      currentLossStreak: 0,
      longestWinStreak: 0,
      longestLossStreak: 0,
      bestWeek: { weekStr: '', pnl: 0 },
      worstWeek: { weekStr: '', pnl: 0 },
    };
  }

  // Sort chronologically
  const sorted = [...entries].sort(
    (a, b) => new Date(a.closeTime).getTime() - new Date(b.closeTime).getTime()
  );

  let currentWinStreak = 0;
  let currentLossStreak = 0;
  let longestWinStreak = 0;
  let longestLossStreak = 0;

  sorted.forEach((e) => {
    if (e.pnl > 0) {
      currentWinStreak += 1;
      currentLossStreak = 0;
      if (currentWinStreak > longestWinStreak) longestWinStreak = currentWinStreak;
    } else if (e.pnl < 0) {
      currentLossStreak += 1;
      currentWinStreak = 0;
      if (currentLossStreak > longestLossStreak) longestLossStreak = currentLossStreak;
    }
  });

  // Calculate last active streaks
  let lastWins = 0;
  let lastLosses = 0;
  for (let i = sorted.length - 1; i >= 0; i--) {
    const pnl = sorted[i].pnl;
    if (pnl > 0) {
      if (lastLosses > 0) break;
      lastWins += 1;
    } else if (pnl < 0) {
      if (lastWins > 0) break;
      lastLosses += 1;
    }
  }

  // Group by Calendar Week
  const weeklyPnL: Record<string, number> = {};
  sorted.forEach((e) => {
    const d = new Date(e.closeTime);
    // Simple week representation: YYYY-W(weekNumber)
    const onejan = new Date(d.getFullYear(), 0, 1);
    const weekNum = Math.ceil((((d.getTime() - onejan.getTime()) / 86400000) + onejan.getDay() + 1) / 7);
    const weekStr = `${d.getFullYear()}-W${weekNum}`;
    weeklyPnL[weekStr] = (weeklyPnL[weekStr] || 0) + e.pnl;
  });

  let bestWeek = { weekStr: '', pnl: -Infinity };
  let worstWeek = { weekStr: '', pnl: Infinity };

  Object.entries(weeklyPnL).forEach(([weekStr, pnl]) => {
    if (pnl > bestWeek.pnl) bestWeek = { weekStr, pnl };
    if (pnl < worstWeek.pnl) worstWeek = { weekStr, pnl };
  });

  if (bestWeek.pnl === -Infinity) bestWeek = { weekStr: 'N/A', pnl: 0 };
  if (worstWeek.pnl === Infinity) worstWeek = { weekStr: 'N/A', pnl: 0 };

  return {
    currentWinStreak: lastWins,
    currentLossStreak: lastLosses,
    longestWinStreak,
    longestLossStreak,
    bestWeek,
    worstWeek,
  };
};
