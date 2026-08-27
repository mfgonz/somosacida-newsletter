import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Contact } from "@/lib/database.types";

/**
 * Saved segments are stored as a rule tree, never as SQL. Rules are applied
 * through the PostgREST query builder with an allowlisted field and operator
 * set, so a tampered `definition` can only ever produce a narrower or wider
 * contact query — never arbitrary SQL.
 */

export const FIELDS = {
  email: "Email",
  first_name: "Nombre",
  last_name: "Apellido",
  company: "Empresa",
  status: "Estado",
  created_at: "Fecha de alta",
  last_emailed_at: "Último envío",
  consent_source: "Origen",
} as const;

export type SegmentField = keyof typeof FIELDS;

export const OPERATORS = {
  eq: "es igual a",
  neq: "no es",
  contains: "contiene",
  starts_with: "empieza por",
  is_set: "tiene valor",
  is_empty: "está vacío",
  before: "antes de",
  after: "después de",
} as const;

export type SegmentOperator = keyof typeof OPERATORS;

const ruleSchema = z.object({
  field: z.enum(Object.keys(FIELDS) as [SegmentField, ...SegmentField[]]),
  operator: z.enum(Object.keys(OPERATORS) as [SegmentOperator, ...SegmentOperator[]]),
  value: z.string().max(200).optional().default(""),
});

export const segmentDefinitionSchema = z.object({
  match: z.enum(["all", "any"]).default("all"),
  rules: z.array(ruleSchema).max(25).default([]),
  tagIds: z.array(z.string().uuid()).max(50).default([]),
  listIds: z.array(z.string().uuid()).max(50).default([]),
});

export type SegmentDefinition = z.infer<typeof segmentDefinitionSchema>;
export type SegmentRule = z.infer<typeof ruleSchema>;

export const EMPTY_SEGMENT: SegmentDefinition = {
  match: "all",
  rules: [],
  tagIds: [],
  listIds: [],
};

export function parseSegmentDefinition(input: unknown): SegmentDefinition {
  const parsed = segmentDefinitionSchema.safeParse(input);
  return parsed.success ? parsed.data : EMPTY_SEGMENT;
}

/** Escapes PostgREST `or=` filter syntax, where commas and parens are control characters. */
function escapeForOr(value: string): string {
  return value.replace(/([,().])/g, "\\$1");
}

function ruleToFilter(rule: SegmentRule): string | null {
  const { field, operator, value } = rule;
  const v = escapeForOr(value.trim());

  switch (operator) {
    case "eq":
      return `${field}.eq.${v}`;
    case "neq":
      return `${field}.neq.${v}`;
    case "contains":
      return `${field}.ilike.*${v}*`;
    case "starts_with":
      return `${field}.ilike.${v}*`;
    case "is_set":
      return `${field}.not.is.null`;
    case "is_empty":
      return `${field}.is.null`;
    case "before":
      return value ? `${field}.lt.${v}` : null;
    case "after":
      return value ? `${field}.gt.${v}` : null;
    default:
      return null;
  }
}

type Client = SupabaseClient<Database>;
/* eslint-disable @typescript-eslint/no-explicit-any */
function applyRule(query: any, rule: SegmentRule): any {
  const { field, operator } = rule;
  const value = rule.value.trim();

  switch (operator) {
    case "eq":
      return query.eq(field, value);
    case "neq":
      return query.neq(field, value);
    case "contains":
      return query.ilike(field, `%${value}%`);
    case "starts_with":
      return query.ilike(field, `${value}%`);
    case "is_set":
      return query.not(field, "is", null);
    case "is_empty":
      return query.is(field, null);
    case "before":
      return value ? query.lt(field, value) : query;
    case "after":
      return value ? query.gt(field, value) : query;
    default:
      return query;
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/**
 * Resolves a segment to the contact IDs it matches.
 * `onlySendable` restricts to contacts that may legally be emailed.
 */
export async function resolveSegment(
  supabase: Client,
  definition: SegmentDefinition,
  opts: { onlySendable?: boolean; limit?: number } = {},
): Promise<{ ids: string[]; error: string | null }> {
  const { onlySendable = true, limit = 100_000 } = opts;

  let query = supabase.from("contacts").select("id").limit(limit);

  if (onlySendable) query = query.eq("status", "subscribed");

  if (definition.match === "any") {
    const filters = definition.rules
      .map(ruleToFilter)
      .filter((f): f is string => f !== null);
    if (filters.length) query = query.or(filters.join(","));
  } else {
    // Chained filters are ANDed by PostgREST, and each value is sent as a
    // separate parameter, so no escaping of the value is required here.
    for (const rule of definition.rules) {
      query = applyRule(query, rule);
    }
  }

  const { data, error } = await query;
  if (error) return { ids: [], error: error.message };

  let ids = (data ?? []).map((r) => r.id);

  // Tag and list membership are separate tables, so they are intersected in
  // application code rather than expressed as PostgREST filters.
  if (definition.tagIds.length) {
    const { data: tagged } = await supabase
      .from("contact_tags")
      .select("contact_id")
      .in("tag_id", definition.tagIds);
    const allowed = new Set((tagged ?? []).map((t) => t.contact_id));
    ids = ids.filter((id) => allowed.has(id));
  }

  if (definition.listIds.length) {
    const { data: listed } = await supabase
      .from("list_contacts")
      .select("contact_id")
      .in("list_id", definition.listIds)
      .eq("subscribed", true);
    const allowed = new Set((listed ?? []).map((l) => l.contact_id));
    ids = ids.filter((id) => allowed.has(id));
  }

  return { ids, error: null };
}

export function describeSegment(definition: SegmentDefinition): string {
  const parts: string[] = [];
  for (const r of definition.rules) {
    parts.push(`${FIELDS[r.field]} ${OPERATORS[r.operator]} ${r.value}`.trim());
  }
  if (definition.tagIds.length) parts.push(`${definition.tagIds.length} etiqueta(s)`);
  if (definition.listIds.length) parts.push(`${definition.listIds.length} lista(s)`);
  if (!parts.length) return "Todos los suscriptores";
  return parts.join(definition.match === "all" ? " y " : " o ");
}

export type { Contact };
