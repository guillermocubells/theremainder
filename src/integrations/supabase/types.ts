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
      alert_events: {
        Row: {
          acknowledged_at: string | null
          acknowledged_by: string | null
          created_at: string
          id: string
          message: string | null
          metric_name: string
          metric_value: number
          rule_id: string
          rule_name: string
          severity: string
          threshold: number
        }
        Insert: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metric_name: string
          metric_value: number
          rule_id: string
          rule_name: string
          severity: string
          threshold: number
        }
        Update: {
          acknowledged_at?: string | null
          acknowledged_by?: string | null
          created_at?: string
          id?: string
          message?: string | null
          metric_name?: string
          metric_value?: number
          rule_id?: string
          rule_name?: string
          severity?: string
          threshold?: number
        }
        Relationships: [
          {
            foreignKeyName: "alert_events_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "alert_rules"
            referencedColumns: ["id"]
          },
        ]
      }
      alert_rules: {
        Row: {
          condition: string
          cooldown_minutes: number
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          metric_name: string
          name: string
          severity: string
          tags_filter: Json | null
          threshold: number
          updated_at: string
          window_minutes: number
        }
        Insert: {
          condition?: string
          cooldown_minutes?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metric_name: string
          name: string
          severity?: string
          tags_filter?: Json | null
          threshold: number
          updated_at?: string
          window_minutes?: number
        }
        Update: {
          condition?: string
          cooldown_minutes?: number
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          metric_name?: string
          name?: string
          severity?: string
          tags_filter?: Json | null
          threshold?: number
          updated_at?: string
          window_minutes?: number
        }
        Relationships: []
      }
      auction_consents: {
        Row: {
          accepted_at: string
          consent_type: string
          created_at: string
          id: string
          ip_address: string | null
          metadata: Json | null
          terms_version: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          accepted_at?: string
          consent_type: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          terms_version: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          accepted_at?: string
          consent_type?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          terms_version?: string
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      auction_deposits: {
        Row: {
          amount: number
          auction_id: string
          created_at: string
          currency: string
          id: string
          status: string
          stripe_payment_intent_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          auction_id: string
          created_at?: string
          currency?: string
          id?: string
          status?: string
          stripe_payment_intent_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          auction_id?: string
          created_at?: string
          currency?: string
          id?: string
          status?: string
          stripe_payment_intent_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_deposits_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_events: {
        Row: {
          created_at: string
          entity: string
          entity_id: string | null
          event_type: string
          id: string
          payload: Json | null
        }
        Insert: {
          created_at?: string
          entity: string
          entity_id?: string | null
          event_type: string
          id?: string
          payload?: Json | null
        }
        Update: {
          created_at?: string
          entity?: string
          entity_id?: string | null
          event_type?: string
          id?: string
          payload?: Json | null
        }
        Relationships: []
      }
      auction_lots: {
        Row: {
          auction_id: string
          buy_now_cents: number | null
          closed_at: string | null
          created_at: string
          currency: string
          id: string
          increment_rule: string | null
          item_id: string
          lot_number: number
          reserve_met: boolean
          starting_bid_cents: number
          status: string
          updated_at: string
          winning_bid_id: string | null
        }
        Insert: {
          auction_id: string
          buy_now_cents?: number | null
          closed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          increment_rule?: string | null
          item_id: string
          lot_number: number
          reserve_met?: boolean
          starting_bid_cents?: number
          status?: string
          updated_at?: string
          winning_bid_id?: string | null
        }
        Update: {
          auction_id?: string
          buy_now_cents?: number | null
          closed_at?: string | null
          created_at?: string
          currency?: string
          id?: string
          increment_rule?: string | null
          item_id?: string
          lot_number?: number
          reserve_met?: boolean
          starting_bid_cents?: number
          status?: string
          updated_at?: string
          winning_bid_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "auction_lots_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_lots_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_notifications: {
        Row: {
          auction_id: string
          channel: string
          id: string
          metadata: Json | null
          sent_at: string
          type: string
          user_id: string
        }
        Insert: {
          auction_id: string
          channel?: string
          id?: string
          metadata?: Json | null
          sent_at?: string
          type: string
          user_id: string
        }
        Update: {
          auction_id?: string
          channel?: string
          id?: string
          metadata?: Json | null
          sent_at?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_notifications_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
      }
      auction_settlements: {
        Row: {
          auction_id: string
          buyer_user_id: string
          created_at: string
          currency: string
          deposit_amount: number | null
          deposit_deducted: boolean
          failure_reason: string | null
          hammer_price: number
          id: string
          invoice_id: string | null
          order_id: string | null
          platform_fee_amount: number
          platform_fee_rate: number
          seller_payout_amount: number
          seller_user_id: string
          settled_at: string | null
          status: string
          stripe_charge_id: string | null
          stripe_payment_intent_id: string | null
          stripe_transfer_id: string | null
          updated_at: string
          winning_bid_id: string
        }
        Insert: {
          auction_id: string
          buyer_user_id: string
          created_at?: string
          currency?: string
          deposit_amount?: number | null
          deposit_deducted?: boolean
          failure_reason?: string | null
          hammer_price: number
          id?: string
          invoice_id?: string | null
          order_id?: string | null
          platform_fee_amount: number
          platform_fee_rate?: number
          seller_payout_amount: number
          seller_user_id: string
          settled_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          winning_bid_id: string
        }
        Update: {
          auction_id?: string
          buyer_user_id?: string
          created_at?: string
          currency?: string
          deposit_amount?: number | null
          deposit_deducted?: boolean
          failure_reason?: string | null
          hammer_price?: number
          id?: string
          invoice_id?: string | null
          order_id?: string | null
          platform_fee_amount?: number
          platform_fee_rate?: number
          seller_payout_amount?: number
          seller_user_id?: string
          settled_at?: string | null
          status?: string
          stripe_charge_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_transfer_id?: string | null
          updated_at?: string
          winning_bid_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auction_settlements_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: true
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_settlements_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_settlements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auction_settlements_winning_bid_id_fkey"
            columns: ["winning_bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
            referencedColumns: ["id"]
          },
        ]
      }
      auctions: {
        Row: {
          admin_notes: string | null
          bid_increment: number
          buy_now_price: number | null
          change_request_message: string | null
          condition: string | null
          created_at: string
          created_by: string
          currency: string
          current_price: number
          deposit_amount: number | null
          description: string | null
          dimensions: Json | null
          display_order: number
          ends_at: string | null
          id: string
          images: string[] | null
          location_country: string | null
          meta_description: string | null
          meta_title: string | null
          plant_id: string | null
          platform_fee_percent: number
          provenance: string | null
          provenance_documents: string[] | null
          reserve_met: boolean
          reserve_price: number | null
          reviewed_at: string | null
          reviewed_by: string | null
          seller_notes: string | null
          seller_user_id: string | null
          slug: string
          soft_close_window_sec: number
          starting_price: number
          starts_at: string | null
          status: Database["public"]["Enums"]["auction_status"]
          terms_url: string | null
          title: string
          total_bids: number
          updated_at: string
          videos: string[] | null
          winner_user_id: string | null
          winning_bid_id: string | null
        }
        Insert: {
          admin_notes?: string | null
          bid_increment?: number
          buy_now_price?: number | null
          change_request_message?: string | null
          condition?: string | null
          created_at?: string
          created_by: string
          currency?: string
          current_price?: number
          deposit_amount?: number | null
          description?: string | null
          dimensions?: Json | null
          display_order?: number
          ends_at?: string | null
          id?: string
          images?: string[] | null
          location_country?: string | null
          meta_description?: string | null
          meta_title?: string | null
          plant_id?: string | null
          platform_fee_percent?: number
          provenance?: string | null
          provenance_documents?: string[] | null
          reserve_met?: boolean
          reserve_price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_notes?: string | null
          seller_user_id?: string | null
          slug: string
          soft_close_window_sec?: number
          starting_price?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["auction_status"]
          terms_url?: string | null
          title: string
          total_bids?: number
          updated_at?: string
          videos?: string[] | null
          winner_user_id?: string | null
          winning_bid_id?: string | null
        }
        Update: {
          admin_notes?: string | null
          bid_increment?: number
          buy_now_price?: number | null
          change_request_message?: string | null
          condition?: string | null
          created_at?: string
          created_by?: string
          currency?: string
          current_price?: number
          deposit_amount?: number | null
          description?: string | null
          dimensions?: Json | null
          display_order?: number
          ends_at?: string | null
          id?: string
          images?: string[] | null
          location_country?: string | null
          meta_description?: string | null
          meta_title?: string | null
          plant_id?: string | null
          platform_fee_percent?: number
          provenance?: string | null
          provenance_documents?: string[] | null
          reserve_met?: boolean
          reserve_price?: number | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_notes?: string | null
          seller_user_id?: string | null
          slug?: string
          soft_close_window_sec?: number
          starting_price?: number
          starts_at?: string | null
          status?: Database["public"]["Enums"]["auction_status"]
          terms_url?: string | null
          title?: string
          total_bids?: number
          updated_at?: string
          videos?: string[] | null
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
      audit_logs: {
        Row: {
          action: string
          actor_id: string | null
          actor_role: string
          checksum: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          new_data: Json | null
          old_data: Json | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          actor_role?: string
          checksum?: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          actor_role?: string
          checksum?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          new_data?: Json | null
          old_data?: Json | null
        }
        Relationships: []
      }
      bid_increment_rules: {
        Row: {
          auction_id: string
          id: string
          increment_cents: number
          max_amount_cents: number | null
          min_amount_cents: number
        }
        Insert: {
          auction_id: string
          id?: string
          increment_cents?: number
          max_amount_cents?: number | null
          min_amount_cents?: number
        }
        Update: {
          auction_id?: string
          id?: string
          increment_cents?: number
          max_amount_cents?: number | null
          min_amount_cents?: number
        }
        Relationships: [
          {
            foreignKeyName: "bid_increment_rules_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
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
          ua_hash: string | null
          user_id: string
        }
        Insert: {
          amount: number
          auction_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
          ua_hash?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          auction_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          status?: Database["public"]["Enums"]["bid_status"]
          ua_hash?: string | null
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
      bids_idem: {
        Row: {
          bid_id: string
          created_at: string
          idempotency_key: string
        }
        Insert: {
          bid_id: string
          created_at?: string
          idempotency_key: string
        }
        Update: {
          bid_id?: string
          created_at?: string
          idempotency_key?: string
        }
        Relationships: [
          {
            foreignKeyName: "bids_idem_bid_id_fkey"
            columns: ["bid_id"]
            isOneToOne: false
            referencedRelation: "bids"
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
      compliance_attestations: {
        Row: {
          accepts_platform_fee: boolean
          created_at: string
          export_compliant: boolean
          gdpr_consent: boolean
          id: string
          item_id: string | null
          not_prohibited: boolean
          over_18: boolean
          owns_item: boolean
          phytosanitary_required: boolean
          seller_id: string
          signed_at: string
          signed_ip: string | null
          signed_user_agent: string | null
          spain_auction_rules: boolean
          version: string
        }
        Insert: {
          accepts_platform_fee?: boolean
          created_at?: string
          export_compliant?: boolean
          gdpr_consent?: boolean
          id?: string
          item_id?: string | null
          not_prohibited?: boolean
          over_18?: boolean
          owns_item?: boolean
          phytosanitary_required?: boolean
          seller_id: string
          signed_at?: string
          signed_ip?: string | null
          signed_user_agent?: string | null
          spain_auction_rules?: boolean
          version?: string
        }
        Update: {
          accepts_platform_fee?: boolean
          created_at?: string
          export_compliant?: boolean
          gdpr_consent?: boolean
          id?: string
          item_id?: string | null
          not_prohibited?: boolean
          over_18?: boolean
          owns_item?: boolean
          phytosanitary_required?: boolean
          seller_id?: string
          signed_at?: string
          signed_ip?: string | null
          signed_user_agent?: string | null
          spain_auction_rules?: boolean
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_attestations_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_attestations_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_logs: {
        Row: {
          action: string
          created_at: string
          created_by: string | null
          details: string | null
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_value: string | null
          old_value: string | null
        }
        Insert: {
          action: string
          created_at?: string
          created_by?: string | null
          details?: string | null
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          created_by?: string | null
          details?: string | null
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_value?: string | null
          old_value?: string | null
        }
        Relationships: []
      }
      consent_logs: {
        Row: {
          consents: Json
          created_at: string
          event_type: string
          id: string
          ip_address: string | null
          metadata: Json | null
          order_id: string | null
          session_id: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          consents?: Json
          created_at?: string
          event_type: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          order_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          consents?: Json
          created_at?: string
          event_type?: string
          id?: string
          ip_address?: string | null
          metadata?: Json | null
          order_id?: string | null
          session_id?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "consent_logs_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
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
      dispute_events: {
        Row: {
          actor_id: string | null
          actor_role: string
          attachments: string[] | null
          created_at: string
          dispute_id: string
          event_type: string
          id: string
          message: string | null
          metadata: Json | null
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string
          attachments?: string[] | null
          created_at?: string
          dispute_id: string
          event_type: string
          id?: string
          message?: string | null
          metadata?: Json | null
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          attachments?: string[] | null
          created_at?: string
          dispute_id?: string
          event_type?: string
          id?: string
          message?: string | null
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "dispute_events_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_notes: string | null
          assigned_to: string | null
          auction_id: string | null
          created_at: string
          description: string
          evidence_urls: string[] | null
          id: string
          order_id: string | null
          resolution_summary: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          subject: string
          type: Database["public"]["Enums"]["dispute_type"]
          updated_at: string
          user_id: string
        }
        Insert: {
          admin_notes?: string | null
          assigned_to?: string | null
          auction_id?: string | null
          created_at?: string
          description: string
          evidence_urls?: string[] | null
          id?: string
          order_id?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          subject: string
          type: Database["public"]["Enums"]["dispute_type"]
          updated_at?: string
          user_id: string
        }
        Update: {
          admin_notes?: string | null
          assigned_to?: string | null
          auction_id?: string | null
          created_at?: string
          description?: string
          evidence_urls?: string[] | null
          id?: string
          order_id?: string | null
          resolution_summary?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          subject?: string
          type?: Database["public"]["Enums"]["dispute_type"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      fee_rules: {
        Row: {
          active: boolean
          created_at: string
          created_by: string | null
          effective_from: string
          effective_to: string | null
          id: string
          percent: number
          scope: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          percent?: number
          scope?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          created_by?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          percent?: number
          scope?: string
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
      increment_schemas: {
        Row: {
          created_at: string
          id: string
          name: string
          tiers_json: Json
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          tiers_json?: Json
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          tiers_json?: Json
        }
        Relationships: []
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
      item_media: {
        Row: {
          alt_text: string | null
          created_at: string
          id: string
          item_id: string
          media_type: string
          sort_order: number
          url: string
        }
        Insert: {
          alt_text?: string | null
          created_at?: string
          id?: string
          item_id: string
          media_type?: string
          sort_order?: number
          url: string
        }
        Update: {
          alt_text?: string | null
          created_at?: string
          id?: string
          item_id?: string
          media_type?: string
          sort_order?: number
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "item_media_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "item_submissions"
            referencedColumns: ["id"]
          },
        ]
      }
      item_submissions: {
        Row: {
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          approved_snapshot: Json | null
          category: string | null
          change_request_message: string | null
          common_name: string | null
          compliance_attestation_id: string | null
          condition_grade: string | null
          created_at: string
          currency: string
          defects_text: string | null
          description: string | null
          dimensions_text: string | null
          duration_hours: number | null
          excluded_countries: string | null
          handling_time: string | null
          hardiness_zone: string | null
          humidity_tolerance: string | null
          id: string
          location_country: string | null
          location_region: string | null
          phytosanitary_required: boolean | null
          prohibited_check_status: string | null
          provenance_text: string | null
          rejection_reason: string | null
          reserve_price_cents: number | null
          seller_id: string
          shipping_cost_cents: number | null
          shipping_eu_only: boolean | null
          shipping_tiers: string | null
          species_scientific: string | null
          start_price_cents: number
          status: string
          tags: string[] | null
          title: string
          updated_at: string
          weight_kg: number | null
        }
        Insert: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_snapshot?: Json | null
          category?: string | null
          change_request_message?: string | null
          common_name?: string | null
          compliance_attestation_id?: string | null
          condition_grade?: string | null
          created_at?: string
          currency?: string
          defects_text?: string | null
          description?: string | null
          dimensions_text?: string | null
          duration_hours?: number | null
          excluded_countries?: string | null
          handling_time?: string | null
          hardiness_zone?: string | null
          humidity_tolerance?: string | null
          id?: string
          location_country?: string | null
          location_region?: string | null
          phytosanitary_required?: boolean | null
          prohibited_check_status?: string | null
          provenance_text?: string | null
          rejection_reason?: string | null
          reserve_price_cents?: number | null
          seller_id: string
          shipping_cost_cents?: number | null
          shipping_eu_only?: boolean | null
          shipping_tiers?: string | null
          species_scientific?: string | null
          start_price_cents?: number
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
          weight_kg?: number | null
        }
        Update: {
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          approved_snapshot?: Json | null
          category?: string | null
          change_request_message?: string | null
          common_name?: string | null
          compliance_attestation_id?: string | null
          condition_grade?: string | null
          created_at?: string
          currency?: string
          defects_text?: string | null
          description?: string | null
          dimensions_text?: string | null
          duration_hours?: number | null
          excluded_countries?: string | null
          handling_time?: string | null
          hardiness_zone?: string | null
          humidity_tolerance?: string | null
          id?: string
          location_country?: string | null
          location_region?: string | null
          phytosanitary_required?: boolean | null
          prohibited_check_status?: string | null
          provenance_text?: string | null
          rejection_reason?: string | null
          reserve_price_cents?: number | null
          seller_id?: string
          shipping_cost_cents?: number | null
          shipping_eu_only?: boolean | null
          shipping_tiers?: string | null
          species_scientific?: string | null
          start_price_cents?: number
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "item_submissions_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      job_dead_letters: {
        Row: {
          attempts: number
          created_at: string
          dead_at: string
          first_failed_at: string | null
          id: string
          job_type: string
          last_error: string | null
          max_attempts: number
          original_job_id: string
          payload: Json
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
        }
        Insert: {
          attempts?: number
          created_at?: string
          dead_at?: string
          first_failed_at?: string | null
          id?: string
          job_type: string
          last_error?: string | null
          max_attempts?: number
          original_job_id: string
          payload?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Update: {
          attempts?: number
          created_at?: string
          dead_at?: string
          first_failed_at?: string | null
          id?: string
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          original_job_id?: string
          payload?: Json
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
        }
        Relationships: []
      }
      job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          job_type: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          priority: number
          scheduled_at: string
          started_at: string | null
          status: string
          updated_at: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          job_type: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string | null
          job_type?: string
          last_error?: string | null
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          priority?: number
          scheduled_at?: string
          started_at?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      kyc_documents: {
        Row: {
          created_at: string
          document_type: string
          expires_at: string | null
          file_hash: string
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          rejection_reason: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          seller_profile_id: string
          status: string
          storage_path: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          document_type: string
          expires_at?: string | null
          file_hash: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_profile_id: string
          status?: string
          storage_path: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          document_type?: string
          expires_at?: string | null
          file_hash?: string
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          rejection_reason?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          seller_profile_id?: string
          status?: string
          storage_path?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_documents_seller_profile_id_fkey"
            columns: ["seller_profile_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verification_events: {
        Row: {
          actor_id: string | null
          actor_role: string
          created_at: string
          event_type: string
          id: string
          metadata: Json | null
          notes: string | null
          seller_profile_id: string
        }
        Insert: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          event_type: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          seller_profile_id: string
        }
        Update: {
          actor_id?: string | null
          actor_role?: string
          created_at?: string
          event_type?: string
          id?: string
          metadata?: Json | null
          notes?: string | null
          seller_profile_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verification_events_seller_profile_id_fkey"
            columns: ["seller_profile_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
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
          notify_auction_ending: boolean
          notify_auction_lost: boolean
          notify_auction_starting: boolean
          notify_auction_won: boolean
          notify_new_bid_seller: boolean
          notify_outbid: boolean
          push_enabled: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          email_enabled?: boolean
          email_frequency?: Database["public"]["Enums"]["email_frequency"]
          id?: string
          notify_auction_ending?: boolean
          notify_auction_lost?: boolean
          notify_auction_starting?: boolean
          notify_auction_won?: boolean
          notify_new_bid_seller?: boolean
          notify_outbid?: boolean
          push_enabled?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          email_enabled?: boolean
          email_frequency?: Database["public"]["Enums"]["email_frequency"]
          id?: string
          notify_auction_ending?: boolean
          notify_auction_lost?: boolean
          notify_auction_starting?: boolean
          notify_auction_won?: boolean
          notify_new_bid_seller?: boolean
          notify_outbid?: boolean
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
      oversell_alerts: {
        Row: {
          actual_stock: number
          created_at: string
          deficit: number
          expected_stock: number
          id: string
          order_id: string | null
          plant_id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          updated_at: string
        }
        Insert: {
          actual_stock: number
          created_at?: string
          deficit: number
          expected_stock: number
          id?: string
          order_id?: string | null
          plant_id: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          actual_stock?: number
          created_at?: string
          deficit?: number
          expected_stock?: number
          id?: string
          order_id?: string | null
          plant_id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "oversell_alerts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "oversell_alerts_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
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
      payouts: {
        Row: {
          auction_id: string | null
          created_at: string
          currency: string
          gross_cents: number
          id: string
          lot_id: string | null
          net_cents: number
          paid_at: string | null
          payment_id: string | null
          platform_fee_cents: number
          processing_fee_cents: number
          reference: string | null
          scheduled_at: string | null
          seller_id: string
          status: string
          stripe_transfer_id: string | null
          taxes_withheld_cents: number
          updated_at: string
        }
        Insert: {
          auction_id?: string | null
          created_at?: string
          currency?: string
          gross_cents?: number
          id?: string
          lot_id?: string | null
          net_cents?: number
          paid_at?: string | null
          payment_id?: string | null
          platform_fee_cents?: number
          processing_fee_cents?: number
          reference?: string | null
          scheduled_at?: string | null
          seller_id: string
          status?: string
          stripe_transfer_id?: string | null
          taxes_withheld_cents?: number
          updated_at?: string
        }
        Update: {
          auction_id?: string | null
          created_at?: string
          currency?: string
          gross_cents?: number
          id?: string
          lot_id?: string | null
          net_cents?: number
          paid_at?: string | null
          payment_id?: string | null
          platform_fee_cents?: number
          processing_fee_cents?: number
          reference?: string | null
          scheduled_at?: string | null
          seller_id?: string
          status?: string
          stripe_transfer_id?: string | null
          taxes_withheld_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payouts_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payouts_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
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
      plant_search_index: {
        Row: {
          category_id: string | null
          checksum: string | null
          climate_zones: string[] | null
          common_name_tokens: string
          description_tokens: string
          difficulty: string | null
          display_order: number
          exposure: string[] | null
          family_tokens: string
          hardiness_zones: string[] | null
          has_images: boolean
          humidity: string | null
          index_version: number
          indexed_at: string
          is_in_stock: boolean
          is_on_sale: boolean
          name_tokens: string
          plant_id: string
          plant_type: string | null
          plant_use: string[] | null
          price: number | null
          rarity: string | null
          rarity_ordinal: number
          relevance_boost: number
          sale_price: number | null
          scientific_name_tokens: string
          search_vector: unknown
          variety_tokens: string
          water: string | null
        }
        Insert: {
          category_id?: string | null
          checksum?: string | null
          climate_zones?: string[] | null
          common_name_tokens?: string
          description_tokens?: string
          difficulty?: string | null
          display_order?: number
          exposure?: string[] | null
          family_tokens?: string
          hardiness_zones?: string[] | null
          has_images?: boolean
          humidity?: string | null
          index_version?: number
          indexed_at?: string
          is_in_stock?: boolean
          is_on_sale?: boolean
          name_tokens?: string
          plant_id: string
          plant_type?: string | null
          plant_use?: string[] | null
          price?: number | null
          rarity?: string | null
          rarity_ordinal?: number
          relevance_boost?: number
          sale_price?: number | null
          scientific_name_tokens?: string
          search_vector?: unknown
          variety_tokens?: string
          water?: string | null
        }
        Update: {
          category_id?: string | null
          checksum?: string | null
          climate_zones?: string[] | null
          common_name_tokens?: string
          description_tokens?: string
          difficulty?: string | null
          display_order?: number
          exposure?: string[] | null
          family_tokens?: string
          hardiness_zones?: string[] | null
          has_images?: boolean
          humidity?: string | null
          index_version?: number
          indexed_at?: string
          is_in_stock?: boolean
          is_on_sale?: boolean
          name_tokens?: string
          plant_id?: string
          plant_type?: string | null
          plant_use?: string[] | null
          price?: number | null
          rarity?: string | null
          rarity_ordinal?: number
          relevance_boost?: number
          sale_price?: number | null
          scientific_name_tokens?: string
          search_vector?: unknown
          variety_tokens?: string
          water?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "plant_search_index_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: true
            referencedRelation: "plants"
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
      platform_metrics: {
        Row: {
          created_at: string
          id: string
          metric_name: string
          metric_type: string
          tags: Json | null
          value: number
        }
        Insert: {
          created_at?: string
          id?: string
          metric_name: string
          metric_type?: string
          tags?: Json | null
          value?: number
        }
        Update: {
          created_at?: string
          id?: string
          metric_name?: string
          metric_type?: string
          tags?: Json | null
          value?: number
        }
        Relationships: []
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
      prohibited_species: {
        Row: {
          common_name: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          notes: string | null
          region: string | null
          scientific_name: string
          status: string
        }
        Insert: {
          common_name?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          notes?: string | null
          region?: string | null
          scientific_name: string
          status?: string
        }
        Update: {
          common_name?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          notes?: string | null
          region?: string | null
          scientific_name?: string
          status?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          updated_at: string
          user_agent: string | null
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          updated_at?: string
          user_agent?: string | null
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          updated_at?: string
          user_agent?: string | null
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
      search_boost_configs: {
        Row: {
          boosts: Json
          created_at: string
          created_by: string | null
          exact_match_bonus: Json
          field_weights: Json
          id: string
          is_active: boolean
          prefix_match_bonus: number
          tie_breakers: Json
          trigram_multiplier: number
          trigram_threshold: number
          typo_tolerance: Json
          updated_at: string
          updated_by: string | null
          variant: string
        }
        Insert: {
          boosts?: Json
          created_at?: string
          created_by?: string | null
          exact_match_bonus?: Json
          field_weights?: Json
          id?: string
          is_active?: boolean
          prefix_match_bonus?: number
          tie_breakers?: Json
          trigram_multiplier?: number
          trigram_threshold?: number
          typo_tolerance?: Json
          updated_at?: string
          updated_by?: string | null
          variant?: string
        }
        Update: {
          boosts?: Json
          created_at?: string
          created_by?: string | null
          exact_match_bonus?: Json
          field_weights?: Json
          id?: string
          is_active?: boolean
          prefix_match_bonus?: number
          tie_breakers?: Json
          trigram_multiplier?: number
          trigram_threshold?: number
          typo_tolerance?: Json
          updated_at?: string
          updated_by?: string | null
          variant?: string
        }
        Relationships: []
      }
      search_click_logs: {
        Row: {
          created_at: string
          id: string
          plant_id: string
          position: number
          query_log_id: string | null
          query_text: string
          score: number | null
          session_id: string | null
          user_hash: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          plant_id: string
          position: number
          query_log_id?: string | null
          query_text: string
          score?: number | null
          session_id?: string | null
          user_hash?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          plant_id?: string
          position?: number
          query_log_id?: string | null
          query_text?: string
          score?: number | null
          session_id?: string | null
          user_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "search_click_logs_query_log_id_fkey"
            columns: ["query_log_id"]
            isOneToOne: false
            referencedRelation: "search_query_logs"
            referencedColumns: ["id"]
          },
        ]
      }
      search_facet_definitions: {
        Row: {
          allowed_values: string[] | null
          column_name: string
          created_at: string
          created_by: string | null
          display_order: number
          facet_type: string
          id: string
          is_active: boolean
          label_en: string
          label_es: string
          multi_select: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          allowed_values?: string[] | null
          column_name: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          facet_type?: string
          id?: string
          is_active?: boolean
          label_en: string
          label_es: string
          multi_select?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          allowed_values?: string[] | null
          column_name?: string
          created_at?: string
          created_by?: string | null
          display_order?: number
          facet_type?: string
          id?: string
          is_active?: boolean
          label_en?: string
          label_es?: string
          multi_select?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      search_query_logs: {
        Row: {
          ab_variant: string | null
          created_at: string
          filters: Json | null
          id: string
          is_zero_result: boolean | null
          locale: string | null
          page: number | null
          page_size: number | null
          query_normalized: string
          query_text: string
          response_time_ms: number | null
          session_id: string | null
          sort: string | null
          total_results: number
          user_hash: string | null
        }
        Insert: {
          ab_variant?: string | null
          created_at?: string
          filters?: Json | null
          id?: string
          is_zero_result?: boolean | null
          locale?: string | null
          page?: number | null
          page_size?: number | null
          query_normalized: string
          query_text: string
          response_time_ms?: number | null
          session_id?: string | null
          sort?: string | null
          total_results?: number
          user_hash?: string | null
        }
        Update: {
          ab_variant?: string | null
          created_at?: string
          filters?: Json | null
          id?: string
          is_zero_result?: boolean | null
          locale?: string | null
          page?: number | null
          page_size?: number | null
          query_normalized?: string
          query_text?: string
          response_time_ms?: number | null
          session_id?: string | null
          sort?: string | null
          total_results?: number
          user_hash?: string | null
        }
        Relationships: []
      }
      search_stopwords: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          locale: string
          word: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          locale?: string
          word: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          locale?: string
          word?: string
        }
        Relationships: []
      }
      search_synonyms: {
        Row: {
          canonical: string
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          locale: string
          synonyms: string[]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          canonical: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          locale?: string
          synonyms?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          canonical?: string
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          locale?: string
          synonyms?: string[]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      seller_addresses: {
        Row: {
          city: string
          country_code: string
          created_at: string
          id: string
          is_default: boolean
          line1: string
          line2: string | null
          postal_code: string
          region: string | null
          seller_id: string
          type: string
        }
        Insert: {
          city: string
          country_code?: string
          created_at?: string
          id?: string
          is_default?: boolean
          line1: string
          line2?: string | null
          postal_code: string
          region?: string | null
          seller_id: string
          type?: string
        }
        Update: {
          city?: string
          country_code?: string
          created_at?: string
          id?: string
          is_default?: boolean
          line1?: string
          line2?: string | null
          postal_code?: string
          region?: string | null
          seller_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_addresses_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_profiles: {
        Row: {
          country_code: string | null
          created_at: string
          document_number: string
          document_type: string
          email: string | null
          iban: string | null
          id: string
          kyc_checked_at: string | null
          kyc_ref: string | null
          legal_name: string
          payout_account_ref: string | null
          phone: string | null
          preferred_payout_method: string | null
          rejection_reason: string | null
          seller_type: string
          stripe_account_id: string | null
          stripe_onboarding_complete: boolean
          suspended: boolean
          tax_address_city: string | null
          tax_address_country: string | null
          tax_address_postal_code: string | null
          tax_address_province: string | null
          tax_address_street: string | null
          tax_id: string | null
          updated_at: string
          user_id: string
          vat_number: string | null
          verification_status: string
          verified_at: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          document_number: string
          document_type?: string
          email?: string | null
          iban?: string | null
          id?: string
          kyc_checked_at?: string | null
          kyc_ref?: string | null
          legal_name: string
          payout_account_ref?: string | null
          phone?: string | null
          preferred_payout_method?: string | null
          rejection_reason?: string | null
          seller_type?: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          suspended?: boolean
          tax_address_city?: string | null
          tax_address_country?: string | null
          tax_address_postal_code?: string | null
          tax_address_province?: string | null
          tax_address_street?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id: string
          vat_number?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          document_number?: string
          document_type?: string
          email?: string | null
          iban?: string | null
          id?: string
          kyc_checked_at?: string | null
          kyc_ref?: string | null
          legal_name?: string
          payout_account_ref?: string | null
          phone?: string | null
          preferred_payout_method?: string | null
          rejection_reason?: string | null
          seller_type?: string
          stripe_account_id?: string | null
          stripe_onboarding_complete?: boolean
          suspended?: boolean
          tax_address_city?: string | null
          tax_address_country?: string | null
          tax_address_postal_code?: string | null
          tax_address_province?: string | null
          tax_address_street?: string | null
          tax_id?: string | null
          updated_at?: string
          user_id?: string
          vat_number?: string | null
          verification_status?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      seller_verifications: {
        Row: {
          check_type: string
          created_at: string
          id: string
          notes: string | null
          provider: string
          reference: string | null
          seller_id: string
          status: string
        }
        Insert: {
          check_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          provider?: string
          reference?: string | null
          seller_id: string
          status?: string
        }
        Update: {
          check_type?: string
          created_at?: string
          id?: string
          notes?: string | null
          provider?: string
          reference?: string | null
          seller_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "seller_verifications_seller_id_fkey"
            columns: ["seller_id"]
            isOneToOne: false
            referencedRelation: "seller_profiles"
            referencedColumns: ["id"]
          },
        ]
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
      shipping_details: {
        Row: {
          address_line1: string
          address_line2: string | null
          auction_id: string | null
          buyer_user_id: string
          carrier: string | null
          city: string
          country: string
          created_at: string
          delivered_at: string | null
          id: string
          lot_id: string | null
          postal_code: string
          region: string | null
          shipped_at: string | null
          shipping_cost_cents: number
          tracking_number: string | null
          updated_at: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          auction_id?: string | null
          buyer_user_id: string
          carrier?: string | null
          city: string
          country?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          lot_id?: string | null
          postal_code: string
          region?: string | null
          shipped_at?: string | null
          shipping_cost_cents?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          auction_id?: string | null
          buyer_user_id?: string
          carrier?: string | null
          city?: string
          country?: string
          created_at?: string
          delivered_at?: string | null
          id?: string
          lot_id?: string | null
          postal_code?: string
          region?: string | null
          shipped_at?: string | null
          shipping_cost_cents?: number
          tracking_number?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "shipping_details_auction_id_fkey"
            columns: ["auction_id"]
            isOneToOne: false
            referencedRelation: "auctions"
            referencedColumns: ["id"]
          },
        ]
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
      stock_reservations: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          plant_id: string
          quantity: number
          session_id: string
          status: string
          stripe_payment_intent_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          plant_id: string
          quantity: number
          session_id: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          plant_id?: string
          quantity?: number
          session_id?: string
          status?: string
          stripe_payment_intent_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stock_reservations_plant_id_fkey"
            columns: ["plant_id"]
            isOneToOne: false
            referencedRelation: "plants"
            referencedColumns: ["id"]
          },
        ]
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
      synonym_dictionary: {
        Row: {
          created_at: string
          created_by: string | null
          entry_type: string
          group_label: string | null
          id: string
          is_active: boolean
          language: string
          source_term: string
          target_terms: string[]
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          entry_type?: string
          group_label?: string | null
          id?: string
          is_active?: boolean
          language?: string
          source_term: string
          target_terms?: string[]
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          entry_type?: string
          group_label?: string | null
          id?: string
          is_active?: boolean
          language?: string
          source_term?: string
          target_terms?: string[]
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: []
      }
      synonym_versions: {
        Row: {
          applied_at: string
          checksum: string | null
          entry_count: number
          id: string
          version: number
        }
        Insert: {
          applied_at?: string
          checksum?: string | null
          entry_count?: number
          id?: string
          version?: number
        }
        Update: {
          applied_at?: string
          checksum?: string | null
          entry_count?: number
          id?: string
          version?: number
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
      webhook_events: {
        Row: {
          created_at: string
          error_message: string | null
          event_type: string
          id: string
          payload_snapshot: Json
          processed_at: string
          processing_result: string
          stripe_event_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          event_type: string
          id?: string
          payload_snapshot?: Json
          processed_at?: string
          processing_result?: string
          stripe_event_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          event_type?: string
          id?: string
          payload_snapshot?: Json
          processed_at?: string
          processing_result?: string
          stripe_event_id?: string
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
      search_metrics_daily: {
        Row: {
          ab_variant: string | null
          avg_response_ms: number | null
          avg_results: number | null
          day: string | null
          p95_response_ms: number | null
          total_queries: number | null
          unique_queries: number | null
          unique_users: number | null
          zero_result_queries: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      bump_synonym_version: { Args: never; Returns: number }
      calculate_backoff: { Args: { p_attempts: number }; Returns: unknown }
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
      cleanup_completed_jobs: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      cleanup_search_logs: {
        Args: { p_retention_days?: number }
        Returns: number
      }
      close_ended_auctions: { Args: never; Returns: number }
      compute_relevance_boost: {
        Args: {
          p_is_featured: boolean
          p_product_images: string[]
          p_sale_price: number
          p_stock_qty: number
        }
        Returns: number
      }
      confirm_reservation_by_session: {
        Args: { p_payment_intent_id?: string; p_session_id: string }
        Returns: number
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
      decrement_stock: {
        Args: { p_plant_id: string; p_quantity: number }
        Returns: number
      }
      dequeue_jobs: {
        Args: { p_batch_size?: number }
        Returns: {
          attempts: number
          completed_at: string | null
          created_at: string
          id: string
          idempotency_key: string | null
          job_type: string
          last_error: string | null
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          priority: number
          scheduled_at: string
          started_at: string | null
          status: string
          updated_at: string
        }[]
        SetofOptions: {
          from: "*"
          to: "job_queue"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      emit_metric: {
        Args: {
          p_name: string
          p_tags?: Json
          p_type?: string
          p_value?: number
        }
        Returns: undefined
      }
      enqueue_job:
        | {
            Args: {
              p_delay_seconds?: number
              p_idempotency_key?: string
              p_job_type: string
              p_max_attempts?: number
              p_payload?: Json
              p_priority?: number
            }
            Returns: string
          }
        | {
            Args: {
              p_idempotency_key?: string
              p_job_type: string
              p_max_attempts?: number
              p_payload?: Json
              p_priority?: number
              p_scheduled_at?: string
            }
            Returns: string
          }
      enqueue_reindex_job: {
        Args: { p_plant_ids: string[] }
        Returns: undefined
      }
      full_reindex_catalog: { Args: { p_batch_size?: number }; Returns: Json }
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
      get_auction_terms_version: { Args: never; Returns: string }
      get_metric_aggregate: {
        Args: {
          p_agg?: string
          p_name: string
          p_tags_filter?: Json
          p_window_minutes: number
        }
        Returns: number
      }
      get_public_shared_list_by_slug: {
        Args: { p_slug: string }
        Returns: Json
      }
      get_referral_setting: { Args: { setting_key: string }; Returns: Json }
      get_search_analytics: {
        Args: { p_days?: number; p_limit?: number }
        Returns: Json
      }
      has_auction_consent: {
        Args: { p_consent_type: string; p_user_id: string }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      increment_stock: {
        Args: { p_plant_id: string; p_quantity: number }
        Returns: undefined
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
      log_audit_event: {
        Args: {
          p_action: string
          p_actor_id: string
          p_actor_role: string
          p_entity_id: string
          p_entity_type: string
          p_metadata?: Json
          p_new_data?: Json
          p_old_data?: Json
        }
        Returns: string
      }
      match_wishlist_to_order: {
        Args: { p_order_id: string; p_user_id: string }
        Returns: number
      }
      mature_pending_rewards: { Args: never; Returns: number }
      owns_plant: { Args: { plant_id: string }; Returns: boolean }
      place_bid:
        | {
            Args: {
              p_amount: number
              p_auction_id: string
              p_ip_address?: string
              p_user_id: string
            }
            Returns: string
          }
        | {
            Args: {
              p_amount: number
              p_auction_id: string
              p_idempotency_key?: string
              p_ip_address?: string
              p_user_id: string
            }
            Returns: string
          }
      rarity_to_ordinal: { Args: { p_rarity: string }; Returns: number }
      reindex_plant: { Args: { p_plant_id: string }; Returns: boolean }
      release_expired_reservations: { Args: never; Returns: number }
      release_reservation: {
        Args: { p_reservation_id: string }
        Returns: boolean
      }
      release_reservations_by_session: {
        Args: { p_session_id: string }
        Returns: number
      }
      reserve_stock: {
        Args: {
          p_plant_id: string
          p_quantity: number
          p_session_id: string
          p_ttl_minutes?: number
          p_user_id?: string
        }
        Returns: string
      }
      retry_dead_letter: {
        Args: { p_dead_letter_id: string; p_max_attempts?: number }
        Returns: string
      }
      search_catalog:
        | {
            Args: {
              p_category_id?: string
              p_climate_zones?: string[]
              p_difficulty?: string[]
              p_exposure?: string[]
              p_hardiness_zones?: string[]
              p_humidity?: string[]
              p_in_stock?: boolean
              p_is_featured?: boolean
              p_max_price?: number
              p_min_price?: number
              p_page?: number
              p_page_size?: number
              p_plant_type?: string[]
              p_plant_use?: string[]
              p_query?: string
              p_rarity?: string[]
              p_sort?: string
              p_sort_dir?: string
              p_water?: string[]
            }
            Returns: Json
          }
        | {
            Args: {
              p_ab_variant?: string
              p_category_id?: string
              p_climate_zones?: string[]
              p_difficulty?: string[]
              p_exposure?: string[]
              p_hardiness_zones?: string[]
              p_humidity?: string[]
              p_in_stock?: boolean
              p_is_featured?: boolean
              p_max_price?: number
              p_min_price?: number
              p_page?: number
              p_page_size?: number
              p_plant_type?: string[]
              p_plant_use?: string[]
              p_query?: string
              p_rarity?: string[]
              p_sort?: string
              p_sort_dir?: string
              p_water?: string[]
            }
            Returns: Json
          }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
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
        | "pending_review"
        | "approved"
        | "rejected"
        | "changes_requested"
        | "closed"
      bid_status: "active" | "outbid" | "winning" | "won" | "cancelled"
      customer_type: "b2c" | "b2b"
      difficulty_level:
        | "easy"
        | "intermediate"
        | "advanced"
        | "beginner"
        | "expert"
      dispute_status:
        | "open"
        | "under_review"
        | "awaiting_evidence"
        | "resolved"
        | "rejected"
        | "escalated"
      dispute_type:
        | "damaged_item"
        | "wrong_item"
        | "missing_item"
        | "quality_issue"
        | "shipping_delay"
        | "billing_error"
        | "other"
        | "auction_non_delivery"
        | "auction_misrepresentation"
        | "auction_payment"
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
        "pending_review",
        "approved",
        "rejected",
        "changes_requested",
        "closed",
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
      dispute_status: [
        "open",
        "under_review",
        "awaiting_evidence",
        "resolved",
        "rejected",
        "escalated",
      ],
      dispute_type: [
        "damaged_item",
        "wrong_item",
        "missing_item",
        "quality_issue",
        "shipping_delay",
        "billing_error",
        "other",
        "auction_non_delivery",
        "auction_misrepresentation",
        "auction_payment",
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
