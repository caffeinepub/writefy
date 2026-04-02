import { GripVertical, Plus, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import type { Beat } from "../types/document";

interface OutlineTabProps {
  beats: Beat[];
  sluglines: string[];
  onUpdateBeats: (beats: Beat[]) => void;
  onScrollToSlugline: (text: string) => void;
}

export function OutlineTab({
  beats,
  sluglines,
  onUpdateBeats,
  onScrollToSlugline,
}: OutlineTabProps) {
  const dragIndex = useRef<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const addBeat = () => {
    const newBeat: Beat = {
      id: `beat-${Date.now()}`,
      title: "New Beat",
      goal: "",
      conflict: "",
      sluglineRef: "",
    };
    onUpdateBeats([...beats, newBeat]);
  };

  const removeBeat = (id: string) => {
    onUpdateBeats(beats.filter((b) => b.id !== id));
  };

  const updateBeat = (id: string, field: keyof Beat, value: string) => {
    onUpdateBeats(
      beats.map((b) => (b.id === id ? { ...b, [field]: value } : b)),
    );
  };

  const handleDragStart = (idx: number) => {
    dragIndex.current = idx;
  };

  const handleDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverIdx(idx);
  };

  const handleDrop = (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    if (dragIndex.current === null || dragIndex.current === dropIdx) {
      setDragOverIdx(null);
      return;
    }
    const reordered = [...beats];
    const [moved] = reordered.splice(dragIndex.current, 1);
    reordered.splice(dropIdx, 0, moved);
    onUpdateBeats(reordered);
    dragIndex.current = null;
    setDragOverIdx(null);
  };

  const handleDragEnd = () => {
    dragIndex.current = null;
    setDragOverIdx(null);
  };

  return (
    <div
      className="flex flex-col h-full overflow-y-auto"
      style={{ background: "oklch(0.125 0 0)" }}
      data-ocid="outline.panel"
    >
      <div
        className="flex items-center justify-between px-10 pt-8 pb-5 flex-shrink-0"
        style={{ borderBottom: "1px solid oklch(var(--border))" }}
      >
        <div>
          <h2
            className="text-[22px] font-bold tracking-tight"
            style={{ color: "oklch(0.95 0 0)" }}
          >
            Beat Sheet
          </h2>
          <p className="text-[12px] mt-1" style={{ color: "oklch(0.48 0 0)" }}>
            Drag to reorder. Click a beat linked to a scene to jump there.
          </p>
        </div>
        <button
          type="button"
          onClick={addBeat}
          className="flex items-center gap-2 px-4 py-2 rounded-md text-[13px] font-semibold transition-colors"
          style={{
            background: "oklch(var(--primary))",
            color: "oklch(var(--primary-foreground))",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.opacity = "1";
          }}
          data-ocid="outline.primary_button"
        >
          <Plus size={14} />
          Add Beat
        </button>
      </div>

      <div className="px-10 py-6 flex flex-col gap-4">
        {beats.length === 0 ? (
          <div
            className="text-center py-16"
            style={{ color: "oklch(0.42 0 0)" }}
            data-ocid="outline.empty_state"
          >
            <div className="text-[40px] mb-3">🎬</div>
            <p
              className="text-[14px] font-medium"
              style={{ color: "oklch(0.55 0 0)" }}
            >
              No beats yet
            </p>
            <p className="text-[12px] mt-1">
              Start building your story structure with beat cards.
            </p>
          </div>
        ) : (
          beats.map((beat, i) => (
            <div
              key={beat.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragOver={(e) => handleDragOver(e, i)}
              onDrop={(e) => handleDrop(e, i)}
              onDragEnd={handleDragEnd}
              className="rounded-xl p-5 flex flex-col gap-3 transition-all"
              style={{
                background:
                  dragOverIdx === i ? "oklch(0.16 0 0)" : "oklch(0.145 0 0)",
                border:
                  dragOverIdx === i
                    ? "1px solid oklch(var(--primary))"
                    : "1px solid oklch(0.22 0 0)",
                cursor: "grab",
              }}
              data-ocid={`outline.item.${i + 1}`}
            >
              {/* Header row */}
              <div className="flex items-center gap-2">
                <GripVertical
                  size={16}
                  className="flex-shrink-0"
                  style={{ color: "oklch(0.38 0 0)" }}
                />
                <span
                  className="text-[11px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded"
                  style={{
                    color: "oklch(var(--primary))",
                    background: "oklch(var(--primary) / 12%)",
                  }}
                >
                  Beat {i + 1}
                </span>
                <div className="flex-1" />
                <button
                  type="button"
                  onClick={() => removeBeat(beat.id)}
                  className="p-1.5 rounded transition-colors"
                  style={{ color: "oklch(0.45 0 0)" }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(var(--destructive))";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.color =
                      "oklch(0.45 0 0)";
                  }}
                  aria-label="Delete beat"
                  data-ocid={`outline.delete_button.${i + 1}`}
                >
                  <Trash2 size={14} />
                </button>
              </div>

              {/* Title */}
              <input
                id={`beat-title-${beat.id}`}
                type="text"
                value={beat.title}
                onChange={(e) => updateBeat(beat.id, "title", e.target.value)}
                placeholder="Beat Title"
                className="w-full bg-transparent text-[15px] font-semibold"
                style={{
                  color: "oklch(0.92 0 0)",
                  borderBottom: "1px solid oklch(0.22 0 0)",
                  paddingBottom: "4px",
                }}
                data-ocid={`outline.input.${i + 1}`}
              />

              {/* Goal */}
              <div>
                <label
                  htmlFor={`beat-goal-${beat.id}`}
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1 block"
                  style={{ color: "oklch(0.48 0 0)" }}
                >
                  Goal of Scene
                </label>
                <textarea
                  id={`beat-goal-${beat.id}`}
                  value={beat.goal}
                  onChange={(e) => updateBeat(beat.id, "goal", e.target.value)}
                  placeholder="What does the character want to achieve?"
                  rows={2}
                  className="w-full bg-transparent text-[13px] rounded px-2 py-1.5"
                  style={{
                    color: "oklch(0.78 0 0)",
                    border: "1px solid oklch(0.20 0 0)",
                    resize: "vertical",
                  }}
                  data-ocid={`outline.textarea.${i + 1}`}
                />
              </div>

              {/* Conflict */}
              <div>
                <label
                  htmlFor={`beat-conflict-${beat.id}`}
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1 block"
                  style={{ color: "oklch(0.48 0 0)" }}
                >
                  Conflict
                </label>
                <textarea
                  id={`beat-conflict-${beat.id}`}
                  value={beat.conflict}
                  onChange={(e) =>
                    updateBeat(beat.id, "conflict", e.target.value)
                  }
                  placeholder="What stands in the way?"
                  rows={2}
                  className="w-full bg-transparent text-[13px] rounded px-2 py-1.5"
                  style={{
                    color: "oklch(0.78 0 0)",
                    border: "1px solid oklch(0.20 0 0)",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Scene link */}
              <div>
                <label
                  htmlFor={`beat-scene-${beat.id}`}
                  className="text-[10px] font-semibold uppercase tracking-widest mb-1 block"
                  style={{ color: "oklch(0.48 0 0)" }}
                >
                  Linked Scene
                </label>
                <div className="flex gap-2 items-center">
                  <select
                    id={`beat-scene-${beat.id}`}
                    value={beat.sluglineRef ?? ""}
                    onChange={(e) =>
                      updateBeat(beat.id, "sluglineRef", e.target.value)
                    }
                    className="flex-1 rounded text-[12px] px-2 py-1.5"
                    style={{
                      background: "oklch(0.16 0 0)",
                      color: "oklch(0.75 0 0)",
                      border: "1px solid oklch(0.22 0 0)",
                    }}
                    data-ocid={`outline.select.${i + 1}`}
                  >
                    <option value="">-- No scene linked --</option>
                    {sluglines.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {beat.sluglineRef && (
                    <button
                      type="button"
                      onClick={() => onScrollToSlugline(beat.sluglineRef!)}
                      className="px-2 py-1.5 rounded text-[11px] font-semibold flex-shrink-0 transition-colors"
                      style={{
                        background: "oklch(var(--primary) / 20%)",
                        color: "oklch(var(--primary))",
                      }}
                      data-ocid={`outline.link.${i + 1}`}
                    >
                      Jump
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
