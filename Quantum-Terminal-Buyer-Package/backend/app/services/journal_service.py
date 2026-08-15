import math
import csv
import io
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional

class JournalService:
    @staticmethod
    def calculate_metrics(entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculates comprehensive performance dashboard metrics from trade entries."""
        if not entries:
            return {
                "total_trades": 0,
                "win_count": 0,
                "loss_count": 0,
                "breakeven_count": 0,
                "total_profit": 0.0,
                "net_profit": 0.0,
                "gross_profit": 0.0,
                "gross_loss": 0.0,
                "win_rate": 0.0,
                "loss_rate": 0.0,
                "profit_factor": 0.0,
                "avg_rr": 0.0,
                "avg_trade": 0.0,
                "largest_win": 0.0,
                "largest_loss": 0.0,
                "expectancy": 0.0,
                "recovery_factor": 0.0,
                "max_drawdown": 0.0,
                "max_drawdown_pct": 0.0,
                "max_consecutive_wins": 0,
                "max_consecutive_losses": 0,
                "equity_curve": [10000.0],
                "balance_curve": [10000.0],
            }

        total_trades = len(entries)
        wins = [e for e in entries if float(e.get("pnl", 0)) > 0]
        losses = [e for e in entries if float(e.get("pnl", 0)) < 0]
        breakevens = [e for e in entries if float(e.get("pnl", 0)) == 0]

        win_count = len(wins)
        loss_count = len(losses)
        breakeven_count = len(breakevens)

        gross_profit = sum(float(e.get("pnl", 0)) for e in wins)
        gross_loss = abs(sum(float(e.get("pnl", 0)) for e in losses))
        total_commission = sum(float(e.get("commission", 0)) for e in entries)
        total_swap = sum(float(e.get("swap", 0)) for e in entries)

        net_profit = gross_profit - gross_loss - total_commission - total_swap
        total_profit = gross_profit - gross_loss

        win_rate = (win_count / total_trades) * 100 if total_trades > 0 else 0.0
        loss_rate = (loss_count / total_trades) * 100 if total_trades > 0 else 0.0
        profit_factor = (gross_profit / gross_loss) if gross_loss > 0 else (99.9 if gross_profit > 0 else 0.0)

        avg_win = (gross_profit / win_count) if win_count > 0 else 0.0
        avg_loss = (gross_loss / loss_count) if loss_count > 0 else 0.0
        avg_rr = (avg_win / avg_loss) if avg_loss > 0 else (99.9 if avg_win > 0 else 0.0)

        avg_trade = net_profit / total_trades if total_trades > 0 else 0.0
        largest_win = max([float(e.get("pnl", 0)) for e in entries] + [0.0])
        largest_loss = min([float(e.get("pnl", 0)) for e in entries] + [0.0])

        loss_ratio = loss_count / total_trades if total_trades > 0 else 0.0
        expectancy = ((win_rate / 100.0) * avg_win) - (loss_ratio * avg_loss)

        # Max consecutive wins and losses
        max_consec_wins = 0
        max_consec_losses = 0
        curr_wins = 0
        curr_losses = 0

        for e in entries:
            pnl = float(e.get("pnl", 0))
            if pnl > 0:
                curr_wins += 1
                curr_losses = 0
                if curr_wins > max_consec_wins:
                    max_consec_wins = curr_wins
            elif pnl < 0:
                curr_losses += 1
                curr_wins = 0
                if curr_losses > max_consec_losses:
                    max_consec_losses = curr_losses

        # Equity and Balance curves calculation
        starting_bal = 10000.0
        curr_bal = starting_bal
        peak_bal = starting_bal
        max_dd = 0.0
        max_dd_pct = 0.0

        equity_curve = [starting_bal]
        balance_curve = [starting_bal]

        for e in entries:
            pnl = float(e.get("pnl", 0)) - float(e.get("commission", 0)) - float(e.get("swap", 0))
            curr_bal += pnl
            balance_curve.append(round(curr_bal, 2))
            equity_curve.append(round(curr_bal, 2))

            if curr_bal > peak_bal:
                peak_bal = curr_bal
            dd = peak_bal - curr_bal
            if dd > max_dd:
                max_dd = dd
                max_dd_pct = (dd / peak_bal) * 100 if peak_bal > 0 else 0.0

        recovery_factor = (net_profit / max_dd) if max_dd > 0 else (99.9 if net_profit > 0 else 0.0)

        return {
            "total_trades": total_trades,
            "win_count": win_count,
            "loss_count": loss_count,
            "breakeven_count": breakeven_count,
            "total_profit": round(total_profit, 2),
            "net_profit": round(net_profit, 2),
            "gross_profit": round(gross_profit, 2),
            "gross_loss": round(gross_loss, 2),
            "win_rate": round(win_rate, 2),
            "loss_rate": round(loss_rate, 2),
            "profit_factor": round(profit_factor, 2),
            "avg_rr": round(avg_rr, 2),
            "avg_trade": round(avg_trade, 2),
            "largest_win": round(largest_win, 2),
            "largest_loss": round(largest_loss, 2),
            "expectancy": round(expectancy, 2),
            "recovery_factor": round(recovery_factor, 2),
            "max_drawdown": round(max_dd, 2),
            "max_drawdown_pct": round(max_dd_pct, 2),
            "max_consecutive_wins": max_consec_wins,
            "max_consecutive_losses": max_consec_losses,
            "equity_curve": equity_curve,
            "balance_curve": balance_curve,
        }

    @staticmethod
    def analyze_sessions(entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyzes trades categorized by trading session (Asian, London, NY)."""
        sessions = {"Asian": [], "London": [], "New York": []}
        for e in entries:
            sess = e.get("session", "New York")
            if sess in sessions:
                sessions[sess].append(e)
            else:
                sessions["New York"].append(e)

        result = {}
        best_session = None
        best_pnl = -float("inf")
        worst_session = None
        worst_pnl = float("inf")

        for sess_name, sess_entries in sessions.items():
            metrics = JournalService.calculate_metrics(sess_entries)
            result[sess_name] = {
                "count": metrics["total_trades"],
                "win_rate": metrics["win_rate"],
                "pnl": metrics["net_profit"],
                "avg_rr": metrics["avg_rr"],
                "profit_factor": metrics["profit_factor"],
            }
            if metrics["total_trades"] > 0:
                if metrics["net_profit"] > best_pnl:
                    best_pnl = metrics["net_profit"]
                    best_session = sess_name
                if metrics["net_profit"] < worst_pnl:
                    worst_pnl = metrics["net_profit"]
                    worst_session = sess_name

        result["best_session"] = best_session or "N/A"
        result["worst_session"] = worst_session or "N/A"
        return result

    @staticmethod
    def analyze_symbols(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Group and calculate win rates, profits, losses per symbol."""
        symbols_map: Dict[str, List[Dict[str, Any]]] = {}
        for e in entries:
            sym = e.get("symbol", "UNKNOWN")
            if sym not in symbols_map:
                symbols_map[sym] = []
            symbols_map[sym].append(e)

        result = []
        for sym, sym_entries in symbols_map.items():
            metrics = JournalService.calculate_metrics(sym_entries)
            result.append({
                "symbol": sym,
                "trade_count": metrics["total_trades"],
                "win_rate": metrics["win_rate"],
                "net_profit": metrics["net_profit"],
                "avg_profit": metrics["avg_trade"],
                "avg_rr": metrics["avg_rr"],
                "expectancy": metrics["expectancy"],
                "largest_win": metrics["largest_win"],
                "largest_loss": metrics["largest_loss"],
            })

        return sorted(result, key=lambda x: x["net_profit"], reverse=True)

    @staticmethod
    def analyze_strategies(entries: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Categorize performance by Strategy Tags (Breakout, Swing, Trend, Scalping, Reversal, News)."""
        strat_map: Dict[str, List[Dict[str, Any]]] = {}
        for e in entries:
            strat = e.get("strategy_tag") or e.get("setup_type") or "Trend"
            if strat not in strat_map:
                strat_map[strat] = []
            strat_map[strat].append(e)

        result = []
        for strat, strat_entries in strat_map.items():
            metrics = JournalService.calculate_metrics(strat_entries)
            result.append({
                "strategy": strat,
                "trade_count": metrics["total_trades"],
                "win_rate": metrics["win_rate"],
                "net_profit": metrics["net_profit"],
                "profit_factor": metrics["profit_factor"],
                "avg_rr": metrics["avg_rr"],
            })

        return sorted(result, key=lambda x: x["net_profit"], reverse=True)

    @staticmethod
    def analyze_psychology_and_risks(entries: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Detects psychological habits (revenge trading, overtrading, fear exits) and risk breaches."""
        if not entries:
            return {
                "revenge_trading_count": 0,
                "overtrading_detected": False,
                "fear_exits_count": 0,
                "greed_holding_count": 0,
                "risk_violations_count": 0,
                "daily_loss_breaches": 0,
                "suggestions": ["Keep journaling your trades to unlock AI psychology coaching."],
                "risk_rating": "Safe",
                "performance_grade": "A",
            }

        revenge_count = 0
        overtrading_detected = len(entries) > 20
        fear_exits = 0
        greed_holding = 0
        risk_violations = 0
        suggestions = []

        # Analyze consecutive loss revenge trading
        consec_losses = 0
        for i, e in enumerate(entries):
            pnl = float(e.get("pnl", 0))
            if pnl < 0:
                consec_losses += 1
                if consec_losses >= 2:
                    revenge_count += 1
            else:
                consec_losses = 0

            emotion = str(e.get("emotion", "")).lower()
            if "fear" in emotion or "hesitation" in emotion:
                fear_exits += 1
            if "greed" in emotion or "fomo" in emotion:
                greed_holding += 1

            risk_pct = float(e.get("risk_pct", 1.0))
            if risk_pct > 3.0:
                risk_violations += 1

        if revenge_count > 0:
            suggestions.append(f"Detected {revenge_count} instances of revenge trading after losses. Implement a 15-minute cooldown after 2 losses.")
        if overtrading_detected:
            suggestions.append("High trade volume detected. Limit your trades to maximum 5 high-probability setups per session.")
        if fear_exits > 0:
            suggestions.append(f"{fear_exits} trades closed early due to fear. Trust your stop loss and take profit targets.")
        if risk_violations > 0:
            suggestions.append(f"{risk_violations} trades exceeded 3% risk rule. Strictly cap per-trade risk at 1-2%.")

        if not suggestions:
            suggestions.append("Great psychological discipline! Maintain your current execution rules and risk management.")

        risk_rating = "High" if risk_violations > 3 or revenge_count > 3 else ("Moderate" if risk_violations > 0 else "Low")
        performance_grade = "A+" if len(entries) > 5 and revenge_count == 0 and risk_violations == 0 else "B"

        return {
            "revenge_trading_count": revenge_count,
            "overtrading_detected": overtrading_detected,
            "fear_exits_count": fear_exits,
            "greed_holding_count": greed_holding,
            "risk_violations_count": risk_violations,
            "daily_loss_breaches": 1 if risk_violations > 2 else 0,
            "suggestions": suggestions,
            "risk_rating": risk_rating,
            "performance_grade": performance_grade,
        }

    @staticmethod
    def generate_ai_coaching_report(entries: List[Dict[str, Any]], timeframe: str = "Monthly") -> Dict[str, Any]:
        """Generates full AI Coach Report for Daily, Weekly, Monthly, Quarterly, Yearly."""
        metrics = JournalService.calculate_metrics(entries)
        sessions = JournalService.analyze_sessions(entries)
        symbols = JournalService.analyze_symbols(entries)
        psych = JournalService.analyze_psychology_and_risks(entries)

        strengths = []
        weaknesses = []

        if metrics["win_rate"] >= 55.0:
            strengths.append(f"Solid win rate of {metrics['win_rate']}% across {metrics['total_trades']} trades.")
        if metrics["profit_factor"] >= 1.5:
            strengths.append(f"Institutional Profit Factor of {metrics['profit_factor']}.")
        if sessions.get("best_session") != "N/A":
            strengths.append(f"Highest profitability during {sessions['best_session']} session.")

        if metrics["win_rate"] < 45.0:
            weaknesses.append(f"Low win rate ({metrics['win_rate']}%). Focus on higher probability entry setups.")
        if metrics["avg_rr"] < 1.2:
            weaknesses.append(f"Average RR ratio is {metrics['avg_rr']}. Aim for minimum 1:2 Risk-to-Reward.")
        if psych["revenge_trading_count"] > 0:
            weaknesses.append(f"Revenge trading detected {psych['revenge_trading_count']} times after loss streaks.")

        if not strengths:
            strengths.append("Consistently recording and tracking performance in the AI trade journal.")
        if not weaknesses:
            weaknesses.append("No critical weaknesses detected in this period.")

        return {
            "timeframe": timeframe,
            "generated_at": datetime.utcnow().isoformat(),
            "performance_grade": psych["performance_grade"],
            "risk_rating": psych["risk_rating"],
            "metrics": metrics,
            "strengths": strengths,
            "weaknesses": weaknesses,
            "suggestions": psych["suggestions"],
            "best_session": sessions.get("best_session"),
            "best_symbol": symbols[0]["symbol"] if symbols else "N/A",
        }

    @staticmethod
    def parse_mt5_or_csv_statement(csv_content: str) -> List[Dict[str, Any]]:
        """Parses MT5 statements or generic trading CSV export into journal trade objects."""
        trades = []
        reader = csv.DictReader(io.StringIO(csv_content))

        for idx, row in enumerate(reader):
            # Normalize keys to lowercase
            r = {k.lower().strip(): v.strip() for k, v in row.items() if k}

            symbol = r.get("symbol") or r.get("item") or r.get("pair") or "BTCUSDT"
            side = r.get("side") or r.get("type") or "buy"
            if "buy" in side.lower():
                side = "buy"
                direction = "long"
            else:
                side = "sell"
                direction = "short"

            entry_price = float(r.get("entry_price") or r.get("open_price") or r.get("price") or 0.0)
            exit_price = float(r.get("exit_price") or r.get("close_price") or r.get("price") or entry_price)
            quantity = float(r.get("quantity") or r.get("qty") or r.get("size") or r.get("volume") or 1.0)
            pnl = float(r.get("pnl") or r.get("profit") or r.get("net_profit") or 0.0)

            commission = float(r.get("commission") or r.get("fee") or 0.0)
            swap = float(r.get("swap") or 0.0)
            net_pnl = pnl - commission - swap

            now_str = datetime.now(timezone.utc).isoformat()
            trade_id = r.get("trade_id") or r.get("ticket") or r.get("order_id") or f"import_{idx}_{int(datetime.now(timezone.utc).timestamp())}"

            trades.append({
                "trade_id": str(trade_id),
                "symbol": str(symbol).upper(),
                "broker": r.get("broker", "MT5 Import"),
                "account": r.get("account", "Live Account"),
                "side": side,
                "direction": direction,
                "entry_price": entry_price,
                "exit_price": exit_price,
                "quantity": quantity,
                "sl": float(r.get("sl") or 0.0) if r.get("sl") else None,
                "tp": float(r.get("tp") or 0.0) if r.get("tp") else None,
                "pnl": pnl,
                "net_pnl": net_pnl,
                "commission": commission,
                "swap": swap,
                "spread": float(r.get("spread") or 0.0),
                "fees": commission,
                "rr": float(r.get("rr") or 2.0),
                "open_time": r.get("open_time") or r.get("time") or now_str,
                "close_time": r.get("close_time") or r.get("time") or now_str,
                "session": r.get("session", "New York"),
                "setup_type": r.get("setup") or r.get("strategy") or "Breakout",
                "strategy_tag": r.get("strategy") or "Trend",
                "notes": r.get("notes", "Imported statement trade"),
                "grade": r.get("grade", "B"),
            })

        return trades
