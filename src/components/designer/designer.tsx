"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import {
  BLOCK_TYPES,
  BLOCK_LABELS,
  createBlock,
  type Block,
  type BlockType,
  type Design,
} from "@/lib/email/blocks";
import { SortableBlock } from "./sortable-block";
import { Inspector } from "./inspector";
import { BlockPreview } from "./block-preview";

type Viewport = "desktop" | "mobile";

export function Designer({
  design,
  onChange,
}: {
  design: Design;
  onChange: (next: Design) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");

  const sensors = useSensors(
    // A small activation distance keeps a click-to-select from starting a drag.
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const selected = useMemo(
    () => design.blocks.find((b) => b.id === selectedId) ?? null,
    [design.blocks, selectedId],
  );

  const setBlocks = useCallback(
    (blocks: Block[]) => onChange({ ...design, blocks }),
    [design, onChange],
  );

  const addBlock = useCallback(
    (type: BlockType) => {
      const block = createBlock(type);
      setBlocks([...design.blocks, block]);
      setSelectedId(block.id);
    },
    [design.blocks, setBlocks],
  );

  const updateBlock = useCallback(
    (id: string, patch: Partial<Block>) => {
      setBlocks(
        design.blocks.map((b) =>
          b.id === id ? ({ ...b, ...patch } as Block) : b,
        ),
      );
    },
    [design.blocks, setBlocks],
  );

  const removeBlock = useCallback(
    (id: string) => {
      setBlocks(design.blocks.filter((b) => b.id !== id));
      setSelectedId((cur) => (cur === id ? null : cur));
    },
    [design.blocks, setBlocks],
  );

  const duplicateBlock = useCallback(
    (id: string) => {
      const index = design.blocks.findIndex((b) => b.id === id);
      if (index < 0) return;
      const source = design.blocks[index];
      const copy = { ...source, id: createBlock(source.type).id } as Block;
      const next = [...design.blocks];
      next.splice(index + 1, 0, copy);
      setBlocks(next);
      setSelectedId(copy.id);
    },
    [design.blocks, setBlocks],
  );

  function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = design.blocks.findIndex((b) => b.id === active.id);
    const to = design.blocks.findIndex((b) => b.id === over.id);
    if (from < 0 || to < 0) return;
    setBlocks(arrayMove(design.blocks, from, to));
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[180px_1fr_300px]">
      <aside className="lg:sticky lg:top-4 lg:self-start">
        <p className="label">Bloques</p>
        <div className="grid grid-cols-2 gap-1.5 lg:grid-cols-1">
          {BLOCK_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addBlock(type)}
              className="rounded-md border border-line bg-surface px-3 py-2 text-left text-sm font-medium transition hover:border-ink hover:bg-canvas"
            >
              + {BLOCK_LABELS[type]}
            </button>
          ))}
        </div>
      </aside>

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="label mb-0">Vista previa</p>
          <div className="flex gap-1">
            {(["desktop", "mobile"] as Viewport[]).map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setViewport(v)}
                className={`rounded px-2.5 py-1 text-xs font-medium ${
                  viewport === v ? "bg-ink text-white" : "text-muted hover:bg-canvas"
                }`}
              >
                {v === "desktop" ? "Escritorio" : "Móvil"}
              </button>
            ))}
          </div>
        </div>

        <div
          className="mx-auto rounded-lg p-4 transition-all"
          style={{
            backgroundColor: design.settings.background,
            maxWidth: viewport === "mobile" ? 380 : "100%",
          }}
        >
          <div
            className="mx-auto overflow-hidden rounded-lg"
            style={{
              backgroundColor: design.settings.surface,
              maxWidth: design.settings.contentWidth,
            }}
          >
            {design.blocks.length === 0 ? (
              <p className="px-6 py-16 text-center text-sm text-muted">
                Añade bloques desde la izquierda para empezar a diseñar.
              </p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={design.blocks.map((b) => b.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {design.blocks.map((block) => (
                    <SortableBlock
                      key={block.id}
                      block={block}
                      selected={block.id === selectedId}
                      onSelect={() => setSelectedId(block.id)}
                      onDuplicate={() => duplicateBlock(block.id)}
                      onRemove={() => removeBlock(block.id)}
                    >
                      <BlockPreview block={block} settings={design.settings} />
                    </SortableBlock>
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      </div>

      <aside className="lg:sticky lg:top-4 lg:self-start">
        <Inspector
          block={selected}
          settings={design.settings}
          onBlockChange={(patch) => selected && updateBlock(selected.id, patch)}
          onSettingsChange={(patch) =>
            onChange({ ...design, settings: { ...design.settings, ...patch } })
          }
        />
      </aside>
    </div>
  );
}
