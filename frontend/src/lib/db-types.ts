export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      app_users: {
        Row: {
          user_id: string;
          email: string;
          stripe_customer_id: string | null;
          role: string | null;
          created_at: string | null;
        };
        Insert: {
          user_id: string;
          email: string;
          stripe_customer_id?: string | null;
          role?: string | null;
          created_at?: string | null;
        };
        Update: {
          user_id?: string;
          email?: string;
          stripe_customer_id?: string | null;
          role?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      billing: {
        Row: {
          user_id: string;
          stripe_subscription_id: string | null;
          tier: string | null;
          status: string | null;
          updated_at: string | null;
        };
        Insert: {
          user_id: string;
          stripe_subscription_id?: string | null;
          tier?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Update: {
          user_id?: string;
          stripe_subscription_id?: string | null;
          tier?: string | null;
          status?: string | null;
          updated_at?: string | null;
        };
        Relationships: [];
      };
      proofs: {
        Row: {
          id: string;
          user_id: string;
          file_name: string;
          version: number | null;
          hash_full: string;
          hash_prefix: string;
          signature: string;
          timestamp: string;
          project: string | null;
          visibility: string;
          anchor_txid: string | null;
          created_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          file_name: string;
          version?: number | null;
          hash_full: string;
          hash_prefix: string;
          signature: string;
          timestamp: string;
          project?: string | null;
          visibility?: string;
          anchor_txid?: string | null;
          created_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          file_name?: string;
          version?: number | null;
          hash_full?: string;
          hash_prefix?: string;
          signature?: string;
          timestamp?: string;
          project?: string | null;
          visibility?: string;
          anchor_txid?: string | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema['Tables'] & PublicSchema['Views'])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions['schema']]['Tables'] &
        Database[PublicTableNameOrOptions['schema']]['Views'])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions['schema']]['Tables'] &
      Database[PublicTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema['Tables'] &
      PublicSchema['Views'])
  ? (PublicSchema['Tables'] &
      PublicSchema['Views'])[PublicTableNameOrOptions] extends {
      Row: infer R;
    }
    ? R
    : never
  : never;

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
  ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
      Insert: infer I;
    }
    ? I
    : never
  : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema['Tables']
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions['schema']]['Tables']
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema['Tables']
  ? PublicSchema['Tables'][PublicTableNameOrOptions] extends {
      Update: infer U;
    }
    ? U
    : never
  : never;

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema['Enums']
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions['schema']]['Enums'][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema['Enums']
  ? PublicSchema['Enums'][PublicEnumNameOrOptions]
  : never;

// Convenience types for your specific tables
export type AppUser = Tables<'app_users'>;
export type AppUserInsert = TablesInsert<'app_users'>;
export type AppUserUpdate = TablesUpdate<'app_users'>;

export type Billing = Tables<'billing'>;
export type BillingInsert = TablesInsert<'billing'>;
export type BillingUpdate = TablesUpdate<'billing'>;

export type Proof = Tables<'proofs'>;
export type ProofInsert = TablesInsert<'proofs'>;
export type ProofUpdate = TablesUpdate<'proofs'>;
