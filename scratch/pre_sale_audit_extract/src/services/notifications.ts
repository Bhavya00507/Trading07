// src/services/notifications.ts

// Request notification permissions from the user
export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!('Notification' in window)) {
    console.warn('This browser does not support desktop notifications');
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

// Send browser desktop notification
export const sendDesktopNotification = (title: string, body: string, icon = '/favicon.ico') => {
  if (!('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon });
  } else {
    // Fallback to console warning if not allowed
    console.log(`[Notification Fallback] ${title}: ${body}`);
  }
};

// Initialize listeners on window events to trigger desktop notifications
export const initializeNotificationService = () => {
  requestNotificationPermission();

  // Listen to simulated trades from the Strategy Bots
  window.addEventListener('simulated-trade', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    sendDesktopNotification(
      `Bot Execution: ${detail.botName}`,
      `${detail.lastTrade} (PnL: ${detail.tradePnl >= 0 ? '+' : ''}$${detail.tradePnl})`
    );
  });
  
  // Custom event listener for web socket events or manual trade notifications
  window.addEventListener('notification-alert', (e: Event) => {
    const detail = (e as CustomEvent).detail;
    sendDesktopNotification(detail.title, detail.body);
  });
};
