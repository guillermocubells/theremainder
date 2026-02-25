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
      active_garden_addresses: {
        Row: {
          address_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          address_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          address_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "active_garden_addresses_address_id_fkey"
            columns: ["address_id"]
            isOneToOne: false
            referencedRelation: "addresses"
            referencedColumns: ["id"]
          },
        ]
      }
      addresses: {
        Row: {
          altitude_m: number | null
          apartment: string | null
          avg_annual_rainfall_mm: number | null
          city: string
          climate_zone: string | null
          country: string
          created_at: string
          drainage: string | null
          frost_frequency: string | null
          full_name: string
          garden_notes: string | null
          humidity_level: string | null
          id: string
          is_default: boolean
          is_garden_location: boolean
          min_winter_temp_c: number | null
          phone: string | null
          postal_code: string
          province: string
          soil_ph: string | null
          soil_type: string | null
          street: string
          sun_exposure: string | null
          updated_at: string
          user_id: string
          wind_exposure: string | null
        }
        Insert: {
          altitude_m?: number | null
          apartment?: string | null
          avg_annual_rainfall_mm?: number | null
          city: string
          climate_zone?: string | null
          country?: string
          created_at?: string
          drainage?: string | null
          frost_frequency?: string | null
          full_name: string
          garden_notes?: string | null
          humidity_level?: string | null
          id?: string
          is_default?: boolean
          is_garden_location?: boolean
          min_winter_temp_c?: number | null
          phone?: string | null
          postal_code: string
          province: string
          soil_ph?: string | null
          soil_type?: string | null
          street: string
          sun_exposure?: string | null
          updated_at?: string
          user_id: string
          wind_exposure?: string | null
        }
        Update: {
          altitude_m?: number | null
          apartment?: string | null
          avg_annual_rainfall_mm?: number | null
          city?: string
          climate_zone?: string | null
          country?: string
          created_at?: string
          drainage?: string | null
          frost_frequency?: string | null
          full_name?: string
          garden_notes?: string | null
          humidity_level?: string | null
          id?: string
          is_default?: boolean
          is_garden_location?: boolean
          min_winter_temp_c?: number | null
          phone?: string | null
          postal_code?: string
          province?: string
          soil_ph?: string | null
          soil_type?: string | null
          street?: string
          sun_exposure?: string | null
          updated_at?: string
          user_id?: string
          wind_exposure?: string | null
        }
        Relationships: []
      }
      auctions: {
        Row: {
          bid_increment: number
          buy_now_price: number | null
          condition: string | null
          created_at: string
          created_by: string
          currency: string
          current_price: number
          description: string | null
          ends_at: string | null
          id: string
          images: string[] | null
          meta_description: string | null
          meta_title: string | null
          plant_id: string | null
          reserve_met: boolean
          reserve_price: number | null
          slug: string
          starting_price: number
          starts_at: string | null
          status: Database["public"]["Enums"]["auction_status"]
          title: string
          total_bids: number
          updated_at: string
          winner_user_id: string | null
          winning_bid_id: string | null
        }
        Insert: {
          bid_increment?: number
          buy_now_price?: number | null
          condition?: string | null
          created_at?: string
          created_by: string
          currency?: string
          current_price?: number
          description?: string | null
          ends_at?: string | null
          id?: string
          images?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          plant_id?: string | null
          reserve_met?: boolean
          reserve_price?: number | null
          slug: string
          starting_price?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["auction_status"]
          title: string
          total_bids?: number
          updated_at?: string
          winner_user_id?: string | null
          winning_bid_id?: string | null
        }
        Update: {
          bid_increment?: number
          buy_now_price?: number | null
          condition?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          current_price?: number
          description?: string | null
          ends_at?: string | null
          id?: string
          images?: string[] | null
          meta_description?: string | null
          meta_title?: string | null
          plant_id?: string | null
          reserve_met?: boolean
          reserve_price?: number | null
          slug?: string
          starting_price?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["auction_status"]
          title?: string
          total_bids?: number
          updated_at?: string
          winner_user_id?: string | null
          winning_bid_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auctions_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
      bids: {
        Row: {
          amount: number
          auction_id: string
          created_at: string
          id: string
          ip_address: string | null
          status: Database["public"]["Enums"]["bid_status"]
          user_id: string
        }
        Insert: {
          amount: number
          auction_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
          user_id: string
        }
        Update: {
          amount?: number
          auction_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      cart_items: {
        Row: {
          container_size: string | null
          created_at: string
          id: string
          image: string | null
          max_quantity: number
          name: string
          plant_id: string
          price: number
          quantity: number
          updated_at: string
          user_id: string
        }
        Insert: {
          container_size?: string | null
          created_at?: string
          id?: string
          image?: string | null
          max_quantity?: number
          name: string
          plant_id: string
          price?: number
          quantity?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          container_size?: string | null
          created_at?: string
          id?: string
          image?: string | null
          max_quantity?: number
          name?: string
          plant_id?: string
          price?: number
          quantity?: number
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
      currency_rates: {
        Row: {
          base_currency: string
          id: string
          rate: number
          target_currency: string
          updated_at: string
        }
        Insert: {
          base_currency?: string
          id?: string
          rate: number
          target_currency: string
          updated_at?: string
        }
        Update: {
          base_currency?: string
          id?: string
          rate?: number
          target_currency?: string
          updated_at?: string
        }
        Relationships: []
      }
      fraud_flags: {
        Row: {
          created_at: string
          id: string
          metadata: Json | null
          notes: string | null
          referrer_user_id: string | null
          related_order_id: string | null
          related_reward_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          severity: Database["public"]["Enums"]["fraud_flag_severity"]
          status: Database["public"]["Enums"]["fraud_flag_status"]
          type: Database["public"]["Enums"]["fraud_flag_type"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          referrer_user_id?: string | null
          related_order_id?: string | null
          related_reward_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["fraud_flag_severity"]
          status?: Database["public"]["Enums"]["fraud_flag_status"]
          type: Database["public"]["Enums"]["fraud_flag_type"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          referrer_user_id?: string | null
          related_order_id?: string | null
          related_reward_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          severity?: Database["public"]["Enums"]["fraud_flag_severity"]
          status?: Database["public"]["Enums"]["fraud_flag_status"]
          type?: Database["public"]["Enums"]["fraud_flag_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fraud_flags_related_order_id_fkey"
            columns: ["related_order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fraud_flags_related_reward_id_fkey"
            columns: ["related_reward_id"]
            isOneToOne: false
            referencedRelation: "referral_rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      garden_inquiries: {
        Row: {
          created_at: string
          id: string
          message: string
          offer_type: string | null
          owned_plant_id: string
          owner_reply: string | null
          owner_user_id: string
          replied_at: string | null
          shared_list_id: string | null
          status: string
          updated_at: string
          viewer_email: string | null
          viewer_identifier: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          offer_type?: string | null
          owned_plant_id: string
          owner_reply?: string | null
          owner_user_id: string
          replied_at?: string | null
          shared_list_id?: string | null
          status?: string
          updated_at?: string
          viewer_email?: string | null
          viewer_identifier: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          offer_type?: string | null
          owned_plant_id?: string
          owner_reply?: string | null
          owner_user_id?: string
          replied_at?: string | null
          shared_list_id?: string | null
          status?: string
          updated_at?: string
          viewer_email?: string | null
          viewer_identifier?: string
        }
        Relationships: [
          {
            foreignKeyName: "garden_inquiries_owned_plant_id_fkey"
            columns: ["owned_plant_id"]
            isOneToOne: false
            referencedRelation: "owned_plants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_inquiries_owned_plant_id_fkey"
            columns: ["owned_plant_id"]
            isOneToOne: false
            referencedRelation: "owned_plants_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "garden_inquiries_shared_list_id_fkey"
            columns: ["shared_list_id"]
            isOneToOne: false
            referencedRelation: "shared_search_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      garden_viewer_blocks: {
        Row: {
          created_at: string
          id: string
          owner_user_id: string
          scope: string
          shared_list_id: string | null
          viewer_identifier: string
        }
        Insert: {
          created_at?: string
          id?: string
          owner_user_id: string
          scope?: string
          shared_list_id?: string | null
          viewer_identifier: string
        }
        Update: {
          created_at?: string
          id?: string
          owner_user_id?: string
          scope?: string
          shared_list_id?: string | null
          viewer_identifier?: string
        }
        Relationships: [
          {
            foreignKeyName: "garden_viewer_blocks_shared_list_id_fkey"
            columns: ["shared_list_id"]
            isOneToOne: false
            referencedRelation: "shared_search_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_records: {
        Row: {
          base_imponible: number
          created_at: string
          currency: string
          current_hash: string
          id: string
          invoice_id: string
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          issue_date: string
          issuer_name: string | null
          issuer_nif: string | null
          previous_hash: string | null
          receiver_name: string | null
          receiver_nif: string | null
          record_sequence: number
          tax_amount: number
          tax_rate: number
          total_amount: number
        }
        Insert: {
          base_imponible: number
          created_at?: string
          currency?: string
          current_hash: string
          id?: string
          invoice_id: string
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type"]
          issue_date: string
          issuer_name?: string | null
          issuer_nif?: string | null
          previous_hash?: string | null
          receiver_name?: string | null
          receiver_nif?: string | null
          record_sequence: number
          tax_amount: number
          tax_rate: number
          total_amount: number
        }
        Update: {
          base_imponible?: number
          created_at?: string
          currency?: string
          current_hash?: string
          id?: string
          invoice_id?: string
          invoice_number?: string
          invoice_type?: Database["public"]["Enums"]["invoice_type"]
          issue_date?: string
          issuer_name?: string | null
          issuer_nif?: string | null
          previous_hash?: string | null
          receiver_name?: string | null
          receiver_nif?: string | null
          record_sequence?: number
          tax_amount?: number
          tax_rate?: number
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_records_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_series: {
        Row: {
          code: string
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          next_number: number
          prefix: string
          series_type: string
          updated_at: string | null
          year: number
        }
        Insert: {
          code: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          next_number?: number
          prefix: string
          series_type: string
          updated_at?: string | null
          year: number
        }
        Update: {
          code?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          next_number?: number
          prefix?: string
          series_type?: string
          updated_at?: string | null
          year?: number
        }
        Relationships: []
      }
      invoices: {
        Row: {
          base_imponible: number | null
          buyer_address: Json | null
          buyer_email: string | null
          buyer_legal_name: string | null
          buyer_name: string
          buyer_tax_id: string | null
          cancelled_at: string | null
          created_at: string
          currency: string
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          id: string
          invoice_number: string
          invoice_type: Database["public"]["Enums"]["invoice_type"] | null
          issued_at: string
          items: Json
          order_id: string
          pdf_path: string | null
          rectification_reason: string | null
          rectifies_invoice_id: string | null
          rectifies_invoice_number: string | null
          refund_amount: number | null
          seller_address: string | null
          seller_email: string | null
          seller_name: string
          seller_tax_id: string | null
          series_id: string | null
          shipping_cost: number
          snapshot_hash: string | null
          status: Database["public"]["Enums"]["invoice_status"]
          stripe_payment_intent_id: string | null
          subtotal: number
          tax_amount: number | null
          tax_rate: number | null
          total_amount: number
          updated_at: string
          user_id: string
        }
        Insert: {
          base_imponible?: number | null
          buyer_address?: Json | null
          buyer_email?: string | null
          buyer_legal_name?: string | null
          buyer_name: string
          buyer_tax_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          id?: string
          invoice_number: string
          invoice_type?: Database["public"]["Enums"]["invoice_type"] | null
          issued_at?: string
          items?: Json
          order_id: string
          pdf_path?: string | null
          rectification_reason?: string | null
          rectifies_invoice_id?: string | null
          rectifies_invoice_number?: string | null
          refund_amount?: number | null
          seller_address?: string | null
          seller_email?: string | null
          seller_name: string
          seller_tax_id?: string | null
          series_id?: string | null
          shipping_cost?: number
          snapshot_hash?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          base_imponible?: number | null
          buyer_address?: Json | null
          buyer_email?: string | null
          buyer_legal_name?: string | null
          buyer_name?: string
          buyer_tax_id?: string | null
          cancelled_at?: string | null
          created_at?: string
          currency?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          id?: string
          invoice_number?: string
          invoice_type?: Database["public"]["Enums"]["invoice_type"] | null
          issued_at?: string
          items?: Json
          order_id?: string
          pdf_path?: string | null
          rectification_reason?: string | null
          rectifies_invoice_id?: string | null
          rectifies_invoice_number?: string | null
          refund_amount?: number | null
          seller_address?: string | null
          seller_email?: string | null
          seller_name?: string
          seller_tax_id?: string | null
          series_id?: string | null
          shipping_cost?: number
          snapshot_hash?: string | null
          status?: Database["public"]["Enums"]["invoice_status"]
          stripe_payment_intent_id?: string | null
          subtotal?: number
          tax_amount?: number | null
          tax_rate?: number | null
          total_amount?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_rectifies_invoice_id_fkey"
            columns: ["rectifies_invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_series_id_fkey"
            columns: ["series_id"]
            isOneToOne: false
            referencedRelation: "invoice_series"
            referencedColumns: ["id"]
          },
        ]
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
          client_ip: string | null
          created_at: string
          customer_type: Database["public"]["Enums"]["customer_type"] | null
          id: string
          invoice_id: string | null
          notes: string | null
          order_number: string
          referral_code_used: string | null
          referrer_user_id: string | null
          refund_amount: number | null
          refund_id: string | null
          shipping_address: Json
          status: Database["public"]["Enums"]["order_status"]
          stripe_charge_id: string | null
          stripe_checkout_session_id: string | null
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          total_amount: number
          tracking_number: string | null
          tracking_url: string | null
          updated_at: string
          user_agent: string | null
          user_id: string
          wallet_amount_used: number | null
        }
        Insert: {
          client_ip?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_number: string
          referral_code_used?: string | null
          referrer_user_id?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          shipping_address: Json
          status?: Database["public"]["Enums"]["order_status"]
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          total_amount: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id: string
          wallet_amount_used?: number | null
        }
        Update: {
          client_ip?: string | null
          created_at?: string
          customer_type?: Database["public"]["Enums"]["customer_type"] | null
          id?: string
          invoice_id?: string | null
          notes?: string | null
          order_number?: string
          referral_code_used?: string | null
          referrer_user_id?: string | null
          refund_amount?: number | null
          refund_id?: string | null
          shipping_address?: Json
          status?: Database["public"]["Enums"]["order_status"]
          stripe_charge_id?: string | null
          stripe_checkout_session_id?: string | null
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          total_amount?: number
          tracking_number?: string | null
          tracking_url?: string | null
          updated_at?: string
          user_agent?: string | null
          user_id?: string
          wallet_amount_used?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      owned_plants: {
        Row: {
          allow_inquiries: boolean
          availability_intent: string
          common_name: string | null
          created_at: string
          id: string
          inquiry_handling_mode: string
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
          visibility_in_shared_lists: string
        }
        Insert: {
          allow_inquiries?: boolean
          availability_intent?: string
          common_name?: string | null
          created_at?: string
          id?: string
          inquiry_handling_mode?: string
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
          visibility_in_shared_lists?: string
        }
        Update: {
          allow_inquiries?: boolean
          availability_intent?: string
          common_name?: string | null
          created_at?: string
          id?: string
          inquiry_handling_mode?: string
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
          visibility_in_shared_lists?: string
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
          {
            foreignKeyName: "plant_notes_owned_plant_id_fkey"
            columns: ["owned_plant_id"]
            isOneToOne: false
            referencedRelation: "owned_plants_public"
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
          {
            foreignKeyName: "plant_observations_owned_plant_id_fkey"
            columns: ["owned_plant_id"]
            isOneToOne: false
            referencedRelation: "owned_plants_public"
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
          {
            foreignKeyName: "plant_public_slugs_owned_plant_id_fkey"
            columns: ["owned_plant_id"]
            isOneToOne: true
            referencedRelation: "owned_plants_public"
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
          family: string | null
          germination_date: string | null
          growth_rate: string | null
          hardiness_zones: string[] | null
          humidity: Database["public"]["Enums"]["humidity_level"] | null
          id: string
          image_alt_text: string | null
          images: string[] | null
          is_active: boolean
          is_featured: boolean
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
          primary_image: string | null
          product_images: string[] | null
          rarity: Database["public"]["Enums"]["rarity_level"] | null
          reference_url: string | null
          sale_price: number | null
          scientific_name: string | null
          short_description: string | null
          slug: string
          specifications: Json | null
          stock_qty: number
          updated_at: string
          variety: string | null
          water: Database["public"]["Enums"]["water_level"] | null
          weight_grams: number | null
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
          family?: string | null
          germination_date?: string | null
          growth_rate?: string | null
          hardiness_zones?: string[] | null
          humidity?: Database["public"]["Enums"]["humidity_level"] | null
          id?: string
          image_alt_text?: string | null
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
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
          primary_image?: string | null
          product_images?: string[] | null
          rarity?: Database["public"]["Enums"]["rarity_level"] | null
          reference_url?: string | null
          sale_price?: number | null
          scientific_name?: string | null
          short_description?: string | null
          slug: string
          specifications?: Json | null
          stock_qty?: number
          updated_at?: string
          variety?: string | null
          water?: Database["public"]["Enums"]["water_level"] | null
          weight_grams?: number | null
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
          family?: string | null
          germination_date?: string | null
          growth_rate?: string | null
          hardiness_zones?: string[] | null
          humidity?: Database["public"]["Enums"]["humidity_level"] | null
          id?: string
          image_alt_text?: string | null
          images?: string[] | null
          is_active?: boolean
          is_featured?: boolean
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
          primary_image?: string | null
          product_images?: string[] | null
          rarity?: Database["public"]["Enums"]["rarity_level"] | null
          reference_url?: string | null
          sale_price?: number | null
          scientific_name?: string | null
          short_description?: string | null
          slug?: string
          specifications?: Json | null
          stock_qty?: number
          updated_at?: string
          variety?: string | null
          water?: Database["public"]["Enums"]["water_level"] | null
          weight_grams?: number | null
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
          referral_code_used: string | null
          referred_by_user_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          referral_code_used?: string | null
          referred_by_user_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          referral_code_used?: string | null
          referred_by_user_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      referral_rewards: {
        Row: {
          cap_applied: boolean
          created_at: string
          currency: string
          fraud_blocked: boolean | null
          fraud_reason: string | null
          id: string
          matured_at: string | null
          matures_at: string | null
          order_id: string
          payment_confirmed_at: string | null
          product_subtotal: number
          referred_user_id: string
          referrer_user_id: string
          reversal_reason: string | null
          reversed_at: string | null
          reward_amount: number
          reward_percentage: number
          status: Database["public"]["Enums"]["referral_reward_status"]
          updated_at: string
          wallet_transaction_id: string | null
        }
        Insert: {
          cap_applied?: boolean
          created_at?: string
          currency?: string
          fraud_blocked?: boolean | null
          fraud_reason?: string | null
          id?: string
          matured_at?: string | null
          matures_at?: string | null
          order_id: string
          payment_confirmed_at?: string | null
          product_subtotal: number
          referred_user_id: string
          referrer_user_id: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reward_amount: number
          reward_percentage?: number
          status?: Database["public"]["Enums"]["referral_reward_status"]
          updated_at?: string
          wallet_transaction_id?: string | null
        }
        Update: {
          cap_applied?: boolean
          created_at?: string
          currency?: string
          fraud_blocked?: boolean | null
          fraud_reason?: string | null
          id?: string
          matured_at?: string | null
          matures_at?: string | null
          order_id?: string
          payment_confirmed_at?: string | null
          product_subtotal?: number
          referred_user_id?: string
          referrer_user_id?: string
          reversal_reason?: string | null
          reversed_at?: string | null
          reward_amount?: number
          reward_percentage?: number
          status?: Database["public"]["Enums"]["referral_reward_status"]
          updated_at?: string
          wallet_transaction_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referral_rewards_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referral_rewards_wallet_transaction_id_fkey"
            columns: ["wallet_transaction_id"]
            isOneToOne: false
            referencedRelation: "wallet_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      referral_settings: {
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
      shared_search_lists: {
        Row: {
          created_at: string
          description: string | null
          global_inquiries_mode: string
          id: string
          is_public: boolean
          slug: string
          title: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          global_inquiries_mode?: string
          id?: string
          is_public?: boolean
          slug?: string
          title?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          global_inquiries_mode?: string
          id?: string
          is_public?: boolean
          slug?: string
          title?: string | null
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
      stock_notifications: {
        Row: {
          created_at: string
          email: string
          id: string
          notified_at: string | null
          plant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          notified_at?: string | null
          plant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          notified_at?: string | null
          plant_id?: string
          user_id?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          description: string | null
          id: string
          is_public: boolean
          key: string
          updated_at: string
          value: Json
        }
        Insert: {
          description?: string | null
          id?: string
          is_public?: boolean
          key: string
          updated_at?: string
          value: Json
        }
        Update: {
          description?: string | null
          id?: string
          is_public?: boolean
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
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          description: string | null
          id: string
          reference_id: string | null
          source: Database["public"]["Enums"]["wallet_transaction_source"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          source: Database["public"]["Enums"]["wallet_transaction_source"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          reference_id?: string | null
          source?: Database["public"]["Enums"]["wallet_transaction_source"]
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          user_id?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          available_balance: number
          created_at: string
          currency: string
          id: string
          pending_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          pending_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          created_at?: string
          currency?: string
          id?: string
          pending_balance?: number
          updated_at?: string
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
            foreignKeyName: "wishlist_items_acquired_owned_plant_id_fkey"
            columns: ["acquired_owned_plant_id"]
            isOneToOne: false
            referencedRelation: "owned_plants_public"
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
      owned_plants_public: {
        Row: {
          common_name: string | null
          created_at: string | null
          id: string | null
          nickname: string | null
          photos: string[] | null
          purchase_date: string | null
          scientific_name: string | null
          serial_code: string | null
          source_plant_id: string | null
          status: Database["public"]["Enums"]["plant_status"] | null
          tags: string[] | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "owned_plants_source_plant_id_fkey"
            columns: ["source_plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      calculate_invoice_hash: {
        Args: {
          p_invoice_number: string
          p_issue_date: string
          p_issuer_nif: string
          p_previous_hash: string
          p_total: number
        }
        Returns: string
      }
      check_referral_fraud: {
        Args: {
          p_client_ip?: string
          p_order_id: string
          p_referred_user_id: string
          p_referrer_user_id: string
          p_user_agent?: string
        }
        Returns: {
          flags: Json
          is_blocked: boolean
        }[]
      }
      create_invoice_from_order: {
        Args: { p_order_id: string }
        Returns: string
      }
      create_invoice_record: { Args: { p_invoice_id: string }; Returns: string }
      create_owned_plants_from_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: number
      }
      create_spanish_invoice_from_order: {
        Args: {
          p_invoice_type?: Database["public"]["Enums"]["invoice_type"]
          p_order_id: string
          p_rectification_reason?: string
          p_rectifies_invoice_id?: string
        }
        Returns: string
      }
      generate_invoice_number: { Args: never; Returns: string }
      generate_invoice_number_from_series: {
        Args: { p_series_type: string }
        Returns: {
          invoice_number: string
          series_id: string
        }[]
      }
      generate_order_number: { Args: never; Returns: string }
      generate_plant_serial_code: { Args: never; Returns: string }
      generate_plant_slug: { Args: never; Returns: string }
      generate_referral_code: { Args: never; Returns: string }
      get_public_shared_list_by_slug: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_referral_setting: { Args: { setting_key: string }; Returns: Json }
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
      is_own_stock_notification: {
        Args: { n_user_id: string }
        Returns: boolean
      }
      is_own_wishlist_item: { Args: { wi_user_id: string }; Returns: boolean }
      match_wishlist_to_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: number
      }
      mature_pending_rewards: { Args: never; Returns: number }
      owns_plant: { Args: { plant_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user"
      auction_status:
        | "draft"
        | "scheduled"
        | "live"
        | "ended"
        | "settled"
        | "cancelled"
      bid_status: "active" | "outbid" | "winning" | "won" | "cancelled"
      customer_type: "b2c" | "b2b"
      difficulty_level:
        | "easy"
        | "intermediate"
        | "advanced"
        | "beginner"
        | "expert"
      email_frequency: "instant" | "daily" | "weekly"
      fraud_flag_severity: "low" | "medium" | "high" | "critical"
      fraud_flag_status: "pending" | "reviewed" | "approved" | "revoked"
      fraud_flag_type:
        | "self_referral"
        | "similar_email"
        | "ip_match"
        | "device_fingerprint"
        | "multiple_first_orders_ip"
        | "suspicious_amount_pattern"
        | "wallet_abuse"
      growth_speed: "slow" | "medium" | "fast"
      humidity_level: "low" | "medium" | "high"
      invoice_status:
        | "issued"
        | "cancelled"
        | "refunded"
        | "partially_refunded"
        | "void"
      invoice_type: "standard" | "rectificativa"
      notification_type: "available" | "price_drop" | "similar"
      observation_condition: "healthy" | "okay" | "concern" | "critical"
      order_status:
        | "pending"
        | "paid"
        | "shipped"
        | "delivered"
        | "cancelled"
        | "partially_refunded"
        | "failed"
        | "refunded"
      plant_status: "alive" | "dormant" | "sick" | "removed"
      plant_type:
        | "palm"
        | "fern"
        | "tree"
        | "cycad"
        | "shrub"
        | "other"
        | "succulent"
        | "grass"
      rarity_level:
        | "low"
        | "medium"
        | "high"
        | "rare"
        | "common"
        | "uncommon"
        | "very_rare"
        | "extremely_rare"
      referral_reward_status:
        | "pending"
        | "available"
        | "used"
        | "reversed"
        | "expired"
      wallet_transaction_source:
        | "referral_reward"
        | "order_discount"
        | "admin_adjustment"
        | "reward_matured"
      wallet_transaction_type: "credit" | "debit" | "reversal"
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
      auction_status: [
        "draft",
        "scheduled",
        "live",
        "ended",
        "settled",
        "cancelled",
      ],
      bid_status: ["active", "outbid", "winning", "won", "cancelled"],
      customer_type: ["b2c", "b2b"],
      difficulty_level: [
        "easy",
        "intermediate",
        "advanced",
        "beginner",
        "expert",
      ],
      email_frequency: ["instant", "daily", "weekly"],
      fraud_flag_severity: ["low", "medium", "high", "critical"],
      fraud_flag_status: ["pending", "reviewed", "approved", "revoked"],
      fraud_flag_type: [
        "self_referral",
        "similar_email",
        "ip_match",
        "device_fingerprint",
        "multiple_first_orders_ip",
        "suspicious_amount_pattern",
        "wallet_abuse",
      ],
      growth_speed: ["slow", "medium", "fast"],
      humidity_level: ["low", "medium", "high"],
      invoice_status: [
        "issued",
        "cancelled",
        "refunded",
        "partially_refunded",
        "void",
      ],
      invoice_type: ["standard", "rectificativa"],
      notification_type: ["available", "price_drop", "similar"],
      observation_condition: ["healthy", "okay", "concern", "critical"],
      order_status: [
        "pending",
        "paid",
        "shipped",
        "delivered",
        "cancelled",
        "partially_refunded",
        "failed",
        "refunded",
      ],
      plant_status: ["alive", "dormant", "sick", "removed"],
      plant_type: [
        "palm",
        "fern",
        "tree",
        "cycad",
        "shrub",
        "other",
        "succulent",
        "grass",
      ],
      rarity_level: [
        "low",
        "medium",
        "high",
        "rare",
        "common",
        "uncommon",
        "very_rare",
        "extremely_rare",
      ],
      referral_reward_status: [
        "pending",
        "available",
        "used",
        "reversed",
        "expired",
      ],
      wallet_transaction_source: [
        "referral_reward",
        "order_discount",
        "admin_adjustment",
        "reward_matured",
      ],
      wallet_transaction_type: ["credit", "debit", "reversal"],
      water_level: ["low", "medium", "high"],
      wishlist_priority: ["low", "medium", "high", "urgent"],
      wishlist_source: ["frondaprima", "any", "specific"],
      wishlist_status: ["wishlist", "looking", "acquired"],
    },
  },
} as const
