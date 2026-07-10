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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_email_settings: {
        Row: {
          account_id: string
          capture_replies_enabled: boolean
          default_reply_to_email: string | null
          domain_verification_status: string
          from_email: string | null
          from_name: string | null
          last_test_sent_at: string | null
          outbound_suspended: boolean
          reply_routing_mode: string
          resend_domain_id: string | null
          sending_domain: string | null
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          capture_replies_enabled?: boolean
          default_reply_to_email?: string | null
          domain_verification_status?: string
          from_email?: string | null
          from_name?: string | null
          last_test_sent_at?: string | null
          outbound_suspended?: boolean
          reply_routing_mode?: string
          resend_domain_id?: string | null
          sending_domain?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          capture_replies_enabled?: boolean
          default_reply_to_email?: string | null
          domain_verification_status?: string
          from_email?: string | null
          from_name?: string | null
          last_test_sent_at?: string | null
          outbound_suspended?: boolean
          reply_routing_mode?: string
          resend_domain_id?: string | null
          sending_domain?: string | null
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_email_settings_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      account_members: {
        Row: {
          account_id: string
          client_id: string | null
          created_at: string
          from_display_name: string | null
          from_email_local_part: string | null
          job_function: string | null
          lead_visibility: string
          max_open_leads: number | null
          onboarding_tour_completed_at: string | null
          role: string
          user_id: string
        }
        Insert: {
          account_id: string
          client_id?: string | null
          created_at?: string
          from_display_name?: string | null
          from_email_local_part?: string | null
          job_function?: string | null
          lead_visibility?: string
          max_open_leads?: number | null
          onboarding_tour_completed_at?: string | null
          role?: string
          user_id: string
        }
        Update: {
          account_id?: string
          client_id?: string | null
          created_at?: string
          from_display_name?: string | null
          from_email_local_part?: string | null
          job_function?: string | null
          lead_visibility?: string
          max_open_leads?: number | null
          onboarding_tour_completed_at?: string | null
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "account_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts: {
        Row: {
          created_at: string
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      activities: {
        Row: {
          account_id: string
          actor_user_id: string | null
          created_at: string
          id: string
          lead_id: string
          payload: Json
          type: string
        }
        Insert: {
          account_id: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          lead_id: string
          payload?: Json
          type: string
        }
        Update: {
          account_id?: string
          actor_user_id?: string | null
          created_at?: string
          id?: string
          lead_id?: string
          payload?: Json
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "activities_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          account_id: string
          contact_email: string | null
          contact_phone: string | null
          created_at: string
          drive_folder_id: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          drive_folder_id?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          contact_email?: string | null
          contact_phone?: string | null
          created_at?: string
          drive_folder_id?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          account_id: string
          company: string | null
          created_at: string
          deleted_at: string | null
          email: string | null
          email_opted_out_at: string | null
          first_name: string
          id: string
          last_name: string | null
          notes: string | null
          phone: string | null
          source: string | null
          updated_at: string
        }
        Insert: {
          account_id: string
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          email_opted_out_at?: string | null
          first_name: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Update: {
          account_id?: string
          company?: string | null
          created_at?: string
          deleted_at?: string | null
          email?: string | null
          email_opted_out_at?: string | null
          first_name?: string
          id?: string
          last_name?: string | null
          notes?: string | null
          phone?: string | null
          source?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "contacts_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_delivery_events: {
        Row: {
          account_id: string
          created_at: string
          event_type: string
          id: string
          lead_id: string | null
          payload: Json
          recipient: string | null
          resend_email_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          event_type: string
          id?: string
          lead_id?: string | null
          payload?: Json
          recipient?: string | null
          resend_email_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          event_type?: string
          id?: string
          lead_id?: string | null
          payload?: Json
          recipient?: string | null
          resend_email_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_delivery_events_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_delivery_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      email_reply_tokens: {
        Row: {
          account_id: string
          created_at: string
          expires_at: string
          lead_id: string
          outbound_activity_id: string | null
          thread_id: string
          token: string
        }
        Insert: {
          account_id: string
          created_at?: string
          expires_at?: string
          lead_id: string
          outbound_activity_id?: string | null
          thread_id: string
          token: string
        }
        Update: {
          account_id?: string
          created_at?: string
          expires_at?: string
          lead_id?: string
          outbound_activity_id?: string | null
          thread_id?: string
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_reply_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_reply_tokens_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_reply_tokens_outbound_activity_id_fkey"
            columns: ["outbound_activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
        ]
      }
      google_integrations: {
        Row: {
          access_token: string
          account_id: string
          connected_at: string
          connected_by_user_id: string | null
          connected_email: string | null
          drive_folder_id: string | null
          refresh_token: string
          token_expires_at: string
          updated_at: string
        }
        Insert: {
          access_token: string
          account_id: string
          connected_at?: string
          connected_by_user_id?: string | null
          connected_email?: string | null
          drive_folder_id?: string | null
          refresh_token: string
          token_expires_at: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          account_id?: string
          connected_at?: string
          connected_by_user_id?: string | null
          connected_email?: string | null
          drive_folder_id?: string | null
          refresh_token?: string
          token_expires_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "google_integrations_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: true
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_client_comments: {
        Row: {
          account_id: string
          author_user_id: string | null
          body: string
          client_id: string
          created_at: string
          id: string
          lead_id: string
        }
        Insert: {
          account_id: string
          author_user_id?: string | null
          body: string
          client_id: string
          created_at?: string
          id?: string
          lead_id: string
        }
        Update: {
          account_id?: string
          author_user_id?: string | null
          body?: string
          client_id?: string
          created_at?: string
          id?: string
          lead_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_client_comments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_client_comments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_client_comments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_group_members: {
        Row: {
          account_id: string
          created_at: string
          current_weight: number
          group_id: string
          user_id: string
          weight: number
        }
        Insert: {
          account_id: string
          created_at?: string
          current_weight?: number
          group_id: string
          user_id: string
          weight?: number
        }
        Update: {
          account_id?: string
          created_at?: string
          current_weight?: number
          group_id?: string
          user_id?: string
          weight?: number
        }
        Relationships: [
          {
            foreignKeyName: "lead_group_members_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_group_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "lead_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_groups: {
        Row: {
          account_id: string
          created_at: string
          id: string
          name: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_groups_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_intake_sources: {
        Row: {
          account_id: string
          created_at: string
          id: string
          name: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          name: string
          revoked_at?: string | null
          token: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          name?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_intake_sources_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_properties: {
        Row: {
          ac_condition: string | null
          account_id: string
          address_line1: string | null
          address_line2: string | null
          asking_price: number | null
          basement_type: string | null
          bathrooms: number | null
          bedrooms: number | null
          city: string | null
          condition: string | null
          contract_amount: number | null
          contract_close_date: string | null
          contract_status: string
          created_at: string
          electrical_plumbing_condition: string | null
          estimated_value: number | null
          flooring_condition: string | null
          follow_up_contact: string | null
          frame_siding_condition: string | null
          furnace_condition: string | null
          id: string
          kitchen_bath_condition: string | null
          lead_id: string
          mortgage: string | null
          motivation: string | null
          notes: string | null
          occupancy_status: string | null
          postal_code: string | null
          property_type: string | null
          roof_condition: string | null
          square_feet: number | null
          state: string | null
          tenant_duration_rent: string | null
          timeline: string | null
          updated_at: string
          updates_done: string | null
          updates_needed: string | null
          walls_condition: string | null
          water_heater_condition: string | null
          windows_condition: string | null
          work_needed: string | null
        }
        Insert: {
          ac_condition?: string | null
          account_id: string
          address_line1?: string | null
          address_line2?: string | null
          asking_price?: number | null
          basement_type?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          condition?: string | null
          contract_amount?: number | null
          contract_close_date?: string | null
          contract_status?: string
          created_at?: string
          electrical_plumbing_condition?: string | null
          estimated_value?: number | null
          flooring_condition?: string | null
          follow_up_contact?: string | null
          frame_siding_condition?: string | null
          furnace_condition?: string | null
          id?: string
          kitchen_bath_condition?: string | null
          lead_id: string
          mortgage?: string | null
          motivation?: string | null
          notes?: string | null
          occupancy_status?: string | null
          postal_code?: string | null
          property_type?: string | null
          roof_condition?: string | null
          square_feet?: number | null
          state?: string | null
          tenant_duration_rent?: string | null
          timeline?: string | null
          updated_at?: string
          updates_done?: string | null
          updates_needed?: string | null
          walls_condition?: string | null
          water_heater_condition?: string | null
          windows_condition?: string | null
          work_needed?: string | null
        }
        Update: {
          ac_condition?: string | null
          account_id?: string
          address_line1?: string | null
          address_line2?: string | null
          asking_price?: number | null
          basement_type?: string | null
          bathrooms?: number | null
          bedrooms?: number | null
          city?: string | null
          condition?: string | null
          contract_amount?: number | null
          contract_close_date?: string | null
          contract_status?: string
          created_at?: string
          electrical_plumbing_condition?: string | null
          estimated_value?: number | null
          flooring_condition?: string | null
          follow_up_contact?: string | null
          frame_siding_condition?: string | null
          furnace_condition?: string | null
          id?: string
          kitchen_bath_condition?: string | null
          lead_id?: string
          mortgage?: string | null
          motivation?: string | null
          notes?: string | null
          occupancy_status?: string | null
          postal_code?: string | null
          property_type?: string | null
          roof_condition?: string | null
          square_feet?: number | null
          state?: string | null
          tenant_duration_rent?: string | null
          timeline?: string | null
          updated_at?: string
          updates_done?: string | null
          updates_needed?: string | null
          walls_condition?: string | null
          water_heater_condition?: string | null
          windows_condition?: string | null
          work_needed?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_properties_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_properties_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_sequence_enrollments: {
        Row: {
          account_id: string
          completed_at: string | null
          created_at: string
          current_step_number: number
          enrolled_at: string
          id: string
          lead_id: string
          next_step_due_at: string | null
          sequence_id: string
          status: string
          updated_at: string
        }
        Insert: {
          account_id: string
          completed_at?: string | null
          created_at?: string
          current_step_number?: number
          enrolled_at?: string
          id?: string
          lead_id: string
          next_step_due_at?: string | null
          sequence_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          completed_at?: string | null
          created_at?: string
          current_step_number?: number
          enrolled_at?: string
          id?: string
          lead_id?: string
          next_step_due_at?: string | null
          sequence_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_sequence_enrollments_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_sequence_enrollments_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_sequence_enrollments_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tags: {
        Row: {
          account_id: string
          created_at: string
          lead_id: string
          tag_id: string
        }
        Insert: {
          account_id: string
          created_at?: string
          lead_id: string
          tag_id: string
        }
        Update: {
          account_id?: string
          created_at?: string
          lead_id?: string
          tag_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tags_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tags_tag_id_fkey"
            columns: ["tag_id"]
            isOneToOne: false
            referencedRelation: "tags"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tasks: {
        Row: {
          account_id: string
          assigned_user_id: string | null
          completed_at: string | null
          completed_by_user_id: string | null
          completion_note: string | null
          created_at: string
          created_by_user_id: string | null
          description: string | null
          due_at: string
          id: string
          lead_id: string
          next_task_id: string | null
          priority: string
          title: string
          updated_at: string
        }
        Insert: {
          account_id: string
          assigned_user_id?: string | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          completion_note?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_at: string
          id?: string
          lead_id: string
          next_task_id?: string | null
          priority?: string
          title: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          assigned_user_id?: string | null
          completed_at?: string | null
          completed_by_user_id?: string | null
          completion_note?: string | null
          created_at?: string
          created_by_user_id?: string | null
          description?: string | null
          due_at?: string
          id?: string
          lead_id?: string
          next_task_id?: string | null
          priority?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_tasks_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tasks_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_tasks_next_task_id_fkey"
            columns: ["next_task_id"]
            isOneToOne: false
            referencedRelation: "lead_tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          account_id: string
          ai_score: number | null
          ai_score_factors: Json | null
          ai_scored_at: string | null
          client_decided_at: string | null
          client_id: string | null
          client_interest_status: string | null
          contact_id: string
          created_at: string
          deleted_at: string | null
          google_doc_url: string | null
          id: string
          owner_user_id: string | null
          pipeline_stage_id: string
          qualification_status: string | null
          qualified_at: string | null
          qualified_by_user_id: string | null
          rejection_reason: string | null
          routing_group_id: string | null
          status: string
          submitted_by_user_id: string | null
          title: string
          updated_at: string
          value: number | null
        }
        Insert: {
          account_id: string
          ai_score?: number | null
          ai_score_factors?: Json | null
          ai_scored_at?: string | null
          client_decided_at?: string | null
          client_id?: string | null
          client_interest_status?: string | null
          contact_id: string
          created_at?: string
          deleted_at?: string | null
          google_doc_url?: string | null
          id?: string
          owner_user_id?: string | null
          pipeline_stage_id: string
          qualification_status?: string | null
          qualified_at?: string | null
          qualified_by_user_id?: string | null
          rejection_reason?: string | null
          routing_group_id?: string | null
          status?: string
          submitted_by_user_id?: string | null
          title: string
          updated_at?: string
          value?: number | null
        }
        Update: {
          account_id?: string
          ai_score?: number | null
          ai_score_factors?: Json | null
          ai_scored_at?: string | null
          client_decided_at?: string | null
          client_id?: string | null
          client_interest_status?: string | null
          contact_id?: string
          created_at?: string
          deleted_at?: string | null
          google_doc_url?: string | null
          id?: string
          owner_user_id?: string | null
          pipeline_stage_id?: string
          qualification_status?: string | null
          qualified_at?: string | null
          qualified_by_user_id?: string | null
          rejection_reason?: string | null
          routing_group_id?: string | null
          status?: string
          submitted_by_user_id?: string | null
          title?: string
          updated_at?: string
          value?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "leads_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_pipeline_stage_id_fkey"
            columns: ["pipeline_stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "leads_routing_group_id_fkey"
            columns: ["routing_group_id"]
            isOneToOne: false
            referencedRelation: "lead_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          account_id: string
          created_at: string
          display_order: number
          id: string
          is_lost: boolean
          is_won: boolean
          name: string
        }
        Insert: {
          account_id: string
          created_at?: string
          display_order: number
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name: string
        }
        Update: {
          account_id?: string
          created_at?: string
          display_order?: number
          id?: string
          is_lost?: boolean
          is_won?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_step_sends: {
        Row: {
          account_id: string
          activity_id: string | null
          enrollment_id: string
          id: string
          sent_at: string
          sent_by_user_id: string | null
          sequence_step_id: string
        }
        Insert: {
          account_id: string
          activity_id?: string | null
          enrollment_id: string
          id?: string
          sent_at?: string
          sent_by_user_id?: string | null
          sequence_step_id: string
        }
        Update: {
          account_id?: string
          activity_id?: string | null
          enrollment_id?: string
          id?: string
          sent_at?: string
          sent_by_user_id?: string | null
          sequence_step_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequence_step_sends_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_step_sends_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_step_sends_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "lead_sequence_enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_step_sends_sequence_step_id_fkey"
            columns: ["sequence_step_id"]
            isOneToOne: false
            referencedRelation: "sequence_steps"
            referencedColumns: ["id"]
          },
        ]
      }
      sequence_steps: {
        Row: {
          account_id: string
          body_template: string
          channel: string
          created_at: string
          delay_days: number
          id: string
          sequence_id: string
          step_number: number
          subject: string | null
        }
        Insert: {
          account_id: string
          body_template: string
          channel?: string
          created_at?: string
          delay_days?: number
          id?: string
          sequence_id: string
          step_number: number
          subject?: string | null
        }
        Update: {
          account_id?: string
          body_template?: string
          channel?: string
          created_at?: string
          delay_days?: number
          id?: string
          sequence_id?: string
          step_number?: number
          subject?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sequence_steps_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sequence_steps_sequence_id_fkey"
            columns: ["sequence_id"]
            isOneToOne: false
            referencedRelation: "sequences"
            referencedColumns: ["id"]
          },
        ]
      }
      sequences: {
        Row: {
          account_id: string
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          is_marketing: boolean
          name: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_marketing?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          is_marketing?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "sequences_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tags: {
        Row: {
          account_id: string
          color: string | null
          created_at: string
          id: string
          name: string
        }
        Insert: {
          account_id: string
          color?: string | null
          created_at?: string
          id?: string
          name: string
        }
        Update: {
          account_id?: string
          color?: string | null
          created_at?: string
          id?: string
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "tags_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      tv_display_tokens: {
        Row: {
          account_id: string
          created_at: string
          id: string
          name: string
          revoked_at: string | null
          token: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          name: string
          revoked_at?: string | null
          token?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          name?: string
          revoked_at?: string | null
          token?: string
        }
        Relationships: [
          {
            foreignKeyName: "tv_display_tokens_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      workflow_actions: {
        Row: {
          account_id: string
          action_config: Json
          action_type: string
          created_at: string
          id: string
          step_number: number
          workflow_id: string
        }
        Insert: {
          account_id: string
          action_config?: Json
          action_type: string
          created_at?: string
          id?: string
          step_number: number
          workflow_id: string
        }
        Update: {
          account_id?: string
          action_config?: Json
          action_type?: string
          created_at?: string
          id?: string
          step_number?: number
          workflow_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflow_actions_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workflow_actions_workflow_id_fkey"
            columns: ["workflow_id"]
            isOneToOne: false
            referencedRelation: "workflows"
            referencedColumns: ["id"]
          },
        ]
      }
      workflows: {
        Row: {
          account_id: string
          created_at: string
          id: string
          is_active: boolean
          name: string
          trigger_config: Json
          trigger_type: string
          updated_at: string
        }
        Insert: {
          account_id: string
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          trigger_config?: Json
          trigger_type: string
          updated_at?: string
        }
        Update: {
          account_id?: string
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          trigger_config?: Json
          trigger_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workflows_account_id_fkey"
            columns: ["account_id"]
            isOneToOne: false
            referencedRelation: "accounts"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      assign_lead_round_robin: {
        Args: { p_group_id: string; p_lead_id: string }
        Returns: string
      }
      get_account_member_profiles: {
        Args: { p_account_id: string }
        Returns: {
          email: string
          from_display_name: string
          from_email_local_part: string
          job_function: string
          lead_visibility: string
          max_open_leads: number
          role: string
          user_id: string
        }[]
      }
      get_client_portal_members: {
        Args: { p_account_id: string }
        Returns: {
          client_id: string
          client_name: string
          email: string
          user_id: string
        }[]
      }
      get_lead_owner_email: { Args: { p_lead_id: string }; Returns: string }
      get_my_client_id: { Args: { check_account_id: string }; Returns: string }
      get_related_leads: {
        Args: { p_account_id: string; p_lead_id: string; p_limit?: number }
        Returns: {
          lead_id: string
          match_reasons: string[]
          relevance: number
        }[]
      }
      is_account_admin: { Args: { check_account_id: string }; Returns: boolean }
      is_account_client: {
        Args: { check_account_id: string }
        Returns: boolean
      }
      is_account_member: {
        Args: { check_account_id: string }
        Returns: boolean
      }
      set_client_lead_interest: {
        Args: { p_lead_id: string; p_status: string }
        Returns: undefined
      }
      smart_search_digits: { Args: { p_value: string }; Returns: string }
      smart_search_leads: {
        Args: {
          p_account_id: string
          p_limit?: number
          p_owner_id?: string
          p_owner_unassigned?: boolean
          p_query: string
          p_stage_id?: string
          p_tag_id?: string
        }
        Returns: {
          lead_id: string
          match_reasons: string[]
          relevance: number
        }[]
      }
      smart_search_normalize: { Args: { p_value: string }; Returns: string }
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
