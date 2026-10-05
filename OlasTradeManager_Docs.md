# OlasTradeManager - Variable Documentation

Here is an in-depth breakdown of every customizable variable in the **OlasTradeManager.mq5** Expert Advisor. 
They are grouped by their function so you can understand exactly how they control your trade management.

---

## 1. Master Controls & Filters
These variables dictate **whether** the EA runs, and **which trades** it is allowed to touch.

*   `InpEnabled` **(true / false)**
    *   **What it does:** The master kill-switch. If set to `false`, the EA goes completely dormant. It won't set initial SLs, it won't trail stops, and it won't partial close. 
    *   **Use case:** Switch this to false if there's high market volatility (like a news event) and you want to temporarily take manual control of your trades without the EA interfering.

*   `InpMagicNumber` **(Number, e.g., 12345)**
    *   **What it does:** Every EA assigns a hidden "Magic Number" to the trades it opens so it can identify them later. If you set this to `12345`, the Manager will *only* modify trades that have the magic number `12345`. 
    *   **Note:** If you set this to `0`, the EA ignores magic numbers entirely.

*   `InpManageAllPositions` **(true / false)**
    *   **What it does:** A heavy-handed override. If `true`, the EA ignores the Magic Number entirely and will manage **every single open position** on the asset chart it is attached to, including trades you opened manually from your phone.

---

## 2. Distance Calculation Methods
Many of the settings below ask for a "Method". You have three options for how distance is calculated:
1.  **FIXED_PIPS:** Distance is calculated in standard pips. (e.g., a value of `200` means 200 pips).
2.  **ATR_MULTIPLE:** Distance adapts to market volatility using the Average True Range indicator. (e.g., a value of `1.5` means 1.5 times the current ATR).
3.  **PERCENT_OF_PRICE:** Distance is a percentage of the current asset price. (e.g., a value of `0.5` means 0.5% of the current price).

---

## 3. Initial Stop Loss & Take Profit
These variables run exactly once: the moment a new trade is opened.

*   `InpSLMethod` & `InpSLValue`
    *   **What it does:** Defines where your Initial Stop Loss is placed. 
    *   **Example:** If Method = `PERCENT_OF_PRICE` and Value = `1.0`, your SL is placed exactly 1% away from your entry price.

*   `InpTP1Method` & `InpTP1Value`
    *   **What it does:** Defines the location of your **First Take Profit (TP1)**. This is actually sent to the broker as your official Take Profit when the trade opens.

*   `InpTP2Method` & `InpTP2Value`
    *   **What it does:** Defines the location of your **Final Take Profit (TP2)**. 
    *   **Note:** The EA *memorizes* this internally. It does not send TP2 to the broker until TP1 has been hit.

---

## 4. Breakeven Settings
These variables control when and how your Stop Loss is moved to protect your capital.

*   `InpBreakevenTrigger` & `InpBreakevenValue`
    *   **What it does:** Defines how much profit the trade must be in before the EA moves your Stop Loss to breakeven. 
    *   **Example:** If Method = `FIXED_PIPS` and Value = `100`, the moment your trade is 100 pips in profit, the SL jumps to your entry price.

*   `InpBreakevenBufferPips` **(Number, e.g., 5)**
    *   **What it does:** When moving the SL to breakeven, you usually don't want it exactly at `Entry Price + 0.00` because broker spreads might knock you out prematurely. This adds a tiny buffer (e.g., 5 pips) into profit so you still cover broker commissions if stopped out.

---

## 5. Partial Close & Trailing Stop
These variables take effect **after** your trade hits TP1.

*   `InpPartialClosePercent` **(Number, e.g., 50)**
    *   **What it does:** When price hits TP1, the EA will close this exact percentage of your lot size and leave the rest as a "runner".
    *   **Example:** If your lot size is 1.00 and this is set to `50`, the EA closes 0.50 lots at TP1. The remaining 0.50 lots will have their Take Profit moved to your **TP2** target.

*   `InpTrailMethod` & `InpTrailValue`
    *   **What it does:** Once TP1 is hit, the EA begins trailing your Stop Loss behind the current price by this distance. 
    *   **Example:** If Method = `ATR_MULTIPLE` and Value = `2.0`, the EA will constantly move your SL so it is never further than 2x the ATR away from the current price. It will only move the SL forward (locking in more profit); it will never move it backward.

---

## 6. System Settings
These are backend technical variables.

*   `InpATRPeriod` **(Number, e.g., 14)**
    *   **What it does:** If you selected `ATR_MULTIPLE` for any of your SL/TP/Trailing methods above, this tells the EA how many candles to look back to calculate the volatility. 14 is the industry standard.

*   `InpCheckIntervalSeconds` **(Number, e.g., 5)**
    *   **What it does:** How often the EA wakes up to check if it needs to move a Stop Loss or take partial profits. 
    *   **Why it exists:** Running logic on every single market "tick" uses massive amounts of CPU and can freeze your terminal. Checking every 5 seconds is incredibly fast but keeps your computer running smoothly.
