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
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      chapters: {
        Row: {
          chapter_order: number | null
          character_count: number | null
          content_type: string
          created_at: string
          episode_id: string | null
          id: string
          is_orphaned: boolean | null
          original_text: string
          position: number | null
          processed_text: string | null
          processing_count: number | null
          project_id: string
          relative_to_episode: string | null
          title: string
          type: string
          updated_at: string
        }
        Insert: {
          chapter_order?: number | null
          character_count?: number | null
          content_type?: string
          created_at?: string
          episode_id?: string | null
          id?: string
          is_orphaned?: boolean | null
          original_text?: string
          position?: number | null
          processed_text?: string | null
          processing_count?: number | null
          project_id: string
          relative_to_episode?: string | null
          title: string
          type?: string
          updated_at?: string
        }
        Update: {
          chapter_order?: number | null
          character_count?: number | null
          content_type?: string
          created_at?: string
          episode_id?: string | null
          id?: string
          is_orphaned?: boolean | null
          original_text?: string
          position?: number | null
          processed_text?: string | null
          processing_count?: number | null
          project_id?: string
          relative_to_episode?: string | null
          title?: string
          type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chapters_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chapters_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      demo_projects: {
        Row: {
          content_type: string
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean
          original_language: string | null
          output_language: string | null
          output_medium: string | null
          purpose: string
          title: string
          updated_at: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          original_language?: string | null
          output_language?: string | null
          output_medium?: string | null
          purpose?: string
          title: string
          updated_at?: string
        }
        Update: {
          content_type?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean
          original_language?: string | null
          output_language?: string | null
          output_medium?: string | null
          purpose?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      edge_function_prompts: {
        Row: {
          created_at: string
          function_name: string
          id: string
          is_active: boolean
          is_system: boolean
          model: string
          name: string
          prompt_content: string
          provider: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          function_name: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          model?: string
          name: string
          prompt_content: string
          provider?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          function_name?: string
          id?: string
          is_active?: boolean
          is_system?: boolean
          model?: string
          name?: string
          prompt_content?: string
          provider?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      episodes: {
        Row: {
          chapter_ids: Json | null
          created_at: string
          description: string | null
          episode_order: number
          id: string
          original_content: string
          processed_content: string | null
          project_id: string
          sections: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          chapter_ids?: Json | null
          created_at?: string
          description?: string | null
          episode_order?: number
          id?: string
          original_content: string
          processed_content?: string | null
          project_id: string
          sections?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          chapter_ids?: Json | null
          created_at?: string
          description?: string | null
          episode_order?: number
          id?: string
          original_content?: string
          processed_content?: string | null
          project_id?: string
          sections?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "episodes_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      export_settings: {
        Row: {
          created_at: string
          format: string
          id: string
          settings: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          format: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          format?: string
          id?: string
          settings?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      project_collaborators: {
        Row: {
          created_at: string
          id: string
          invited_by: string
          project_id: string
          role: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_by: string
          project_id: string
          role?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_by?: string
          project_id?: string
          role?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_collaborators_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_invites: {
        Row: {
          created_at: string | null
          created_by: string
          current_uses: number | null
          expires_at: string | null
          id: string
          invite_code: string
          max_uses: number | null
          project_id: string
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          invite_code: string
          max_uses?: number | null
          project_id: string
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          current_uses?: number | null
          expires_at?: string | null
          id?: string
          invite_code?: string
          max_uses?: number | null
          project_id?: string
          role?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "project_invites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          content_type: string
          created_at: string
          description: string | null
          generated_prompt: string | null
          generated_summary: string | null
          id: string
          is_demo: boolean | null
          original_demo_project_id: string | null
          original_language: string | null
          output_language: string | null
          output_medium: string | null
          purpose: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content_type: string
          created_at?: string
          description?: string | null
          generated_prompt?: string | null
          generated_summary?: string | null
          id?: string
          is_demo?: boolean | null
          original_demo_project_id?: string | null
          original_language?: string | null
          output_language?: string | null
          output_medium?: string | null
          purpose?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          description?: string | null
          generated_prompt?: string | null
          generated_summary?: string | null
          id?: string
          is_demo?: boolean | null
          original_demo_project_id?: string | null
          original_language?: string | null
          output_language?: string | null
          output_medium?: string | null
          purpose?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_original_demo_project_id_fkey"
            columns: ["original_demo_project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      prompt_templates: {
        Row: {
          category: string
          created_at: string
          id: string
          input_type: string
          is_system: boolean
          name: string
          output_type: string
          template_content: string
          updated_at: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          input_type: string
          is_system?: boolean
          name: string
          output_type: string
          template_content: string
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          input_type?: string
          is_system?: boolean
          name?: string
          output_type?: string
          template_content?: string
          updated_at?: string
        }
        Relationships: []
      }
      prompts: {
        Row: {
          category: string
          content: string
          created_at: string
          id: string
          is_default: boolean | null
          name: string
          original_template_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category?: string
          content: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name: string
          original_template_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          content?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          name?: string
          original_template_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      script_versions: {
        Row: {
          content: string
          created_at: string
          created_by: string
          episode_id: string
          id: string
          is_current: boolean
          version_number: number
        }
        Insert: {
          content: string
          created_at?: string
          created_by: string
          episode_id: string
          id?: string
          is_current?: boolean
          version_number: number
        }
        Update: {
          content?: string
          created_at?: string
          created_by?: string
          episode_id?: string
          id?: string
          is_current?: boolean
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "script_versions_episode_id_fkey"
            columns: ["episode_id"]
            isOneToOne: false
            referencedRelation: "episodes"
            referencedColumns: ["id"]
          },
        ]
      }
      shot_images: {
        Row: {
          created_at: string
          id: string
          image_order: number
          image_type: string
          image_url: string
          project_id: string
          prompt_used: string | null
          shot_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_order?: number
          image_type?: string
          image_url: string
          project_id: string
          prompt_used?: string | null
          shot_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_order?: number
          image_type?: string
          image_url?: string
          project_id?: string
          prompt_used?: string | null
          shot_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      shots: {
        Row: {
          camera_movement: string | null
          camera_movement_description: string | null
          chapter_id: string
          created_at: string
          end_position: number
          generated_description: string | null
          id: string
          project_id: string
          shot_order: number
          shot_type: string
          source_text: string
          source_type: string
          start_position: number
          updated_at: string
          user_description: string | null
        }
        Insert: {
          camera_movement?: string | null
          camera_movement_description?: string | null
          chapter_id: string
          created_at?: string
          end_position: number
          generated_description?: string | null
          id?: string
          project_id: string
          shot_order?: number
          shot_type?: string
          source_text: string
          source_type?: string
          start_position: number
          updated_at?: string
          user_description?: string | null
        }
        Update: {
          camera_movement?: string | null
          camera_movement_description?: string | null
          chapter_id?: string
          created_at?: string
          end_position?: number
          generated_description?: string | null
          id?: string
          project_id?: string
          shot_order?: number
          shot_type?: string
          source_text?: string
          source_type?: string
          start_position?: number
          updated_at?: string
          user_description?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_project_invite: {
        Args: { invite_code: string }
        Returns: Json
      }
      can_user_access_episode: {
        Args: { episode_id_param: string }
        Returns: boolean
      }
      can_user_access_project: {
        Args: { project_id_param: string }
        Returns: boolean
      }
      can_user_access_project_safe: {
        Args: { project_id_param: string }
        Returns: boolean
      }
      can_user_view_project_collaborators: {
        Args: { project_id_param: string }
        Returns: boolean
      }
      debug_auth_state: {
        Args: Record<PropertyKey, never>
        Returns: Json
      }
      fix_demo_project_episode_references: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      fix_demo_projects_comprehensive: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_user_accessible_projects: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_project_owner: {
        Args: { project_id_param: string }
        Returns: boolean
      }
      migrate_local_project_to_db: {
        Args: {
          p_content_type?: string
          p_description?: string
          p_title: string
          p_user_id?: string
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
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
      app_role: ["admin", "moderator", "user"],
    },
  },
} as const
