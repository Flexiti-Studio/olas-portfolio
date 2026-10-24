//+------------------------------------------------------------------+
//|                                             OlasTradeManager.mq5 |
//|                                      Olas Portfolio Trade Manager|
//+------------------------------------------------------------------+
#property copyright "Olas Portfolio"
#property link      ""
#property version   "1.00"

#include <Trade\Trade.mqh>

//--- Enums
enum SLTPMethod
  {
   FIXED_PIPS,       // Fixed Pips
   ATR_MULTIPLE,     // ATR Multiple
   PERCENT_OF_PRICE  // Percent of Price
  };

enum POSITION_STATE
  {
   INITIAL,
   BREAKEVEN_SET,
   TP1_HIT_TRAILING
  };

//--- Inputs
input bool       InpEnabled              = true;   // Master kill-switch
input long       InpMagicNumber          = 0;      // Magic Number (0 = ignore magic, manage all)
input bool       InpManageAllPositions   = false;  // Manage All Positions (Overrides Magic)

input SLTPMethod InpSLMethod             = FIXED_PIPS; // SL Method
input double     InpSLValue              = 200;        // SL Value (Pips/ATR/Percent)

input SLTPMethod InpTP1Method            = FIXED_PIPS; // TP1 Method
input double     InpTP1Value             = 150;        // TP1 Value
input SLTPMethod InpTP2Method            = FIXED_PIPS; // TP2 Method
input double     InpTP2Value             = 400;        // TP2 Value

input double     InpPartialClosePercent  = 50;         // Partial Close % at TP1

input SLTPMethod InpBreakevenTrigger     = FIXED_PIPS; // BE Trigger Method
input double     InpBreakevenValue       = 100;        // BE Trigger Value
input double     InpBreakevenBufferPips  = 5;          // BE Buffer Pips

input SLTPMethod InpTrailMethod          = FIXED_PIPS; // Trailing SL Method
input double     InpTrailValue           = 80;         // Trailing Value

input int        InpATRPeriod            = 14;         // ATR Period
input int        InpCheckIntervalSeconds = 5;          // Timer Check Interval (Seconds)

//--- Structs
struct TrackedPosition
  {
   ulong          ticket;
   POSITION_STATE state;
   double         initialSL;
   double         tp1;
   double         tp2;
  };

//--- Global Variables
TrackedPosition TrackedArray[];
CTrade trade;

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
  {
   trade.SetExpertMagicNumber(InpMagicNumber);
   
   EventSetTimer(InpCheckIntervalSeconds);
   
   // RECOVERY LOGIC:
   // NOTE: State tracking is strictly in-memory and lost on restart!
   // We loop through open positions and infer state based on the current SL.
   int total = PositionsTotal();
   for(int i = 0; i < total; i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      
      if(!InpManageAllPositions && InpMagicNumber != 0)
        {
         if(PositionGetInteger(POSITION_MAGIC) != InpMagicNumber) continue;
        }
        
      double entry = PositionGetDouble(POSITION_PRICE_OPEN);
      double sl = PositionGetDouble(POSITION_SL);
      long type = PositionGetInteger(POSITION_TYPE);
      
      POSITION_STATE state = INITIAL;
      
      if(sl > 0)
        {
         if(type == POSITION_TYPE_BUY && sl >= entry) state = BREAKEVEN_SET;
         if(type == POSITION_TYPE_SELL && sl <= entry && sl > 0) state = BREAKEVEN_SET;
        }
        
      AddTrackedPosition(ticket, state);
      Print("Recovered tracking for ticket: ", ticket, " inferred state: ", EnumToString(state));
     }
     
   return(INIT_SUCCEEDED);
  }

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
  {
   EventKillTimer();
  }

//+------------------------------------------------------------------+
//| Array Helpers                                                    |
//+------------------------------------------------------------------+
void AddTrackedPosition(ulong ticket, POSITION_STATE state)
  {
   int size = ArraySize(TrackedArray);
   for(int i = 0; i < size; i++)
     {
      if(TrackedArray[i].ticket == ticket) return; 
     }
   ArrayResize(TrackedArray, size + 1);
   TrackedArray[size].ticket = ticket;
   TrackedArray[size].state = state;
   TrackedArray[size].initialSL = 0;
   TrackedArray[size].tp1 = 0;
   TrackedArray[size].tp2 = 0;
  }

void RemoveTrackedPosition(ulong ticket)
  {
   int size = ArraySize(TrackedArray);
   for(int i = 0; i < size; i++)
     {
      if(TrackedArray[i].ticket == ticket)
        {
         for(int j = i; j < size - 1; j++) TrackedArray[j] = TrackedArray[j+1];
         ArrayResize(TrackedArray, size - 1);
         return;
        }
     }
  }

