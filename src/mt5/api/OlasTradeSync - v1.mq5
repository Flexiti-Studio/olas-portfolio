//+------------------------------------------------------------------+
//|                                                OlasTradeSync.mq5 |
//+------------------------------------------------------------------+
#property copyright "Olas Portfolio"
#property version   "1.12"

input string   InpApiUrl          = "http://127.0.0.1:3000/api/mt5/ingest";
input string   InpPositionsApiUrl = "http://127.0.0.1:3000/api/mt5/positions";
input string   InpApiSecret       = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
input int      InpTimerSeconds    = 60;
input bool     InpBackfillAll     = true;   // set true ONCE to pull full history, then switch to false and recompile
input int      InpRollingDays     = 30;     // once backfilled, only re-scan this many days per sync (watermark handles the rest)

long     last_sent_ticket = 0;
datetime history_start    = 0;

int OnInit()
  {
   if(GlobalVariableCheck("OlasLastSentTicket"))
      last_sent_ticket = (long)GlobalVariableGet("OlasLastSentTicket");

   history_start = InpBackfillAll ? 0 : (TimeCurrent() - (86400 * InpRollingDays));
   Print("History sync starting from: ", TimeToString(history_start), InpBackfillAll ? " (FULL BACKFILL MODE)" : "");

   EventSetTimer(InpTimerSeconds);
   SyncClosedTrades();
   SyncOpenPositions();
   return(INIT_SUCCEEDED);
  }

void OnDeinit(const int reason) { EventKillTimer(); }
void OnTimer() { SyncClosedTrades(); SyncOpenPositions(); }

string TimeToISO(datetime time)
  {
   MqlDateTime dt;
   TimeToStruct(time, dt);
   return StringFormat("%04d-%02d-%02dT%02d:%02d:%02dZ", dt.year, dt.mon, dt.day, dt.hour, dt.min, dt.sec);
  }

void SyncClosedTrades()
  {
   if(!HistorySelect(history_start, TimeCurrent()))
     {
      Print("Failed to select history. Error: ", GetLastError());
      return;
     }

   int total_deals = HistoryDealsTotal();
   if(total_deals == 0) return;

   ulong    t_ticket[];      long t_entry[];      long t_type[];       string t_symbol[];
   double   t_volume[];      double t_price[];    double t_profit[];   datetime t_time[];
   long     t_magic[];       string t_comment[];  long t_position_id[];
   ArrayResize(t_ticket, total_deals);      ArrayResize(t_entry, total_deals);
   ArrayResize(t_type, total_deals);        ArrayResize(t_symbol, total_deals);
   ArrayResize(t_volume, total_deals);      ArrayResize(t_price, total_deals);
   ArrayResize(t_profit, total_deals);      ArrayResize(t_time, total_deals);
   ArrayResize(t_magic, total_deals);       ArrayResize(t_comment, total_deals);
   ArrayResize(t_position_id, total_deals);

   long open_pos_id[]; double open_price_map[]; datetime open_time_map[];
   int open_map_count = 0;
   ArrayResize(open_pos_id, total_deals);
   ArrayResize(open_price_map, total_deals);
   ArrayResize(open_time_map, total_deals);

   for(int i = 0; i < total_deals; i++)
     {
      ulong ticket = HistoryDealGetTicket(i);
      t_ticket[i]      = ticket;
      t_entry[i]       = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      t_type[i]        = HistoryDealGetInteger(ticket, DEAL_TYPE);
      t_symbol[i]      = HistoryDealGetString(ticket, DEAL_SYMBOL);
      t_volume[i]      = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      t_price[i]       = HistoryDealGetDouble(ticket, DEAL_PRICE);
      t_profit[i]      = HistoryDealGetDouble(ticket, DEAL_PROFIT)
                        + HistoryDealGetDouble(ticket, DEAL_SWAP)
                        + HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      t_time[i]        = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      t_magic[i]       = HistoryDealGetInteger(ticket, DEAL_MAGIC);
      t_comment[i]     = HistoryDealGetString(ticket, DEAL_COMMENT);
      t_position_id[i] = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);

      if(t_entry[i] == DEAL_ENTRY_IN)
        {
         open_pos_id[open_map_count]    = t_position_id[i];
         open_price_map[open_map_count] = t_price[i];
         open_time_map[open_map_count]  = t_time[i];
         open_map_count++;
        }
     }

   string payload = "[";
   int added = 0;
   long max_ticket_this_run = last_sent_ticket;

   for(int i = 0; i < total_deals; i++)
     {
      if(t_ticket[i] <= (ulong)last_sent_ticket) continue;
      if(t_entry[i] != DEAL_ENTRY_OUT) continue;
      if(t_type[i] != DEAL_TYPE_BUY && t_type[i] != DEAL_TYPE_SELL) continue;

      double open_price = 0.0;
      datetime open_time = 0;
      for(int m = 0; m < open_map_count; m++)
        {
         if(open_pos_id[m] == t_position_id[i])
           {
            open_price = open_price_map[m];
            open_time  = open_time_map[m];
            break;
           }
        }
      if(open_time == 0) open_time = t_time[i];

      string type_str = (t_type[i] == DEAL_TYPE_BUY) ? "SELL" : "BUY";
      string comment = t_comment[i];
      StringReplace(comment, "\"", "'");
      StringReplace(comment, "\\", "/");

      if(added > 0) payload += ",";
      // "ticket" = the actual deal ticket (unique per exit event, survives partial closes correctly)
      // "positionId" = sent alongside so the server can group partial closes of the same trade together
      payload += StringFormat(
         "{\"ticket\":%I64u,\"positionId\":%I64d,\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%.2f,\"openPrice\":%.5f,\"closePrice\":%.5f,\"profit\":%.2f,\"openTime\":\"%s\",\"closeTime\":\"%s\",\"magicNumber\":%I64d,\"comment\":\"%s\"}",
         t_ticket[i], t_position_id[i], t_symbol[i], type_str, t_volume[i], open_price, t_price[i], t_profit[i],
         TimeToISO(open_time), TimeToISO(t_time[i]), t_magic[i], comment
      );
      added++;
      if((long)t_ticket[i] > max_ticket_this_run) max_ticket_this_run = (long)t_ticket[i];
     }
   payload += "]";

   if(added == 0) return;

   if(SendPost(InpApiUrl, payload))
     {
      Print("Successfully synced ", added, " closed trades.");
      last_sent_ticket = max_ticket_this_run;
      GlobalVariableSet("OlasLastSentTicket", (double)last_sent_ticket);
     }
  }

