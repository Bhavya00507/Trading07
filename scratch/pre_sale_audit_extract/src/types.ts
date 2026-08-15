export interface Order {
  id: string;
  user_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  type: 'market' | 'limit' | 'stop' | 'stop_limit';
  quantity: number;
  price?: number;
  stop_price?: number;
  stop_loss?: number;
  take_profit?: number;
  status: 'PENDING' | 'FILLED' | 'PARTIAL' | 'CANCELLED';
  created_at: string;
}

export interface Position {
  id: string;
  symbol: string;
  quantity: number;
  average_price: number;
  unrealized_pnl: number;
  realized_pnl: number;
  stop_loss?: number;
  take_profit?: number;
  trailing_stop?: number;
}

export interface TradeHistory {
  id: string;
  user_id: string;
  symbol: string;
  side: 'buy' | 'sell';
  entry_price: number;
  exit_price: number;
  quantity: number;
  pnl: number;
  timestamp: string;
  account_type?: string;
}

export interface Instrument {
  symbol: string;
  name: string;
  category: string;
  price: number;
  change?: number;
  volume?: number;
  pip_size?: number;
  contract_size?: number;
  leverage_limit?: number;
  is_delayed?: boolean;
}

export interface Account {
  id: string;
  user_id: string;
  balance: number;
  equity: number;
  peak_balance: number;
  margin_used: number;
  free_margin: number;
  daily_pnl: number;
  drawdown: number;
}

export interface WSEvent {
  event_id: string;
  timestamp: number;
  type: 'market_candle' | 'order_created' | 'order_updated' | 'order_rejected' | 'position_update' | 'account_update';
  data: any;
  symbol?: string;
  timeframe?: string;
}