//+------------------------------------------------------------------+
//| Distance Calculation Helper                                      |
//+------------------------------------------------------------------+
double CalculateDistance(SLTPMethod method, double value, string symbol, ENUM_TIMEFRAMES tf = PERIOD_CURRENT)
  {
   double dist = 0.0;
   
   if(method == FIXED_PIPS)
     {
      double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      double pipSize = point;
      if(digits == 3 || digits == 5) pipSize = point * 10.0; // Broker standardization
      
      dist = value * pipSize;
     }
   else if(method == ATR_MULTIPLE)
     {
      int handle = iATR(symbol, tf, InpATRPeriod);
      if(handle != INVALID_HANDLE)
        {
         double atrArray[1];
         if(CopyBuffer(handle, 0, 1, 1, atrArray) > 0)
           {
            dist = value * atrArray[0];
           }
         IndicatorRelease(handle);
        }
     }
   else if(method == PERCENT_OF_PRICE)
     {
      double current_price = SymbolInfoDouble(symbol, SYMBOL_BID);
      dist = current_price * (value / 100.0);
     }
     
   return dist;
  }

//+------------------------------------------------------------------+
//| Trade Transaction Event                                          |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction &trans,
                        const MqlTradeRequest &request,
                        const MqlTradeResult &result)
  {
   if(!InpEnabled) return;
   
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD)
     {
      if(trans.deal_type == DEAL_TYPE_BUY || trans.deal_type == DEAL_TYPE_SELL)
        {
         ulong ticket = trans.position;
         if(HistoryDealSelect(trans.deal))
           {
            long entry_type = HistoryDealGetInteger(trans.deal, DEAL_ENTRY);
            
            // ON OPEN
            if(entry_type == DEAL_ENTRY_IN)
              {
               if(PositionSelectByTicket(ticket))
                 {
                  long magic = PositionGetInteger(POSITION_MAGIC);
                  if(InpManageAllPositions || magic == InpMagicNumber)
                    {
                     string symbol = PositionGetString(POSITION_SYMBOL);
                     double open_price = PositionGetDouble(POSITION_PRICE_OPEN);
                     long type = PositionGetInteger(POSITION_TYPE);
                     
                     double sl_dist = CalculateDistance(InpSLMethod, InpSLValue, symbol);
                     double tp1_dist = CalculateDistance(InpTP1Method, InpTP1Value, symbol);
                     double tp2_dist = CalculateDistance(InpTP2Method, InpTP2Value, symbol);
                     
                     double sl = 0, tp1 = 0, tp2 = 0;
                     
                     if(type == POSITION_TYPE_BUY)
                       {
                        sl = open_price - sl_dist;
                        tp1 = open_price + tp1_dist;
                        tp2 = open_price + tp2_dist;
                       }
                     else if(type == POSITION_TYPE_SELL)
                       {
                        sl = open_price + sl_dist;
                        tp1 = open_price - tp1_dist;
                        tp2 = open_price - tp2_dist;
                       }
                     
                     int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
                     sl = NormalizeDouble(sl, digits);
                     tp1 = NormalizeDouble(tp1, digits);
                     tp2 = NormalizeDouble(tp2, digits);
                     
                     AddTrackedPosition(ticket, INITIAL);
                     
                     int size = ArraySize(TrackedArray);
                     for(int i=0; i<size; i++)
                       {
                        if(TrackedArray[i].ticket == ticket)
                          {
                           TrackedArray[i].initialSL = sl;
                           TrackedArray[i].tp1 = tp1;
                           TrackedArray[i].tp2 = tp2;
                           break;
                          }
                       }
                       
                     if(!trade.PositionModify(ticket, sl, tp1))
                       {
                        Print("Failed to set initial SL/TP1. Ticket: ", ticket, " Err: ", GetLastError());
                       }
                     else
                       {
                        Print("Set initial SL/TP1 for Ticket: ", ticket);
                       }
                    }
                 }
              }
            // ON CLOSE (CLEANUP)
            else if(entry_type == DEAL_ENTRY_OUT)
              {
               if(!PositionSelectByTicket(ticket))
                 {
                  RemoveTrackedPosition(ticket);
                 }
              }
           }
        }
     }
  }

