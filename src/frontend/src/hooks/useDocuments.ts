import { useCallback } from "react";
import type {
  ScreenplayElementType,
  ScriptLine,
  WritefyDocument,
  WritingMode,
} from "../types/document";
import { useLocalStorage } from "./useLocalStorage";

/** Migrate legacy content string to per-line ScriptLine array */
function migrateToLines(doc: WritefyDocument): WritefyDocument {
  if (doc.lines && doc.lines.length > 0) return doc;
  const rawLines = (doc.content || "").split("\n");
  const lines: ScriptLine[] = rawLines.map((text, i) => ({
    id: `line-${doc.id}-${i}`,
    text,
    type: "action" as ScreenplayElementType,
  }));
  return { ...doc, lines };
}

const SAMPLE_LINES: ScriptLine[] = [
  {
    id: "sl-1",
    text: "INT. ABANDONED RADIO STATION - NIGHT",
    type: "slugline",
  },
  { id: "sl-2", text: "", type: "action" },
  {
    id: "sl-3",
    text: "Dust motes float in beams of pale moonlight. Banks of equipment stand silent, abandoned.",
    type: "action",
  },
  { id: "sl-4", text: "", type: "action" },
  { id: "sl-5", text: "MARCUS", type: "character" },
  { id: "sl-6", text: "", type: "action" },
  {
    id: "sl-7",
    text: "They've been broadcasting this thing for forty years. Nobody listened.",
    type: "dialogue",
  },
  { id: "sl-8", text: "", type: "action" },
  {
    id: "sl-9",
    text: "He reaches for the transmitter. His hand trembles.",
    type: "action",
  },
  { id: "sl-10", text: "", type: "action" },
  { id: "sl-11", text: "EXT. ROOFTOP - DAWN", type: "slugline" },
  { id: "sl-12", text: "", type: "action" },
  {
    id: "sl-13",
    text: "The city spreads out below, indifferent and vast.",
    type: "action",
  },
  { id: "sl-14", text: "", type: "action" },
  { id: "sl-15", text: "FADE OUT:", type: "transition" },
];

const SECOND_LINES: ScriptLine[] = [
  { id: "el-1", text: "", type: "action" },
  {
    id: "el-2",
    text: "The morning arrived the way grief does — quietly, without announcement, settling into every corner of the room before she was fully awake.",
    type: "action",
  },
  { id: "el-3", text: "", type: "action" },
  {
    id: "el-4",
    text: "Elena pressed her palm against the cold windowpane, watching the fog swallow the harbor whole. Somewhere out there, her father's boat sat moored at the dock, waiting for a captain who would never return.",
    type: "action",
  },
  { id: "el-5", text: "", type: "action" },
  {
    id: "el-6",
    text: "She had always believed that loss was loud. She was wrong.",
    type: "action",
  },
];

const SAMPLE_DOCUMENT: WritefyDocument = {
  id: "default-1",
  title: "The Last Signal",
  mode: "screenplay",
  content: SAMPLE_LINES.map((l) => l.text).join("\n"),
  lines: SAMPLE_LINES,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const SECOND_DOCUMENT: WritefyDocument = {
  id: "default-2",
  title: "Echoes of the Quiet",
  mode: "novel",
  content: SECOND_LINES.map((l) => l.text).join("\n"),
  lines: SECOND_LINES,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

const DEFAULT_DOCUMENTS = [SAMPLE_DOCUMENT, SECOND_DOCUMENT];

export function useDocuments() {
  const [rawDocuments, setDocuments] = useLocalStorage<WritefyDocument[]>(
    "writefy_documents",
    DEFAULT_DOCUMENTS,
  );
  const [activeDocId, setActiveDocId] = useLocalStorage<string>(
    "writefy_active_doc",
    DEFAULT_DOCUMENTS[0].id,
  );

  // Migrate any legacy documents that don't have lines
  const documents = rawDocuments.map(migrateToLines);

  const activeDocument =
    documents.find((d) => d.id === activeDocId) ?? documents[0] ?? null;

  const updateDocument = useCallback(
    (id: string, updates: Partial<WritefyDocument>) => {
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id
            ? { ...doc, ...updates, updatedAt: new Date().toISOString() }
            : doc,
        ),
      );
    },
    [setDocuments],
  );

  const updateDocumentLines = useCallback(
    (id: string, lines: ScriptLine[]) => {
      const content = lines.map((l) => l.text).join("\n");
      setDocuments((prev) =>
        prev.map((doc) =>
          doc.id === id
            ? { ...doc, lines, content, updatedAt: new Date().toISOString() }
            : doc,
        ),
      );
    },
    [setDocuments],
  );

  const createDocument = useCallback(
    (mode: WritingMode = "screenplay") => {
      const id = `doc-${Date.now()}`;
      const initialLine: ScriptLine = {
        id: `line-${id}-0`,
        text: "",
        type: "action",
      };
      const newDoc: WritefyDocument = {
        id,
        title: "Untitled Script",
        content: "",
        lines: [initialLine],
        mode,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setDocuments((prev) => [newDoc, ...prev]);
      setActiveDocId(newDoc.id);
      return newDoc;
    },
    [setDocuments, setActiveDocId],
  );

  const deleteDocument = useCallback(
    (id: string) => {
      setDocuments((prev) => {
        const next = prev.filter((d) => d.id !== id);
        if (activeDocId === id && next.length > 0) {
          setActiveDocId(next[0].id);
        }
        return next;
      });
    },
    [setDocuments, setActiveDocId, activeDocId],
  );

  return {
    documents,
    activeDocument,
    activeDocId,
    setActiveDocId,
    updateDocument,
    updateDocumentLines,
    createDocument,
    deleteDocument,
  };
}
