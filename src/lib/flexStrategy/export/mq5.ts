import { StrategyContract } from '../engine/types';

/**
 * Stub translator for exporting a flexStrategy script to MetaTrader 5 MQL5 expert advisor code.
 */
export function generateMq5Stub(strategy: StrategyContract): string {
  const inputsCode = strategy.params
    .map((p) => `input ${p.type === 'number' ? 'double' : p.type === 'boolean' ? 'bool' : 'string'} Inp_${p.key} = ${p.default}; // ${p.label}`)
    .join('\n');

  return `//+------------------------------------------------------------------+
//|                                     flexStrategy Generated EA    |
//|                                     Strategy: ${strategy.name.padEnd(20)}|
//+------------------------------------------------------------------+
#property copyright "flexStrategy"
#property version   "1.00"
#property strict

#include <Trade\\Trade.mqh>
CTrade trade;

//--- Strategy Parameters
${inputsCode}

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit() {
   trade.SetExpertMagicNumber(133700);
   Print("Initialized flexStrategy EA: ${strategy.name}");
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason) {
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick() {
   // Bar-by-bar execution logic
   static datetime lastBarTime = 0;
   datetime currentBarTime = iTime(_Symbol, _Period, 0);
   if (currentBarTime == lastBarTime) return; // Only run on bar open
   lastBarTime = currentBarTime;

   // TODO: Translated onBar logic
   /*
   ${strategy.code.replace(/\n/g, '\n   ')}
   */
}
`;
}
