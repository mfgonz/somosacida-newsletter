"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setContactTags } from "@/app/(admin)/contacts/actions";
import type { Tag } from "@/lib/database.types";

export function TagPicker({
  contactId,
  allTags,
  selectedIds,
}: {
  contactId: string;
  allTags: Tag[];
  selectedIds: string[];
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>(selectedIds);
  const [pending, start] = useTransition();

  function toggle(tagId: string) {
    const next = selected.includes(tagId)
      ? selected.filter((t) => t !== tagId)
      : [...selected, tagId];
    setSelected(next);
    start(async () => {
      await setContactTags(contactId, next);
      router.refresh();
    });
  }

  if (!allTags.length) {
    return (
      <p className="text-sm text-muted">
        No hay etiquetas todavía. Créalas en la sección Etiquetas.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5" aria-busy={pending}>
      {allTags.map((tag) => {
        const active = selected.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() => toggle(tag.id)}
            className="badge border transition"
            style={
              active
                ? { backgroundColor: tag.color, borderColor: tag.color, color: "#fff" }
                : { borderColor: "#E4E4E7", color: "#71717A" }
            }
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
