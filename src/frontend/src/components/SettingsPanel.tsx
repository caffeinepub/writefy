import { Download, FolderOpen, Upload } from "lucide-react";
import { X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useRef } from "react";
import type { ThemeId } from "../hooks/useTheme";
import { THEMES } from "../hooks/useTheme";
import { requestFolder } from "../utils/storage";

export type GlowColor = "accent" | "white" | "gold" | "cyan";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  activeTheme: ThemeId;
  onSetTheme: (id: ThemeId) => void;
  stickyKeyboard: boolean;
  onSetStickyKeyboard: (v: boolean) => void;
  glowIntensity: number;
  onSetGlowIntensity: (v: number) => void;
  glowColor: GlowColor;
  onSetGlowColor: (v: GlowColor) => void;
  glowTransparency: number;
  onSetGlowTransparency: (v: number) => void;
  // Storage props
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
  onLinkFolder?: () => void;
  folderName?: string | null;
  isFileSystemSupported?: boolean;
}

export function SettingsPanel({
  isOpen,
  onClose,
  activeTheme,
  onSetTheme,
  stickyKeyboard,
  onSetStickyKeyboard,
  glowIntensity,
  onSetGlowIntensity,
  glowColor,
  onSetGlowColor,
  glowTransparency,
  onSetGlowTransparency,
  onExportBackup,
  onImportBackup,
  onLinkFolder,
  folderName,
  isFileSystemSupported,
}: SettingsPanelProps) {
  const importInputRef = useRef<HTMLInputElement>(null);

  const isDay = activeTheme === "high-contrast-day";

  const panelBg = isDay ? "#f4f4f4" : "oklch(0.11 0 0)";
  const panelBorder = isDay ? "#dddddd" : "oklch(0.20 0 0)";
  const headerBorder = isDay ? "#e0e0e0" : "oklch(0.18 0 0)";
  const headingColor = isDay ? "#111111" : "oklch(0.95 0 0)";
  const subColor = isDay ? "#555555" : "oklch(0.45 0 0)";
  const labelColor = isDay ? "#666666" : "oklch(0.45 0 0)";
  const rowBg = isDay ? "#ffffff" : "oklch(0.14 0 0)";
  const rowBorder = isDay ? "#e0e0e0" : "oklch(0.20 0 0)";
  const rowText = isDay ? "#222222" : "oklch(0.85 0 0)";
  const rowSubText = isDay ? "#888888" : "oklch(0.50 0 0)";

  const handleImportClick = () => {
    importInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onImportBackup) {
      onImportBackup(file);
    }
    // Reset so same file can be re-imported
    if (e.target) e.target.value = "";
  };

  const handleLinkFolder = async () => {
    if (onLinkFolder) {
      onLinkFolder();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="settings-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "oklch(0.05 0 0 / 70%)" }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            key="settings-panel"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 flex flex-col"
            style={{
              width: "360px",
              background: panelBg,
              borderLeft: `1px solid ${panelBorder}`,
            }}
            data-ocid="settings.panel"
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-5 flex-shrink-0"
              style={{ borderBottom: `1px solid ${headerBorder}` }}
            >
              <div>
                <h2
                  className="text-[18px] font-bold tracking-tight"
                  style={{ color: headingColor }}
                >
                  Settings
                </h2>
                <p className="text-[12px] mt-0.5" style={{ color: subColor }}>
                  Customize your writing environment
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-md transition-colors"
                style={{ color: subColor }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color =
                    headingColor;
                  (e.currentTarget as HTMLButtonElement).style.background =
                    isDay ? "#e8e8e8" : "oklch(0.18 0 0)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.color = subColor;
                  (e.currentTarget as HTMLButtonElement).style.background =
                    "transparent";
                }}
                aria-label="Close settings"
                data-ocid="settings.close_button"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {/* ── Data & Backup ── */}
              <div className="mb-8">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-4"
                  style={{ color: labelColor }}
                >
                  Data & Backup
                </p>
                <div className="flex flex-col gap-2">
                  {/* Export Backup */}
                  <button
                    type="button"
                    onClick={onExportBackup}
                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-medium transition-colors"
                    style={{
                      background: rowBg,
                      border: `1px solid ${rowBorder}`,
                      color: rowText,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        isDay ? "#1565C0" : "oklch(var(--primary) / 40%)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        rowBorder;
                    }}
                    data-ocid="settings.button"
                  >
                    <Download
                      size={14}
                      style={{
                        color: isDay ? "#1565C0" : "oklch(var(--primary))",
                      }}
                    />
                    Export Backup
                    <span
                      className="ml-auto text-[10px]"
                      style={{ color: rowSubText }}
                    >
                      .json
                    </span>
                  </button>

                  {/* Import Backup */}
                  <button
                    type="button"
                    onClick={handleImportClick}
                    className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-medium transition-colors"
                    style={{
                      background: rowBg,
                      border: `1px solid ${rowBorder}`,
                      color: rowText,
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        isDay ? "#1565C0" : "oklch(var(--primary) / 40%)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.borderColor =
                        rowBorder;
                    }}
                    data-ocid="settings.button"
                  >
                    <Upload
                      size={14}
                      style={{
                        color: isDay ? "#1565C0" : "oklch(var(--primary))",
                      }}
                    />
                    Import Backup
                    <span
                      className="ml-auto text-[10px]"
                      style={{ color: rowSubText }}
                    >
                      restore
                    </span>
                  </button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".json"
                    className="hidden"
                    onChange={handleFileChange}
                    data-ocid="settings.upload_button"
                  />

                  {/* Link to Local Folder */}
                  {isFileSystemSupported && (
                    <button
                      type="button"
                      onClick={handleLinkFolder}
                      className="w-full flex items-center gap-2.5 px-4 py-3 rounded-xl text-[13px] font-medium transition-colors"
                      style={{
                        background: folderName
                          ? isDay
                            ? "#e8f0fe"
                            : "oklch(var(--primary) / 8%)"
                          : rowBg,
                        border: folderName
                          ? `1px solid ${isDay ? "#1565C0" : "oklch(var(--primary) / 40%)"}`
                          : `1px solid ${rowBorder}`,
                        color: folderName
                          ? isDay
                            ? "#1565C0"
                            : "oklch(var(--primary))"
                          : rowText,
                        cursor: "pointer",
                      }}
                      data-ocid="settings.button"
                    >
                      <FolderOpen size={14} />
                      {folderName ? (
                        <>
                          Linked:{" "}
                          <span className="font-semibold ml-1 truncate max-w-[140px]">
                            {folderName}
                          </span>
                        </>
                      ) : (
                        "Link to Local Folder"
                      )}
                      <span
                        className="ml-auto text-[10px]"
                        style={{ color: rowSubText }}
                      >
                        {folderName ? "change" : "auto-save"}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              {/* Mobile writing settings */}
              <div className="mb-8">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-4"
                  style={{ color: labelColor }}
                >
                  Mobile Writing
                </p>
                {/* Stick Toolbar to Keyboard toggle */}
                <div
                  className="flex items-center justify-between py-3 px-4 rounded-xl"
                  style={{
                    background: rowBg,
                    border: `1px solid ${rowBorder}`,
                  }}
                >
                  <div>
                    <span
                      className="block text-[13px] font-medium"
                      style={{ color: rowText }}
                    >
                      Stick Toolbar to Keyboard
                    </span>
                    <span
                      className="block text-[11px] mt-0.5"
                      style={{ color: rowSubText }}
                    >
                      Toolbar sits above the virtual keyboard
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onSetStickyKeyboard(!stickyKeyboard)}
                    aria-label="Toggle stick toolbar to keyboard"
                    style={{
                      width: "40px",
                      height: "22px",
                      borderRadius: "11px",
                      background: stickyKeyboard
                        ? "oklch(var(--primary))"
                        : isDay
                          ? "#cccccc"
                          : "oklch(0.22 0 0)",
                      position: "relative",
                      transition: "background 0.2s",
                      flexShrink: 0,
                      border: "none",
                      cursor: "pointer",
                    }}
                    data-ocid="settings.toggle"
                  >
                    <span
                      style={{
                        position: "absolute",
                        top: "3px",
                        left: stickyKeyboard ? "21px" : "3px",
                        width: "16px",
                        height: "16px",
                        borderRadius: "50%",
                        background: "white",
                        transition: "left 0.2s",
                      }}
                    />
                  </button>
                </div>
              </div>

              {/* Active Line Glow Settings */}
              <div className="mb-8">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-4"
                  style={{ color: labelColor }}
                >
                  Active Line Glow
                </p>

                {/* Glow Intensity slider */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1.5">
                    <span
                      style={{
                        fontSize: 11,
                        color: isDay ? "#666" : "oklch(0.65 0 0)",
                      }}
                    >
                      Intensity
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "oklch(var(--primary))",
                        fontWeight: 600,
                      }}
                    >
                      {glowIntensity}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={glowIntensity}
                    onChange={(e) => onSetGlowIntensity(Number(e.target.value))}
                    style={{
                      width: "100%",
                      accentColor: "oklch(var(--primary))",
                    }}
                    data-ocid="settings.input"
                  />
                </div>

                {/* Glow Transparency slider */}
                <div className="mb-4">
                  <div className="flex justify-between mb-1.5">
                    <span
                      style={{
                        fontSize: 11,
                        color: isDay ? "#666" : "oklch(0.65 0 0)",
                      }}
                    >
                      Transparency
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: "oklch(var(--primary))",
                        fontWeight: 600,
                      }}
                    >
                      {glowTransparency}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={glowTransparency}
                    onChange={(e) =>
                      onSetGlowTransparency(Number(e.target.value))
                    }
                    style={{
                      width: "100%",
                      accentColor: "oklch(var(--primary))",
                    }}
                    data-ocid="settings.input"
                  />
                </div>

                {/* Glow Color */}
                <div>
                  <span
                    style={{
                      fontSize: 11,
                      color: isDay ? "#666" : "oklch(0.65 0 0)",
                      display: "block",
                      marginBottom: 8,
                    }}
                  >
                    Color
                  </span>
                  <div style={{ display: "flex", gap: 6 }}>
                    {(["accent", "white", "gold", "cyan"] as const).map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => onSetGlowColor(c)}
                        style={{
                          flex: 1,
                          padding: "5px 0",
                          borderRadius: 8,
                          fontSize: 10,
                          fontWeight: glowColor === c ? 700 : 500,
                          background:
                            glowColor === c
                              ? c === "accent"
                                ? "oklch(var(--primary) / 20%)"
                                : c === "white"
                                  ? "rgba(255,255,255,0.1)"
                                  : c === "gold"
                                    ? "rgba(255,200,50,0.15)"
                                    : "rgba(0,220,220,0.15)"
                              : isDay
                                ? "#eeeeee"
                                : "oklch(0.16 0 0)",
                          color:
                            c === "white"
                              ? glowColor === c
                                ? "#fff"
                                : isDay
                                  ? "#555"
                                  : "oklch(0.60 0 0)"
                              : c === "gold"
                                ? glowColor === c
                                  ? "#ffc832"
                                  : isDay
                                    ? "#555"
                                    : "oklch(0.60 0 0)"
                                : c === "cyan"
                                  ? glowColor === c
                                    ? "#00dcdc"
                                    : isDay
                                      ? "#555"
                                      : "oklch(0.60 0 0)"
                                  : glowColor === c
                                    ? "oklch(var(--primary))"
                                    : isDay
                                      ? "#555"
                                      : "oklch(0.60 0 0)",
                          border:
                            glowColor === c
                              ? "1.5px solid currentColor"
                              : isDay
                                ? "1.5px solid #ddd"
                                : "1.5px solid oklch(0.22 0 0)",
                          cursor: "pointer",
                          textTransform: "capitalize",
                        }}
                        data-ocid="settings.toggle"
                      >
                        {c === "accent"
                          ? "Neon"
                          : c.charAt(0).toUpperCase() + c.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Theme Gallery */}
              <div className="mb-8">
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-4"
                  style={{ color: labelColor }}
                >
                  Theme Gallery
                </p>
                {/* Horizontal pill list */}
                <div className="flex flex-col gap-1.5">
                  {THEMES.map((theme) => {
                    const isActive = activeTheme === theme.id;
                    const accentColor =
                      theme.id === "high-contrast-day"
                        ? "#1565C0"
                        : theme.accent;
                    return (
                      <button
                        type="button"
                        key={theme.id}
                        onClick={() => onSetTheme(theme.id)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          padding: "8px 12px",
                          borderRadius: "20px",
                          border: isActive
                            ? `1.5px solid ${accentColor}`
                            : `1.5px solid ${isDay ? "#ddd" : "oklch(0.22 0 0)"}`,
                          background: isActive
                            ? `${accentColor}18`
                            : isDay
                              ? "#ffffff"
                              : "oklch(0.14 0 0)",
                          cursor: "pointer",
                          width: "100%",
                          textAlign: "left",
                          transition: "all 0.15s",
                        }}
                        data-ocid="settings.toggle"
                      >
                        <div
                          style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: accentColor,
                            flexShrink: 0,
                            boxShadow: isActive
                              ? `0 0 6px ${accentColor}`
                              : "none",
                          }}
                        />
                        <span
                          style={{
                            flex: 1,
                            fontSize: "12px",
                            fontWeight: isActive ? 700 : 500,
                            color: isActive
                              ? accentColor
                              : isDay
                                ? "#555"
                                : "oklch(0.70 0 0)",
                          }}
                        >
                          {theme.name}
                        </span>
                        {isActive && (
                          <span
                            style={{
                              fontSize: "9px",
                              fontWeight: 700,
                              color: accentColor,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                            }}
                          >
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Keyboard Shortcuts */}
              <div
                className="p-4 rounded-xl"
                style={{
                  background: rowBg,
                  border: `1px solid ${rowBorder}`,
                }}
              >
                <p
                  className="text-[11px] font-bold uppercase tracking-widest mb-2"
                  style={{ color: labelColor }}
                >
                  Keyboard Shortcuts
                </p>
                <div className="flex flex-col gap-2">
                  {[
                    ["Tab", "Cycle element type"],
                    ["Ctrl+B", "Bold"],
                    ["Ctrl+I", "Italic"],
                    ["Enter (Character)", "→ Dialogue"],
                    ["Enter (Dialogue)", "→ Action"],
                    ["Enter (Slugline)", "→ Action"],
                  ].map(([key, desc]) => (
                    <div
                      key={key}
                      className="flex items-center justify-between"
                    >
                      <kbd
                        className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                        style={{
                          background: isDay ? "#e8e8e8" : "oklch(0.20 0 0)",
                          color: isDay ? "#333" : "oklch(0.75 0 0)",
                          border: `1px solid ${isDay ? "#ccc" : "oklch(0.28 0 0)"}`,
                        }}
                      >
                        {key}
                      </kbd>
                      <span
                        className="text-[11px]"
                        style={{ color: isDay ? "#777" : "oklch(0.58 0 0)" }}
                      >
                        {desc}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
