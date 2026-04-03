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
import {
  type SyncStatus,
  debounce,
  loadFromIDB,
  persistFolderHandle,
  requestFolder,
  restoreFolderHandle,
  saveToFolder,
  saveToIDB,
} from "./utils/storage";

const BACKUP_KEY = "writefy_backup";
const BACKUP_FILENAME = "naksha_master_data.json";

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
  const [editorView, setEditorView] = useState<"write" | "outline">("write");

  // Dual-layer storage state
  const [syncStatus, setSyncStatus] = useState<SyncStatus>("idle");
  const [folderHandle, setFolderHandle] =
    useState<FileSystemDirectoryHandle | null>(null);

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

  // ── Dual-Layer Auto-Save (debounced 2s) ────────────────────────
  const debouncedSaveRef = useRef<((...args: any[]) => void) | null>(null);
  const handleLinkFolderRef = useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    debouncedSaveRef.current = debounce(
      async (
        docs: typeof documents,
        currentDocId: string,
        handle: FileSystemDirectoryHandle | null,
      ) => {
        if (!docs || docs.length === 0) {
          // Anti-corruption: abort if empty
          const existingIDB = await loadFromIDB<object>(BACKUP_KEY);
          if (existingIDB) {
            toast.error(
              "Save aborted: data appears empty. Previous save preserved.",
            );
            setSyncStatus("error");
            return;
          }
        }

        const payload = {
          projects: docs,
          currentProjectId: currentDocId,
          lastModified: new Date().toISOString(),
        };

        // Layer 1: IndexedDB
        setSyncStatus("syncing");
        try {
          await saveToIDB(BACKUP_KEY, payload);
          setSyncStatus("memory");
          setLastSaved(new Date());
        } catch {
          setSyncStatus("error");
          return;
        }

        // Layer 2: File System Access API (if folder is linked)
        if (handle) {
          try {
            const ok = await saveToFolder(
              handle,
              BACKUP_FILENAME,
              JSON.stringify(payload, null, 2),
            );
            if (ok) {
              setSyncStatus("saved");
            } else {
              setSyncStatus("error");
              toast.warning(
                "Warning: Master Folder moved. Using Internal Backup.",
                {
                  action: {
                    label: "Re-link",
                    onClick: () => {
                      void handleLinkFolderRef.current?.();
                    },
                  },
                  duration: 8000,
                },
              );
            }
          } catch {
            setSyncStatus("error");
            toast.warning(
              "Warning: Master Folder moved. Using Internal Backup.",
              {
                action: {
                  label: "Re-link",
                  onClick: () => handleLinkFolderRef.current?.(),
                },
                duration: 8000,
              },
            );
          }
        }
      },
      2000,
    );
  }, []);

  // Trigger debounced save when documents change
  useEffect(() => {
    if (documents.length === 0) return;
    debouncedSaveRef.current?.(documents, activeDocId, folderHandle);
  }, [documents, activeDocId, folderHandle]);

  // ── Safe-Load on mount: File > IDB > localStorage ─────────
  // Note: localStorage is already handled by useDocuments’s useLocalStorage hook.
  // We additionally try to restore from IDB on first load if IDB has data newer than LS.
  useEffect(() => {
    (async () => {
      try {
        const idbData = await loadFromIDB<{
          projects: any[];
          currentProjectId: string;
          lastModified: string;
        }>(BACKUP_KEY);

        if (!idbData || !idbData.projects || idbData.projects.length === 0)
          return;

        const lsRaw = localStorage.getItem("writefy_documents");
        const lsUpdated = lsRaw
          ? (() => {
              try {
                const docs = JSON.parse(lsRaw) as Array<{ updatedAt?: string }>;
                return docs[0]?.updatedAt ?? null;
              } catch {
                return null;
              }
            })()
          : null;

        const idbUpdated = idbData.lastModified;

        // Only restore from IDB if it has newer data
        if (idbUpdated && lsUpdated && idbUpdated > lsUpdated) {
          localStorage.setItem(
            "writefy_documents",
            JSON.stringify(idbData.projects),
          );
          if (idbData.currentProjectId) {
            localStorage.setItem(
              "writefy_active_doc",
              JSON.stringify(idbData.currentProjectId),
            );
          }
          // Force a reload to pick up the new localStorage values
          window.location.reload();
        }
      } catch {
        // Silent failure — fall back to localStorage
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Hard-save interval: every 60s ────────────────────────
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

  // ── Export/Import Backup ──────────────────────────────
  const exportBackup = useCallback(() => {
    if (!documents || documents.length === 0) {
      toast.error("No data to export");
      return;
    }
    const payload = {
      projects: documents,
      currentProjectId: activeDocId,
      lastModified: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = window.document.createElement("a");
    const ts = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    a.href = url;
    a.download = `writefy-backup-${ts}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Backup exported");
  }, [documents, activeDocId]);

  const importBackup = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const data = JSON.parse(text);
        if (
          !data.projects ||
          !Array.isArray(data.projects) ||
          data.projects.length === 0
        ) {
          toast.error("Invalid backup file: no projects found");
          return;
        }
        localStorage.setItem(
          "writefy_documents",
          JSON.stringify(data.projects),
        );
        if (data.currentProjectId) {
          localStorage.setItem(
            "writefy_active_doc",
            JSON.stringify(data.currentProjectId),
          );
        }
        toast.success("Backup imported — reloading...");
        setTimeout(() => window.location.reload(), 800);
      } catch {
        toast.error("Failed to parse backup file");
      }
    };
    reader.readAsText(file);
  }, []);

  // ── Link Folder (dual-layer handle) ───────────────────────
  const handleLinkFolder = useCallback(async () => {
    // Try storage utility first (for dual-layer handle)
    const handle = await requestFolder();
    if (handle) {
      setFolderHandle(handle);
      // Persist folder handle so it survives page reload
      await persistFolderHandle(handle);
      // Also update the legacy fileSystem hook for per-file saves
      await fileSystem.requestFolder();
      toast.success(`Linked to folder: ${handle.name}`);
      if (activeDocument) {
        fileSystem.saveFile(activeDocument.title, activeDocument.content);
      }
    }
  }, [fileSystem, activeDocument]);

  // Keep ref in sync with the latest handleLinkFolder
  useEffect(() => {
    handleLinkFolderRef.current = handleLinkFolder;
  }, [handleLinkFolder]);

  // ── Test Connection ────────────────────────────────────────────────────
  const handleTestConnection = useCallback(async () => {
    if (!folderHandle) {
      toast.error("No folder linked. Please link a folder first.");
      return;
    }
    try {
      const testContent = JSON.stringify({ test: true, ts: Date.now() });
      // @ts-ignore
      const testFileHandle = await folderHandle.getFileHandle(
        "_writefy_test.tmp",
        { create: true },
      );
      // @ts-ignore
      const writable = await testFileHandle.createWritable();
      await writable.write(testContent);
      await writable.close();
      // Delete test file
      // @ts-ignore
      await folderHandle.removeEntry("_writefy_test.tmp");
      toast.success(
        `Storage Verified: All systems synced to ${folderHandle.name}`,
      );
    } catch {
      toast.error("Connection test failed. Check folder permissions.");
    }
  }, [folderHandle]);

  // ── Export helpers ─────────────────────────────────────
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

  // ── Content handlers ───────────────────────────────────
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

  // ── Delete flow ────────────────────────────────────────
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

  const isDay = activeTheme === "high-contrast-day";

  return (
    <div
      className="flex flex-col h-screen overflow-hidden"
      style={{
        background: isDay ? "#ffffff" : "oklch(0.08 0 0)",
        color: isDay ? "#111111" : undefined,
      }}
    >
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: isDay ? "#ffffff" : "oklch(0.16 0 0)",
            color: isDay ? "#111111" : "oklch(0.90 0 0)",
            border: isDay ? "1px solid #dddddd" : "1px solid oklch(0.22 0 0)",
          },
        }}
      />

      <TopBar
        onMenuToggle={() => setIsMobileMenuOpen((p) => !p)}
        isMobileMenuOpen={isMobileMenuOpen}
        onSettingsOpen={() => setIsSettingsOpen(true)}
        folderName={fileSystem.folderName ?? folderHandle?.name ?? null}
        isFileSystemSupported={fileSystem.isSupported}
        onLinkFolder={handleLinkFolder}
        lastSaved={lastSaved}
        syncStatus={syncStatus}
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
          isLinked={fileSystem.isLinked || !!folderHandle}
          folderName={fileSystem.folderName ?? folderHandle?.name ?? null}
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
                onViewChange={setEditorView}
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
          isWriting={editorView === "write"}
        />
      )}

      {/* Footer */}
      <div
        className="flex-shrink-0 flex items-center justify-center py-1"
        style={{
          background: isDay ? "#f4f4f4" : "oklch(0.07 0 0)",
          borderTop: isDay ? "1px solid #e0e0e0" : "1px solid oklch(0.13 0 0)",
        }}
      >
        <p
          className="text-[10px]"
          style={{ color: isDay ? "#888" : "oklch(0.32 0 0)" }}
        >
          © {new Date().getFullYear()}. Built with ❤️ using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(window.location.hostname)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:underline transition-colors"
            style={{ color: isDay ? "#1565C0" : "oklch(0.45 0 0)" }}
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
        onExportBackup={exportBackup}
        onImportBackup={importBackup}
        onLinkFolder={handleLinkFolder}
        folderName={fileSystem.folderName ?? folderHandle?.name ?? null}
        isFileSystemSupported={fileSystem.isSupported}
        onTestConnection={handleTestConnection}
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
            background: isDay ? "#ffffff" : "oklch(0.12 0 0)",
            border: isDay ? "1px solid #dddddd" : "1px solid oklch(0.22 0 0)",
            color: isDay ? "#111111" : "oklch(0.92 0 0)",
          }}
          data-ocid="sidebar.dialog"
        >
          {deleteStep === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle
                  style={{ color: isDay ? "#111111" : "oklch(0.92 0 0)" }}
                >
                  Delete "{pendingDeleteTitle}"?
                </DialogTitle>
                <DialogDescription
                  style={{ color: isDay ? "#666666" : "oklch(0.55 0 0)" }}
                >
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
                    background: isDay ? "#f0f0f0" : "oklch(0.18 0 0)",
                    color: isDay ? "#444444" : "oklch(0.75 0 0)",
                    border: isDay
                      ? "1px solid #dddddd"
                      : "1px solid oklch(0.26 0 0)",
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
                <DialogDescription
                  style={{ color: isDay ? "#666666" : "oklch(0.55 0 0)" }}
                >
                  Type{" "}
                  <span
                    className="font-bold font-mono"
                    style={{ color: isDay ? "#111111" : "oklch(0.85 0 0)" }}
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
                    background: isDay ? "#f8f8f8" : "oklch(0.09 0 0)",
                    border: `1px solid ${
                      deleteConfirmText === "DELETE"
                        ? "oklch(0.65 0.22 20)"
                        : isDay
                          ? "#dddddd"
                          : "oklch(0.25 0 0)"
                    }`,
                    color: isDay ? "#111111" : "oklch(0.92 0 0)",
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
                    background: isDay ? "#f0f0f0" : "oklch(0.18 0 0)",
                    color: isDay ? "#444444" : "oklch(0.75 0 0)",
                    border: isDay
                      ? "1px solid #dddddd"
                      : "1px solid oklch(0.26 0 0)",
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
                        : isDay
                          ? "#e8e8e8"
                          : "oklch(0.20 0 0)",
                    color:
                      deleteConfirmText === "DELETE"
                        ? "oklch(0.97 0 0)"
                        : isDay
                          ? "#aaaaaa"
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
