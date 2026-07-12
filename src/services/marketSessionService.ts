// src/services/marketSessionService.ts

export interface SessionConfig {
  symbol: string;
  sessionOpen: string;  // "HH:MM"
  sessionClose: string; // "HH:MM"
  timezone: string;     // e.g. "America/New_York", "Europe/Berlin", "Asia/Tokyo", "UTC"
  holidays: string[];   // "YYYY-MM-DD"
  maintenanceBreaks: { start: string; end: string }[]; // "HH:MM" range
  category: 'crypto' | 'forex' | 'metals' | 'indices' | 'stocks';
}

const CONFIGS: Record<string, SessionConfig> = {
  // Forex
  EURUSD: { symbol: 'EURUSD', sessionOpen: '00:00', sessionClose: '24:00', timezone: 'UTC', holidays: [], maintenanceBreaks: [], category: 'forex' },
  GBPUSD: { symbol: 'GBPUSD', sessionOpen: '00:00', sessionClose: '24:00', timezone: 'UTC', holidays: [], maintenanceBreaks: [], category: 'forex' },
  USDJPY: { symbol: 'USDJPY', sessionOpen: '00:00', sessionClose: '24:00', timezone: 'UTC', holidays: [], maintenanceBreaks: [], category: 'forex' },
  USDCHF: { symbol: 'USDCHF', sessionOpen: '00:00', sessionClose: '24:00', timezone: 'UTC', holidays: [], maintenanceBreaks: [], category: 'forex' },
  AUDUSD: { symbol: 'AUDUSD', sessionOpen: '00:00', sessionClose: '24:00', timezone: 'UTC', holidays: [], maintenanceBreaks: [], category: 'forex' },
  NZDUSD: { symbol: 'NZDUSD', sessionOpen: '00:00', sessionClose: '24:00', timezone: 'UTC', holidays: [], maintenanceBreaks: [], category: 'forex' },
  USDCAD: { symbol: 'USDCAD', sessionOpen: '00:00', sessionClose: '24:00', timezone: 'UTC', holidays: [], maintenanceBreaks: [], category: 'forex' },

  // Metals
  XAUUSD: { symbol: 'XAUUSD', sessionOpen: '00:00', sessionClose: '24:00', timezone: 'UTC', holidays: [], maintenanceBreaks: [{ start: '23:00', end: '24:00' }], category: 'metals' },
  XAGUSD: { symbol: 'XAGUSD', sessionOpen: '00:00', sessionClose: '24:00', timezone: 'UTC', holidays: [], maintenanceBreaks: [{ start: '23:00', end: '24:00' }], category: 'metals' },
  USOIL: { symbol: 'USOIL', sessionOpen: '00:00', sessionClose: '24:00', timezone: 'UTC', holidays: [], maintenanceBreaks: [{ start: '23:00', end: '24:00' }], category: 'metals' },
  BRENT: { symbol: 'BRENT', sessionOpen: '00:00', sessionClose: '24:00', timezone: 'UTC', holidays: [], maintenanceBreaks: [{ start: '23:00', end: '24:00' }], category: 'metals' },

  // Indices
  US30: { symbol: 'US30', sessionOpen: '09:30', sessionClose: '16:00', timezone: 'America/New_York', holidays: ['2026-01-01', '2026-07-04', '2026-12-25'], maintenanceBreaks: [], category: 'indices' },
  NAS100: { symbol: 'NAS100', sessionOpen: '09:30', sessionClose: '16:00', timezone: 'America/New_York', holidays: ['2026-01-01', '2026-07-04', '2026-12-25'], maintenanceBreaks: [], category: 'indices' },
  SPX500: { symbol: 'SPX500', sessionOpen: '09:30', sessionClose: '16:00', timezone: 'America/New_York', holidays: ['2026-01-01', '2026-07-04', '2026-12-25'], maintenanceBreaks: [], category: 'indices' },
  GER40: { symbol: 'GER40', sessionOpen: '09:00', sessionClose: '17:30', timezone: 'Europe/Berlin', holidays: ['2026-01-01', '2026-12-25'], maintenanceBreaks: [], category: 'indices' },
  UK100: { symbol: 'UK100', sessionOpen: '08:00', sessionClose: '16:30', timezone: 'Europe/London', holidays: ['2026-01-01', '2026-12-25'], maintenanceBreaks: [], category: 'indices' },
  JP225: { symbol: 'JP225', sessionOpen: '09:00', sessionClose: '15:00', timezone: 'Asia/Tokyo', holidays: ['2026-01-01'], maintenanceBreaks: [], category: 'indices' },

  // Stocks
  AAPL: { symbol: 'AAPL', sessionOpen: '09:30', sessionClose: '16:00', timezone: 'America/New_York', holidays: ['2026-01-01', '2026-12-25'], maintenanceBreaks: [], category: 'stocks' },
  TSLA: { symbol: 'TSLA', sessionOpen: '09:30', sessionClose: '16:00', timezone: 'America/New_York', holidays: ['2026-01-01', '2026-12-25'], maintenanceBreaks: [], category: 'stocks' },
  MSFT: { symbol: 'MSFT', sessionOpen: '09:30', sessionClose: '16:00', timezone: 'America/New_York', holidays: ['2026-01-01', '2026-12-25'], maintenanceBreaks: [], category: 'stocks' }
};

