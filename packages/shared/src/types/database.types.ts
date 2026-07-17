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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      expire_temporary_memory: { Args: never; Returns: number };
    };
    Enums: {
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
      work_feeling: ['love_it', 'fine_for_now', 'ready_for_new', 'building_side'],
    },
  },
} as const;
