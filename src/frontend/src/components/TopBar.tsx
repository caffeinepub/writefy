import { FolderOpen, Menu, Settings, Unlink } from "lucide-react";
import type { SyncStatus } from "../utils/storage";

interface TopBarProps {
  onMenuToggle: () => void;
  isMobileMenuOpen: boolean;
  onSettingsOpen: () => void;
  folderName?: string | null;
  isFileSystemSupported?: boolean;
  onLinkFolder?: () => void;
  lastSaved?: Date | null;
  syncStatus?: SyncStatus;
}

function StorageStatusBadge({
  status,
  folderName,
}: {
  status: SyncStatus;
  folderName?: string | null;
}) {
  if (
    status === "idle" ||
    (!folderName && status !== "error" && status !== "memory")
  ) {
    // No folder linked
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          borderRadius: 20,
          background: "oklch(0.20 0 0)",
          border: "1px solid oklch(0.30 0.05 20)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#ef4444",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: "#ef4444",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          No Folder Linked
        </span>
      </div>
    );
  }

  if (status === "syncing") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          borderRadius: 20,
          background: "oklch(0.20 0 0)",
          border: "1px solid oklch(0.22 0.05 142)",
        }}
      >
        <svg
          style={{
            width: 10,
            height: 10,
            animation: "spin 0.8s linear infinite",
            flexShrink: 0,
          }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="#22c55e"
          strokeWidth={2.5}
          aria-hidden="true"
        >
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
        <span
          style={{
            fontSize: 10,
            color: "#22c55e",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          Syncing…
        </span>
      </div>
    );
  }

  if (status === "saved" && folderName) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          borderRadius: 20,
          background: "oklch(0.20 0 0)",
          border: "1px solid oklch(0.30 0.12 142)",
          boxShadow: "0 0 8px oklch(0.60 0.20 142 / 30%)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#22c55e",
            boxShadow: "0 0 6px #22c55e88",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: "#22c55e",
            fontWeight: 600,
            whiteSpace: "nowrap",
            maxWidth: 120,
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          Linked: {folderName}
        </span>
      </div>
    );
  }

  if (status === "memory") {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 5,
          padding: "3px 10px",
          borderRadius: 20,
          background: "oklch(0.20 0 0)",
          border: "1px solid oklch(0.30 0.10 90)",
        }}
      >
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#eab308",
            boxShadow: "0 0 6px #eab30888",
            display: "inline-block",
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontSize: 10,
            color: "#eab308",
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          Browser Only
        </span>
      </div>
    );
  }

  // error — pulsing red
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 10px",
        borderRadius: 20,
        background: "oklch(0.20 0 0)",
        border: "1px solid oklch(0.30 0.10 20)",
        animation: "sync-pulse 1.2s ease-in-out infinite",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: "#ef4444",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span
        style={{
          fontSize: 10,
          color: "#ef4444",
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        Save Failed
      </span>
    </div>
  );
}

export function TopBar({
  onMenuToggle,
  onSettingsOpen,
  folderName,
  isFileSystemSupported,
  onLinkFolder,
  lastSaved,
  syncStatus = "idle",
}: TopBarProps) {
  return (
    <header
      className="flex-shrink-0 flex items-center justify-between px-4 md:px-6"
      style={{
        height: "56px",
        background: "oklch(var(--background, 0.09 0 0))",
        borderBottom: "1px solid oklch(var(--border, 0.15 0 0))",
        zIndex: 30,
        position: "relative",
      }}
      data-ocid="nav.panel"
    >
      {/* Animations */}
      <style>{`
        @keyframes sync-pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Left: hamburger (mobile) + logo */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="md:hidden p-2 rounded text-muted-foreground hover:text-foreground transition-colors"
          onClick={onMenuToggle}
          aria-label="Toggle menu"
          data-ocid="nav.toggle"
        >
          <Menu size={20} />
        </button>

        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "oklch(var(--primary))" }}
          >
            <span
              className="text-[13px] font-black"
              style={{ color: "oklch(var(--primary-foreground))" }}
            >
              W
            </span>
          </div>
          <span
            className="text-[16px] font-bold tracking-tight"
            style={{ color: "oklch(var(--foreground, 0.95 0 0))" }}
          >
            Writefy
          </span>
        </div>
      </div>

      {/* Center nav (desktop) */}
      <nav className="hidden md:flex items-center gap-6">
        {["Editor", "Library"].map((item) => (
          <button
            type="button"
            key={item}
            className="text-[13px] font-medium transition-colors"
            style={{
              color:
                item === "Editor"
                  ? "oklch(var(--foreground, 0.90 0 0))"
                  : "oklch(var(--muted-foreground, 0.50 0 0))",
            }}
            data-ocid="nav.link"
          >
            {item}
          </button>
        ))}
      </nav>

      {/* Right: storage badge + last-saved + folder status + settings */}
      <div className="flex items-center gap-2">
        {/* Storage status badge */}
        <div className="hidden md:block">
          <StorageStatusBadge status={syncStatus} folderName={folderName} />
        </div>

        {/* Last Saved timestamp */}
        {lastSaved && (
          <span
            style={{
              fontSize: "10px",
              color: "oklch(0.40 0 0)",
              whiteSpace: "nowrap",
              letterSpacing: "0.01em",
            }}
            data-ocid="nav.panel"
          >
            Last Saved:{" "}
            {lastSaved.toLocaleTimeString("en-US", {
              hour: "2-digit",
              minute: "2-digit",
            })}
            {" · "}
            {lastSaved.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            })}
          </span>
        )}

        {/* File System folder indicator / link button */}
        {isFileSystemSupported && (
          <button
            type="button"
            onClick={onLinkFolder}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-semibold transition-colors"
            style={{
              background: folderName
                ? "oklch(var(--primary) / 15%)"
                : "oklch(var(--muted, 0.14 0 0))",
              color: folderName
                ? "oklch(var(--primary))"
                : "oklch(var(--muted-foreground, 0.50 0 0))",
              border: folderName
                ? "1px solid oklch(var(--primary) / 30%)"
                : "1px solid oklch(var(--border, 0.22 0 0))",
            }}
            title={
              folderName
                ? `Linked: ${folderName} — Click to change`
                : "Link a local folder for auto-save"
            }
            data-ocid="nav.button"
          >
            {folderName ? (
              <>
                <FolderOpen size={13} />
                <span className="max-w-[100px] truncate">{folderName}</span>
              </>
            ) : (
              <>
                <Unlink size={12} />
                <span>Link Folder</span>
              </>
            )}
          </button>
        )}

        <button
          type="button"
          onClick={onSettingsOpen}
          className="p-2 rounded-md transition-colors"
          style={{ color: "oklch(var(--muted-foreground, 0.50 0 0))" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "oklch(var(--foreground, 0.80 0 0))";
            (e.currentTarget as HTMLButtonElement).style.background =
              "oklch(var(--muted, 0.15 0 0))";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.color =
              "oklch(var(--muted-foreground, 0.50 0 0))";
            (e.currentTarget as HTMLButtonElement).style.background =
              "transparent";
          }}
          aria-label="Settings"
          title="Settings & Themes"
          data-ocid="nav.link"
        >
          <Settings size={17} />
        </button>
        <button
          type="button"
          className="hidden md:block text-[12px] font-semibold px-4 py-1.5 rounded-full transition-colors"
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
          data-ocid="nav.primary_button"
        >
          Focus Mode
        </button>
      </div>
    </header>
  );
}