export function getSessionConfig(symbol: string): SessionConfig {
  const norm = symbol.toUpperCase();
  if (CONFIGS[norm]) return CONFIGS[norm];
  
  // Default to crypto
  return {
    symbol: norm,
    sessionOpen: '00:00',
    sessionClose: '24:00',
    timezone: 'UTC',
    holidays: [],
    maintenanceBreaks: [],
    category: 'crypto'
  };
}

function getPartsInTimezone(date: Date, timeZone: string) {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
    const parts = formatter.formatToParts(date);
    const map: Record<string, string> = {};
    parts.forEach(p => {
      map[p.type] = p.value;
    });
    return {
      year: parseInt(map.year, 10),
      month: parseInt(map.month, 10),
      day: parseInt(map.day, 10),
      hour: parseInt(map.hour, 10),
      minute: parseInt(map.minute, 10),
      second: parseInt(map.second, 10)
    };
  } catch (e) {
    // Fallback to UTC
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate(),
      hour: date.getUTCHours(),
      minute: date.getUTCMinutes(),
      second: date.getUTCSeconds()
    };
  }
}

export function checkIsOpen(symbol: string, date: Date = new Date()): boolean {
  const config = getSessionConfig(symbol);
  if (config.category === 'crypto') {
    return true;
  }

  // Get parts of date in UTC (for Forex/Metals) or in target timezone (for indices/stocks)
  const parts = getPartsInTimezone(date, config.timezone);
  
  // Form formatted date: YYYY-MM-DD
  const yyyymmdd = `${parts.year}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
  if (config.holidays.includes(yyyymmdd)) {
    return false;
  }

  // Get day of week in target timezone (0 is Sunday, 1 is Monday, ..., 6 is Saturday)
  const localDate = new Date(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second);
  const dayOfWeek = localDate.getDay();

  if (config.category === 'forex') {
    // Forex: Open Sunday 22:00 UTC to Friday 22:00 UTC
    const utcDay = date.getUTCDay();
    const utcHour = date.getUTCHours();
    const utcMin = date.getUTCMinutes();
    const minutesSinceSunday00 = utcDay * 1440 + utcHour * 60 + utcMin;

    const forexOpenMinutes = 0 * 1440 + 22 * 60; // Sunday 22:00
    const forexCloseMinutes = 5 * 1440 + 22 * 60; // Friday 22:00

    if (minutesSinceSunday00 < forexOpenMinutes || minutesSinceSunday00 >= forexCloseMinutes) {
      return false;
    }
    return true;
  }

  if (config.category === 'metals') {
    // Metals: Mon-Fri, daily maintenance 23:00 - 24:00 UTC. Closed weekends.
    const utcDay = date.getUTCDay();
    const utcHour = date.getUTCHours();
    
    if (utcDay === 0 || utcDay === 6) {
      return false;
    }
    
    // Daily maintenance break: 23:00 to 24:00 (i.e. hour 23)
    if (utcHour === 23) {
      return false;
    }
    return true;
  }

  // Indices / Stocks: Follow local timezone
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false;
  }

  // Check if within sessionOpen and sessionClose
  const [openH, openM] = config.sessionOpen.split(':').map(Number);
  const [closeH, closeM] = config.sessionClose.split(':').map(Number);

  const localMinutes = parts.hour * 60 + parts.minute;
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  if (localMinutes < openMinutes || localMinutes >= closeMinutes) {
    return false;
  }

  // Check maintenance breaks
  for (const brk of config.maintenanceBreaks) {
    const [startH, startM] = brk.start.split(':').map(Number);
    const [endH, endM] = brk.end.split(':').map(Number);
    const startMin = startH * 60 + startM;
    const endMin = endH * 60 + endM;
    if (localMinutes >= startMin && localMinutes < endMin) {
      return false;
    }
  }

  return true;
}

export const MarketSessionService = {
  isOpen(symbol: string): boolean {
    return checkIsOpen(symbol, new Date());
  },

  nextOpen(symbol: string): Date | null {
    const config = getSessionConfig(symbol);
    if (config.category === 'crypto') return null;

    const now = new Date();
    const maxSearch = 7 * 24 * 60 * 60 * 1000; // 7 days
    // Use larger step for speed: 15 minutes, then refine
    const coarseStep = 15 * 60 * 1000;
    const fineStep = 60 * 1000;
    const end = now.getTime() + maxSearch;

    let testTime = now.getTime();
    let wasOpen = checkIsOpen(symbol, new Date(testTime));

    // Coarse pass: 15-min steps
    while (testTime < end) {
      testTime += coarseStep;
      const isOpenNow = checkIsOpen(symbol, new Date(testTime));
      if (!wasOpen && isOpenNow) {
        // Refine: step back one coarse step, then do fine 1-min steps
        testTime -= coarseStep;
        const fineEnd = testTime + coarseStep + fineStep;
        while (testTime < fineEnd) {
          testTime += fineStep;
          const fine = checkIsOpen(symbol, new Date(testTime));
          if (fine) return new Date(testTime);
        }
        return new Date(testTime);
      }
      wasOpen = isOpenNow;
    }
    return null;
  },

  nextClose(symbol: string): Date | null {
    const config = getSessionConfig(symbol);
    if (config.category === 'crypto') return null;

    const now = new Date();
    const maxSearch = 7 * 24 * 60 * 60 * 1000; // 7 days
    const coarseStep = 15 * 60 * 1000;
    const fineStep = 60 * 1000;
    const end = now.getTime() + maxSearch;

    let testTime = now.getTime();
    let wasOpen = checkIsOpen(symbol, new Date(testTime));

    while (testTime < end) {
      testTime += coarseStep;
      const isOpenNow = checkIsOpen(symbol, new Date(testTime));
      if (wasOpen && !isOpenNow) {
        // Refine
        testTime -= coarseStep;
        const fineEnd = testTime + coarseStep + fineStep;
        while (testTime < fineEnd) {
          testTime += fineStep;
          const fine = checkIsOpen(symbol, new Date(testTime));
          if (!fine) return new Date(testTime);
        }
        return new Date(testTime);
      }
      wasOpen = isOpenNow;
    }
    return null;
  },

  marketStatus(symbol: string): 'OPEN' | 'CLOSED' | 'MAINTENANCE' {
    const config = getSessionConfig(symbol);
    if (config.category === 'crypto') return 'OPEN';

    const now = new Date();
    const isOpenNow = checkIsOpen(symbol, now);
    if (isOpenNow) return 'OPEN';

    // If it's closed but within weekdays (1-5) and in metals, and hour is 23:00, it's MAINTENANCE
    if (config.category === 'metals') {
      const utcDay = now.getUTCDay();
      const utcHour = now.getUTCHours();
      if (utcDay !== 0 && utcDay !== 6 && utcHour === 23) {
        return 'MAINTENANCE';
      }
    }
    
    // Check general config breaks
    const parts = getPartsInTimezone(now, config.timezone);
    const localMinutes = parts.hour * 60 + parts.minute;
    for (const brk of config.maintenanceBreaks) {
      const [startH, startM] = brk.start.split(':').map(Number);
      const [endH, endM] = brk.end.split(':').map(Number);
      if (localMinutes >= (startH * 60 + startM) && localMinutes < (endH * 60 + endM)) {
        return 'MAINTENANCE';
      }
    }

    return 'CLOSED';
  }
};
