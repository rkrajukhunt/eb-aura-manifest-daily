export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      affirmations: {
        Row: {
          created_at: string;
          feeling: string | null;
          goal_area: string | null;
          id: string;
          kind: Database['public']['Enums']['affirmation_kind'];
          revealed_at: string | null;
          saved_at: string | null;
          status: Database['public']['Enums']['affirmation_status'];
          technique: string | null;
          text: string;
          tone: string | null;
          updated_at: string;
          user_id: string;
          why_line: string | null;
        };
        Insert: {
          created_at?: string;
          feeling?: string | null;
          goal_area?: string | null;
          id?: string;
          kind: Database['public']['Enums']['affirmation_kind'];
          revealed_at?: string | null;
          saved_at?: string | null;
          status?: Database['public']['Enums']['affirmation_status'];
          technique?: string | null;
          text: string;
          tone?: string | null;
          updated_at?: string;
          user_id: string;
          why_line?: string | null;
        };
        Update: {
          created_at?: string;
          feeling?: string | null;
          goal_area?: string | null;
          id?: string;
          kind?: Database['public']['Enums']['affirmation_kind'];
          revealed_at?: string | null;
          saved_at?: string | null;
          status?: Database['public']['Enums']['affirmation_status'];
          technique?: string | null;
          text?: string;
          tone?: string | null;
          updated_at?: string;
          user_id?: string;
          why_line?: string | null;
        };
        Relationships: [];
      };
      exact_phrases: {
        Row: {
          created_at: string;
          id: string;
          last_used_at: string | null;
          memory_item_id: string | null;
          phrase: string;
          source: Database['public']['Enums']['memory_source'];
          use_count: number;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          last_used_at?: string | null;
          memory_item_id?: string | null;
          phrase: string;
          source: Database['public']['Enums']['memory_source'];
          use_count?: number;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          last_used_at?: string | null;
          memory_item_id?: string | null;
          phrase?: string;
          source?: Database['public']['Enums']['memory_source'];
          use_count?: number;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'exact_phrases_memory_item_id_fkey';
            columns: ['memory_item_id'];
            isOneToOne: false;
            referencedRelation: 'memory_items';
            referencedColumns: ['id'];
          },
        ];
      };
      generation_jobs: {
        Row: {
          artifact: Database['public']['Enums']['job_artifact'];
          attempt: number;
          created_at: string;
          error: string | null;
          finished_at: string | null;
          id: string;
          idempotency_key: string | null;
          input: Json | null;
          latency_ms: number | null;
          moment_id: string | null;
          status: Database['public']['Enums']['job_status'];
          user_id: string;
        };
        Insert: {
          artifact: Database['public']['Enums']['job_artifact'];
          attempt?: number;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          input?: Json | null;
          latency_ms?: number | null;
          moment_id?: string | null;
          status?: Database['public']['Enums']['job_status'];
          user_id: string;
        };
        Update: {
          artifact?: Database['public']['Enums']['job_artifact'];
          attempt?: number;
          created_at?: string;
          error?: string | null;
          finished_at?: string | null;
          id?: string;
          idempotency_key?: string | null;
          input?: Json | null;
          latency_ms?: number | null;
          moment_id?: string | null;
          status?: Database['public']['Enums']['job_status'];
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'generation_jobs_moment_id_fkey';
            columns: ['moment_id'];
            isOneToOne: false;
            referencedRelation: 'moments';
            referencedColumns: ['id'];
          },
        ];
      };
      memory_items: {
        Row: {
          category: Database['public']['Enums']['memory_category'];
          content: string;
          created_at: string;
          deleted_at: string | null;
          emotional_weight: number;
          excluded: boolean;
          expires_at: string | null;
          id: string;
          last_used_at: string | null;
          source: Database['public']['Enums']['memory_source'];
          source_id: string | null;
          tier: Database['public']['Enums']['memory_tier'];
          updated_at: string;
          use_count: number;
          user_id: string;
          verbatim: string | null;
        };
        Insert: {
          category: Database['public']['Enums']['memory_category'];
          content: string;
          created_at?: string;
          deleted_at?: string | null;
          emotional_weight?: number;
          excluded?: boolean;
          expires_at?: string | null;
          id?: string;
          last_used_at?: string | null;
          source: Database['public']['Enums']['memory_source'];
          source_id?: string | null;
          tier: Database['public']['Enums']['memory_tier'];
          updated_at?: string;
          use_count?: number;
          user_id: string;
          verbatim?: string | null;
        };
        Update: {
          category?: Database['public']['Enums']['memory_category'];
          content?: string;
          created_at?: string;
          deleted_at?: string | null;
          emotional_weight?: number;
          excluded?: boolean;
          expires_at?: string | null;
          id?: string;
          last_used_at?: string | null;
          source?: Database['public']['Enums']['memory_source'];
          source_id?: string | null;
          tier?: Database['public']['Enums']['memory_tier'];
          updated_at?: string;
          use_count?: number;
          user_id?: string;
          verbatim?: string | null;
        };
        Relationships: [];
      };
      moments: {
        Row: {
          audio_path: string | null;
          body: string | null;
          completed_at: string | null;
          created_at: string;
          desire_text: string | null;
          duration_ms: number | null;
          favorited_at: string | null;
          id: string;
          milestone_day: number | null;
          played_at: string | null;
          qa_report: Json | null;
          refine_of: string | null;
          scheduled_for: string | null;
          status: Database['public']['Enums']['moment_status'];
          title: string | null;
          type: Database['public']['Enums']['moment_type'];
          updated_at: string;
          user_id: string;
          word_timings: Json | null;
        };
        Insert: {
          audio_path?: string | null;
          body?: string | null;
          completed_at?: string | null;
          created_at?: string;
          desire_text?: string | null;
          duration_ms?: number | null;
          favorited_at?: string | null;
          id?: string;
          milestone_day?: number | null;
          played_at?: string | null;
          qa_report?: Json | null;
          refine_of?: string | null;
          scheduled_for?: string | null;
          status?: Database['public']['Enums']['moment_status'];
          title?: string | null;
          type: Database['public']['Enums']['moment_type'];
          updated_at?: string;
          user_id: string;
          word_timings?: Json | null;
        };
        Update: {
          audio_path?: string | null;
          body?: string | null;
          completed_at?: string | null;
          created_at?: string;
          desire_text?: string | null;
          duration_ms?: number | null;
          favorited_at?: string | null;
          id?: string;
          milestone_day?: number | null;
          played_at?: string | null;
          qa_report?: Json | null;
          refine_of?: string | null;
          scheduled_for?: string | null;
          status?: Database['public']['Enums']['moment_status'];
          title?: string | null;
          type?: Database['public']['Enums']['moment_type'];
          updated_at?: string;
          user_id?: string;
          word_timings?: Json | null;
        };
        Relationships: [
          {
            foreignKeyName: 'moments_refine_of_fkey';
            columns: ['refine_of'];
            isOneToOne: false;
            referencedRelation: 'moments';
            referencedColumns: ['id'];
          },
        ];
      };
      never_include: {
        Row: {
          created_at: string;
          id: string;
          term: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          id?: string;
          term: string;
          user_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          term?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      onboarding_answers: {
        Row: {
          answer: Json | null;
          created_at: string;
          id: string;
          screen_id: string;
          skipped: boolean;
          user_id: string;
        };
        Insert: {
          answer?: Json | null;
          created_at?: string;
          id?: string;
          screen_id: string;
          skipped?: boolean;
          user_id: string;
        };
        Update: {
          answer?: Json | null;
          created_at?: string;
          id?: string;
          screen_id?: string;
          skipped?: boolean;
          user_id?: string;
        };
        Relationships: [];
      };
      people: {
        Row: {
          active: boolean;
          created_at: string;
          descriptor: string | null;
          id: string;
          name: string;
          updated_at: string;
          user_id: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          descriptor?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
          user_id: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          descriptor?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
          user_id?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          arrival_time: string | null;
          created_at: string;
          dream_city: string | null;
          dream_home: string | null;
          free_text_note: string | null;
          is_anonymous: boolean;
          last_active_at: string;
          name: string | null;
          onboarding_completed_at: string | null;
          self_description: string | null;
          struggle: string | null;
          timezone: string | null;
          updated_at: string;
          user_id: string;
          values: string[] | null;
          voice_id: string | null;
          work_feeling: Database['public']['Enums']['work_feeling'] | null;
        };
        Insert: {
          arrival_time?: string | null;
          created_at?: string;
          dream_city?: string | null;
          dream_home?: string | null;
          free_text_note?: string | null;
          is_anonymous?: boolean;
          last_active_at?: string;
          name?: string | null;
          onboarding_completed_at?: string | null;
          self_description?: string | null;
          struggle?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id: string;
          values?: string[] | null;
          voice_id?: string | null;
          work_feeling?: Database['public']['Enums']['work_feeling'] | null;
        };
        Update: {
          arrival_time?: string | null;
          created_at?: string;
          dream_city?: string | null;
          dream_home?: string | null;
          free_text_note?: string | null;
          is_anonymous?: boolean;
          last_active_at?: string;
          name?: string | null;
          onboarding_completed_at?: string | null;
          self_description?: string | null;
          struggle?: string | null;
          timezone?: string | null;
          updated_at?: string;
          user_id?: string;
          values?: string[] | null;
          voice_id?: string | null;
          work_feeling?: Database['public']['Enums']['work_feeling'] | null;
        };
        Relationships: [];
      };
      subscription_state: {
        Row: {
          created_at: string;
          entitlement: Database['public']['Enums']['entitlement'];
          expires_at: string | null;
          lapsed_at: string | null;
          last_event: string | null;
          last_event_at: string | null;
          period_type: Database['public']['Enums']['period_type'] | null;
          product_id: string | null;
          rc_app_user_id: string | null;
          updated_at: string;
          user_id: string;
          will_renew: boolean;
        };
        Insert: {
          created_at?: string;
          entitlement?: Database['public']['Enums']['entitlement'];
          expires_at?: string | null;
          lapsed_at?: string | null;
          last_event?: string | null;
          last_event_at?: string | null;
          period_type?: Database['public']['Enums']['period_type'] | null;
          product_id?: string | null;
          rc_app_user_id?: string | null;
          updated_at?: string;
          user_id: string;
          will_renew?: boolean;
        };
        Update: {
          created_at?: string;
          entitlement?: Database['public']['Enums']['entitlement'];
          expires_at?: string | null;
          lapsed_at?: string | null;
          last_event?: string | null;
          last_event_at?: string | null;
          period_type?: Database['public']['Enums']['period_type'] | null;
          product_id?: string | null;
          rc_app_user_id?: string | null;
          updated_at?: string;
          user_id?: string;
          will_renew?: boolean;
        };
        Relationships: [];
      };
      usage_credits: {
        Row: {
          manifest_used: number;
          user_id: string;
          week_start: string;
        };
        Insert: {
          manifest_used?: number;
          user_id: string;
          week_start: string;
        };
        Update: {
          manifest_used?: number;
          user_id?: string;
          week_start?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      expire_temporary_memory: { Args: never; Returns: number };
    };
    Enums: {
      affirmation_kind: 'daily' | 'guided';
      affirmation_status: 'candidate' | 'kept';
      entitlement: 'free' | 'premium';
      job_artifact:
        | 'letter'
        | 'daily'
        | 'ondemand'
        | 'refine'
        | 'affirmation_daily'
        | 'affirmation_guided'
        | 'milestone'
        | 'winback';
      job_status: 'queued' | 'running' | 'qa_failed' | 'retrying' | 'succeeded' | 'failed';
      memory_category:
        | 'identity'
        | 'dream'
        | 'person'
        | 'place_lifestyle'
        | 'struggle'
        | 'phrase'
        | 'milestone'
        | 'preference'
        | 'gratitude_ref'
        | 'temp_context';
      memory_source: 'onboarding' | 'gratitude' | 'refine' | 'manifest' | 'profile_edit' | 'system';
      memory_tier: 'permanent' | 'evolving' | 'temporary' | 'sensitive';
      moment_status: 'forming' | 'generating' | 'ready' | 'failed' | 'replaced';
      moment_type: 'letter' | 'daily' | 'ondemand' | 'milestone' | 'winback';
      period_type: 'trial' | 'normal';
      work_feeling: 'love_it' | 'fine_for_now' | 'ready_for_new' | 'building_side';
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      affirmation_kind: ['daily', 'guided'],
      affirmation_status: ['candidate', 'kept'],
      entitlement: ['free', 'premium'],
      job_artifact: [
        'letter',
        'daily',
        'ondemand',
        'refine',
        'affirmation_daily',
        'affirmation_guided',
        'milestone',
        'winback',
      ],
      job_status: ['queued', 'running', 'qa_failed', 'retrying', 'succeeded', 'failed'],
      memory_category: [
        'identity',
        'dream',
        'person',
        'place_lifestyle',
        'struggle',
        'phrase',
        'milestone',
        'preference',
        'gratitude_ref',
        'temp_context',
      ],
      memory_source: ['onboarding', 'gratitude', 'refine', 'manifest', 'profile_edit', 'system'],
      memory_tier: ['permanent', 'evolving', 'temporary', 'sensitive'],
      moment_status: ['forming', 'generating', 'ready', 'failed', 'replaced'],
      moment_type: ['letter', 'daily', 'ondemand', 'milestone', 'winback'],
      period_type: ['trial', 'normal'],
      work_feeling: ['love_it', 'fine_for_now', 'ready_for_new', 'building_side'],
    },
  },
} as const;
