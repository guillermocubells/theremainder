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
          container_size: string | null
          created_at: string
          curious_facts: Json | null
          description: string | null
          display_order: number
          germination_date: string | null
          growth_rate: string | null
          hardiness_zone: string | null
          id: string
          images: string[] | null
          is_active: boolean
          is_featured: boolean
          mature_height: string | null
          mature_width: string | null
          meta_description: string | null
          meta_title: string | null
          name: string
          native_habitat: string | null
          origin_country: string | null
          origin_region: string | null
          price: number
          sale_price: number | null
          scientific_name: string | null
          short_description: string | null
          slug: string
          specifications: Json | null
          stock: number
          sun_requirement: string | null
          temperature_range: string | null
          thumbnail_url: string | null
          updated_at: string
          water_requirement: string | null
        }
        Insert: {
          care_instructions?: Json | null
          category_id?: string | null
          container_size?: string | null
          created_at?: string
          curious_facts?: Json | null
          description?: string | null
          display_order?: number
          germination_date?: string | null
          growth_rate?: string | null
          hardiness_zone?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          mature_height?: string | null
          mature_width?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name: string
          native_habitat?: string | null
          origin_country?: string | null
          origin_region?: string | null
          price?: number
          sale_price?: number | null
          scientific_name?: string | null
          short_description?: string | null
          slug: string
          specifications?: Json | null
          stock?: number
          sun_requirement?: string | null
          temperature_range?: string | null
          thumbnail_url?: string | null
          updated_at?: string
          water_requirement?: string | null
        }
        Update: {
          care_instructions?: Json | null
          category_id?: string | null
          container_size?: string | null
          created_at?: string
          curious_facts?: Json | null
          description?: string | null
          display_order?: number
          germination_date?: string | null
          growth_rate?: string | null
          hardiness_zone?: string | null
          id?: string
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
          mature_height?: string | null
          mature_width?: string | null
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          native_habitat?: string | null
          origin_country?: string | null
          origin_region?: string | null
          price?: number
          sale_price?: number | null
          scientific_name?: string | null
          short_description?: string | null
          slug?: string
          specifications?: Json | null
          stock?: number
          sun_requirement?: string | null
          temperature_range?: string | null
          thumbnail_url?: string | null
          updated_at?: string
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
      is_own_order: { Args: { o_user_id: string }; Returns: boolean }
      is_own_owned_plant: { Args: { op_user_id: string }; Returns: boolean }
      is_own_plant_location: { Args: { pl_user_id: string }; Returns: boolean }
      is_own_profile: { Args: { p_user_id: string }; Returns: boolean }
      is_own_saved_search: { Args: { ss_user_id: string }; Returns: boolean }
      owns_plant: { Args: { plant_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      observation_condition: "healthy" | "okay" | "concern" | "critical"
      order_status: "pending" | "paid" | "shipped" | "delivered" | "cancelled"
      plant_status: "alive" | "dormant" | "sick" | "removed"
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
      observation_condition: ["healthy", "okay", "concern", "critical"],
      order_status: ["pending", "paid", "shipped", "delivered", "cancelled"],
      plant_status: ["alive", "dormant", "sick", "removed"],
    },
  },
} as const
