"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { Block } from "@/lib/email/blocks";
import { BLOCK_LABELS } from "@/lib/email/blocks";

export function SortableBlock({
  block,
  selected,
  onSelect,
  onDuplicate,
  onRemove,
  children,
}: {
  block: Block;
  selected: boolean;
  onSelect: () => void;
  onDuplicate: () => void;
  onRemove: () => void;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      onClick={onSelect}
      className={`group relative cursor-pointer border-2 ${
        selected ? "border-primary" : "border-transparent hover:border-line"
      }`}
    >
      {children}

      <div
        className={`absolute right-1 top-1 flex gap-0.5 rounded bg-ink/90 p-0.5 transition ${
          selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          title="Arrastrar para reordenar"
          aria-label={`Mover bloque ${BLOCK_LABELS[block.type]}`}
          className="cursor-grab px-1.5 py-0.5 text-[11px] text-white active:cursor-grabbing"
        >
          ⠿
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          title="Duplicar"
          className="px-1.5 py-0.5 text-[11px] text-white hover:text-primary"
        >
          ⧉
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          title="Eliminar"
          className="px-1.5 py-0.5 text-[11px] text-white hover:text-accent"
        >
          ✕
        </button>
      </div>

      {selected && (
        <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary-ink">
          {BLOCK_LABELS[block.type]}
        </span>
      )}
    </div>
  );
}
