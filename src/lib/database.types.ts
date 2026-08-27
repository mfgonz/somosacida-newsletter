/**
 * Generated from the live schema (supabase/migrations). Regenerate after any
 * migration rather than hand-editing.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type ContactStatus =
  | "pending"
  | "subscribed"
  | "unsubscribed"
  | "bounced"
  | "complained"
  | "cleaned";

export type CampaignStatus =
  | "draft"
  | "scheduled"
  | "sending"
  | "sent"
  | "paused"
  | "failed"
  | "cancelled";

export type RecipientStatus =
  | "queued"
  | "sent"
  | "delivered"
  | "bounced"
  | "complained"
  | "failed"
  | "skipped";

export type EmailEventType =
  | "sent"
  | "delivered"
  | "opened"
  | "clicked"
  | "bounced"
  | "complained"
  | "unsubscribed"
  | "failed";

export type AutomationTrigger =
  | "contact_created"
  | "tag_added"
  | "list_joined"
  | "form_submitted";

export type SuppressionReason =
  | "unsubscribed"
  | "bounced"
  | "complained"
  | "manual"
  | "invalid";

type AdminUser = {
  id: string;
  email: string;
  display_name: string | null;
  created_at: string;
}

type Contact = {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  company: string | null;
  status: ContactStatus;
  attributes: Json;
  consent_source: string | null;
  consent_at: string | null;
  consent_ip: string | null;
  consent_user_agent: string | null;
  confirmed_at: string | null;
  unsubscribed_at: string | null;
  unsubscribe_reason: string | null;
  last_emailed_at: string | null;
  created_at: string;
  updated_at: string;
}

type CustomField = {
  id: string;
  key: string;
  label: string;
  field_type: "text" | "number" | "date" | "boolean" | "select" | "url";
  options: Json;
  created_at: string;
}

type ContactNote = {
  id: string;
  contact_id: string;
  body: string;
  author_email: string | null;
  created_at: string;
}

type Tag = {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

type ContactTag = {
  contact_id: string;
  tag_id: string;
  created_at: string;
}

type List = {
  id: string;
  name: string;
  description: string | null;
  is_public: boolean;
  created_at: string;
}

type ListContact = {
  list_id: string;
  contact_id: string;
  subscribed: boolean;
  created_at: string;
}

type Segment = {
  id: string;
  name: string;
  description: string | null;
  definition: Json;
  created_at: string;
  updated_at: string;
}

type Template = {
  id: string;
  name: string;
  design: Json;
  thumbnail_url: string | null;
  is_starter: boolean;
  created_at: string;
  updated_at: string;
}

type Campaign = {
  id: string;
  name: string;
  subject: string;
  preheader: string | null;
  from_name: string | null;
  from_email: string | null;
  reply_to: string | null;
  design: Json;
  html_snapshot: string | null;
  text_snapshot: string | null;
  status: CampaignStatus;
  audience: Json;
  scheduled_at: string | null;
  send_started_at: string | null;
  sent_at: string | null;
  error_message: string | null;
  total_recipients: number;
  created_at: string;
  updated_at: string;
}

type CampaignRecipient = {
  id: string;
  campaign_id: string;
  contact_id: string;
  email: string;
  status: RecipientStatus;
  provider_message_id: string | null;
  error_message: string | null;
  sent_at: string | null;
  opened_at: string | null;
  clicked_at: string | null;
  open_count: number;
  click_count: number;
  created_at: string;
}

type EmailEvent = {
  id: string;
  contact_id: string | null;
  campaign_id: string | null;
  recipient_id: string | null;
  event_type: EmailEventType;
  provider_message_id: string | null;
  link_url: string | null;
  metadata: Json;
  occurred_at: string;
}

type Suppression = {
  email: string;
  reason: SuppressionReason;
  notes: string | null;
  created_at: string;
}

type Form = {
  id: string;
  slug: string;
  name: string;
  headline: string | null;
  description: string | null;
  button_label: string;
  success_message: string;
  fields: Json;
  target_list_ids: string[];
  target_tag_ids: string[];
  double_opt_in: boolean;
  redirect_url: string | null;
  is_active: boolean;
  submission_count: number;
  created_at: string;
  updated_at: string;
}

type Automation = {
  id: string;
  name: string;
  trigger_type: AutomationTrigger;
  trigger_config: Json;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

type AutomationStep = {
  id: string;
  automation_id: string;
  position: number;
  step_type: "wait" | "email" | "tag";
  wait_minutes: number;
  subject: string | null;
  design: Json | null;
  tag_id: string | null;
  created_at: string;
}

type AutomationEnrollment = {
  id: string;
  automation_id: string;
  contact_id: string;
  current_step: number;
  next_run_at: string;
  status: "active" | "completed" | "cancelled";
  created_at: string;
}

type AuditLogEntry = {
  id: string;
  actor_email: string | null;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  metadata: Json;
  ip: string | null;
  created_at: string;
}

type Settings = {
  id: boolean;
  organization_name: string;
  postal_address: string;
  default_from_name: string | null;
  default_from_email: string | null;
  default_reply_to: string | null;
  logo_url: string | null;
  brand_overrides: Json;
  created_at: string;
  updated_at: string;
}

/** Columns the database fills in itself and callers never supply. */
type Generated = "id" | "created_at" | "updated_at";

type TableDef<Row, Required extends keyof Row = never> = {
  Row: Row;
  Insert: Partial<Omit<Row, Required>> & Pick<Row, Required>;
  Update: Partial<Row>;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.17" };
  public: {
    Tables: {
      admin_users: TableDef<AdminUser, "email">;
      contacts: TableDef<Contact, "email">;
      custom_fields: TableDef<CustomField, "key" | "label">;
      contact_notes: TableDef<ContactNote, "contact_id" | "body">;
      tags: TableDef<Tag, "name">;
      contact_tags: TableDef<ContactTag, "contact_id" | "tag_id">;
      lists: TableDef<List, "name">;
      list_contacts: TableDef<ListContact, "list_id" | "contact_id">;
      segments: TableDef<Segment, "name">;
      templates: TableDef<Template, "name">;
      campaigns: TableDef<Campaign, "name">;
      campaign_recipients: TableDef<
        CampaignRecipient,
        "campaign_id" | "contact_id" | "email"
      >;
      email_events: TableDef<EmailEvent, "event_type">;
      suppressions: TableDef<Suppression, "email" | "reason">;
      forms: TableDef<Form, "slug" | "name">;
      automations: TableDef<Automation, "name" | "trigger_type">;
      automation_steps: TableDef<
        AutomationStep,
        "automation_id" | "position" | "step_type"
      >;
      automation_enrollments: TableDef<
        AutomationEnrollment,
        "automation_id" | "contact_id"
      >;
      audit_log: TableDef<AuditLogEntry, "action">;
      settings: TableDef<Settings>;
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      contact_status: ContactStatus;
      campaign_status: CampaignStatus;
      recipient_status: RecipientStatus;
      email_event_type: EmailEventType;
      automation_trigger: AutomationTrigger;
    };
    CompositeTypes: Record<string, never>;
  };
};

type PublicSchema = Database["public"];
type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;
export type { DatabaseWithoutInternals };

export type Tables<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof PublicSchema["Tables"]> =
  PublicSchema["Tables"][T]["Update"];

export type {
  Contact,
  Campaign,
  CampaignRecipient,
  Template,
  Tag,
  List,
  Segment,
  Form,
  Settings,
  Suppression,
  EmailEvent,
  ContactNote,
  CustomField,
  Automation,
  AutomationStep,
  AuditLogEntry,
  Generated,
};
