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
      addresses: {
        Row: {
          apartment: string | null
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          phone: string | null
          postal_code: string
          province: string
          street: string
          updated_at: string
          user_id: string
        }
        Insert: {
          apartment?: string | null
          city: string
          country?: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          phone?: string | null
          postal_code: string
          province: string
          street: string
          updated_at?: string
          user_id: string
        }
        Update: {
          apartment?: string | null
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          phone?: string | null
          postal_code?: string
          province?: string
          street?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          description: string | null
          display_order: number
          id: string
          image_url: string | null
          is_active: boolean
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          display_order?: number
          id?: string
          image_url?: string | null
          is_active?: boolean
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      notification_preferences: {
        Row: {
          created_at: string
          email_enabled: boolean
          email_frequency: Database["public"]["Enums"]["email_frequency"]
          id: string
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          email_frequency?: Database["public"]["Enums"]["email_frequency"]
          id?: string
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          email_frequency?: Database["public"]["Enums"]["email_frequency"]
          id?: string
          push_enabled?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          order_id: string
          product_id: string
          product_image: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_id: string
          product_id: string
          product_image?: string | null
          product_name: string
          quantity: number
          unit_price: number
        }
        Update: {
          created_at?: string
          id?: string
          order_id?: string
          product_id?: string
          product_image?: string | null
          product_name?: string
          quantity?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          created_at: string
          id: string
          notes: string | null
          order_number: string
          shipping_address: Json
          status: Database["public"]["Enums"]["order_status"]
          total_amount: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          notes?: string | null
          order_number: string
          shipping_address: Json
          status?: Database["public"]["Enums"]["order_status"]
          total_amount: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          notes?: string | null
          order_number?: string
          shipping_address?: Json
          status?: Database["public"]["Enums"]["order_status"]
          total_amount?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      owned_plants: {
        Row: {
          common_name: string | null
          created_at: string
          id: string
          location_id: string | null
          location_text: string | null
          next_checkin_date: string | null
          nickname: string
          order_id: string | null
          order_item_id: string | null
          photos: string[] | null
          purchase_date: string | null
          scientific_name: string | null
          serial_code: string | null
          source_plant_id: string | null
          status: Database["public"]["Enums"]["plant_status"]
          tags: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          common_name?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          location_text?: string | null
          next_checkin_date?: string | null
          nickname: string
          order_id?: string | null
          order_item_id?: string | null
          photos?: string[] | null
          purchase_date?: string | null
          scientific_name?: string | null
          serial_code?: string | null
          source_plant_id?: string | null
          status?: Database["public"]["Enums"]["plant_status"]
          tags?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          common_name?: string | null
          created_at?: string
          id?: string
          location_id?: string | null
          location_text?: string | null
          next_checkin_date?: string | null
          nickname?: string
          order_id?: string | null
          order_item_id?: string | null
          photos?: string[] | null
          purchase_date?: string | null
          scientific_name?: string | null
          serial_code?: string | null
          source_plant_id?: string | null
          status?: Database["public"]["Enums"]["plant_status"]
          tags?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owned_plants_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "plant_locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owned_plants_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owned_plants_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owned_plants_source_plant_id_fkey"
            columns: ["source_plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_locations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      plant_notes: {
        Row: {
          content: string
          created_at: string
          id: string
          owned_plant_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          owned_plant_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          owned_plant_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_notes_owned_plant_id_fkey"
            columns: ["owned_plant_id"]
            isOneToOne: false
            referencedRelation: "owned_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_observations: {
        Row: {
          condition: Database["public"]["Enums"]["observation_condition"]
          created_at: string
          id: string
          notes: string | null
          observation_date: string
          owned_plant_id: string
          photos: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          condition?: Database["public"]["Enums"]["observation_condition"]
          created_at?: string
          id?: string
          notes?: string | null
          observation_date?: string
          owned_plant_id: string
          photos?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          condition?: Database["public"]["Enums"]["observation_condition"]
          created_at?: string
          id?: string
          notes?: string | null
          observation_date?: string
          owned_plant_id?: string
          photos?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_observations_owned_plant_id_fkey"
            columns: ["owned_plant_id"]
            isOneToOne: false
            referencedRelation: "owned_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plant_public_slugs: {
        Row: {
          created_at: string
          id: string
          is_public: boolean
          owned_plant_id: string
          slug: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_public?: boolean
          owned_plant_id: string
          slug: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_public?: boolean
          owned_plant_id?: string
          slug?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "plant_public_slugs_owned_plant_id_fkey"
            columns: ["owned_plant_id"]
            isOneToOne: true
            referencedRelation: "owned_plants"
            referencedColumns: ["id"]
          },
        ]
      }
      plants: {
        Row: {
          care_instructions: Json | null
          category_id: string | null
          climate_zones: string[] | null
          common_name: string | null
          container_size: string | null
          created_at: string
          curious_facts: Json | null
          description: string | null
          difficulty: Database["public"]["Enums"]["difficulty_level"] | null
          display_order: number
          exposure: string[] | null
          germination_date: string | null
          growth_rate: string | null
          hardiness_zone: string | null
          humidity: Database["public"]["Enums"]["humidity_level"] | null
          id: string
          images: string[] | null
          is_active: boolean
          is_featured: boolean
          is_in_stock: boolean | null
          mature_height: string | null
          mature_width: string | null
          meta_description: string | null
          meta_title: string | null
          min_temp_c: number | null
          name: string
          native_habitat: string | null
          notes: string | null
          origin_country: string | null
          origin_region: string | null
          plant_type: Database["public"]["Enums"]["plant_type"] | null
          plant_use: string[] | null
          price: number
          rarity: Database["public"]["Enums"]["rarity_level"] | null
          sale_price: number | null
          scientific_name: string | null
          short_description: string | null
          slug: string
          specifications: Json | null
          stock_qty: number
          sun_requirement: string | null
          temperature_range: string | null
          thumbnail_url: string | null
          updated_at: string
          water: Database["public"]["Enums"]["water_level"] | null
          water_requirement: string | null
        }
        Insert: {
          care_instructions?: Json | null
          category_id?: string | null
          climate_zones?: string[] | null
          common_name?: string | null
          container_size?: string | null
          created_at?: string
          curious_facts?: Json | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          display_order?: number
          exposure?: string[] | null
          germination_date?: string | null
          growth_rate?: string | null
          hardiness_zone?: string | null
          humidity?: Database["public"]["Enums"]["humidity_level"] | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          is_in_stock?: boolean | null
          mature_height?: string | null
          mature_width?: string | null
          meta_description?: string | null
          meta_title?: string | null
          min_temp_c?: number | null
          name: string
          native_habitat?: string | null
          notes?: string | null
          origin_country?: string | null
          origin_region?: string | null
          plant_type?: Database["public"]["Enums"]["plant_type"] | null
          plant_use?: string[] | null
          price?: number
          rarity?: Database["public"]["Enums"]["rarity_level"] | null
          sale_price?: number | null
          scientific_name?: string | null
          short_description?: string | null
          slug: string
          specifications?: Json | null
          stock_qty?: number
          sun_requirement?: string | null
          temperature_range?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          water?: Database["public"]["Enums"]["water_level"] | null
          water_requirement?: string | null
        }
        Update: {
          care_instructions?: Json | null
          category_id?: string | null
          climate_zones?: string[] | null
          common_name?: string | null
          container_size?: string | null
          created_at?: string
          curious_facts?: Json | null
          description?: string | null
          difficulty?: Database["public"]["Enums"]["difficulty_level"] | null
          display_order?: number
          exposure?: string[] | null
          germination_date?: string | null
          growth_rate?: string | null
          hardiness_zone?: string | null
          humidity?: Database["public"]["Enums"]["humidity_level"] | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          is_in_stock?: boolean | null
          mature_height?: string | null
          mature_width?: string | null
          meta_description?: string | null
          meta_title?: string | null
          min_temp_c?: number | null
          name?: string
          native_habitat?: string | null
          notes?: string | null
          origin_country?: string | null
          origin_region?: string | null
          plant_type?: Database["public"]["Enums"]["plant_type"] | null
          plant_use?: string[] | null
          price?: number
          rarity?: Database["public"]["Enums"]["rarity_level"] | null
          sale_price?: number | null
          scientific_name?: string | null
          short_description?: string | null
          slug?: string
          specifications?: Json | null
          stock_qty?: number
          sun_requirement?: string | null
          temperature_range?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          water?: Database["public"]["Enums"]["water_level"] | null
          water_requirement?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plants_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          filters: Json
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      shipping_zones: {
        Row: {
          base_cost: number
          country_code: string
          country_name: string
          created_at: string
          delivery_days_max: number
          delivery_days_min: number
          free_shipping_threshold: number | null
          id: string
          is_active: boolean
          per_item_cost: number
          updated_at: string
        }
        Insert: {
          base_cost?: number
          country_code: string
          country_name: string
          created_at?: string
          delivery_days_max?: number
          delivery_days_min?: number
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean
          per_item_cost?: number
          updated_at?: string
        }
        Update: {
          base_cost?: number
          country_code?: string
          country_name?: string
          created_at?: string
          delivery_days_max?: number
          delivery_days_min?: number
          free_shipping_threshold?: number | null
          id?: string
          is_active?: boolean
          per_item_cost?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          description: string | null
          id: string
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          key?: string
          updated_at?: string
          value?: Json
        }
        Relationships: []
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
      wishlist_items: {
        Row: {
          acquired_at: string | null
          acquired_owned_plant_id: string | null
          catalog_product_id: string | null
          created_at: string
          id: string
          image_url: string | null
          name: string
          notes: string | null
          notify_availability: boolean
          notify_price_drop: boolean
          price_max: number | null
          price_min: number | null
          priority: Database["public"]["Enums"]["wishlist_priority"]
          provider_name: string | null
          provider_url: string | null
          scientific_name: string | null
          source_preference: Database["public"]["Enums"]["wishlist_source"]
          status: Database["public"]["Enums"]["wishlist_status"]
          updated_at: string
          user_id: string
          variety_notes: string | null
        }
        Insert: {
          acquired_at?: string | null
          acquired_owned_plant_id?: string | null
          catalog_product_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name: string
          notes?: string | null
          notify_availability?: boolean
          notify_price_drop?: boolean
          price_max?: number | null
          price_min?: number | null
          priority?: Database["public"]["Enums"]["wishlist_priority"]
          provider_name?: string | null
          provider_url?: string | null
          scientific_name?: string | null
          source_preference?: Database["public"]["Enums"]["wishlist_source"]
          status?: Database["public"]["Enums"]["wishlist_status"]
          updated_at?: string
          user_id: string
          variety_notes?: string | null
        }
        Update: {
          acquired_at?: string | null
          acquired_owned_plant_id?: string | null
          catalog_product_id?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          name?: string
          notes?: string | null
          notify_availability?: boolean
          notify_price_drop?: boolean
          price_max?: number | null
          price_min?: number | null
          priority?: Database["public"]["Enums"]["wishlist_priority"]
          provider_name?: string | null
          provider_url?: string | null
          scientific_name?: string | null
          source_preference?: Database["public"]["Enums"]["wishlist_source"]
          status?: Database["public"]["Enums"]["wishlist_status"]
          updated_at?: string
          user_id?: string
          variety_notes?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_items_acquired_owned_plant_id_fkey"
            columns: ["acquired_owned_plant_id"]
            isOneToOne: false
            referencedRelation: "owned_plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wishlist_items_catalog_product_id_fkey"
            columns: ["catalog_product_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      wishlist_notifications: {
        Row: {
          created_at: string
          id: string
          is_read: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          wishlist_item_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_read?: boolean
          message: string
          title: string
          type: Database["public"]["Enums"]["notification_type"]
          user_id: string
          wishlist_item_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_read?: boolean
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["notification_type"]
          user_id?: string
          wishlist_item_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "wishlist_notifications_wishlist_item_id_fkey"
            columns: ["wishlist_item_id"]
            isOneToOne: false
            referencedRelation: "wishlist_items"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      create_owned_plants_from_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: number
      }
      generate_order_number: { Args: never; Returns: string }
      generate_plant_serial_code: { Args: never; Returns: string }
      generate_plant_slug: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_order_item_owner: { Args: { oi_order_id: string }; Returns: boolean }
      is_own_address: { Args: { a_user_id: string }; Returns: boolean }
      is_own_notification: { Args: { n_user_id: string }; Returns: boolean }
      is_own_order: { Args: { o_user_id: string }; Returns: boolean }
      is_own_owned_plant: { Args: { op_user_id: string }; Returns: boolean }
      is_own_plant_location: { Args: { pl_user_id: string }; Returns: boolean }
      is_own_profile: { Args: { p_user_id: string }; Returns: boolean }
      is_own_saved_search: { Args: { ss_user_id: string }; Returns: boolean }
      is_own_wishlist_item: { Args: { wi_user_id: string }; Returns: boolean }
      match_wishlist_to_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: number
      }
      owns_plant: { Args: { plant_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      difficulty_level: "easy" | "intermediate" | "advanced"
      email_frequency: "instant" | "daily" | "weekly"
      growth_speed: "slow" | "medium" | "fast"
      humidity_level: "low" | "medium" | "high"
      notification_type: "available" | "price_drop" | "similar"
      observation_condition: "healthy" | "okay" | "concern" | "critical"
      order_status: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
      plant_status: "alive" | "dormant" | "sick" | "removed"
      plant_type: "palm" | "fern" | "tree" | "cycad" | "shrub" | "other"
      rarity_level: "low" | "medium" | "high"
      water_level: "low" | "medium" | "high"
      wishlist_priority: "low" | "medium" | "high" | "urgent"
      wishlist_source: "frondaprima" | "any" | "specific"
      wishlist_status: "wishlist" | "looking" | "acquired"
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
      app_role: ["admin", "user"],
      difficulty_level: ["easy", "intermediate", "advanced"],
      email_frequency: ["instant", "daily", "weekly"],
      growth_speed: ["slow", "medium", "fast"],
      humidity_level: ["low", "medium", "high"],
      notification_type: ["available", "price_drop", "similar"],
      observation_condition: ["healthy", "okay", "concern", "critical"],
      order_status: ["pending", "paid", "shipped", "delivered", "cancelled"],
      plant_status: ["alive", "dormant", "sick", "removed"],
      plant_type: ["palm", "fern", "tree", "cycad", "shrub", "other"],
      rarity_level: ["low", "medium", "high"],
      water_level: ["low", "medium", "high"],
      wishlist_priority: ["low", "medium", "high", "urgent"],
      wishlist_source: ["frondaprima", "any", "specific"],
      wishlist_status: ["wishlist", "looking", "acquired"],
    },
  },
} as const
