import { AnimatePresence, motion } from "motion/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import type {
  Beat,
  ScreenplayElementType,
  ScriptLine,
  WritefyDocument,
} from "../types/document";
import {
  ELEMENT_AUTO_NEXT,
  ELEMENT_CYCLE,
  ELEMENT_LABELS,
  ELEMENT_META,
} from "../types/document";
import { extractSluglinesFromLines } from "../utils/scriptUtils";
import { OutlineTab } from "./OutlineTab";

export type GlowColor = "accent" | "white" | "gold" | "cyan";

export interface EditorHandle {
  scrollToSlugline: (text: string) => void;
}

interface EditorProps {
  document: WritefyDocument;
  onUpdateContent: (content: string) => void;
  onUpdateTitle: (title: string) => void;
  onUpdateBeats: (beats: Beat[]) => void;
  onUpdateLines?: (lines: ScriptLine[]) => void;
  stickyKeyboard?: boolean;
  glowIntensity?: number;
  glowColor?: GlowColor;
  glowTransparency?: number;
  activeTheme?: string;
  onViewChange?: (view: "write" | "outline") => void;
}

// Generate stable line ID
function makeLineId(): string {
  return `line-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

// ───────────────────────────────────────────────────────────────────────────────
// Per-line styling with glow customization
// ───────────────────────────────────────────────────────────────────────────────
function getLineStyle(
  type: ScreenplayElementType,
  isActive: boolean,
  glowIntensity = 60,
  glowColorKey: GlowColor = "accent",
  glowTransparency = 60,
  activeTheme = "",
): React.CSSProperties {
  const meta = ELEMENT_META[type];

  // Glow color map
  const glowColorMap: Record<GlowColor, string> = {
    accent: "oklch(var(--primary))",
    white: "rgba(255,255,255,1)",
    gold: "rgba(255,200,50,1)",
    cyan: "rgba(0,220,220,1)",
  };
  const glowColorVal = glowColorMap[glowColorKey];
  const blurPx = (glowIntensity / 100) * 14; // max 14px blur
  const alpha = glowTransparency / 100;

  // High Contrast Day theme: no glow, solid blue border-left
  if (activeTheme === "high-contrast-day") {
    return {
      fontFamily: "'Courier Prime', 'Courier New', Courier, monospace",
      fontSize: "15px",
      lineHeight: "1.7",
      color: isActive ? "#000000" : "#1a1a1a",
      background: isActive ? "rgba(26,111,232,0.08)" : "transparent",
      borderLeft: isActive ? "4px solid #1a6fe8" : "2px solid transparent",
      outline: "none",
      minHeight: "1.7em",
      padding: "1px 8px",
      wordBreak: "break-word",
      whiteSpace: "pre-wrap",
      display: "block",
      width: "100%",
      boxSizing: "border-box",
      caretColor: "#1a6fe8",
      transition: "background 0.08s ease, border-color 0.08s ease",
      fontWeight: meta.fontWeight ?? "400",
      fontStyle: meta.fontStyle ?? "normal",
      textTransform: meta.autoCaps ? "uppercase" : "none",
      textAlign: meta.textAlign ?? "left",
      paddingLeft: meta.marginLeft ?? "8px",
      paddingRight: meta.marginRight ?? "8px",
      filter: "none",
    };
  }

  // Build glow filter value with alpha
  let filterVal = "none";
  if (isActive && glowIntensity > 0 && blurPx > 0) {
    // Replace trailing 1) with alpha)
    const colorWithAlpha = glowColorVal.endsWith(")")
      ? glowColorVal.replace(/(\d*\.?\d+)\)$/, `${alpha})`)
      : glowColorVal;
    filterVal = `drop-shadow(0 0 ${blurPx}px ${colorWithAlpha})`;
  }

  const base: React.CSSProperties = {
    fontFamily: "'Courier Prime', 'Courier New', Courier, monospace",
    fontSize: "15px",
    lineHeight: "1.7",
    color: isActive ? "oklch(0.97 0 0)" : "oklch(0.88 0 0)",
    background: isActive ? "oklch(0.22 0 0 / 55%)" : "transparent",
    borderLeft: isActive
      ? "2px solid oklch(var(--primary) / 50%)"
      : "2px solid transparent",
    outline: "none",
    minHeight: "1.7em",
    padding: "1px 8px",
    wordBreak: "break-word",
    whiteSpace: "pre-wrap",
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    caretColor: "oklch(var(--primary))",
    transition:
      "background 0.08s ease, border-color 0.08s ease, filter 0.08s ease",
    textShadow: isActive ? "0 0 12px rgba(255,255,255,0.1)" : "none",
    fontWeight: meta.fontWeight ?? "400",
    fontStyle: meta.fontStyle ?? "normal",
    textTransform: meta.autoCaps ? "uppercase" : "none",
    textAlign: meta.textAlign ?? "left",
    paddingLeft: meta.marginLeft ?? "8px",
    paddingRight: meta.marginRight ?? "8px",
    filter: filterVal,
  };
  return base;
}

// ───────────────────────────────────────────────────────────────────────────────
// Single line component
// ───────────────────────────────────────────────────────────────────────────────
interface LineProps {
  line: ScriptLine;
  index: number;
  isActive: boolean;
  isScreenplay: boolean;
  glowIntensity?: number;
  glowColor?: GlowColor;
  glowTransparency?: number;
  activeTheme?: string;
  onFocus: (index: number) => void;
  onChange: (index: number, text: string) => void;
  onKeyDown: (index: number, e: React.KeyboardEvent<HTMLDivElement>) => void;
  onLineRef: (index: number, el: HTMLDivElement | null) => void;
}

function ScriptLineEditor({
  line,
  index,
  isActive,
  isScreenplay,
  glowIntensity,
  glowColor,
  glowTransparency,
  activeTheme,
  onFocus,
  onChange,
  onKeyDown,
  onLineRef,
}: LineProps) {
  const divRef = useRef<HTMLDivElement>(null);
  const isComposing = useRef(false);

  // Register ref with parent
  useEffect(() => {
    onLineRef(index, divRef.current);
    return () => onLineRef(index, null);
  }, [index, onLineRef]);

  // Only sync DOM from external state changes
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    if (el === window.document.activeElement) return;
    if (el.textContent !== line.text) {
      el.textContent = line.text;
    }
  }, [line.text]);

  const handleInput = useCallback(() => {
    if (isComposing.current) return;
    const el = divRef.current;
    if (!el) return;
    const raw = el.textContent ?? "";
    const meta = ELEMENT_META[line.type];

    if (isScreenplay && meta.autoCaps) {
      const upper = raw.toUpperCase();
      if (upper !== raw) {
        const sel = window.getSelection();
        const offset = sel?.focusOffset ?? upper.length;
        el.textContent = upper;
        const textNode = el.firstChild;
        if (textNode && sel) {
          const range = window.document.createRange();
          range.setStart(textNode, Math.min(offset, upper.length));
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
        }
        onChange(index, upper);
        return;
      }
    }
    onChange(index, raw);
  }, [index, isScreenplay, line.type, onChange]);

  const handleCompositionStart = () => {
    isComposing.current = true;
  };
  const handleCompositionEnd = () => {
    isComposing.current = false;
    handleInput();
  };

  const style = isScreenplay
    ? getLineStyle(
        line.type,
        isActive,
        glowIntensity,
        glowColor,
        glowTransparency,
        activeTheme,
      )
    : ({
        fontFamily: "Georgia, 'Times New Roman', serif",
        fontSize: "16px",
        lineHeight: "1.9",
        color: isActive ? "oklch(0.97 0 0)" : "oklch(0.88 0 0)",
        background: isActive ? "oklch(0.22 0 0 / 55%)" : "transparent",
        outline: "none",
        minHeight: "1.9em",
        padding: "1px 8px",
        wordBreak: "break-word",
        whiteSpace: "pre-wrap",
        display: "block",
        width: "100%",
        boxSizing: "border-box",
        caretColor: "oklch(var(--primary))",
        filter: isActive
          ? `drop-shadow(0 0 ${
              ((glowIntensity ?? 60) / 100) * 14
            }px oklch(var(--primary) / ${(glowTransparency ?? 60) / 100}))`
          : "none",
      } as React.CSSProperties);

  const meta = ELEMENT_META[line.type];
  const hintText = isScreenplay && isActive ? meta.hint : "";

  return (
    <div
      ref={divRef}
      contentEditable
      suppressContentEditableWarning
      data-line-index={index}
      data-line-id={line.id}
      onInput={handleInput}
      onCompositionStart={handleCompositionStart}
      onCompositionEnd={handleCompositionEnd}
      onKeyDown={(e) => onKeyDown(index, e)}
      onFocus={() => onFocus(index)}
      style={style}
      aria-label={`Line ${index + 1}: ${ELEMENT_LABELS[line.type]}`}
      data-placeholder={hintText}
      className="script-line"
    />
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// Main Editor
// ───────────────────────────────────────────────────────────────────────────────
export const Editor = forwardRef<EditorHandle, EditorProps>(function Editor(
  {
    document: doc,
    onUpdateContent,
    onUpdateTitle,
    onUpdateBeats,
    onUpdateLines,
    stickyKeyboard = false,
    glowIntensity = 60,
    glowColor = "accent",
    glowTransparency = 60,
    activeTheme = "",
    onViewChange,
  },
  ref,
) {
  const [lines, setLines] = useState<ScriptLine[]>(() => {
    if (doc.lines && doc.lines.length > 0) return doc.lines;
    return (doc.content || "").split("\n").map((text, i) => ({
      id: `line-${doc.id}-${i}`,
      text,
      type: "action" as ScreenplayElementType,
    }));
  });

  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [activeView, setActiveView] = useState<"write" | "outline">("write");
  // Keyboard inset tracking for sticky toolbar
  const [keyboardBottom, setKeyboardBottom] = useState(0);

  const titleRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const lineRefs = useRef<(HTMLDivElement | null)[]>([]);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const docIdRef = useRef(doc.id);
  docIdRef.current = doc.id;

  const isScreenplay = doc.mode === "screenplay";
  const sluglines = extractSluglinesFromLines(lines);
  const beats = doc.beats ?? [];

  // ── visualViewport listener for sticky keyboard toolbar ──
  useEffect(() => {
    if (!stickyKeyboard) {
      setKeyboardBottom(0);
      return;
    }
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const bottom = window.innerHeight - vv.height - vv.offsetTop;
      setKeyboardBottom(Math.max(0, bottom));
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    update();
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, [stickyKeyboard]);

  // ── Sync lines when doc.id changes (project switch) ──
  // biome-ignore lint/correctness/useExhaustiveDependencies: intentionally only on doc.id
  useEffect(() => {
    let incoming: ScriptLine[];
    if (doc.lines && doc.lines.length > 0) {
      incoming = doc.lines;
    } else {
      incoming = (doc.content || "").split("\n").map((text, i) => ({
        id: `line-${doc.id}-${i}`,
        text,
        type: "action" as ScreenplayElementType,
      }));
    }
    setLines(incoming);
    setActiveLineIndex(0);
  }, [doc.id]);

  useImperativeHandle(ref, () => ({
    scrollToSlugline(text: string) {
      const idx = lines.findIndex((l) => l.text.trim() === text.trim());
      if (idx >= 0) {
        const el = lineRefs.current[idx];
        if (el) {
          el.scrollIntoView({ block: "center", behavior: "smooth" });
          el.focus();
          setActiveLineIndex(idx);
        }
      }
    },
  }));

  useEffect(() => {
    if (isEditingTitle && titleRef.current) {
      titleRef.current.focus();
      titleRef.current.select();
    }
  }, [isEditingTitle]);

  // ── Persist changes (debounced) ──
  const persistLines = useCallback(
    (nextLines: ScriptLine[]) => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        const content = nextLines.map((l) => l.text).join("\n");
        onUpdateContent(content);
        onUpdateLines?.(nextLines);
      }, 300);
    },
    [onUpdateContent, onUpdateLines],
  );

  // ── moveCursorToEnd helper ──
  const moveCursorToEnd = useCallback((el: HTMLDivElement) => {
    const sel = window.getSelection();
    if (!sel) return;
    const range = window.document.createRange();
    const textNode = el.firstChild;
    if (textNode) {
      range.setStart(textNode, (textNode as Text).length);
      range.collapse(true);
    } else {
      range.setStart(el, 0);
      range.collapse(true);
    }
    sel.removeAllRanges();
    sel.addRange(range);
  }, []);

  // ── Handle line text change with INT/EXT auto-detection ──
  const handleLineChange = useCallback(
    (index: number, text: string) => {
      setLines((prev) => {
        const currentType = prev[index]?.type;
        const trimmed = text.trimStart().toUpperCase();
        const isSluglineCandidate =
          /^(INT|EXT)[.\s]/i.test(trimmed) ||
          trimmed === "INT" ||
          trimmed === "EXT";
        const newType: ScreenplayElementType =
          isSluglineCandidate && isScreenplay && currentType !== "slugline"
            ? "slugline"
            : (currentType ?? "action");
        const next = prev.map((l, i) =>
          i === index ? { ...l, text, type: newType } : l,
        );
        persistLines(next);
        return next;
      });
    },
    [persistLines, isScreenplay],
  );

  // ── Change the type of the active line ──
  const setLineType = useCallback(
    (index: number, type: ScreenplayElementType) => {
      setLines((prev) => {
        const next = prev.map((l, i) => (i === index ? { ...l, type } : l));
        persistLines(next);
        setTimeout(() => {
          const el = lineRefs.current[index];
          if (el) {
            const meta = ELEMENT_META[type];
            if (meta.autoCaps && el.textContent) {
              const upper = el.textContent.toUpperCase();
              if (upper !== el.textContent) el.textContent = upper;
            }
          }
        }, 0);
        return next;
      });
    },
    [persistLines],
  );

  // ── Focus a line ──
  const focusLine = useCallback((index: number, atEnd = false) => {
    setTimeout(() => {
      const el = lineRefs.current[index];
      if (!el) return;
      el.focus();
      const sel = window.getSelection();
      if (!sel) return;
      const range = window.document.createRange();
      const textNode = el.firstChild;
      if (textNode) {
        const pos = atEnd ? (textNode as Text).length : 0;
        range.setStart(textNode, pos);
        range.collapse(true);
      } else {
        range.setStart(el, 0);
        range.collapse(true);
      }
      sel.removeAllRanges();
      sel.addRange(range);
    }, 0);
  }, []);

  // ── Keyboard handling per line ──
  const handleLineKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLDivElement>) => {
      const currentLine = lines[index];

      // Ctrl+B: Bold
      if (e.ctrlKey && e.key === "b") {
        e.preventDefault();
        document.execCommand("bold");
        return;
      }
      // Ctrl+I: Italic
      if ((e.ctrlKey || e.metaKey) && e.key === "i") {
        e.preventDefault();
        document.execCommand("italic");
        return;
      }

      // ── Smart Slugline Spacebar logic ──
      if (e.key === " " && currentLine.type === "slugline" && isScreenplay) {
        const el = lineRefs.current[index];
        const rawText = (el?.textContent ?? "").trimEnd();

        // Auto-prefix: 'INT' → 'INT. ' or 'EXT' → 'EXT. '
        if (/^(INT|EXT)$/i.test(rawText)) {
          e.preventDefault();
          const upper = rawText.toUpperCase();
          const newText = `${upper}. `;
          if (el) {
            el.textContent = newText;
            moveCursorToEnd(el);
          }
          handleLineChange(index, newText);
          return;
        }

        // Auto-separator: if 'INT. LOCATION' (no hyphen yet), insert ' - '
        if (/^(INT|EXT)\. .+$/i.test(rawText) && !rawText.includes(" - ")) {
          e.preventDefault();
          const newText = `${rawText} - `;
          if (el) {
            el.textContent = newText;
            moveCursorToEnd(el);
          }
          handleLineChange(index, newText);
          return;
        }
      }

      // Tab: cycle element type for THIS line only
      if (e.key === "Tab" && isScreenplay) {
        e.preventDefault();
        const idx = ELEMENT_CYCLE.indexOf(currentLine.type);
        const nextType = ELEMENT_CYCLE[(idx + 1) % ELEMENT_CYCLE.length];
        setLineType(index, nextType);
        return;
      }

      // Tab in novel mode: insert spaces
      if (e.key === "Tab" && !isScreenplay) {
        e.preventDefault();
        const el = lineRefs.current[index];
        if (!el) return;
        const sel = window.getSelection();
        if (!sel?.rangeCount) return;
        const range = sel.getRangeAt(0);
        range.deleteContents();
        const spaceNode = window.document.createTextNode("    ");
        range.insertNode(spaceNode);
        range.setStartAfter(spaceNode);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        handleLineChange(index, el.textContent ?? "");
        return;
      }

      // Enter: insert new line
      if (e.key === "Enter") {
        e.preventDefault();
        const autoNext = isScreenplay
          ? ELEMENT_AUTO_NEXT[currentLine.type]
          : "action";

        const el = lineRefs.current[index];
        let textBefore = currentLine.text;
        let textAfter = "";
        if (el) {
          const sel = window.getSelection();
          if (sel?.rangeCount) {
            const range = sel.getRangeAt(0);
            const beforeRange = window.document.createRange();
            beforeRange.setStart(el, 0);
            beforeRange.setEnd(range.startContainer, range.startOffset);
            textBefore = beforeRange.toString();
            textAfter = currentLine.text.slice(textBefore.length);
          }
        }

        const newLine: ScriptLine = {
          id: makeLineId(),
          text: textAfter,
          type: autoNext,
        };

        setLines((prev) => {
          const next = [
            ...prev.slice(0, index),
            { ...prev[index], text: textBefore },
            newLine,
            ...prev.slice(index + 1),
          ];
          persistLines(next);
          return next;
        });

        setActiveLineIndex(index + 1);
        focusLine(index + 1, false);
        return;
      }

      // Backspace on empty line: remove it
      if (e.key === "Backspace") {
        const el = lineRefs.current[index];
        const isEmpty = (el?.textContent ?? "").length === 0;
        if (isEmpty && lines.length > 1) {
          e.preventDefault();
          setLines((prev) => {
            const next = prev.filter((_, i) => i !== index);
            persistLines(next);
            return next;
          });
          const prevIdx = Math.max(0, index - 1);
          setActiveLineIndex(prevIdx);
          focusLine(prevIdx, true);
          return;
        }
      }

      // Arrow Up
      if (e.key === "ArrowUp" && index > 0) {
        const el = lineRefs.current[index];
        const sel = window.getSelection();
        if (!sel?.rangeCount) return;
        const range = sel.getRangeAt(0);
        const atStart =
          range.startOffset === 0 &&
          (range.startContainer === el ||
            range.startContainer === el?.firstChild);
        if (atStart) {
          e.preventDefault();
          setActiveLineIndex(index - 1);
          focusLine(index - 1, true);
        }
        return;
      }

      // Arrow Down
      if (e.key === "ArrowDown" && index < lines.length - 1) {
        const el = lineRefs.current[index];
        const text = el?.textContent ?? "";
        const sel = window.getSelection();
        if (!sel?.rangeCount) return;
        const range = sel.getRangeAt(0);
        const atEnd =
          range.startOffset === text.length || range.startContainer === el;
        if (atEnd) {
          e.preventDefault();
          setActiveLineIndex(index + 1);
          focusLine(index + 1, false);
        }
        return;
      }
    },
    [
      lines,
      isScreenplay,
      setLineType,
      handleLineChange,
      persistLines,
      focusLine,
      moveCursorToEnd,
    ],
  );

  const handleLineRefCallback = useCallback(
    (index: number, el: HTMLDivElement | null) => {
      lineRefs.current[index] = el;
    },
    [],
  );

  const handleTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === "Escape") setIsEditingTitle(false);
  };

  const handleScrollToSlugline = useCallback(
    (text: string) => {
      setActiveView("write");
      onViewChange?.("write");
      setTimeout(() => {
        const idx = lines.findIndex((l) => l.text.trim() === text.trim());
        if (idx >= 0) {
          const el = lineRefs.current[idx];
          if (el) {
            el.scrollIntoView({ block: "center", behavior: "smooth" });
            el.focus();
            setActiveLineIndex(idx);
          }
        }
      }, 50);
    },
    [lines, onViewChange],
  );

  const activeType = lines[activeLineIndex]?.type ?? "action";
  const activeMeta = ELEMENT_META[activeType];

  // ── Toolbar ──
  const elementToolbar =
    isScreenplay && activeView === "write" ? (
      <AnimatePresence>
        <motion.div
          key="element-toolbar"
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          className="no-scrollbar"
          style={{
            display: "flex",
            alignItems: "stretch",
            overflowX: "auto",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
            touchAction: "pan-x",
            borderTop: "1px solid oklch(0.15 0 0)",
            background: "oklch(0.11 0 0)",
            padding: "0 8px",
          }}
        >
          {ELEMENT_CYCLE.map((el) => (
            <button
              type="button"
              key={el}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setLineType(activeLineIndex, el);
                focusLine(activeLineIndex, false);
              }}
              className="transition-colors"
              style={{
                flexShrink: 0,
                padding: "6px 12px",
                fontSize: "11px",
                fontWeight: activeType === el ? "700" : "500",
                color:
                  activeType === el
                    ? "oklch(var(--primary))"
                    : "oklch(0.48 0 0)",
                borderBottom:
                  activeType === el
                    ? "2px solid oklch(var(--primary))"
                    : "2px solid transparent",
                background: "transparent",
                whiteSpace: "nowrap",
                letterSpacing: "0.02em",
              }}
              data-ocid="editor.tab"
            >
              {ELEMENT_LABELS[el]}
            </button>
          ))}
          <span
            className="ml-auto text-[10px] px-3 py-1 flex-shrink-0 self-center"
            style={{
              color: "oklch(0.38 0 0)",
              whiteSpace: "nowrap",
            }}
          >
            Tab cycles
          </span>
        </motion.div>
      </AnimatePresence>
    ) : null;

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ background: "oklch(0.125 0 0)" }}
    >
      {/* Document header */}
      <div
        className="flex-shrink-0 px-10 pt-8 pb-4"
        style={{ borderBottom: "1px solid oklch(0.17 0 0)" }}
      >
        {isEditingTitle ? (
          <input
            ref={titleRef}
            type="text"
            value={doc.title}
            onChange={(e) => onUpdateTitle(e.target.value)}
            onBlur={() => setIsEditingTitle(false)}
            onKeyDown={handleTitleKeyDown}
            className="text-[26px] font-bold bg-transparent w-full"
            style={{
              color: "oklch(0.95 0 0)",
              borderBottom: "2px solid oklch(var(--primary))",
            }}
            data-ocid="editor.input"
          />
        ) : (
          <button
            type="button"
            className="text-[26px] font-bold cursor-text hover:opacity-80 transition-opacity truncate text-left w-full"
            style={{
              color: "oklch(0.95 0 0)",
              background: "transparent",
              border: "none",
              padding: 0,
            }}
            onClick={() => setIsEditingTitle(true)}
            title="Click to rename"
            data-ocid="editor.input"
          >
            {doc.title || "Untitled"}
          </button>
        )}
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[12px]" style={{ color: "oklch(0.48 0 0)" }}>
            {doc.mode === "screenplay" ? "Screenplay" : "Novel"}
          </span>
          <span className="text-[12px]" style={{ color: "oklch(0.30 0 0)" }}>
            ·
          </span>
          <span className="text-[12px]" style={{ color: "oklch(0.48 0 0)" }}>
            Last edited{" "}
            {new Date(doc.updatedAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        </div>
      </div>

      {/* Sticky tab bar + toolbar (non-sticky-keyboard mode) */}
      <div
        className="flex-shrink-0"
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "oklch(0.125 0 0)",
          borderBottom: "1px solid oklch(0.17 0 0)",
        }}
      >
        {/* View tabs row */}
        <div className="flex items-center px-10">
          <button
            type="button"
            onClick={() => {
              setActiveView("write");
              onViewChange?.("write");
            }}
            className="px-3 py-2.5 text-[12px] font-semibold transition-colors flex-shrink-0"
            style={{
              color:
                activeView === "write"
                  ? "oklch(var(--primary))"
                  : "oklch(0.45 0 0)",
              borderBottom:
                activeView === "write"
                  ? "2px solid oklch(var(--primary))"
                  : "2px solid transparent",
            }}
            data-ocid="editor.tab"
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveView("outline");
              onViewChange?.("outline");
            }}
            className="px-3 py-2.5 text-[12px] font-semibold transition-colors flex-shrink-0"
            style={{
              color:
                activeView === "outline"
                  ? "oklch(var(--primary))"
                  : "oklch(0.45 0 0)",
              borderBottom:
                activeView === "outline"
                  ? "2px solid oklch(var(--primary))"
                  : "2px solid transparent",
            }}
            data-ocid="editor.tab"
          >
            Outline
          </button>
        </div>

        {/* Toolbar: render here when NOT sticky-keyboard mode */}
        {!stickyKeyboard && elementToolbar}
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-y-auto" ref={editorContainerRef}>
        {activeView === "outline" ? (
          <OutlineTab
            beats={beats}
            sluglines={sluglines}
            onUpdateBeats={onUpdateBeats}
            onScrollToSlugline={handleScrollToSlugline}
          />
        ) : (
          <div
            className="py-8"
            style={{
              maxWidth: isScreenplay ? "680px" : "720px",
              margin: "0 auto",
              paddingLeft: "40px",
              paddingRight: "40px",
              paddingBottom: stickyKeyboard ? "60px" : undefined,
            }}
          >
            {/* Active element indicator */}
            {isScreenplay && (
              <div className="mb-3 flex items-center gap-2">
                <span
                  className="text-[11px] font-semibold uppercase tracking-widest px-2 py-1 rounded"
                  style={{
                    color: "oklch(var(--primary))",
                    background: "oklch(var(--primary) / 12%)",
                    border: "1px solid oklch(var(--primary) / 25%)",
                  }}
                >
                  {ELEMENT_LABELS[activeType]}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: "oklch(0.38 0 0)" }}
                >
                  {activeMeta.hint}
                </span>
              </div>
            )}

            {/* Per-line editor */}
            <div data-ocid="editor.canvas_target">
              {lines.map((line, i) => (
                <ScriptLineEditor
                  key={line.id}
                  line={line}
                  index={i}
                  isActive={i === activeLineIndex}
                  isScreenplay={isScreenplay}
                  glowIntensity={glowIntensity}
                  glowColor={glowColor}
                  glowTransparency={glowTransparency}
                  activeTheme={activeTheme}
                  onFocus={setActiveLineIndex}
                  onChange={handleLineChange}
                  onKeyDown={handleLineKeyDown}
                  onLineRef={handleLineRefCallback}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Keyboard-stuck toolbar — fixed above virtual keyboard on mobile */}
      {stickyKeyboard && isScreenplay && activeView === "write" && (
        <div
          style={{
            position: "fixed",
            bottom: `${keyboardBottom}px`,
            left: 0,
            right: 0,
            zIndex: 50,
            background: "oklch(0.11 0 0)",
            borderTop: "1px solid oklch(0.20 0 0)",
          }}
        >
          {elementToolbar}
        </div>
      )}
    </div>
  );
});
