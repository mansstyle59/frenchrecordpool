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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_id: string
          created_at: string
          details: Json | null
          entity_id: string | null
          entity_label: string | null
          entity_type: string
          id: string
        }
        Insert: {
          action: string
          actor_id: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type: string
          id?: string
        }
        Update: {
          action?: string
          actor_id?: string
          created_at?: string
          details?: Json | null
          entity_id?: string | null
          entity_label?: string | null
          entity_type?: string
          id?: string
        }
        Relationships: []
      }
      artists: {
        Row: {
          banner_url: string | null
          beatport_url: string | null
          bio: string | null
          bio_long: string | null
          country: string | null
          created_at: string
          created_by: string | null
          featured: boolean
          genre: string | null
          id: string
          instagram_url: string | null
          kind: string
          name: string
          photo_url: string | null
          slug: string
          sort_order: number
          soundcloud_url: string | null
          spotify_url: string | null
          tagline: string | null
          tiktok_url: string | null
          updated_at: string
          user_id: string | null
          website_url: string | null
          youtube_url: string | null
        }
        Insert: {
          banner_url?: string | null
          beatport_url?: string | null
          bio?: string | null
          bio_long?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          featured?: boolean
          genre?: string | null
          id?: string
          instagram_url?: string | null
          kind?: string
          name: string
          photo_url?: string | null
          slug: string
          sort_order?: number
          soundcloud_url?: string | null
          spotify_url?: string | null
          tagline?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Update: {
          banner_url?: string | null
          beatport_url?: string | null
          bio?: string | null
          bio_long?: string | null
          country?: string | null
          created_at?: string
          created_by?: string | null
          featured?: boolean
          genre?: string | null
          id?: string
          instagram_url?: string | null
          kind?: string
          name?: string
          photo_url?: string | null
          slug?: string
          sort_order?: number
          soundcloud_url?: string | null
          spotify_url?: string | null
          tagline?: string | null
          tiktok_url?: string | null
          updated_at?: string
          user_id?: string | null
          website_url?: string | null
          youtube_url?: string | null
        }
        Relationships: []
      }
      cms_content: {
        Row: {
          created_at: string
          key: string
          published_at: string | null
          published_by: string | null
          type: string
          updated_at: string
          updated_by: string | null
          value_draft: Json | null
          value_published: Json | null
        }
        Insert: {
          created_at?: string
          key: string
          published_at?: string | null
          published_by?: string | null
          type: string
          updated_at?: string
          updated_by?: string | null
          value_draft?: Json | null
          value_published?: Json | null
        }
        Update: {
          created_at?: string
          key?: string
          published_at?: string | null
          published_by?: string | null
          type?: string
          updated_at?: string
          updated_by?: string | null
          value_draft?: Json | null
          value_published?: Json | null
        }
        Relationships: []
      }
      cms_content_versions: {
        Row: {
          action: string
          content_key: string
          created_at: string
          created_by: string | null
          id: string
          value: Json | null
        }
        Insert: {
          action: string
          content_key: string
          created_at?: string
          created_by?: string | null
          id?: string
          value?: Json | null
        }
        Update: {
          action?: string
          content_key?: string
          created_at?: string
          created_by?: string | null
          id?: string
          value?: Json | null
        }
        Relationships: []
      }
      downloads: {
        Row: {
          downloaded_at: string
          id: string
          track_id: string
          user_id: string
        }
        Insert: {
          downloaded_at?: string
          id?: string
          track_id: string
          user_id: string
        }
        Update: {
          downloaded_at?: string
          id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "downloads_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          created_at: string
          id: string
          track_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          track_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          track_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_track_id_fkey"
            columns: ["track_id"]
            isOneToOne: false
            referencedRelation: "tracks"
            referencedColumns: ["id"]
          },
        ]
      }
      home_widgets: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          position: number
          type: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          position?: number
          type: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          position?: number
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          data: Json | null
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          data?: Json | null
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      popups: {
        Row: {
          accent_color: string
          audience: string
          bg_color: string
          body: string | null
          created_at: string
          created_by: string | null
          cta_label: string | null
          cta_url: string | null
          devices: string
          ends_at: string | null
          frequency: string
          id: string
          image_url: string | null
          is_active: boolean
          layout: string
          name: string
          pages: string[]
          priority: number
          starts_at: string | null
          text_color: string
          title: string | null
          trigger_type: string
          trigger_value: number
          updated_at: string
        }
        Insert: {
          accent_color?: string
          audience?: string
          bg_color?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          devices?: string
          ends_at?: string | null
          frequency?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          layout?: string
          name: string
          pages?: string[]
          priority?: number
          starts_at?: string | null
          text_color?: string
          title?: string | null
          trigger_type?: string
          trigger_value?: number
          updated_at?: string
        }
        Update: {
          accent_color?: string
          audience?: string
          bg_color?: string
          body?: string | null
          created_at?: string
          created_by?: string | null
          cta_label?: string | null
          cta_url?: string | null
          devices?: string
          ends_at?: string | null
          frequency?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          layout?: string
          name?: string
          pages?: string[]
          priority?: number
          starts_at?: string | null
          text_color?: string
          title?: string | null
          trigger_type?: string
          trigger_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          dj_name: string | null
          email: string | null
          id: string
          is_blocked: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          dj_name?: string | null
          email?: string | null
          id?: string
          is_blocked?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          dj_name?: string | null
          email?: string | null
          id?: string
          is_blocked?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      promo_codes: {
        Row: {
          allowed_plan_ids: string[] | null
          code: string
          created_at: string
          created_by: string | null
          discount_type: Database["public"]["Enums"]["promo_discount_type"]
          discount_value: number | null
          expires_at: string | null
          id: string
          is_active: boolean
          max_uses: number | null
          notes: string | null
          per_user_limit: number
          updated_at: string
          uses_count: number
        }
        Insert: {
          allowed_plan_ids?: string[] | null
          code: string
          created_at?: string
          created_by?: string | null
          discount_type: Database["public"]["Enums"]["promo_discount_type"]
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          notes?: string | null
          per_user_limit?: number
          updated_at?: string
          uses_count?: number
        }
        Update: {
          allowed_plan_ids?: string[] | null
          code?: string
          created_at?: string
          created_by?: string | null
          discount_type?: Database["public"]["Enums"]["promo_discount_type"]
          discount_value?: number | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          max_uses?: number | null
          notes?: string | null
          per_user_limit?: number
          updated_at?: string
          uses_count?: number
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          granted_until: string | null
          id: string
          plan_id: string | null
          promo_code_id: string
          redeemed_at: string
          user_id: string
        }
        Insert: {
          granted_until?: string | null
          id?: string
          plan_id?: string | null
          promo_code_id: string
          redeemed_at?: string
          user_id: string
        }
        Update: {
          granted_until?: string | null
          id?: string
          plan_id?: string | null
          promo_code_id?: string
          redeemed_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      site_branding: {
        Row: {
          dark_accent: string
          dark_background: string
          dark_border: string
          dark_card: string
          dark_foreground: string
          dark_muted: string
          dark_primary: string
          favicon_url: string | null
          font_body: string
          font_display: string
          footer_text: string | null
          hero_subtitle: string | null
          hero_title: string | null
          id: string
          light_accent: string
          light_background: string
          light_border: string
          light_card: string
          light_foreground: string
          light_muted: string
          light_primary: string
          logo_url: string | null
          radius: string
          site_name: string
          tagline: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          dark_accent?: string
          dark_background?: string
          dark_border?: string
          dark_card?: string
          dark_foreground?: string
          dark_muted?: string
          dark_primary?: string
          favicon_url?: string | null
          font_body?: string
          font_display?: string
          footer_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          light_accent?: string
          light_background?: string
          light_border?: string
          light_card?: string
          light_foreground?: string
          light_muted?: string
          light_primary?: string
          logo_url?: string | null
          radius?: string
          site_name?: string
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          dark_accent?: string
          dark_background?: string
          dark_border?: string
          dark_card?: string
          dark_foreground?: string
          dark_muted?: string
          dark_primary?: string
          favicon_url?: string | null
          font_body?: string
          font_display?: string
          footer_text?: string | null
          hero_subtitle?: string | null
          hero_title?: string | null
          id?: string
          light_accent?: string
          light_background?: string
          light_border?: string
          light_card?: string
          light_foreground?: string
          light_muted?: string
          light_primary?: string
          logo_url?: string | null
          radius?: string
          site_name?: string
          tagline?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      subscription_plans: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          features: Json
          id: string
          interval: string
          is_active: boolean
          name: string
          price_cents: number
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          name: string
          price_cents?: number
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          features?: Json
          id?: string
          interval?: string
          is_active?: boolean
          name?: string
          price_cents?: number
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          created_at: string
          current_period_end: string | null
          id: string
          plan: string
          plan_id: string | null
          status: string
          stripe_customer_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          current_period_end?: string | null
          id?: string
          plan?: string
          plan_id?: string | null
          status?: string
          stripe_customer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "subscription_plans"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          is_admin: boolean
          sender_id: string
          thread_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_admin?: boolean
          sender_id: string
          thread_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_admin?: boolean
          sender_id?: string
          thread_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "support_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      support_threads: {
        Row: {
          closed: boolean
          created_at: string
          id: string
          last_message_at: string
          subject: string | null
          unread_for_admin: boolean
          unread_for_user: boolean
          user_id: string
        }
        Insert: {
          closed?: boolean
          created_at?: string
          id?: string
          last_message_at?: string
          subject?: string | null
          unread_for_admin?: boolean
          unread_for_user?: boolean
          user_id: string
        }
        Update: {
          closed?: boolean
          created_at?: string
          id?: string
          last_message_at?: string
          subject?: string | null
          unread_for_admin?: boolean
          unread_for_user?: boolean
          user_id?: string
        }
        Relationships: []
      }
      track_revisions: {
        Row: {
          created_at: string
          id: string
          payload: Json
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_by: string
          track_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          payload?: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by: string
          track_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          payload?: Json
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_by?: string
          track_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      tracks: {
        Row: {
          acapella_url: string | null
          artist: string
          artist_id: string | null
          audio_format: string | null
          audio_url: string | null
          bpm: number | null
          cover_url: string | null
          created_at: string
          created_by: string | null
          download_url: string | null
          downloads: number | null
          duration: string | null
          featured_artists: string[] | null
          file_size_bytes: number | null
          genre: string
          id: string
          instrumental_url: string | null
          isrc: string | null
          label: string | null
          mood: string | null
          musical_key: string | null
          preview_url: string | null
          producer: string | null
          rejection_reason: string | null
          release_date: string | null
          release_year: number | null
          remixer_ids: string[] | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          subgenre: string | null
          submitted_by: string | null
          tags: string[] | null
          title: string
          updated_at: string
          version: string | null
        }
        Insert: {
          acapella_url?: string | null
          artist: string
          artist_id?: string | null
          audio_format?: string | null
          audio_url?: string | null
          bpm?: number | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          download_url?: string | null
          downloads?: number | null
          duration?: string | null
          featured_artists?: string[] | null
          file_size_bytes?: number | null
          genre: string
          id?: string
          instrumental_url?: string | null
          isrc?: string | null
          label?: string | null
          mood?: string | null
          musical_key?: string | null
          preview_url?: string | null
          producer?: string | null
          rejection_reason?: string | null
          release_date?: string | null
          release_year?: number | null
          remixer_ids?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subgenre?: string | null
          submitted_by?: string | null
          tags?: string[] | null
          title: string
          updated_at?: string
          version?: string | null
        }
        Update: {
          acapella_url?: string | null
          artist?: string
          artist_id?: string | null
          audio_format?: string | null
          audio_url?: string | null
          bpm?: number | null
          cover_url?: string | null
          created_at?: string
          created_by?: string | null
          download_url?: string | null
          downloads?: number | null
          duration?: string | null
          featured_artists?: string[] | null
          file_size_bytes?: number | null
          genre?: string
          id?: string
          instrumental_url?: string | null
          isrc?: string | null
          label?: string | null
          mood?: string | null
          musical_key?: string | null
          preview_url?: string | null
          producer?: string | null
          rejection_reason?: string | null
          release_date?: string | null
          release_year?: number | null
          remixer_ids?: string[] | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          subgenre?: string | null
          submitted_by?: string | null
          tags?: string[] | null
          title?: string
          updated_at?: string
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tracks_artist_id_fkey"
            columns: ["artist_id"]
            isOneToOne: false
            referencedRelation: "artists"
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
          role?: Database["public"]["Enums"]["app_role"]
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
    }
    Views: {
      cms_content_public: {
        Row: {
          key: string | null
          published_at: string | null
          type: string | null
          value: Json | null
        }
        Insert: {
          key?: string | null
          published_at?: string | null
          type?: string | null
          value?: Json | null
        }
        Update: {
          key?: string | null
          published_at?: string | null
          type?: string | null
          value?: Json | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_assign_plan: {
        Args: { _months?: number; _plan_id: string; _user_id: string }
        Returns: undefined
      }
      admin_cancel_subscription: {
        Args: { _user_id: string }
        Returns: undefined
      }
      admin_clear_support_thread: {
        Args: { _thread_id: string }
        Returns: undefined
      }
      admin_delete_support_thread: {
        Args: { _thread_id: string }
        Returns: undefined
      }
      admin_delete_track: { Args: { _id: string }; Returns: undefined }
      admin_delete_user: { Args: { _user_id: string }; Returns: undefined }
      admin_review_track: {
        Args: {
          _decision: string
          _id: string
          _patch?: Json
          _reason?: string
        }
        Returns: undefined
      }
      admin_set_user_access: {
        Args: { _grant: boolean; _user_id: string }
        Returns: undefined
      }
      admin_set_user_blocked: {
        Args: { _blocked: boolean; _user_id: string }
        Returns: undefined
      }
      admin_upsert_track: {
        Args: { _id?: string; _track: Json }
        Returns: string
      }
      cancel_my_subscription: { Args: never; Returns: undefined }
      cms_publish: { Args: { _keys?: string[] }; Returns: number }
      cms_restore_version: { Args: { _version_id: string }; Returns: undefined }
      cms_revert_draft: { Args: { _key: string }; Returns: undefined }
      cms_save_draft: {
        Args: { _key: string; _type: string; _value: Json }
        Returns: undefined
      }
      dj_submit_track: { Args: { _track: Json }; Returns: string }
      dj_update_own_track: {
        Args: { _id: string; _track: Json }
        Returns: undefined
      }
      has_active_subscription: { Args: { _user_id: string }; Returns: boolean }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      my_download_history: {
        Args: never
        Returns: {
          artist: string
          audio_format: string
          audio_url: string
          bpm: number
          cover_url: string
          created_at: string
          download_id: string
          download_url: string
          downloaded_at: string
          duration: string
          file_size_bytes: number
          genre: string
          musical_key: string
          title: string
          track_id: string
          version: string
        }[]
      }
      notify_user: {
        Args: {
          _body: string
          _data: Json
          _link: string
          _title: string
          _type: string
          _user_id: string
        }
        Returns: undefined
      }
      redeem_promo_code: {
        Args: { _code: string; _plan_id?: string }
        Returns: Json
      }
      resolve_or_create_artist: {
        Args: { _kind?: string; _name: string }
        Returns: string
      }
      slugify: { Args: { _v: string }; Returns: string }
    }
    Enums: {
      app_role: "admin" | "client" | "dj"
      promo_discount_type: "percent" | "fixed" | "free_period" | "full_access"
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
      app_role: ["admin", "client", "dj"],
      promo_discount_type: ["percent", "fixed", "free_period", "full_access"],
    },
  },
} as const
