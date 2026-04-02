import type { ScriptLine } from "../types/document";

/**
 * Extract sluglines (INT./EXT.) from raw screenplay content.
 */
export function extractSluglines(content: string): string[] {
  const lines = content.split("\n");
  const sluglines: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(INT\.|EXT\.)/i.test(trimmed) && trimmed.length > 5) {
      sluglines.push(trimmed);
    }
  }
  return sluglines;
}

/**
 * Extract sluglines from per-line ScriptLine array.
 */
export function extractSluglinesFromLines(lines: ScriptLine[]): string[] {
  return lines
    .filter((l) => l.type === "slugline" && l.text.trim().length > 3)
    .map((l) => l.text.trim());
}

/**
 * Extract character names from per-line ScriptLine array.
 */
export function extractCharactersFromLines(lines: ScriptLine[]): string[] {
  const chars = new Set<string>();
  for (const l of lines) {
    if (l.type === "character" && l.text.trim().length >= 2) {
      chars.add(l.text.trim());
    }
  }
  return Array.from(chars);
}

/**
 * Extract character names from content using heuristic:
 * ALL CAPS, 2-30 chars, no periods, not a slugline.
 */
export function extractCharacters(content: string): string[] {
  const lines = content.split("\n");
  const chars = new Set<string>();
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.length >= 2 &&
      trimmed.length <= 30 &&
      trimmed === trimmed.toUpperCase() &&
      /^[A-Z][A-Z\s]+$/.test(trimmed) &&
      !trimmed.startsWith("INT.") &&
      !trimmed.startsWith("EXT.")
    ) {
      chars.add(trimmed);
    }
  }
  return Array.from(chars);
}

type LineType = "slugline" | "character" | "dialogue" | "action";

interface ParsedLine {
  text: string;
  type: LineType;
}

/**
 * Parse raw screenplay text into typed lines for PDF export.
 */
export function parseScreenplayLines(content: string): ParsedLine[] {
  const lines = content.split("\n");
  const result: ParsedLine[] = [];
  let prevType: LineType = "action";

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (trimmed === "") {
      result.push({ text: "", type: "action" });
      continue;
    }

    if (/^(INT\.|EXT\.)/i.test(trimmed)) {
      result.push({ text: trimmed, type: "slugline" });
      prevType = "slugline";
    } else if (
      trimmed === trimmed.toUpperCase() &&
      /^[A-Z][A-Z\s]+$/.test(trimmed) &&
      trimmed.length <= 30 &&
      !trimmed.startsWith("INT.") &&
      !trimmed.startsWith("EXT.")
    ) {
      result.push({ text: trimmed, type: "character" });
      prevType = "character";
    } else if (prevType === "character" || prevType === "dialogue") {
      result.push({ text: trimmed, type: "dialogue" });
      prevType = "dialogue";
    } else {
      result.push({ text: trimmed, type: "action" });
      prevType = "action";
    }
  }

  return result;
}

/**
 * Generate print-ready HTML for screenplay PDF export.
 * Industry-standard margins: 1" top/right/bottom, 1.5" left.
 * Accepts either ScriptLine[] (new) or raw content string (legacy).
 */
export function generatePrintHTML(
  title: string,
  content: string,
  lines?: ScriptLine[],
): string {
  let lineHTML: string;

  if (lines && lines.length > 0) {
    lineHTML = lines
      .map((line) => {
        if (line.text === "") return "<div style='height:12pt'></div>";
        switch (line.type) {
          case "slugline":
            return `<div style="font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-top:18pt;margin-bottom:0">${escapeHtml(line.text)}</div>`;
          case "character":
            return `<div style="text-align:center;text-transform:uppercase;margin-top:12pt;margin-bottom:0">${escapeHtml(line.text)}</div>`;
          case "dialogue":
            return `<div style="margin-left:2in;margin-right:2in;margin-top:0">${escapeHtml(line.text)}</div>`;
          case "parenthetical":
            return `<div style="margin-left:2.5in;margin-right:2.5in;font-style:italic;margin-top:0">${escapeHtml(line.text)}</div>`;
          case "transition":
            return `<div style="text-align:right;text-transform:uppercase;margin-top:12pt">${escapeHtml(line.text)}</div>`;
          case "cameraAngle":
            return `<div style="text-transform:uppercase;font-style:italic;margin-top:6pt">${escapeHtml(line.text)}</div>`;
          case "endAct":
          case "startAct":
            return `<div style="text-align:center;text-transform:uppercase;font-weight:700;margin-top:18pt;margin-bottom:18pt">${escapeHtml(line.text)}</div>`;
          default:
            return `<div style="margin-top:6pt">${escapeHtml(line.text)}</div>`;
        }
      })
      .join("\n");
  } else {
    const parsedLines = parseScreenplayLines(content);
    lineHTML = parsedLines
      .map((line) => {
        if (line.text === "") return "<div style='height:12pt'></div>";
        switch (line.type) {
          case "slugline":
            return `<div style="font-weight:700;text-transform:uppercase;letter-spacing:0.04em;margin-top:18pt;margin-bottom:0">${escapeHtml(line.text)}</div>`;
          case "character":
            return `<div style="text-align:center;text-transform:uppercase;margin-top:12pt;margin-bottom:0">${escapeHtml(line.text)}</div>`;
          case "dialogue":
            return `<div style="margin-left:2in;margin-right:2in;margin-top:0">${escapeHtml(line.text)}</div>`;
          default:
            return `<div style="margin-top:6pt">${escapeHtml(line.text)}</div>`;
        }
      })
      .join("\n");
  }

  return `
    <div style="font-family:'Courier New',Courier,monospace;font-size:12pt;line-height:1.6;margin-top:1in;margin-right:1in;margin-bottom:1in;margin-left:1.5in;color:#000">
      <h1 style="text-align:center;text-transform:uppercase;font-size:14pt;font-weight:700;margin-bottom:48pt;letter-spacing:0.1em">${escapeHtml(title)}</h1>
      ${lineHTML}
    </div>
  `;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
