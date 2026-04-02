import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Toaster } from "@/components/ui/sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { BottomBar } from "./components/BottomBar";
import { Editor } from "./components/Editor";
import type { EditorHandle } from "./components/Editor";
import { OutlinerDrawer } from "./components/OutlinerDrawer";
import { SettingsPanel } from "./components/SettingsPanel";
import type { GlowColor } from "./components/SettingsPanel";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { useDocuments } from "./hooks/useDocuments";
import { useFileSystem } from "./hooks/useFileSystem";
import { useTheme } from "./hooks/useTheme";
import { useWritingMetrics } from "./hooks/useWritingMetrics";
import type { Beat, ScriptLine, WritingMode } from "./types/document";
import {
  extractCharactersFromLines,
  generatePrintHTML,
} from "./utils/scriptUtils";

function computeReadTime(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const minutes = Math.ceil(words / 200);
  if (minutes < 1) return "< 1m";
  if (minutes < 60) return `${minutes}m`;
  const hrs = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hrs}hr ${mins}m` : `${hrs}hr`;
}

function computeWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export default function App() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [outlinerOpen, setOutlinerOpen] = useState(false);
  const [stickyKeyboard, setStickyKeyboard] = useState(false);

  // Glow settings
  const [glowIntensity, setGlowIntensityState] = useState<number>(() =>
    Number(localStorage.getItem("writefy_glow_intensity") ?? "60"),
  );
  const [glowColor, setGlowColorState] = useState<GlowColor>(
    () =>
      (localStorage.getItem("writefy_glow_color") as GlowColor | null) ??
      "accent",
  );
  const [glowTransparency, setGlowTransparencyState] = useState<number>(() =>
    Number(localStorage.getItem("writefy_glow_transparency") ?? "60"),
  );

  const setGlowIntensity = useCallback((v: number) => {
    setGlowIntensityState(v);
    localStorage.setItem("writefy_glow_intensity", String(v));
  }, []);
  const setGlowColor = useCallback((v: GlowColor) => {
    setGlowColorState(v);
    localStorage.setItem("writefy_glow_color", v);
  }, []);
  const setGlowTransparency = useCallback((v: number) => {
    setGlowTransparencyState(v);
    localStorage.setItem("writefy_glow_transparency", String(v));
  }, []);

  // Last saved timestamp
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Delete confirmation flow
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deleteStep, setDeleteStep] = useState<1 | 2>(1);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const {
    documents,
    activeDocument,
    activeDocId,
    setActiveDocId,
    updateDocument,
    updateDocumentLines,
    createDocument,
    deleteDocument,
  } = useDocuments();

  const { activeTheme, setTheme } = useTheme();
  const fileSystem = useFileSystem();
  const editorRef = useRef<EditorHandle>(null);

  const wordCount = useMemo(
    () => computeWordCount(activeDocument?.content ?? ""),
    [activeDocument?.content],
  );

  const readTime = useMemo(
    () => computeReadTime(activeDocument?.content ?? ""),
    [activeDocument?.content],
  );

  const characters = useMemo(
    () =>
      activeDocument?.lines
        ? extractCharactersFromLines(activeDocument.lines)
        : [],
    [activeDocument?.lines],
  );

  const metrics = useWritingMetrics(wordCount);

  // ── Hard-save interval: every 60s ──
  useEffect(() => {
    const interval = setInterval(() => {
      if (activeDocument) {
        updateDocument(activeDocument.id, {
          updatedAt: new Date().toISOString(),
        });
        setLastSaved(new Date());
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [activeDocument, updateDocument]);

  // ── Export helpers ──
  const handleExportTxt = useCallback(
    (docId?: string) => {
      const doc = docId
        ? documents.find((d) => d.id === docId)
        : activeDocument;
      if (!doc) return;
      const blob = new Blob([doc.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${doc.title.replace(/[^a-z0-9_\-. ]/gi, "_")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported as .txt");
    },
    [documents, activeDocument],
  );

  const _handleExportFountain = useCallback(
    (docId?: string) => {
      const doc = docId
        ? documents.find((d) => d.id === docId)
        : activeDocument;
      if (!doc) return;
      const blob = new Blob([doc.content], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${doc.title.replace(/[^a-z0-9_\-. ]/gi, "_")}.fountain`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Exported as .fountain");
    },
    [documents, activeDocument],
  );

  const handleExportPdf = useCallback(
    (docId?: string) => {
      const doc = docId
        ? documents.find((d) => d.id === docId)
        : activeDocument;
      if (!doc) return;
      const printHtml = generatePrintHTML(doc.title, doc.content, doc.lines);
      let printDiv = window.document.getElementById("print-target");
      if (!printDiv) {
        printDiv = window.document.createElement("div");
        printDiv.id = "print-target";
        window.document.body.appendChild(printDiv);
      }
      printDiv.innerHTML = printHtml;
      window.print();
      setTimeout(() => {
        if (printDiv) printDiv.innerHTML = "";
      }, 1000);
    },
    [documents, activeDocument],
  );

  // ── Content handlers ──
  const handleContentChange = useCallback(
    (content: string) => {
      if (!activeDocument) return;
      updateDocument(activeDocument.id, { content });
      fileSystem.saveFile(activeDocument.title, content);
      setLastSaved(new Date());
    },
    [activeDocument, updateDocument, fileSystem],
  );

  const handleLinesChange = useCallback(
    (lines: ScriptLine[]) => {
      if (!activeDocument) return;
      updateDocumentLines(activeDocument.id, lines);
      const content = lines.map((l) => l.text).join("\n");
      fileSystem.saveFile(activeDocument.title, content);
      setLastSaved(new Date());
    },
    [activeDocument, updateDocumentLines, fileSystem],
  );

  const handleTitleChange = useCallback(
    (title: string) => {
      if (activeDocument) updateDocument(activeDocument.id, { title });
    },
    [activeDocument, updateDocument],
  );

  const handleModeChange = useCallback(
    (mode: WritingMode) => {
      if (activeDocument) {
        updateDocument(activeDocument.id, { mode });
        toast.success(
          `Switched to ${mode === "screenplay" ? "Screenplay" : "Novel"} mode`,
        );
      }
    },
    [activeDocument, updateDocument],
  );

  const handleUpdateBeats = useCallback(
    (beats: Beat[]) => {
      if (activeDocument) updateDocument(activeDocument.id, { beats });
    },
    [activeDocument, updateDocument],
  );

  const handleUpdateCharacterMotes = useCallback(
    (name: string, mote: string) => {
      if (activeDocument) {
        const prev = activeDocument.characterMotes ?? {};
        updateDocument(activeDocument.id, {
          characterMotes: { ...prev, [name]: mote },
        });
      }
    },
    [activeDocument, updateDocument],
  );

  const handleScrollToSlugline = useCallback((text: string) => {
    editorRef.current?.scrollToSlugline(text);
  }, []);

  const handleNewDoc = useCallback(async () => {
    const newDoc = createDocument("screenplay");
    toast.success("New document created");
    if (fileSystem.isSupported && !fileSystem.isLinked) {
      setTimeout(async () => {
        await fileSystem.requestFolder();
        if (fileSystem.isLinked) {
          toast.success(`Linked to folder: ${fileSystem.folderName}`);
        }
      }, 400);
    } else if (fileSystem.isLinked) {
      fileSystem.saveFile(newDoc.title, "");
    }
  }, [createDocument, fileSystem]);

  const handleLinkFolder = useCallback(async () => {
    await fileSystem.requestFolder();
    if (fileSystem.folderName) {
      toast.success(`Linked to folder: ${fileSystem.folderName}`);
      if (activeDocument) {
        fileSystem.saveFile(activeDocument.title, activeDocument.content);
      }
    }
  }, [fileSystem, activeDocument]);

  // ── Delete flow ──
  const openDeleteDialog = useCallback(
    (id: string) => {
      if (documents.length <= 1) {
        toast.error("Cannot delete the last document");
        return;
      }
      setPendingDeleteId(id);
      setDeleteStep(1);
      setDeleteConfirmText("");
    },
    [documents.length],
  );

  const closeDeleteDialog = useCallback(() => {
    setPendingDeleteId(null);
    setDeleteStep(1);
    setDeleteConfirmText("");
  }, []);

  const confirmDeleteStep1 = useCallback(() => {
    setDeleteStep(2);
    setDeleteConfirmText("");
  }, []);

  const confirmDeleteStep2 = useCallback(() => {
    if (!pendingDeleteId || deleteConfirmText !== "DELETE") return;
    deleteDocument(pendingDeleteId);
    toast.success("Document deleted");
    closeDeleteDialog();
  }, [pendingDeleteId, deleteConfirmText, deleteDocument, closeDeleteDialog]);

  const pendingDeleteTitle = useMemo(
    () => documents.find((d) => d.id === pendingDeleteId)?.title ?? "",
    [documents, pendingDeleteId],
  );

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{ background: "oklch(0.08 0 0)" }}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: "oklch(0.16 0 0)",
            color: "oklch(0.90 0 0)",
            border: "1px solid oklch(0.22 0 0)",
          },
        }}
      />

      <TopBar
        onMenuToggle={() => setIsMobileMenuOpen((p) => !p)}
        isMobileMenuOpen={isMobileMenuOpen}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        folderName={fileSystem.folderName}
        isFileSystemSupported={fileSystem.isSupported}
        onLinkFolder={handleLinkFolder}
        lastSaved={lastSaved}
      />

      <div className="flex flex-1 overflow-hidden">
        <Sidebar
          documents={documents}
          activeDocId={activeDocId}
          onSelectDoc={(id) => {
            setActiveDocId(id);
            setIsMobileMenuOpen(false);
          }}
          onNewDoc={handleNewDoc}
          onDeleteDoc={openDeleteDialog}
          onExportPdf={(id) => handleExportPdf(id)}
          onExportTxt={(id) => handleExportTxt(id)}
          onRenameDoc={(id, title) => updateDocument(id, { title })}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={() => setIsMobileMenuOpen(false)}
          isFileSystemSupported={fileSystem.isSupported}
          isLinked={fileSystem.isLinked}
          folderName={fileSystem.folderName}
          onLinkFolder={handleLinkFolder}
        />

        {/* Relative container for outliner overlay */}
        <div className="flex flex-1 overflow-hidden relative">
          <main className="flex-1 overflow-hidden h-full">
            {activeDocument ? (
              <Editor
                key={activeDocument.id}
                ref={editorRef}
                document={activeDocument}
                onUpdateContent={handleContentChange}
                onUpdateTitle={handleTitleChange}
                onUpdateBeats={handleUpdateBeats}
                onUpdateLines={handleLinesChange}
                stickyKeyboard={stickyKeyboard}
                glowIntensity={glowIntensity}
                glowColor={glowColor}
                glowTransparency={glowTransparency}
                activeTheme={activeTheme}
              />
            ) : (
              <div
                className="flex items-center justify-center h-full"
                style={{ color: "oklch(0.40 0 0)" }}
                data-ocid="editor.empty_state"
              >
                <div className="text-center">
                  <div className="text-[48px] mb-4">✍️</div>
                  <p className="text-[14px]">No document selected</p>
                  <button
                    type="button"
                    onClick={handleNewDoc}
                    className="mt-4 text-[13px] font-semibold px-4 py-2 rounded-md transition-colors"
                    style={{
                      background: "oklch(var(--primary))",
                      color: "oklch(var(--primary-foreground))",
                    }}
                    data-ocid="editor.primary_button"
                  >
                    Create your first document
                  </button>
                </div>
              </div>
            )}
          </main>

          {/* Outliner Drawer */}
          {activeDocument && activeDocument.mode === "screenplay" && (
            <OutlinerDrawer
              lines={activeDocument.lines}
              content={activeDocument.content}
              onScrollToSlugline={handleScrollToSlugline}
              isOpen={outlinerOpen}
              onToggle={() => setOutlinerOpen((p) => !p)}
              docId={activeDocument.id}
              wordCount={wordCount}
              wph={metrics.wph}
              episodeTarget={metrics.episodeTarget}
              onSetEpisodeTarget={metrics.setEpisodeTarget}
              etaLabel={metrics.etaLabel}
              episodeProgress={metrics.episodeProgress}
            />
          )}
        </div>
      </div>

      {/* Bottom bar */}
      {activeDocument && (
        <BottomBar
          wordCount={wordCount}
          readTime={readTime}
          mode={activeDocument.mode}
          onModeChange={handleModeChange}
          characters={characters}
          characterMotes={activeDocument.characterMotes ?? {}}
          onUpdateCharacterMotes={handleUpdateCharacterMotes}
          documentContent={activeDocument.content}
          documentTitle={activeDocument.title}
          wph={metrics.wph}
          episodeTarget={metrics.episodeTarget}
          onSetEpisodeTarget={metrics.setEpisodeTarget}
          dailyGoal={metrics.dailyGoal}
          onSetDailyGoal={metrics.setDailyGoal}
          dailyWordsWritten={metrics.dailyWordsWritten}
          episodeProgress={metrics.episodeProgress}
          dailyProgress={metrics.dailyProgress}
          etaLabel={metrics.etaLabel}
          onExportPdf={() => handleExportPdf()}
          onExportTxt={() => handleExportTxt()}
        />
      )}

      {/* Footer */}
      <div
        className="flex-shrink-0 flex items-center justify-center py-1"
        style={{
          background: "oklch(0.07 0 0)",
          borderTop: "1px solid oklch(0.13 0 0)",
        }}
      >
        <p className="text-[10px]" style={{ color: "oklch(0.32 0 0)" }}>
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline transition-colors"
            style={{ color: "oklch(0.45 0 0)" }}
          >
            caffeine.ai
          </a>
        </p>
      </div>

      <SettingsPanel
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        activeTheme={activeTheme}
        onSetTheme={setTheme}
        stickyKeyboard={stickyKeyboard}
        onSetStickyKeyboard={setStickyKeyboard}
        glowIntensity={glowIntensity}
        onSetGlowIntensity={setGlowIntensity}
        glowColor={glowColor}
        onSetGlowColor={setGlowColor}
        glowTransparency={glowTransparency}
        onSetGlowTransparency={setGlowTransparency}
      />

      {/* Safety Delete Dialog */}
      <Dialog
        open={pendingDeleteId !== null}
        onOpenChange={(open) => {
          if (!open) closeDeleteDialog();
        }}
      >
        <DialogContent
          style={{
            background: "oklch(0.12 0 0)",
            border: "1px solid oklch(0.22 0 0)",
            color: "oklch(0.92 0 0)",
          }}
          data-ocid="sidebar.dialog"
        >
          {deleteStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle style={{ color: "oklch(0.92 0 0)" }}>
                  Delete "{pendingDeleteTitle}"?
                </DialogTitle>
                <DialogDescription style={{ color: "oklch(0.55 0 0)" }}>
                  This script will be permanently removed. This action cannot be
                  undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 flex-row justify-end">
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  className="px-4 py-2 rounded-md text-[13px] font-medium transition-colors"
                  style={{
                    background: "oklch(0.18 0 0)",
                    color: "oklch(0.75 0 0)",
                    border: "1px solid oklch(0.26 0 0)",
                  }}
                  data-ocid="sidebar.cancel_button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteStep1}
                  className="px-4 py-2 rounded-md text-[13px] font-semibold transition-colors"
                  style={{
                    background: "oklch(0.55 0.22 20)",
                    color: "oklch(0.97 0 0)",
                  }}
                  data-ocid="sidebar.confirm_button"
                >
                  Continue
                </button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle style={{ color: "oklch(0.65 0.22 20)" }}>
                  Final Confirmation
                </DialogTitle>
                <DialogDescription style={{ color: "oklch(0.55 0 0)" }}>
                  Type{" "}
                  <span
                    className="font-bold font-mono"
                    style={{ color: "oklch(0.85 0 0)" }}
                  >
                    DELETE
                  </span>{" "}
                  to permanently destroy "{pendingDeleteTitle}".
                </DialogDescription>
              </DialogHeader>
              <div className="py-2">
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type DELETE here"
                  className="w-full px-3 py-2 rounded-md text-[13px] font-mono"
                  style={{
                    background: "oklch(0.09 0 0)",
                    border: `1px solid ${
                      deleteConfirmText === "DELETE"
                        ? "oklch(0.65 0.22 20)"
                        : "oklch(0.25 0 0)"
                    }`,
                    color: "oklch(0.92 0 0)",
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && deleteConfirmText === "DELETE")
                      confirmDeleteStep2();
                  }}
                  data-ocid="sidebar.input"
                />
              </div>
              <DialogFooter className="gap-2 flex-row justify-end">
                <button
                  type="button"
                  onClick={closeDeleteDialog}
                  className="px-4 py-2 rounded-md text-[13px] font-medium transition-colors"
                  style={{
                    background: "oklch(0.18 0 0)",
                    color: "oklch(0.75 0 0)",
                    border: "1px solid oklch(0.26 0 0)",
                  }}
                  data-ocid="sidebar.cancel_button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmDeleteStep2}
                  disabled={deleteConfirmText !== "DELETE"}
                  className="px-4 py-2 rounded-md text-[13px] font-semibold transition-all"
                  style={{
                    background:
                      deleteConfirmText === "DELETE"
                        ? "oklch(0.55 0.22 20)"
                        : "oklch(0.20 0 0)",
                    color:
                      deleteConfirmText === "DELETE"
                        ? "oklch(0.97 0 0)"
                        : "oklch(0.38 0 0)",
                    cursor:
                      deleteConfirmText === "DELETE"
                        ? "pointer"
                        : "not-allowed",
                  }}
                  data-ocid="sidebar.delete_button"
                >
                  Delete Forever
                </button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
