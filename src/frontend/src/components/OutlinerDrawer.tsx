import { Progress } from "@/components/ui/progress";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Film,
  FolderOpen,
  Plus,
  Target,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useIsMobile } from "../hooks/use-mobile";
import type { ScriptLine } from "../types/document";
import { extractSluglinesFromLines } from "../utils/scriptUtils";

// ── Outline hierarchy types ──
interface SceneOutlineChapter {
  id: string;
  name: string;
  sceneIndices: number[]; // indices into sluglines array
}

interface SceneOutlineAct {
  id: string;
  name: string;
  chapters: SceneOutlineChapter[];
}

function makeId() {
  return `id-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

interface OutlinerDrawerProps {
  lines?: ScriptLine[];
  content: string;
  onScrollToSlugline: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  docId?: string;
  // Stats
  wordCount?: number;
  wph?: number;
  episodeTarget?: number;
  onSetEpisodeTarget?: (target: number) => void;
  etaLabel?: string;
  episodeProgress?: number;
}

export function OutlinerDrawer({
  lines,
  content,
  onScrollToSlugline,
  isOpen,
  onToggle,
  docId,
  wordCount = 0,
  wph = 0,
  episodeTarget = 5000,
  onSetEpisodeTarget,
  etaLabel = "∞",
  episodeProgress = 0,
}: OutlinerDrawerProps) {
  const isMobile = useIsMobile();
  const [episodeInput, setEpisodeInput] = useState(String(episodeTarget));
  const [editingTarget, setEditingTarget] = useState(false);

  // ── ACT > CHAPTER > SCENE hierarchy ──
  const storageKey = `writefy_outline_acts_${docId ?? "default"}`;
  const [acts, setActs] = useState<SceneOutlineAct[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved) as SceneOutlineAct[];
    } catch {
      // ignore parse errors
    }
    return [];
  });

  // Collapsed state for acts and chapters
  const [collapsedActs, setCollapsedActs] = useState<Set<string>>(new Set());
  const [collapsedChapters, setCollapsedChapters] = useState<Set<string>>(
    new Set(),
  );

  // Editing state for inline rename
  const [editingActId, setEditingActId] = useState<string | null>(null);
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");

  // Persist acts to localStorage when they change
  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(acts));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acts, storageKey]);

  // Reload acts when docId changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional reload on docId
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setActs(JSON.parse(saved) as SceneOutlineAct[]);
      else setActs([]);
    } catch {
      setActs([]);
    }
  }, [docId]);

  // Prefer typed lines; fall back to content parsing
  const sluglines = lines
    ? extractSluglinesFromLines(lines)
    : content
        .split("\n")
        .filter((l) => /^(INT\.|EXT\.)/i.test(l.trim()) && l.trim().length > 5)
        .map((l) => l.trim());

  const drawerWidth = isMobile ? "100vw" : "300px";

  const commitTarget = () => {
    const n = Number.parseInt(episodeInput, 10);
    if (!Number.isNaN(n) && n > 0) onSetEpisodeTarget?.(n);
    setEditingTarget(false);
  };

  // Get all scene indices assigned to any chapter
  const assignedSceneIndices = new Set(
    acts.flatMap((a) => a.chapters.flatMap((c) => c.sceneIndices)),
  );
  const _unassignedSlugs = sluglines.filter(
    (_, i) => !assignedSceneIndices.has(i),
  );

  const addAct = () => {
    const newAct: SceneOutlineAct = {
      id: makeId(),
      name: `Act ${acts.length + 1}`,
      chapters: [],
    };
    setActs((prev) => [...prev, newAct]);
  };

  const addChapter = (actId: string) => {
    setActs((prev) =>
      prev.map((a) => {
        if (a.id !== actId) return a;
        const newChapter: SceneOutlineChapter = {
          id: makeId(),
          name: `Chapter ${a.chapters.length + 1}`,
          sceneIndices: [],
        };
        return { ...a, chapters: [...a.chapters, newChapter] };
      }),
    );
  };

  const renameAct = (actId: string, name: string) => {
    setActs((prev) => prev.map((a) => (a.id === actId ? { ...a, name } : a)));
  };

  const renameChapter = (actId: string, chapterId: string, name: string) => {
    setActs((prev) =>
      prev.map((a) => {
        if (a.id !== actId) return a;
        return {
          ...a,
          chapters: a.chapters.map((c) =>
            c.id === chapterId ? { ...c, name } : c,
          ),
        };
      }),
    );
  };

  const toggleActCollapse = (actId: string) => {
    setCollapsedActs((prev) => {
      const next = new Set(prev);
      if (next.has(actId)) next.delete(actId);
      else next.add(actId);
      return next;
    });
  };

  const toggleChapterCollapse = (chapterId: string) => {
    setCollapsedChapters((prev) => {
      const next = new Set(prev);
      if (next.has(chapterId)) next.delete(chapterId);
      else next.add(chapterId);
      return next;
    });
  };

  const handleSlugClick = (slug: string) => {
    onScrollToSlugline(slug);
    if (isMobile) onToggle();
  };

  return (
    <>
      {/* Floating toggle button — desktop */}
      {!isMobile && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute flex items-center justify-center"
          style={{
            right: isOpen ? "308px" : "8px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 30,
            width: "24px",
            height: "48px",
            borderRadius: "6px",
            background: "oklch(0.15 0 0 / 90%)",
            border: "1px solid oklch(0.25 0 0)",
            color: "oklch(0.55 0 0)",
            backdropFilter: "blur(4px)",
            transition: "right 0.28s cubic-bezier(0.4,0,0.2,1), color 0.15s",
          }}
          onMouseEnter={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.color = "oklch(var(--primary))";
            btn.style.borderColor = "oklch(var(--primary) / 50%)";
          }}
          onMouseLeave={(e) => {
            const btn = e.currentTarget as HTMLButtonElement;
            btn.style.color = "oklch(0.55 0 0)";
            btn.style.borderColor = "oklch(0.25 0 0)";
          }}
          title={isOpen ? "Hide scenes panel" : "Show scenes panel"}
          aria-label={isOpen ? "Hide scenes panel" : "Show scenes panel"}
          data-ocid="outliner.toggle"
        >
          {isOpen ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      )}

      {/* Mobile: button to open drawer */}
      {isMobile && !isOpen && (
        <button
          type="button"
          onClick={onToggle}
          className="absolute flex items-center justify-center"
          style={{
            right: "8px",
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 30,
            width: "28px",
            height: "52px",
            borderRadius: "6px",
            background: "oklch(0.15 0 0 / 90%)",
            border: "1px solid oklch(0.25 0 0)",
            color: "oklch(0.55 0 0)",
            backdropFilter: "blur(4px)",
          }}
          title="Show scenes panel"
          aria-label="Show scenes panel"
          data-ocid="outliner.toggle"
        >
          <ChevronLeft size={14} />
        </button>
      )}

      {/* Backdrop for mobile */}
      <AnimatePresence>
        {isOpen && isMobile && (
          <motion.div
            key="outliner-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0"
            style={{ background: "oklch(0.05 0 0 / 75%)", zIndex: 39 }}
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Overlay panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="outliner-panel"
            initial={{ x: "100%", opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: "100%", opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="right-0 top-0 bottom-0 flex flex-col"
            style={{
              position: isMobile ? "fixed" : "absolute",
              width: drawerWidth,
              zIndex: 40,
              background: "oklch(0.10 0 0 / 97%)",
              backdropFilter: "blur(16px)",
              borderLeft: "1px solid oklch(var(--border))",
              overflowY: "auto",
            }}
            data-ocid="outliner.panel"
          >
            {/* Header */}
            <div
              className="flex-shrink-0 px-4 py-3 flex items-center justify-between"
              style={{ borderBottom: "1px solid oklch(0.18 0 0)" }}
            >
              <p
                className="text-[11px] font-bold tracking-widest uppercase"
                style={{ color: "oklch(0.55 0 0)" }}
              >
                Studio Panel
              </p>
              <button
                type="button"
                onClick={onToggle}
                className="p-1.5 rounded transition-colors"
                style={{ color: "oklch(0.45 0 0)" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "oklch(0.80 0 0)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "oklch(0.45 0 0)";
                }}
                aria-label="Close panel"
                data-ocid="outliner.close_button"
              >
                <X size={14} />
              </button>
            </div>

            {/* ── Stats Dashboard ── */}
            <div
              className="flex-shrink-0 px-4 py-4"
              style={{ borderBottom: "1px solid oklch(0.16 0 0)" }}
            >
              <div className="flex items-center gap-1.5 mb-3">
                <Target size={12} style={{ color: "oklch(var(--primary))" }} />
                <span
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: "oklch(0.50 0 0)" }}
                >
                  Writing Stats
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-3">
                <div
                  className="rounded-lg px-3 py-2"
                  style={{ background: "oklch(0.14 0 0)" }}
                >
                  <p
                    className="text-[10px]"
                    style={{ color: "oklch(0.45 0 0)" }}
                  >
                    Words
                  </p>
                  <p
                    className="text-[16px] font-bold tabular-nums"
                    style={{ color: "oklch(0.90 0 0)" }}
                  >
                    {wordCount.toLocaleString()}
                  </p>
                </div>
                <div
                  className="rounded-lg px-3 py-2"
                  style={{ background: "oklch(0.14 0 0)" }}
                >
                  <p
                    className="text-[10px]"
                    style={{ color: "oklch(0.45 0 0)" }}
                  >
                    WPH
                  </p>
                  <p
                    className="text-[16px] font-bold tabular-nums"
                    style={{
                      color:
                        wph > 0 ? "oklch(var(--primary))" : "oklch(0.38 0 0)",
                    }}
                  >
                    {wph > 0 ? wph.toLocaleString() : "—"}
                  </p>
                </div>
              </div>

              {/* Episode target */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className="text-[10px]"
                    style={{ color: "oklch(0.48 0 0)" }}
                  >
                    Goal:
                  </span>
                  {editingTarget ? (
                    <input
                      type="number"
                      value={episodeInput}
                      onChange={(e) => setEpisodeInput(e.target.value)}
                      onBlur={commitTarget}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitTarget();
                        if (e.key === "Escape") setEditingTarget(false);
                      }}
                      className="w-20 text-[11px] text-right px-2 py-0.5 rounded"
                      style={{
                        background: "oklch(0.16 0 0)",
                        color: "oklch(0.90 0 0)",
                        border: "1px solid oklch(var(--primary) / 50%)",
                      }}
                      data-ocid="outliner.input"
                    />
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEpisodeInput(String(episodeTarget));
                        setEditingTarget(true);
                      }}
                      className="text-[11px] font-semibold tabular-nums transition-colors"
                      style={{ color: "oklch(var(--primary))" }}
                      title="Click to edit target"
                      data-ocid="outliner.button"
                    >
                      {episodeTarget.toLocaleString()} words
                    </button>
                  )}
                </div>
                <Progress
                  value={episodeProgress}
                  className="h-1"
                  style={
                    { background: "oklch(0.18 0 0)" } as React.CSSProperties
                  }
                />
                <div className="flex justify-between mt-1">
                  <span
                    className="text-[10px]"
                    style={{ color: "oklch(0.40 0 0)" }}
                  >
                    {Math.round(episodeProgress)}% complete
                  </span>
                  <span
                    className="text-[10px] font-semibold"
                    style={{
                      color:
                        etaLabel === "Done!"
                          ? "oklch(0.72 0.13 142)"
                          : "oklch(0.55 0 0)",
                    }}
                  >
                    {wph === 0
                      ? "Start writing"
                      : etaLabel === "Done!"
                        ? "Done! ✓"
                        : `ETA: ${etaLabel}`}
                  </span>
                </div>
              </div>
            </div>

            {/* ── Outline: ACT > CHAPTER > SCENE ── */}
            <div
              className="flex-shrink-0 px-4 py-2"
              style={{ borderBottom: "1px solid oklch(0.15 0 0)" }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="text-[10px] font-bold tracking-widest uppercase"
                  style={{ color: "oklch(0.45 0 0)" }}
                >
                  Outline
                </p>
                <button
                  type="button"
                  onClick={addAct}
                  className="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded transition-colors"
                  style={{
                    color: "oklch(var(--primary))",
                    background: "oklch(var(--primary) / 10%)",
                    border: "1px solid oklch(var(--primary) / 25%)",
                  }}
                  title="Add Act"
                  data-ocid="outliner.button"
                >
                  <Plus size={10} /> Add Act
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Act list */}
              {acts.map((act) => {
                const isActCollapsed = collapsedActs.has(act.id);
                return (
                  <div key={act.id}>
                    {/* Act row */}
                    <div
                      className="flex items-center gap-1.5 px-3 py-2"
                      style={{
                        background: "oklch(0.13 0 0)",
                        borderBottom: "1px solid oklch(0.16 0 0)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => toggleActCollapse(act.id)}
                        className="flex-shrink-0 p-0.5"
                        style={{ color: "oklch(0.45 0 0)" }}
                        aria-label={
                          isActCollapsed ? "Expand act" : "Collapse act"
                        }
                        data-ocid="outliner.toggle"
                      >
                        {isActCollapsed ? (
                          <ChevronRight size={11} />
                        ) : (
                          <ChevronDown size={11} />
                        )}
                      </button>
                      {editingActId === act.id ? (
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onBlur={() => {
                            if (editingName.trim())
                              renameAct(act.id, editingName.trim());
                            setEditingActId(null);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              if (editingName.trim())
                                renameAct(act.id, editingName.trim());
                              setEditingActId(null);
                            }
                            if (e.key === "Escape") setEditingActId(null);
                          }}
                          className="flex-1 text-[11px] font-bold bg-transparent"
                          style={{
                            color: "oklch(0.90 0 0)",
                            borderBottom:
                              "1px solid oklch(var(--primary) / 60%)",
                          }}
                          data-ocid="outliner.input"
                        />
                      ) : (
                        <button
                          type="button"
                          className="flex-1 text-left text-[11px] font-bold"
                          style={{ color: "oklch(0.85 0 0)" }}
                          onDoubleClick={() => {
                            setEditingActId(act.id);
                            setEditingName(act.name);
                          }}
                          title="Double-click to rename"
                          data-ocid="outliner.button"
                        >
                          {act.name}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => addChapter(act.id)}
                        className="flex-shrink-0 p-1 rounded transition-colors"
                        style={{ color: "oklch(0.40 0 0)" }}
                        title="Add Chapter"
                        onMouseEnter={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "oklch(var(--primary))";
                        }}
                        onMouseLeave={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.color =
                            "oklch(0.40 0 0)";
                        }}
                        data-ocid="outliner.button"
                      >
                        <Plus size={11} />
                      </button>
                    </div>

                    {/* Chapters */}
                    {!isActCollapsed &&
                      act.chapters.map((chapter) => {
                        const isChapterCollapsed = collapsedChapters.has(
                          chapter.id,
                        );
                        const chapterSlugs = chapter.sceneIndices
                          .map((i) => sluglines[i])
                          .filter(Boolean);
                        return (
                          <div key={chapter.id}>
                            {/* Chapter row */}
                            <div
                              className="flex items-center gap-1.5 px-5 py-2"
                              style={{
                                background: "oklch(0.115 0 0)",
                                borderBottom: "1px solid oklch(0.155 0 0)",
                              }}
                            >
                              <button
                                type="button"
                                onClick={() =>
                                  toggleChapterCollapse(chapter.id)
                                }
                                className="flex-shrink-0 p-0.5"
                                style={{ color: "oklch(0.40 0 0)" }}
                                data-ocid="outliner.toggle"
                              >
                                {isChapterCollapsed ? (
                                  <ChevronRight size={10} />
                                ) : (
                                  <ChevronDown size={10} />
                                )}
                              </button>
                              <FolderOpen
                                size={10}
                                style={{
                                  color: "oklch(var(--primary))",
                                  flexShrink: 0,
                                }}
                              />
                              {editingChapterId === chapter.id ? (
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) =>
                                    setEditingName(e.target.value)
                                  }
                                  onBlur={() => {
                                    if (editingName.trim())
                                      renameChapter(
                                        act.id,
                                        chapter.id,
                                        editingName.trim(),
                                      );
                                    setEditingChapterId(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      if (editingName.trim())
                                        renameChapter(
                                          act.id,
                                          chapter.id,
                                          editingName.trim(),
                                        );
                                      setEditingChapterId(null);
                                    }
                                    if (e.key === "Escape")
                                      setEditingChapterId(null);
                                  }}
                                  className="flex-1 text-[10px] bg-transparent"
                                  style={{
                                    color: "oklch(0.80 0 0)",
                                    borderBottom:
                                      "1px solid oklch(var(--primary) / 50%)",
                                  }}
                                  data-ocid="outliner.input"
                                />
                              ) : (
                                <button
                                  type="button"
                                  className="flex-1 text-left text-[10px] font-semibold"
                                  style={{ color: "oklch(0.72 0 0)" }}
                                  onDoubleClick={() => {
                                    setEditingChapterId(chapter.id);
                                    setEditingName(chapter.name);
                                  }}
                                  title="Double-click to rename"
                                  data-ocid="outliner.button"
                                >
                                  {chapter.name}
                                </button>
                              )}
                              <span
                                className="text-[9px] tabular-nums"
                                style={{ color: "oklch(0.35 0 0)" }}
                              >
                                {chapterSlugs.length}
                              </span>
                            </div>

                            {/* Scenes in chapter */}
                            {!isChapterCollapsed &&
                              chapterSlugs.map((slug, si) => (
                                <button
                                  type="button"
                                  key={slug}
                                  onClick={() => handleSlugClick(slug)}
                                  className="w-full flex items-start gap-2 pl-10 pr-4 py-2 text-left transition-colors"
                                  style={{
                                    borderBottom: "1px solid oklch(0.12 0 0)",
                                    background: "transparent",
                                  }}
                                  onMouseEnter={(e) => {
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.background = "oklch(0.14 0 0)";
                                  }}
                                  onMouseLeave={(e) => {
                                    (
                                      e.currentTarget as HTMLButtonElement
                                    ).style.background = "transparent";
                                  }}
                                  title={slug}
                                  data-ocid={`outliner.item.${si + 1}`}
                                >
                                  <Film
                                    size={10}
                                    className="flex-shrink-0 mt-0.5"
                                    style={{ color: "oklch(var(--primary))" }}
                                  />
                                  <span
                                    className="text-[11px] leading-tight"
                                    style={{
                                      color: "oklch(0.68 0 0)",
                                      wordBreak: "break-word",
                                    }}
                                  >
                                    {slug.length > 26
                                      ? `${slug.slice(0, 26)}…`
                                      : slug}
                                  </span>
                                </button>
                              ))}
                          </div>
                        );
                      })}
                  </div>
                );
              })}

              {/* Unassigned scenes section */}
              {sluglines.length > 0 && (
                <>
                  {acts.length > 0 && (
                    <div
                      className="px-3 py-2"
                      style={{
                        background: "oklch(0.12 0 0)",
                        borderBottom: "1px solid oklch(0.16 0 0)",
                      }}
                    >
                      <p
                        className="text-[9px] font-bold tracking-widest uppercase"
                        style={{ color: "oklch(0.38 0 0)" }}
                      >
                        All Scenes ({sluglines.length})
                      </p>
                    </div>
                  )}
                  {sluglines.map((slug, i) => (
                    <button
                      type="button"
                      key={slug}
                      onClick={() => handleSlugClick(slug)}
                      className="w-full flex items-start gap-2 px-4 py-2.5 text-left transition-colors"
                      style={{
                        borderBottom: "1px solid oklch(0.13 0 0)",
                        background: "transparent",
                      }}
                      onMouseEnter={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "oklch(0.14 0 0)";
                      }}
                      onMouseLeave={(e) => {
                        (
                          e.currentTarget as HTMLButtonElement
                        ).style.background = "transparent";
                      }}
                      title={slug}
                      data-ocid={`outliner.item.${i + 1}`}
                    >
                      <Film
                        size={11}
                        className="flex-shrink-0 mt-0.5"
                        style={{ color: "oklch(var(--primary))" }}
                      />
                      <span
                        className="text-[11px] font-medium leading-tight"
                        style={{
                          color: "oklch(0.72 0 0)",
                          wordBreak: "break-word",
                        }}
                      >
                        <span
                          className="mr-1.5 font-bold tabular-nums"
                          style={{ color: "oklch(0.40 0 0)", fontSize: "10px" }}
                        >
                          {i + 1}.
                        </span>
                        {slug.length > 28 ? `${slug.slice(0, 28)}…` : slug}
                      </span>
                    </button>
                  ))}
                </>
              )}

              {sluglines.length === 0 && (
                <div
                  className="px-4 py-6 text-center"
                  style={{ color: "oklch(0.38 0 0)", fontSize: "11px" }}
                  data-ocid="outliner.empty_state"
                >
                  No scenes yet.
                  <br />
                  Add a slugline (INT./EXT.).
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
