export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      agents: {
        Row: {
          collected_total: number
          commission_rate: number
          created_at: string
          custody_balance: number
          full_name: string
          id: string
          is_active: boolean
          phone: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          collected_total?: number
          commission_rate?: number
          created_at?: string
          custody_balance?: number
          full_name: string
          id?: string
          is_active?: boolean
          phone: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          collected_total?: number
          commission_rate?: number
          created_at?: string
          custody_balance?: number
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      audit_logs: {
        Row: {
          action: string
          created_at: string
          id: string
          ip_address: string | null
          new_data: Json | null
          old_data: Json | null
          record_id: string | null
          table_name: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          new_data?: Json | null
          old_data?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      customers: {
        Row: {
          address: string | null
          created_at: string
          full_name: string
          id: string
          loyalty_points: number
          national_id: string | null
          notes: string | null
          phone: string
          total_debt: number
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          full_name: string
          id?: string
          loyalty_points?: number
          national_id?: string | null
          notes?: string | null
          phone: string
          total_debt?: number
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          full_name?: string
          id?: string
          loyalty_points?: number
          national_id?: string | null
          notes?: string | null
          phone?: string
          total_debt?: number
          updated_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          branch_id: string | null
          category: string
          created_at: string
          created_by: string | null
          description: string | null
          expense_date: string
          id: string
        }
        Insert: {
          amount: number
          branch_id?: string | null
          category: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
        }
        Update: {
          amount?: number
          branch_id?: string | null
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          expense_date?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_payments: {
        Row: {
          agent_id: string | null
          amount_due: number
          amount_paid: number
          created_at: string
          due_date: string
          id: string
          notes: string | null
          paid_at: string | null
          penalty: number
          plan_id: string
          status: Database["public"]["Enums"]["installment_status"]
        }
        Insert: {
          agent_id?: string | null
          amount_due: number
          amount_paid?: number
          created_at?: string
          due_date: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          penalty?: number
          plan_id: string
          status?: Database["public"]["Enums"]["installment_status"]
        }
        Update: {
          agent_id?: string | null
          amount_due?: number
          amount_paid?: number
          created_at?: string
          due_date?: string
          id?: string
          notes?: string | null
          paid_at?: string | null
          penalty?: number
          plan_id?: string
          status?: Database["public"]["Enums"]["installment_status"]
        }
        Relationships: [
          {
            foreignKeyName: "installment_payments_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_payments_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "installment_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      installment_plans: {
        Row: {
          agent_id: string | null
          created_at: string
          customer_id: string
          down_payment: number
          frequency_days: number
          id: string
          installment_amount: number
          installment_count: number
          is_active: boolean
          notes: string | null
          sale_id: string | null
          start_date: string
          total_amount: number
        }
        Insert: {
          agent_id?: string | null
          created_at?: string
          customer_id: string
          down_payment?: number
          frequency_days?: number
          id?: string
          installment_amount: number
          installment_count: number
          is_active?: boolean
          notes?: string | null
          sale_id?: string | null
          start_date?: string
          total_amount: number
        }
        Update: {
          agent_id?: string | null
          created_at?: string
          customer_id?: string
          down_payment?: number
          frequency_days?: number
          id?: string
          installment_amount?: number
          installment_count?: number
          is_active?: boolean
          notes?: string | null
          sale_id?: string | null
          start_date?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "installment_plans_agent_id_fkey"
            columns: ["agent_id"]
            isOneToOne: false
            referencedRelation: "agents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_plans_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "installment_plans_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      product_imeis: {
        Row: {
          created_at: string
          id: string
          imei: string
          product_id: string
          purchase_price: number | null
          sale_id: string | null
          serial_number: string | null
          sold_at: string | null
          status: Database["public"]["Enums"]["imei_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          imei: string
          product_id: string
          purchase_price?: number | null
          sale_id?: string | null
          serial_number?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["imei_status"]
        }
        Update: {
          created_at?: string
          id?: string
          imei?: string
          product_id?: string
          purchase_price?: number | null
          sale_id?: string | null
          serial_number?: string | null
          sold_at?: string | null
          status?: Database["public"]["Enums"]["imei_status"]
        }
        Relationships: [
          {
            foreignKeyName: "product_imeis_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          barcode: string | null
          branch_id: string | null
          brand: string | null
          color: string | null
          created_at: string
          id: string
          is_active: boolean
          is_phone: boolean
          low_stock_threshold: number
          model: string | null
          name: string
          purchase_price: number
          quantity: number
          selling_price: number
          storage_size: string | null
          supplier: string | null
          updated_at: string
        }
        Insert: {
          barcode?: string | null
          branch_id?: string | null
          brand?: string | null
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_phone?: boolean
          low_stock_threshold?: number
          model?: string | null
          name: string
          purchase_price?: number
          quantity?: number
          selling_price?: number
          storage_size?: string | null
          supplier?: string | null
          updated_at?: string
        }
        Update: {
          barcode?: string | null
          branch_id?: string | null
          brand?: string | null
          color?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          is_phone?: boolean
          low_stock_threshold?: number
          model?: string | null
          name?: string
          purchase_price?: number
          quantity?: number
          selling_price?: number
          storage_size?: string | null
          supplier?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          branch_id: string | null
          created_at: string
          full_name: string
          id: string
          is_active: boolean
          phone: string | null
          updated_at: string
          username: string | null
        }
        Insert: {
          branch_id?: string | null
          created_at?: string
          full_name: string
          id: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Update: {
          branch_id?: string | null
          created_at?: string
          full_name?: string
          id?: string
          is_active?: boolean
          phone?: string | null
          updated_at?: string
          username?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          created_at: string
          gateway: string
          role: string
        }
        Insert: {
          created_at?: string
          gateway: string
          role: string
        }
        Update: {
          created_at?: string
          gateway?: string
          role?: string
        }
        Relationships: []
      }
      sale_items: {
        Row: {
          created_at: string
          id: string
          imei_id: string | null
          line_total: number
          product_id: string | null
          product_name: string
          quantity: number
          sale_id: string
          unit_cost: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          imei_id?: string | null
          line_total: number
          product_id?: string | null
          product_name: string
          quantity?: number
          sale_id: string
          unit_cost?: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          imei_id?: string | null
          line_total?: number
          product_id?: string | null
          product_name?: string
          quantity?: number
          sale_id?: string
          unit_cost?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "sale_items_imei_id_fkey"
            columns: ["imei_id"]
            isOneToOne: false
            referencedRelation: "product_imeis"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sale_items_sale_id_fkey"
            columns: ["sale_id"]
            isOneToOne: false
            referencedRelation: "sales"
            referencedColumns: ["id"]
          },
        ]
      }
      sales: {
        Row: {
          branch_id: string | null
          cash_amount: number
          cashier_id: string | null
          created_at: string
          customer_id: string | null
          discount: number
          id: string
          invoice_number: number
          notes: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          profit: number
          subtotal: number
          tax: number
          total: number
          wallet_amount: number
          wallet_id: string | null
        }
        Insert: {
          branch_id?: string | null
          cash_amount?: number
          cashier_id?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          invoice_number?: number
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          profit?: number
          subtotal?: number
          tax?: number
          total?: number
          wallet_amount?: number
          wallet_id?: string | null
        }
        Update: {
          branch_id?: string | null
          cash_amount?: number
          cashier_id?: string | null
          created_at?: string
          customer_id?: string | null
          discount?: number
          id?: string
          invoice_number?: number
          notes?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          profit?: number
          subtotal?: number
          tax?: number
          total?: number
          wallet_amount?: number
          wallet_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      treasury_days: {
        Row: {
          branch_id: string | null
          closed_at: string | null
          closed_by: string | null
          closing_balance: number
          created_at: string
          day_date: string
          id: string
          is_closed: boolean
          notes: string | null
          opening_balance: number
          total_commissions: number
          total_deposits: number
          total_expenses: number
          total_profit: number
          total_sales: number
          total_transfers: number
          total_withdrawals: number
        }
        Insert: {
          branch_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number
          created_at?: string
          day_date: string
          id?: string
          is_closed?: boolean
          notes?: string | null
          opening_balance?: number
          total_commissions?: number
          total_deposits?: number
          total_expenses?: number
          total_profit?: number
          total_sales?: number
          total_transfers?: number
          total_withdrawals?: number
        }
        Update: {
          branch_id?: string | null
          closed_at?: string | null
          closed_by?: string | null
          closing_balance?: number
          created_at?: string
          day_date?: string
          id?: string
          is_closed?: boolean
          notes?: string | null
          opening_balance?: number
          total_commissions?: number
          total_deposits?: number
          total_expenses?: number
          total_profit?: number
          total_sales?: number
          total_transfers?: number
          total_withdrawals?: number
        }
        Relationships: [
          {
            foreignKeyName: "treasury_days_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          commission: number
          created_at: string
          created_by: string | null
          customer_phone: string | null
          id: string
          image_urls: string[]
          notes: string | null
          status: Database["public"]["Enums"]["wallet_tx_status"]
          tx_type: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          commission?: number
          created_at?: string
          created_by?: string | null
          customer_phone?: string | null
          id?: string
          image_urls?: string[]
          notes?: string | null
          status?: Database["public"]["Enums"]["wallet_tx_status"]
          tx_type: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          commission?: number
          created_at?: string
          created_by?: string | null
          customer_phone?: string | null
          id?: string
          image_urls?: string[]
          notes?: string | null
          status?: Database["public"]["Enums"]["wallet_tx_status"]
          tx_type?: Database["public"]["Enums"]["wallet_tx_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          balance: number
          branch_id: string | null
          created_at: string
          daily_deposit_limit: number
          daily_transfer_limit: number
          daily_withdrawal_limit: number
          id: string
          is_blocked: boolean
          label: string | null
          limits_reset_date: string
          phone_number: string
          provider: Database["public"]["Enums"]["wallet_provider"]
          updated_at: string
          used_deposit_today: number
          used_transfer_today: number
          used_withdrawal_today: number
        }
        Insert: {
          balance?: number
          branch_id?: string | null
          created_at?: string
          daily_deposit_limit?: number
          daily_transfer_limit?: number
          daily_withdrawal_limit?: number
          id?: string
          is_blocked?: boolean
          label?: string | null
          limits_reset_date?: string
          phone_number: string
          provider: Database["public"]["Enums"]["wallet_provider"]
          updated_at?: string
          used_deposit_today?: number
          used_transfer_today?: number
          used_withdrawal_today?: number
        }
        Update: {
          balance?: number
          branch_id?: string | null
          created_at?: string
          daily_deposit_limit?: number
          daily_transfer_limit?: number
          daily_withdrawal_limit?: number
          id?: string
          is_blocked?: boolean
          label?: string | null
          limits_reset_date?: string
          phone_number?: string
          provider?: Database["public"]["Enums"]["wallet_provider"]
          updated_at?: string
          used_deposit_today?: number
          used_transfer_today?: number
          used_withdrawal_today?: number
        }
        Relationships: [
          {
            foreignKeyName: "wallets_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin_or_owner: { Args: { _user_id: string }; Returns: boolean }
      user_gateways: { Args: { _uid: string }; Returns: string[] }
    }
    Enums: {
      app_role:
        | "owner"
        | "admin"
        | "cashier"
        | "accountant"
        | "agent"
        | "branch_manager"
        | "supervisor"
      imei_status: "available" | "sold" | "returned" | "damaged"
      installment_status: "pending" | "paid" | "overdue" | "partial"
      payment_method: "cash" | "wallet" | "mixed" | "installment"
      wallet_provider:
        | "vodafone_cash"
        | "etisalat_cash"
        | "orange_cash"
        | "we_pay"
      wallet_tx_status: "pending" | "approved" | "rejected"
      wallet_tx_type:
        | "withdrawal"
        | "transfer"
        | "deposit"
        | "pos_payment"
        | "adjustment"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: [
        "owner",
        "admin",
        "cashier",
        "accountant",
        "agent",
        "branch_manager",
        "supervisor",
      ],
      imei_status: ["available", "sold", "returned", "damaged"],
      installment_status: ["pending", "paid", "overdue", "partial"],
      payment_method: ["cash", "wallet", "mixed", "installment"],
      wallet_provider: [
        "vodafone_cash",
        "etisalat_cash",
        "orange_cash",
        "we_pay",
      ],
      wallet_tx_status: ["pending", "approved", "rejected"],
      wallet_tx_type: [
        "withdrawal",
        "transfer",
        "deposit",
        "pos_payment",
        "adjustment",
      ],
    },
  },
} as const
