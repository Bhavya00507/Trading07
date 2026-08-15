# Quantum Terminal — Trading Engine Specification

## Overview
The paper trading execution engine (`backend/app/services/trading_engine.py`) models real-world order matching, margin requirements, position management, and PnL calculation.

---

## 1. Margin & Leverage Calculation

- **Initial Margin Required**:  
  $$\text{Margin} = \frac{\text{Quantity} \times \text{Price}}{\text{Leverage}}$$
- **Free Margin**:  
  $$\text{Free Margin} = \text{Equity} - \text{Used Margin}$$
- **Margin Check**: If `Free Margin < Required Margin`, order submission is rejected with an insufficient margin error.

---

## 2. Order Matching Algorithm

1. **Market Orders**: Executed immediately against current Ask (for Buy) or Bid (for Sell).
2. **Limit Orders**:
   - Buy Limit fills when `Ask Price <= Limit Price`.
   - Sell Limit fills when `Bid Price >= Limit Price`.
3. **Stop Orders**:
   - Buy Stop triggers when `Ask Price >= Stop Price`.
   - Sell Stop triggers when `Bid Price <= Stop Price`.
4. **SL/TP Adjustments**: Stop-Loss and Take-Profit values are monitored on every tick. If price reaches SL or TP levels, the position is automatically closed at market price.

---

## 3. Position Aggregation & PnL Formula

- **Long Position PnL**:  
  $$\text{PnL} = (\text{Current Price} - \text{Average Entry Price}) \times \text{Quantity}$$
- **Short Position PnL**:  
  $$\text{PnL} = (\text{Average Entry Price} - \text{Current Price}) \times \text{Quantity}$$
