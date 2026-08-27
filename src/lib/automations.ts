import "server-only";
import { supabaseAdmin } from "@/lib/supabase/server";
import { parseDesign } from "@/lib/email/blocks";
import { renderDesign, renderPlainText } from "@/lib/email/render";
import { buildMergeContext, loadOrgSettings, sendOne } from "@/lib/email/send";
import type { AutomationTrigger } from "@/lib/database.types";

/**
 * Enrols a contact into every active automation matching a trigger.
 * Safe to call more than once: the unique (automation_id, contact_id) index
 * means a contact can never be enrolled in the same sequence twice.
 */
export async function triggerAutomations(params: {
  trigger: AutomationTrigger;
  contactId: string;
  tagId?: string;
  listId?: string;
  formSlug?: string;
}) {
  const db = supabaseAdmin();

  const { data: automations } = await db
    .from("automations")
    .select("id,trigger_config")
    .eq("trigger_type", params.trigger)
    .eq("is_active", true);

  if (!automations?.length) return;

  for (const automation of automations) {
    const config = (automation.trigger_config ?? {}) as Record<string, string>;

    // A trigger scoped to a specific tag/list/form only fires for that one.
    if (config.tagId && config.tagId !== params.tagId) continue;
    if (config.listId && config.listId !== params.listId) continue;
    if (config.formSlug && config.formSlug !== params.formSlug) continue;

    await db.from("automation_enrollments").upsert(
      {
        automation_id: automation.id,
        contact_id: params.contactId,
        current_step: 0,
        next_run_at: new Date().toISOString(),
        status: "active",
      },
      { onConflict: "automation_id,contact_id", ignoreDuplicates: true },
    );
  }
}

/** Advances due enrolments by one step. Called by the cron worker. */
export async function processAutomations(limit = 50) {
  const db = supabaseAdmin();
  const org = await loadOrgSettings();
  const now = new Date().toISOString();

  const { data: due } = await db
    .from("automation_enrollments")
    .select("id,automation_id,contact_id,current_step")
    .eq("status", "active")
    .lte("next_run_at", now)
    .limit(limit);

  if (!due?.length) return { processed: 0 };

  let processed = 0;

  for (const enrollment of due) {
    const { data: step } = await db
      .from("automation_steps")
      .select("*")
      .eq("automation_id", enrollment.automation_id)
      .eq("position", enrollment.current_step)
      .maybeSingle();

    // No step at this position means the sequence is finished.
    if (!step) {
      await db
        .from("automation_enrollments")
        .update({ status: "completed" })
        .eq("id", enrollment.id);
      continue;
    }

    const { data: contact } = await db
      .from("contacts")
      .select("id,email,first_name,last_name,company,status")
      .eq("id", enrollment.contact_id)
      .single();

    // Someone who left the list mid-sequence must not receive the rest of it.
    if (!contact || contact.status !== "subscribed") {
      await db
        .from("automation_enrollments")
        .update({ status: "cancelled" })
        .eq("id", enrollment.id);
      continue;
    }

    const { data: suppressed } = await db
      .from("suppressions")
      .select("email")
      .eq("email", contact.email)
      .maybeSingle();

    if (suppressed) {
      await db
        .from("automation_enrollments")
        .update({ status: "cancelled" })
        .eq("id", enrollment.id);
      continue;
    }

    if (step.step_type === "email" && step.design) {
      const ctx = buildMergeContext(contact, org);
      const design = parseDesign(step.design);

      const result = await sendOne({
        to: contact.email,
        subject: (step.subject ?? "").replace(
          /\{\{\s*first_name\s*\}\}/g,
          contact.first_name ?? "",
        ),
        html: renderDesign(design, ctx),
        text: renderPlainText(design, ctx),
        fromName: org.fromName,
        fromEmail: org.fromEmail,
        replyTo: org.replyTo,
        unsubscribeUrl: ctx.oneClickUnsubscribeUrl,
      });

      if (result.ok) {
        await db.from("email_events").insert({
          contact_id: contact.id,
          event_type: "sent",
          provider_message_id: result.messageId,
          metadata: { automation_id: enrollment.automation_id },
        });
        await db
          .from("contacts")
          .update({ last_emailed_at: new Date().toISOString() })
          .eq("id", contact.id);
      }
    }

    if (step.step_type === "tag" && step.tag_id) {
      await db
        .from("contact_tags")
        .upsert(
          { contact_id: contact.id, tag_id: step.tag_id },
          { onConflict: "contact_id,tag_id", ignoreDuplicates: true },
        );
    }

    // The wait attached to the *next* step determines when we run again.
    const { data: nextStep } = await db
      .from("automation_steps")
      .select("wait_minutes")
      .eq("automation_id", enrollment.automation_id)
      .eq("position", enrollment.current_step + 1)
      .maybeSingle();

    const delayMinutes = nextStep?.wait_minutes ?? 0;

    await db
      .from("automation_enrollments")
      .update({
        current_step: enrollment.current_step + 1,
        next_run_at: new Date(Date.now() + delayMinutes * 60_000).toISOString(),
        status: nextStep ? "active" : "completed",
      })
      .eq("id", enrollment.id);

    processed += 1;
  }

  return { processed };
}
