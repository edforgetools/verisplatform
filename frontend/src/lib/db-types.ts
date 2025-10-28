export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

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
      billing_event_logs: {
        Row: {
          id: string;
          event_id: string;
          event_type: string;
          stripe_subscription_id: string | null;
          user_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          event_id: string;
          event_type: string;
          stripe_subscription_id?: string | null;
          user_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          event_id?: string;
          event_type?: string;
          stripe_subscription_id?: string | null;
          user_id?: string | null;
          created_at?: string;
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
          proof_json: Json | null;
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
          proof_json?: Json | null;
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
          proof_json?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      telemetry: {
        Row: {
          id: number;
          user_id: string | null;
          event: string;
          value: number | null;
          meta: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          user_id?: string | null;
          event: string;
          value?: number | null;
          meta?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          user_id?: string | null;
          event?: string;
          value?: number | null;
          meta?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      telemetry_daily: {
        Row: {
          id: number;
          date: string;
          event: string;
          count: number | null;
          unique_users: number | null;
          meta: Json | null;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          date?: string;
          event: string;
          count?: number | null;
          unique_users?: number | null;
          meta?: Json | null;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          date?: string;
          event?: string;
          count?: number | null;
          unique_users?: number | null;
          meta?: Json | null;
          created_at?: string | null;
        };
        Relationships: [];
      };
      snapshot_meta: {
        Row: {
          id: number;
          batch: number;
          count: number;
          merkle_root: string;
          s3_url: string;
          arweave_txid: string | null;
          arweave_url: string | null;
          integrity_verified: boolean;
          published_at: string;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          batch: number;
          count: number;
          merkle_root: string;
          s3_url: string;
          arweave_txid?: string | null;
          arweave_url?: string | null;
          integrity_verified?: boolean;
          published_at?: string;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          batch?: number;
          count?: number;
          merkle_root?: string;
          s3_url?: string;
          arweave_txid?: string | null;
          arweave_url?: string | null;
          integrity_verified?: boolean;
          published_at?: string;
          created_at?: string | null;
        };
        Relationships: [];
      };
      recovery_audit_logs: {
        Row: {
          id: number;
          audit_date: string;
          total_audited: number;
          successful_recoveries: number;
          failed_recoveries: number;
          hash_mismatches: number;
          signature_failures: number;
          source_breakdown: Json;
          errors: string[];
          created_at: string | null;
        };
        Insert: {
          id?: number;
          audit_date: string;
          total_audited: number;
          successful_recoveries: number;
          failed_recoveries: number;
          hash_mismatches: number;
          signature_failures: number;
          source_breakdown: Json;
          errors: string[];
          created_at?: string | null;
        };
        Update: {
          id?: number;
          audit_date?: string;
          total_audited?: number;
          successful_recoveries?: number;
          failed_recoveries?: number;
          hash_mismatches?: number;
          signature_failures?: number;
          source_breakdown?: Json;
          errors?: string[];
          created_at?: string | null;
        };
        Relationships: [];
      };
      recovery_audit_results: {
        Row: {
          id: number;
          audit_date: string;
          proof_id: string;
          original_hash: string;
          recovered_hash: string;
          hash_match: boolean;
          signature_valid: boolean;
          source: string;
          recovered_at: string;
          errors: string[];
          created_at: string | null;
        };
        Insert: {
          id?: number;
          audit_date: string;
          proof_id: string;
          original_hash: string;
          recovered_hash: string;
          hash_match: boolean;
          signature_valid: boolean;
          source: string;
          recovered_at: string;
          errors: string[];
          created_at?: string | null;
        };
        Update: {
          id?: number;
          audit_date?: string;
          proof_id?: string;
          original_hash?: string;
          recovered_hash?: string;
          hash_match?: boolean;
          signature_valid?: boolean;
          source?: string;
          recovered_at?: string;
          errors?: string[];
          created_at?: string | null;
        };
        Relationships: [];
      };
      recovery_audit_enhanced_logs: {
        Row: {
          id: number;
          audit_date: string;
          total_audited: number;
          successful_recoveries: number;
          failed_recoveries: number;
          hash_mismatches: number;
          signature_failures: number;
          cross_mirror_inconsistencies: number;
          average_recovery_time_ms: number;
          integrity_score: number;
          source_breakdown: Json;
          performance_metrics: Json;
          errors: string[];
          warnings: string[];
          created_at: string | null;
        };
        Insert: {
          id?: number;
          audit_date: string;
          total_audited: number;
          successful_recoveries: number;
          failed_recoveries: number;
          hash_mismatches: number;
          signature_failures: number;
          cross_mirror_inconsistencies: number;
          average_recovery_time_ms: number;
          integrity_score: number;
          source_breakdown: Json;
          performance_metrics: Json;
          errors: string[];
          warnings: string[];
          created_at?: string | null;
        };
        Update: {
          id?: number;
          audit_date?: string;
          total_audited?: number;
          successful_recoveries?: number;
          failed_recoveries?: number;
          hash_mismatches?: number;
          signature_failures?: number;
          cross_mirror_inconsistencies?: number;
          average_recovery_time_ms?: number;
          integrity_score?: number;
          source_breakdown?: Json;
          performance_metrics?: Json;
          errors?: string[];
          warnings?: string[];
          created_at?: string | null;
        };
        Relationships: [];
      };
      recovery_audit_enhanced_results: {
        Row: {
          id: number;
          audit_date: string;
          proof_id: string;
          original_hash: string;
          recovered_hash: string;
          hash_match: boolean;
          signature_valid: boolean;
          source: string;
          recovered_at: string;
          recovery_time_ms: number;
          errors: string[];
          warnings: string[];
          cross_mirror_consistent: boolean;
          integrity_score: number;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          audit_date: string;
          proof_id: string;
          original_hash: string;
          recovered_hash: string;
          hash_match: boolean;
          signature_valid: boolean;
          source: string;
          recovered_at: string;
          recovery_time_ms: number;
          errors: string[];
          warnings: string[];
          cross_mirror_consistent: boolean;
          integrity_score: number;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          audit_date?: string;
          proof_id?: string;
          original_hash?: string;
          recovered_hash?: string;
          hash_match?: boolean;
          signature_valid?: boolean;
          source?: string;
          recovered_at?: string;
          recovery_time_ms?: number;
          errors?: string[];
          warnings?: string[];
          cross_mirror_consistent?: boolean;
          integrity_score?: number;
          created_at?: string | null;
        };
        Relationships: [];
      };
      recovery_audit_cross_mirror: {
        Row: {
          id: number;
          audit_date: string;
          proof_id: string;
          sources: Json;
          consistent: boolean;
          consensus_hash: string | null;
          discrepancies: Json;
          created_at: string | null;
        };
        Insert: {
          id?: number;
          audit_date: string;
          proof_id: string;
          sources: Json;
          consistent: boolean;
          consensus_hash?: string | null;
          discrepancies: Json;
          created_at?: string | null;
        };
        Update: {
          id?: number;
          audit_date?: string;
          proof_id?: string;
          sources?: Json;
          consistent?: boolean;
          consensus_hash?: string | null;
          discrepancies?: Json;
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

type PublicSchema = Database[Extract<keyof Database, "public">];

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    ? (PublicSchema["Tables"] & PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  PublicTableNameOrOptions extends keyof PublicSchema["Tables"] | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  PublicEnumNameOrOptions extends keyof PublicSchema["Enums"] | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never;

// Convenience types for your specific tables
export type AppUser = Tables<"app_users">;
export type AppUserInsert = TablesInsert<"app_users">;
export type AppUserUpdate = TablesUpdate<"app_users">;

export type Billing = Tables<"billing">;
export type BillingInsert = TablesInsert<"billing">;
export type BillingUpdate = TablesUpdate<"billing">;

export type Proof = Tables<"proofs">;
export type ProofInsert = TablesInsert<"proofs">;
export type ProofUpdate = TablesUpdate<"proofs">;

export type Telemetry = Tables<"telemetry">;
export type TelemetryInsert = TablesInsert<"telemetry">;
export type TelemetryUpdate = TablesUpdate<"telemetry">;

export type TelemetryDaily = Tables<"telemetry_daily">;
export type TelemetryDailyInsert = TablesInsert<"telemetry_daily">;
export type TelemetryDailyUpdate = TablesUpdate<"telemetry_daily">;

export type BillingEventLog = Tables<"billing_event_logs">;
export type BillingEventLogInsert = TablesInsert<"billing_event_logs">;
export type BillingEventLogUpdate = TablesUpdate<"billing_event_logs">;

export type SnapshotMeta = Tables<"snapshot_meta">;
export type SnapshotMetaInsert = TablesInsert<"snapshot_meta">;
export type SnapshotMetaUpdate = TablesUpdate<"snapshot_meta">;
export type RecoveryAuditLog = Tables<"recovery_audit_logs">;
export type RecoveryAuditLogInsert = TablesInsert<"recovery_audit_logs">;
export type RecoveryAuditLogUpdate = TablesUpdate<"recovery_audit_logs">;
export type RecoveryAuditResult = Tables<"recovery_audit_results">;
export type RecoveryAuditResultInsert = TablesInsert<"recovery_audit_results">;
export type RecoveryAuditResultUpdate = TablesUpdate<"recovery_audit_results">;
export type RecoveryAuditEnhancedLog = Tables<"recovery_audit_enhanced_logs">;
export type RecoveryAuditEnhancedLogInsert = TablesInsert<"recovery_audit_enhanced_logs">;
export type RecoveryAuditEnhancedLogUpdate = TablesUpdate<"recovery_audit_enhanced_logs">;
export type RecoveryAuditEnhancedResult = Tables<"recovery_audit_enhanced_results">;
export type RecoveryAuditEnhancedResultInsert = TablesInsert<"recovery_audit_enhanced_results">;
export type RecoveryAuditEnhancedResultUpdate = TablesUpdate<"recovery_audit_enhanced_results">;
export type RecoveryAuditCrossMirror = Tables<"recovery_audit_cross_mirror">;
export type RecoveryAuditCrossMirrorInsert = TablesInsert<"recovery_audit_cross_mirror">;
export type RecoveryAuditCrossMirrorUpdate = TablesUpdate<"recovery_audit_cross_mirror">;
