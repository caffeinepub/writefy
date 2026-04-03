import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  FileText,
  FolderOpen,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef, useState } from "react";
import type { WritefyDocument } from "../types/document";

interface SidebarProps {
  documents: WritefyDocument[];
  activeDocId: string;
  onSelectDoc: (id: string) => void;
  onNewDoc: () => void;
  onDeleteDoc: (id: string) => void;
  onExportPdf: (id: string) => void;
  onExportTxt: (id: string) => void;
  onRenameDoc: (id: string, title: string) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
  isFileSystemSupported?: boolean;
  isLinked?: boolean;
  folderName?: string | null;
  onLinkFolder?: () => void;
}

export function Sidebar({
  documents,
  activeDocId,
  onSelectDoc,
  onNewDoc,
  onDeleteDoc,
  onExportPdf,
  onExportTxt,
  onRenameDoc,
  isMobileOpen = false,
  onMobileClose,
  isFileSystemSupported = false,
  isLinked = false,
  folderName = null,
  onLinkFolder,
}: SidebarProps) {
  const [search, setSearch] = useState("");
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);

  const filtered = documents.filter((d) =>
    d.title.toLowerCase().includes(search.toLowerCase()),
  );

  const startRename = (doc: WritefyDocument) => {
    setRenamingId(doc.id);
    setRenameValue(doc.title);
    setTimeout(() => renameInputRef.current?.select(), 50);
  };

  const commitRename = (id: string) => {
    if (renameValue.trim()) onRenameDoc(id, renameValue.trim());
    setRenamingId(null);
  };

  const sidebarContent = (
    <div
      className="flex flex-col h-full"
      style={{ background: "oklch(var(--panel-sidebar, 0.11 0 0))" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-6 pb-4">
        <h2 className="text-[17px] font-bold text-foreground tracking-tight">
          Your Library
        </h2>
        {onMobileClose && (
          <button
            type="button"
            onClick={onMobileClose}
            className="md:hidden p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Close sidebar"
            data-ocid="sidebar.close_button"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="px-4 pb-4">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-md"
          style={{
            background: "oklch(var(--muted, 0.14 0 0))",
            border: "1px solid oklch(var(--border, 0.20 0 0))",
          }}
        >
          <Search size={13} className="text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search documents..."
            className="bg-transparent text-[13px] text-foreground placeholder:text-muted-foreground flex-1 min-w-0"
            data-ocid="sidebar.search_input"
          />
        </div>
      </div>

      {/* Section label */}
      <div className="px-5 pb-2">
        <span
          className="text-[11px] font-semibold tracking-widest"
          style={{ color: "oklch(var(--muted-foreground, 0.50 0 0))" }}
        >
          DOCUMENTS
        </span>
      </div>

      {/* Document list */}
      <div className="flex-1 overflow-y-auto px-2">
        <AnimatePresence initial={false}>
          {filtered.length === 0 ? (
            <div
              className="px-3 py-8 text-center text-[13px]"
              style={{ color: "oklch(var(--muted-foreground, 0.45 0 0))" }}
              data-ocid="sidebar.empty_state"
            >
              No documents found
            </div>
          ) : (
            filtered.map((doc, i) => {
              const isActive = doc.id === activeDocId;
              const isRenaming = renamingId === doc.id;
              return (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.15 }}
                  data-ocid={`sidebar.item.${i + 1}`}
                  className="relative group mb-0.5"
                >
                  {/* Full-width click target — z-index 3 ensures it captures all clicks on the card */}
                  {!isRenaming && (
                    <button
                      type="button"
                      aria-label={`Select ${doc.title}`}
                      className="absolute inset-0 rounded-md cursor-pointer"
                      style={{
                        background: "transparent",
                        border: "none",
                        zIndex: 3,
                      }}
                      onClick={() => {
                        onSelectDoc(doc.id);
                        onMobileClose?.();
                      }}
                      data-ocid="sidebar.button"
                    />
                  )}

                  {/* Card row layout */}
                  <div
                    className="flex items-center gap-2 px-3 py-2.5 rounded-md transition-colors"
                    style={{
                      background: isActive
                        ? "oklch(var(--row-active, 0.71 0.19 142))"
                        : "transparent",
                      userSelect: "none",
                      position: "relative",
                      zIndex: 2,
                      pointerEvents: "none",
                    }}
                    onMouseEnter={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLDivElement).style.background =
                          "oklch(var(--row-hover, 0.16 0 0))";
                    }}
                    onMouseLeave={(e) => {
                      if (!isActive)
                        (e.currentTarget as HTMLDivElement).style.background =
                          "transparent";
                    }}
                  >
                    <FileText
                      size={14}
                      className="flex-shrink-0"
                      style={{
                        color: isActive
                          ? "oklch(0.08 0 0)"
                          : "oklch(var(--muted-foreground, 0.55 0 0))",
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      className="flex-1 min-w-0"
                      style={{ pointerEvents: "none" }}
                    >
                      {isRenaming ? (
                        <input
                          ref={renameInputRef}
                          type="text"
                          value={renameValue}
                          onChange={(e) => setRenameValue(e.target.value)}
                          onBlur={() => commitRename(doc.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitRename(doc.id);
                            if (e.key === "Escape") setRenamingId(null);
                            e.stopPropagation();
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-full text-[13px] font-semibold bg-transparent"
                          style={{
                            color: isActive
                              ? "oklch(0.08 0 0)"
                              : "oklch(0.92 0 0)",
                            borderBottom: "1px solid oklch(var(--primary))",
                            pointerEvents: "auto",
                          }}
                          data-ocid="sidebar.input"
                        />
                      ) : (
                        <>
                          <div
                            className="text-[13px] font-semibold truncate"
                            style={{
                              color: isActive
                                ? "oklch(0.08 0 0)"
                                : "oklch(var(--foreground, 0.92 0 0))",
                            }}
                          >
                            {doc.title}
                          </div>
                          <div
                            className="text-[11px] truncate mt-0.5"
                            style={{
                              color: isActive
                                ? "oklch(0.15 0.04 142)"
                                : "oklch(var(--muted-foreground, 0.52 0 0))",
                            }}
                          >
                            {doc.mode === "screenplay" ? "Screenplay" : "Novel"}
                          </div>
                        </>
                      )}
                    </div>

                    {/* 3-dot menu — must stay interactive (pointerEvents: auto, zIndex above click target) */}
                    {!isRenaming && (
                      <div
                        style={{
                          position: "relative",
                          zIndex: 4,
                          pointerEvents: "auto",
                          flexShrink: 0,
                        }}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              onClick={(e) => e.stopPropagation()}
                              className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-1 rounded transition-opacity"
                              style={{
                                color: isActive
                                  ? "oklch(0.15 0 0)"
                                  : "oklch(0.50 0 0)",
                              }}
                              onMouseEnter={(e) => {
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.color = isActive
                                  ? "oklch(0.05 0 0)"
                                  : "oklch(0.80 0 0)";
                              }}
                              onMouseLeave={(e) => {
                                (
                                  e.currentTarget as HTMLButtonElement
                                ).style.color = isActive
                                  ? "oklch(0.15 0 0)"
                                  : "oklch(0.50 0 0)";
                              }}
                              aria-label="Document options"
                              data-ocid="sidebar.open_modal_button"
                            >
                              <MoreVertical size={13} />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent
                            className="w-44"
                            style={{
                              background: "oklch(0.13 0 0)",
                              border: "1px solid oklch(0.22 0 0)",
                            }}
                            align="end"
                            side="bottom"
                            data-ocid="sidebar.dropdown_menu"
                          >
                            <DropdownMenuItem
                              onClick={() => startRename(doc)}
                              className="text-[12px] cursor-pointer gap-2"
                              style={{ color: "oklch(0.80 0 0)" }}
                              data-ocid="sidebar.button"
                            >
                              <Pencil size={12} /> Rename
                            </DropdownMenuItem>
                            <DropdownMenuSeparator
                              style={{ background: "oklch(0.20 0 0)" }}
                            />
                            <DropdownMenuItem
                              onClick={() => onExportPdf(doc.id)}
                              className="text-[12px] cursor-pointer gap-2"
                              style={{ color: "oklch(0.80 0 0)" }}
                              data-ocid="sidebar.button"
                            >
                              <Download size={12} /> Export as PDF
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => onExportTxt(doc.id)}
                              className="text-[12px] cursor-pointer gap-2"
                              style={{ color: "oklch(0.80 0 0)" }}
                              data-ocid="sidebar.button"
                            >
                              <Download size={12} /> Export as .txt
                            </DropdownMenuItem>
                            <DropdownMenuSeparator
                              style={{ background: "oklch(0.20 0 0)" }}
                            />
                            <DropdownMenuItem
                              onClick={() => onDeleteDoc(doc.id)}
                              className="text-[12px] cursor-pointer gap-2"
                              style={{ color: "oklch(0.65 0.22 20)" }}
                              data-ocid={`sidebar.delete_button.${i + 1}`}
                            >
                              <Trash2 size={12} /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* New document + Link Folder buttons */}
      <div
        className="px-4 py-4"
        style={{ borderTop: "1px solid oklch(var(--border, 0.18 0 0))" }}
      >
        <button
          type="button"
          onClick={onNewDoc}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-[13px] font-semibold transition-colors"
          style={{
            border: "1px solid oklch(var(--border, 0.28 0 0))",
            color: "oklch(var(--muted-foreground, 0.75 0 0))",
            background: "transparent",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "oklch(var(--row-hover, 0.16 0 0))";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
          data-ocid="sidebar.open_modal_button"
        >
          <Plus size={14} />
          New Document
        </button>

        {/* File System: Connect to Local Folder */}
        {isFileSystemSupported && (
          <button
            type="button"
            onClick={onLinkFolder}
            className="w-full flex items-center justify-center gap-2 mt-2 py-2 px-4 rounded-md text-[12px] font-medium transition-all"
            style={{
              border: isLinked
                ? "1px solid oklch(var(--primary) / 30%)"
                : "1px solid oklch(var(--border, 0.22 0 0))",
              color: isLinked
                ? "oklch(var(--primary))"
                : "oklch(var(--muted-foreground, 0.55 0 0))",
              background: isLinked
                ? "oklch(var(--primary) / 8%)"
                : "oklch(var(--muted, 0.14 0 0))",
            }}
            onMouseEnter={(e) => {
              if (!isLinked)
                (e.currentTarget as HTMLButtonElement).style.background =
                  "oklch(var(--row-hover, 0.17 0 0))";
            }}
            onMouseLeave={(e) => {
              if (!isLinked)
                (e.currentTarget as HTMLButtonElement).style.background =
                  "oklch(var(--muted, 0.14 0 0))";
            }}
            data-ocid="sidebar.button"
          >
            <FolderOpen size={13} />
            {isLinked && folderName ? folderName : "Connect to Local Folder"}
          </button>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside
        className="hidden md:flex flex-col w-[280px] flex-shrink-0 h-full"
        style={{ borderRight: "1px solid oklch(var(--border, 0.17 0 0))" }}
        data-ocid="sidebar.panel"
      >
        {sidebarContent}
      </aside>
      <AnimatePresence>
        {isMobileOpen && (
          <>
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden fixed inset-0 z-40"
              style={{ background: "oklch(0.05 0 0 / 80%)" }}
              onClick={onMobileClose}
            />
            <motion.aside
              key="drawer"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="md:hidden fixed left-0 top-0 bottom-0 z-50 w-[300px] flex flex-col"
              data-ocid="sidebar.panel"
            >
              {sidebarContent}
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
