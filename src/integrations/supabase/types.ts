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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      divisions: {
        Row: {
          active: boolean
          created_at: string
          description: string
          focus_areas: string[]
          id: string
          lead_name: string | null
          name: string
          short_name: string
          slug: string
          sort_order: number
          tagline: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string
          focus_areas?: string[]
          id?: string
          lead_name?: string | null
          name: string
          short_name: string
          slug: string
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string
          focus_areas?: string[]
          id?: string
          lead_name?: string | null
          name?: string
          short_name?: string
          slug?: string
          sort_order?: number
          tagline?: string
          updated_at?: string
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          created_at: string
          created_by: string | null
          file_name: string | null
          format: string
          id: string
          inserted: number
          rejected: number
          skipped: number
          status: string
          total: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          format: string
          id?: string
          inserted?: number
          rejected?: number
          skipped?: number
          status?: string
          total?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          file_name?: string | null
          format?: string
          id?: string
          inserted?: number
          rejected?: number
          skipped?: number
          status?: string
          total?: number
        }
        Relationships: []
      }
      import_records: {
        Row: {
          batch_id: string
          created_at: string
          id: string
          message: string | null
          outcome: string
          publication_id: string | null
          raw: Json | null
          row_number: number
          source_id: string | null
          title: string | null
        }
        Insert: {
          batch_id: string
          created_at?: string
          id?: string
          message?: string | null
          outcome: string
          publication_id?: string | null
          raw?: Json | null
          row_number: number
          source_id?: string | null
          title?: string | null
        }
        Update: {
          batch_id?: string
          created_at?: string
          id?: string
          message?: string | null
          outcome?: string
          publication_id?: string | null
          raw?: Json | null
          row_number?: number
          source_id?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "import_records_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "import_records_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      news: {
        Row: {
          body: string
          created_at: string
          division_id: string | null
          id: string
          image_url: string | null
          published: boolean
          published_at: string
          slug: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          body?: string
          created_at?: string
          division_id?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string
          slug: string
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          body?: string
          created_at?: string
          division_id?: string | null
          id?: string
          image_url?: string | null
          published?: boolean
          published_at?: string
          slug?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "news_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
        ]
      }
      project_divisions: {
        Row: {
          division_id: string
          project_id: string
        }
        Insert: {
          division_id: string
          project_id: string
        }
        Update: {
          division_id?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_divisions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_divisions_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
        ]
      }
      project_researchers: {
        Row: {
          project_id: string
          researcher_id: string
        }
        Insert: {
          project_id: string
          researcher_id: string
        }
        Update: {
          project_id?: string
          researcher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_researchers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_researchers_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "researchers"
            referencedColumns: ["id"]
          },
        ]
      }
      projects: {
        Row: {
          created_at: string
          description: string
          featured: boolean
          id: string
          image_url: string | null
          links: Json
          published: boolean
          slug: string
          start_year: number | null
          status: string
          summary: string
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          links?: Json
          published?: boolean
          slug: string
          start_year?: number | null
          status?: string
          summary?: string
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          featured?: boolean
          id?: string
          image_url?: string | null
          links?: Json
          published?: boolean
          slug?: string
          start_year?: number | null
          status?: string
          summary?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      publication_authors: {
        Row: {
          author_name: string
          id: string
          position: number
          publication_id: string
          researcher_id: string | null
        }
        Insert: {
          author_name: string
          id?: string
          position: number
          publication_id: string
          researcher_id?: string | null
        }
        Update: {
          author_name?: string
          id?: string
          position?: number
          publication_id?: string
          researcher_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "publication_authors_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_authors_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "researchers"
            referencedColumns: ["id"]
          },
        ]
      }
      publication_divisions: {
        Row: {
          division_id: string
          publication_id: string
        }
        Insert: {
          division_id: string
          publication_id: string
        }
        Update: {
          division_id?: string
          publication_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "publication_divisions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "publication_divisions_publication_id_fkey"
            columns: ["publication_id"]
            isOneToOne: false
            referencedRelation: "publications"
            referencedColumns: ["id"]
          },
        ]
      }
      publications: {
        Row: {
          abstract: string
          created_at: string
          created_by: string | null
          doi: string | null
          external_url: string | null
          featured: boolean
          id: string
          import_batch_id: string | null
          pdf_name: string | null
          pdf_path: string | null
          pdf_size: number | null
          pub_date: string | null
          slug: string
          source_id: string | null
          source_system: string | null
          status: Database["public"]["Enums"]["pub_status"]
          title: string
          updated_at: string
          venue: string | null
          visibility: Database["public"]["Enums"]["pub_visibility"]
          year: number | null
        }
        Insert: {
          abstract?: string
          created_at?: string
          created_by?: string | null
          doi?: string | null
          external_url?: string | null
          featured?: boolean
          id?: string
          import_batch_id?: string | null
          pdf_name?: string | null
          pdf_path?: string | null
          pdf_size?: number | null
          pub_date?: string | null
          slug: string
          source_id?: string | null
          source_system?: string | null
          status?: Database["public"]["Enums"]["pub_status"]
          title: string
          updated_at?: string
          venue?: string | null
          visibility?: Database["public"]["Enums"]["pub_visibility"]
          year?: number | null
        }
        Update: {
          abstract?: string
          created_at?: string
          created_by?: string | null
          doi?: string | null
          external_url?: string | null
          featured?: boolean
          id?: string
          import_batch_id?: string | null
          pdf_name?: string | null
          pdf_path?: string | null
          pdf_size?: number | null
          pub_date?: string | null
          slug?: string
          source_id?: string | null
          source_system?: string | null
          status?: Database["public"]["Enums"]["pub_status"]
          title?: string
          updated_at?: string
          venue?: string | null
          visibility?: Database["public"]["Enums"]["pub_visibility"]
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "publications_import_batch_id_fkey"
            columns: ["import_batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      researcher_divisions: {
        Row: {
          division_id: string
          researcher_id: string
        }
        Insert: {
          division_id: string
          researcher_id: string
        }
        Update: {
          division_id?: string
          researcher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "researcher_divisions_division_id_fkey"
            columns: ["division_id"]
            isOneToOne: false
            referencedRelation: "divisions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "researcher_divisions_researcher_id_fkey"
            columns: ["researcher_id"]
            isOneToOne: false
            referencedRelation: "researchers"
            referencedColumns: ["id"]
          },
        ]
      }
      researchers: {
        Row: {
          active: boolean
          affiliations: string[]
          bio: string
          created_at: string
          id: string
          interests: string[]
          links: Json
          name: string
          photo_url: string | null
          role_title: string
          slug: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          affiliations?: string[]
          bio?: string
          created_at?: string
          id?: string
          interests?: string[]
          links?: Json
          name: string
          photo_url?: string | null
          role_title?: string
          slug: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          affiliations?: string[]
          bio?: string
          created_at?: string
          id?: string
          interests?: string[]
          links?: Json
          name?: string
          photo_url?: string | null
          role_title?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          granted_by: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          granted_by?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          granted_by?: string | null
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
      claim_initial_owner: { Args: never; Returns: boolean }
      grant_admin: { Args: { _email: string }; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_public_publication: { Args: { _id: string }; Returns: boolean }
      is_staff: { Args: { _user_id: string }; Returns: boolean }
      list_staff: {
        Args: never
        Returns: {
          created_at: string
          email: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }[]
      }
      owner_exists: { Args: never; Returns: boolean }
      revoke_admin: { Args: { _user_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "owner" | "admin"
      pub_status: "draft" | "in_review" | "published" | "archived"
      pub_visibility: "public" | "private"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      app_role: ["owner", "admin"],
      pub_status: ["draft", "in_review", "published", "archived"],
      pub_visibility: ["public", "private"],
    },
  },
} as const