//+------------------------------------------------------------------+
//| Timer Loop                                                       |
//+------------------------------------------------------------------+
void OnTimer()
  {
   if(!InpEnabled) return;
   
   // 1. Periodic cleanup of closed positions (Sweep)
   for(int i = ArraySize(TrackedArray) - 1; i >= 0; i--)
     {
      ulong ticket = TrackedArray[i].ticket;
      if(!PositionSelectByTicket(ticket)) RemoveTrackedPosition(ticket);
     }
     
   int size = ArraySize(TrackedArray);
   for(int i = 0; i < size; i++)
     {
      ulong ticket = TrackedArray[i].ticket;
      if(!PositionSelectByTicket(ticket)) continue; 
      
      string symbol = PositionGetString(POSITION_SYMBOL);
      long type = PositionGetInteger(POSITION_TYPE);
      double entry = PositionGetDouble(POSITION_PRICE_OPEN);
      double current_sl = PositionGetDouble(POSITION_SL);
      double current_tp = PositionGetDouble(POSITION_TP);
      double volume = PositionGetDouble(POSITION_VOLUME);
      
      double current_bid = SymbolInfoDouble(symbol, SYMBOL_BID);
      double current_ask = SymbolInfoDouble(symbol, SYMBOL_ASK);
      double current_price = (type == POSITION_TYPE_BUY) ? current_bid : current_ask;
      
      double point = SymbolInfoDouble(symbol, SYMBOL_POINT);
      int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
      double pipSize = point;
      if(digits == 3 || digits == 5) pipSize = point * 10.0;
      
      POSITION_STATE state = TrackedArray[i].state;
      
      double profit_dist = 0;
      if(type == POSITION_TYPE_BUY) profit_dist = current_price - entry;
      else if(type == POSITION_TYPE_SELL) profit_dist = entry - current_price;
      
      // 2. Breakeven Trigger
      if(state == INITIAL)
        {
         double be_trigger_dist = CalculateDistance(InpBreakevenTrigger, InpBreakevenValue, symbol);
         if(profit_dist >= be_trigger_dist)
           {
            double be_sl = 0;
            double buffer_dist = InpBreakevenBufferPips * pipSize;
            
            if(type == POSITION_TYPE_BUY) be_sl = entry + buffer_dist;
            else if(type == POSITION_TYPE_SELL) be_sl = entry - buffer_dist;
            be_sl = NormalizeDouble(be_sl, digits);
            
            // Safety Guard: Only move SL favorably
            bool favorable = false;
            if(type == POSITION_TYPE_BUY && (current_sl == 0 || be_sl > current_sl)) favorable = true;
            if(type == POSITION_TYPE_SELL && (current_sl == 0 || be_sl < current_sl)) favorable = true;
            
            if(favorable)
              {
               if(trade.PositionModify(ticket, be_sl, current_tp))
                 {
                  TrackedArray[i].state = BREAKEVEN_SET;
                  Print("Moved to Breakeven. Ticket: ", ticket);
                 }
               else
                 {
                  Print("BE Modify failed. Ticket: ", ticket, " Err: ", GetLastError());
                 }
              }
           }
        }
        
      // 3. TP1 Hit & Partial Close
      if(state == INITIAL || state == BREAKEVEN_SET)
        {
         double tp1 = TrackedArray[i].tp1;
         if(tp1 > 0)
           {
            bool tp1_hit = false;
            if(type == POSITION_TYPE_BUY && current_price >= tp1) tp1_hit = true;
            if(type == POSITION_TYPE_SELL && current_price <= tp1) tp1_hit = true;
            
            if(tp1_hit)
              {
               double close_vol = NormalizeDouble(volume * (InpPartialClosePercent / 100.0), 2);
               double min_vol = SymbolInfoDouble(symbol, SYMBOL_VOLUME_MIN);
               double step_vol = SymbolInfoDouble(symbol, SYMBOL_VOLUME_STEP);
               
               close_vol = MathFloor(close_vol / step_vol) * step_vol;
               if(close_vol < min_vol) close_vol = min_vol;
               
               if(close_vol < volume) 
                 {
                  if(trade.PositionClosePartial(ticket, close_vol))
                    {
                     Print("Partial closed. Ticket: ", ticket);
                     double tp2 = TrackedArray[i].tp2;
                     
                     if(tp2 > 0)
                       {
                        if(trade.PositionModify(ticket, current_sl, tp2))
                          {
                           TrackedArray[i].state = TP1_HIT_TRAILING;
                           Print("Set TP2 and Tracking State. Ticket: ", ticket);
                          }
                       }
                     else
                       {
                        TrackedArray[i].state = TP1_HIT_TRAILING;
                       }
                    }
                  else
                    {
                     Print("Partial close failed. Ticket: ", ticket, " Err: ", GetLastError());
                    }
                 }
               else
                 {
                  // Volume too small to divide, jump straight to trailing state
                  double tp2 = TrackedArray[i].tp2;
                  trade.PositionModify(ticket, current_sl, tp2);
                  TrackedArray[i].state = TP1_HIT_TRAILING;
                 }
              }
           }
        }
        
      // 4. Trailing SL
      if(state == TP1_HIT_TRAILING)
        {
         double trail_dist = CalculateDistance(InpTrailMethod, InpTrailValue, symbol);
         double new_sl = 0;
         
         if(type == POSITION_TYPE_BUY) new_sl = current_price - trail_dist;
         else if(type == POSITION_TYPE_SELL) new_sl = current_price + trail_dist;
         
         new_sl = NormalizeDouble(new_sl, digits);
         
         // Safety Guard: Only move SL favorably
         bool favorable = false;
         if(type == POSITION_TYPE_BUY && (current_sl == 0 || new_sl > current_sl)) favorable = true;
         if(type == POSITION_TYPE_SELL && (current_sl == 0 || new_sl < current_sl)) favorable = true;
         
         if(favorable)
           {
            if(trade.PositionModify(ticket, new_sl, current_tp))
              {
               Print("Trailed SL. Ticket: ", ticket, " New SL: ", new_sl);
              }
           }
        }
     }
  }
//+------------------------------------------------------------------+