void SyncOpenPositions()
  {
   int total = PositionsTotal();
   string payload = "[";
   int added = 0;

   for(int i = 0; i < total; i++)
     {
      ulong ticket = PositionGetTicket(i);
      if(ticket == 0) continue;
      if(!PositionSelectByTicket(ticket)) continue;

      string symbol = PositionGetString(POSITION_SYMBOL);
      long type = PositionGetInteger(POSITION_TYPE);
      double volume = PositionGetDouble(POSITION_VOLUME);
      double openPrice = PositionGetDouble(POSITION_PRICE_OPEN);
      double currentPrice = PositionGetDouble(POSITION_PRICE_CURRENT);
      double sl = PositionGetDouble(POSITION_SL);
      double tp = PositionGetDouble(POSITION_TP);
      double profit = PositionGetDouble(POSITION_PROFIT) + PositionGetDouble(POSITION_SWAP);
      datetime openTime = (datetime)PositionGetInteger(POSITION_TIME);
      long magic = PositionGetInteger(POSITION_MAGIC);
      string comment = PositionGetString(POSITION_COMMENT);
      StringReplace(comment, "\"", "'");
      StringReplace(comment, "\\", "/");

      string type_str = (type == POSITION_TYPE_BUY) ? "BUY" : "SELL";

      if(added > 0) payload += ",";
      payload += StringFormat(
         "{\"ticket\":%I64u,\"symbol\":\"%s\",\"type\":\"%s\",\"volume\":%.2f,\"openPrice\":%.5f,\"currentPrice\":%.5f,\"sl\":%.5f,\"tp\":%.5f,\"profit\":%.2f,\"openTime\":\"%s\",\"magicNumber\":%I64d,\"comment\":\"%s\"}",
         ticket, symbol, type_str, volume, openPrice, currentPrice, sl, tp, profit, TimeToISO(openTime), magic, comment
      );
      added++;
     }
   payload += "]"; // always sent, even as "[]" when total==0 — the server NEEDS the empty array to reconcile away closed positions

   SendPost(InpPositionsApiUrl, payload);
  }

bool SendPost(string url, string payload)
  {
   uchar post[], result[];
   string headers;
   StringToCharArray(payload, post, 0, WHOLE_ARRAY, CP_UTF8);
   string custom_headers = "Content-Type: application/json\r\nAuthorization: Bearer " + InpApiSecret + "\r\n";
   ResetLastError();
   int res = WebRequest("POST", url, custom_headers, 5000, post, result, headers);
   if(res == 200 || res == 201)
     {
      Print("Synced OK to ", url, " (HTTP ", res, ")");
      return true;
     }
   else
     {
      string result_str = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      Print("Sync FAILED to ", url, ". HTTP code: ", res, ". Response: ", result_str, ". Error: ", GetLastError());
      if(res == -1) Print(">>> HTTP -1 usually means this URL is NOT whitelisted. Check Tools > Options > Expert Advisors.");
      return false;
     }
  }