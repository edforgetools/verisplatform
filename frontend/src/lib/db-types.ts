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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      acceptance_state_log: {
        Row: {
          actor_ip: unknown
          actor_user_agent: string | null
          created_at: string
          from_state: string
          id: string
          notes: string | null
          proof_id: string
          timestamp: string
          to_state: string
        }
        Insert: {
          actor_ip?: unknown
          actor_user_agent?: string | null
          created_at?: string
          from_state: string
          id?: string
          notes?: string | null
          proof_id: string
          timestamp?: string
          to_state: string
        }
        Update: {
          actor_ip?: unknown
          actor_user_agent?: string | null
          created_at?: string
          from_state?: string
          id?: string
          notes?: string | null
          proof_id?: string
          timestamp?: string
          to_state?: string
        }
        Relationships: [
          {
            foreignKeyName: "acceptance_state_log_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: false
            referencedRelation: "proofs"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          created_at: string | null
          email: string
          role: string | null
          stripe_customer_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          role?: string | null
          stripe_customer_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          role?: string | null
          stripe_customer_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      billing: {
        Row: {
          status: string | null
          stripe_subscription_id: string | null
          tier: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          status?: string | null
          stripe_subscription_id?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          status?: string | null
          stripe_subscription_id?: string | null
          tier?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      billing_event_logs: {
        Row: {
          event_id: string
          event_type: string
          processed_at: string
          stripe_subscription_id: string | null
          user_id: string | null
        }
        Insert: {
          event_id: string
          event_type: string
          processed_at?: string
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Update: {
          event_id?: string
          event_type?: string
          processed_at?: string
          stripe_subscription_id?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      proof_attachments: {
        Row: {
          created_at: string
          description: string | null
          file_name: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          proof_id: string
          s3_key: string | null
          sha256: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          file_name: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          proof_id: string
          s3_key?: string | null
          sha256?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          file_name?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          proof_id?: string
          s3_key?: string | null
          sha256?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proof_attachments_proof_id_fkey"
            columns: ["proof_id"]
            isOneToOne: false
            referencedRelation: "proofs"
            referencedColumns: ["id"]
          },
        ]
      }
      proofs: {
        Row: {
          acceptance_status: string | null
          accepted_at: string | null
          accepted_by_ip: unknown
          accepted_by_user_agent: string | null
          anchor_txid: string | null
          created_at: string | null
          declined_at: string | null
          declined_reason: string | null
          expired_at: string | null
          file_name: string
          hash_full: string
          hash_prefix: string
          id: string
          project: string | null
          proof_json: Json | null
          recipient_email: string | null
          sent_at: string | null
          signature: string
          timestamp: string
          user_id: string
          version: number
          viewed_at: string | null
          visibility: string
        }
        Insert: {
          acceptance_status?: string | null
          accepted_at?: string | null
          accepted_by_ip?: unknown
          accepted_by_user_agent?: string | null
          anchor_txid?: string | null
          created_at?: string | null
          declined_at?: string | null
          declined_reason?: string | null
          expired_at?: string | null
          file_name: string
          hash_full: string
          hash_prefix: string
          id?: string
          project?: string | null
          proof_json?: Json | null
          recipient_email?: string | null
          sent_at?: string | null
          signature: string
          timestamp: string
          user_id: string
          version?: number
          viewed_at?: string | null
          visibility?: string
        }
        Update: {
          acceptance_status?: string | null
          accepted_at?: string | null
          accepted_by_ip?: unknown
          accepted_by_user_agent?: string | null
          anchor_txid?: string | null
          created_at?: string | null
          declined_at?: string | null
          declined_reason?: string | null
          expired_at?: string | null
          file_name?: string
          hash_full?: string
          hash_prefix?: string
          id?: string
          project?: string | null
          proof_json?: Json | null
          recipient_email?: string | null
          sent_at?: string | null
          signature?: string
          timestamp?: string
          user_id?: string
          version?: number
          viewed_at?: string | null
          visibility?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
