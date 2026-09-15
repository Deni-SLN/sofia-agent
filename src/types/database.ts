export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["users"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["users"]["Insert"]>;
      };
      exchange_configs: {
        Row: {
          id: string;
          user_id: string;
          exchange_name: string;
          api_key_enc: string;
          api_secret_enc: string;
          is_testnet: boolean;
          is_connected: boolean;
          permissions: Json | null;
          account_info: Json | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["exchange_configs"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["exchange_configs"]["Insert"]>;
      };
      portfolios: {
        Row: {
          id: string;
          user_id: string;
          total_value_usd: number;
          total_value_idr: number;
          unrealized_pnl: number;
          realized_pnl: number;
          total_invested: number;
          roi_pct: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["portfolios"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["portfolios"]["Insert"]>;
      };
      portfolio_assets: {
        Row: {
          id: string;
          portfolio_id: string;
          coin_symbol: string;
          coin_name: string | null;
          amount: number;
          avg_buy_price: number;
          current_price: number;
          current_value_usd: number;
          unrealized_pnl: number;
          unrealized_pnl_pct: number;
          allocation_pct: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["portfolio_assets"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["portfolio_assets"]["Insert"]>;
      };
      orders: {
        Row: {
          id: string;
          user_id: string;
          exchange_id: string;
          order_id_ext: string | null;
          symbol: string;
          side: "BUY" | "SELL";
          type: "LIMIT" | "MARKET" | "STOP_LOSS" | "STOP_LOSS_LIMIT" | "TAKE_PROFIT" | "TAKE_PROFIT_LIMIT";
          quantity: number;
          price: number | null;
          stop_price: number | null;
          status: "PENDING" | "OPEN" | "PARTIALLY_FILLED" | "FILLED" | "CANCELLED" | "REJECTED" | "EXPIRED";
          filled_qty: number;
          remaining_qty: number;
          commission: number;
          commission_asset: string | null;
          ai_signal_id: string | null;
          created_at: string;
          updated_at: string;
          executed_at: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["orders"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
      };
      positions: {
        Row: {
          id: string;
          user_id: string;
          exchange_id: string;
          position_id_ext: string | null;
          symbol: string;
          side: "LONG" | "SHORT";
          entry_price: number;
          quantity: number;
          leverage: number;
          unrealized_pnl: number;
          realized_pnl: number;
          tp_price: number | null;
          sl_price: number | null;
          trailing_stop_pct: number | null;
          trailing_stop_price: number | null;
          dca_orders: Json;
          status: "OPEN" | "CLOSED" | "LIQUIDATED";
          opened_at: string;
          closed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["positions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["positions"]["Insert"]>;
      };
      ai_providers: {
        Row: {
          id: string;
          name: string;
          display_name: string | null;
          api_key_enc: string | null;
          base_url: string | null;
          is_active: boolean;
          priority: number;
          daily_budget_usd: number | null;
          monthly_budget_usd: number | null;
          current_daily_cost: number;
          current_monthly_cost: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_providers"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["ai_providers"]["Insert"]>;
      };
      ai_models: {
        Row: {
          id: string;
          provider_id: string;
          name: string;
          model_id: string;
          max_tokens: number | null;
          cost_per_1k_input: number | null;
          cost_per_1k_output: number | null;
          is_active: boolean;
          capabilities: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_models"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["ai_models"]["Insert"]>;
      };
      ai_analysis: {
        Row: {
          id: string;
          user_id: string;
          model_id: string;
          symbol: string;
          timeframe: string;
          analysis_type: string;
          technical_score: number | null;
          fundamental_score: number | null;
          sentiment_score: number | null;
          onchain_score: number | null;
          whale_score: number | null;
          confidence_score: number | null;
          risk_score: number | null;
          recommendation: "BUY" | "SELL" | "HOLD" | "STRONG_BUY" | "STRONG_SELL" | null;
          reasoning: string | null;
          raw_response: string | null;
          market_regime: string | null;
          trend_direction: string | null;
          volatility_pct: number | null;
          cost_usd: number | null;
          latency_ms: number | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_analysis"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["ai_analysis"]["Insert"]>;
      };
      trading_signals: {
        Row: {
          id: string;
          user_id: string;
          analysis_id: string | null;
          symbol: string;
          signal_type: "BUY" | "SELL" | "HOLD" | "TP_HIT" | "SL_HIT" | "TRAILING_STOP" | "DCA";
          entry_price: number | null;
          tp_price: number | null;
          sl_price: number | null;
          confidence: number | null;
          risk_reward_ratio: number | null;
          position_size_pct: number | null;
          status: "PENDING" | "CONFIRMED" | "EXECUTED" | "REJECTED" | "EXPIRED";
          execution_mode: string;
          executed_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["trading_signals"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["trading_signals"]["Insert"]>;
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          channel: "BROWSER" | "EMAIL" | "TELEGRAM" | "DISCORD" | "WHATSAPP";
          title: string;
          message: string | null;
          data_json: Json;
          is_read: boolean;
          sent_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["notifications"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["notifications"]["Insert"]>;
      };
      journals: {
        Row: {
          id: string;
          user_id: string;
          entry_type: "TRADE" | "AI_DECISION" | "MANUAL_REVIEW" | "MISTAKE" | "LESSON";
          symbol: string | null;
          ai_prompt: string | null;
          ai_response: string | null;
          trade_result: string | null;
          pnl: number | null;
          pnl_pct: number | null;
          reasoning: string | null;
          screenshot_url: string | null;
          ai_review: string | null;
          tags: string[] | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["journals"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["journals"]["Insert"]>;
      };
    };
  };
}

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type InsertTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Insert"];
export type UpdateTables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Update"];
