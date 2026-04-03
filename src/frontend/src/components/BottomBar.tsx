import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Download, Target, Users } from "lucide-react";
import { useState } from "react";
import type { WritingMode } from "../types/document";

function ActivityRing({ progress }: { progress: number }) {
  const size = 28;
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (progress / 100) * circumference;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ transform: "rotate(-90deg)" }}
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="oklch(0.22 0 0)"
        strokeWidth={strokeWidth}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="oklch(var(--primary))"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={dashOffset}
        style={{
          transition: "stroke-dashoffset 0.6s cubic-bezier(0.4,0,0.2,1)",
        }}
      />
    </svg>
  );
}

interface BottomBarProps {
  wordCount: number;
  readTime: string;
  mode: WritingMode;
  onModeChange: (mode: WritingMode) => void;
  characters: string[];
  characterMotes: Record<string, string>;
  onUpdateCharacterMotes: (name: string, mote: string) => void;
  documentContent: string;
  documentTitle: string;
  wph: number;
  episodeTarget: number;
  onSetEpisodeTarget: (t: number) => void;
  dailyGoal: number;
  onSetDailyGoal: (g: number) => void;
  dailyWordsWritten: number;
  episodeProgress: number;
  dailyProgress: number;
  etaLabel: string;
  onExportPdf: () => void;
  onExportTxt: () => void;
  isWriting?: boolean;
}

export function BottomBar({
  wordCount,
  readTime,
  mode,
  onModeChange,
  characters,
  characterMotes,
  onUpdateCharacterMotes,
  wph,
  episodeTarget,
  onSetEpisodeTarget,
  dailyGoal,
  onSetDailyGoal,
  dailyWordsWritten,
  episodeProgress,
  dailyProgress,
  etaLabel,
  onExportPdf,
  onExportTxt,
  isWriting = true,
}: BottomBarProps) {
  const [charOpen, setCharOpen] = useState(false);
  const [episodeOpen, setEpisodeOpen] = useState(false);
  const [dailyOpen, setDailyOpen] = useState(false);
  const [episodeInput, setEpisodeInput] = useState(String(episodeTarget));
  const [dailyInput, setDailyInput] = useState(String(dailyGoal));

  const commitEpisodeTarget = () => {
    const n = Number.parseInt(episodeInput, 10);
    if (!Number.isNaN(n) && n > 0) onSetEpisodeTarget(n);
  };

  const commitDailyGoal = () => {
    const n = Number.parseInt(dailyInput, 10);
    if (!Number.isNaN(n) && n > 0) onSetDailyGoal(n);
  };

  return (
    <footer
      className="flex-shrink-0 flex items-center justify-between px-4 md:px-6"
      style={{
        height: "40px",
        background: "oklch(0.09 0 0)",
        borderTop: "1px solid oklch(0.17 0 0)",
      }}
      data-ocid="editor.panel"
    >
      <div className="flex items-center gap-2 overflow-hidden">
        {/* Word count */}
        <span
          className="text-[11px] font-medium whitespace-nowrap"
          style={{ color: "oklch(0.60 0 0)" }}
        >
          Words:{" "}
          <span style={{ color: "oklch(0.80 0 0)" }}>
            {wordCount.toLocaleString()}
          </span>
        </span>
        <span style={{ color: "oklch(0.28 0 0)", fontSize: "11px" }}>|</span>
        {/* Read time */}
        <span
          className="text-[11px] font-medium whitespace-nowrap"
          style={{ color: "oklch(0.60 0 0)" }}
        >
          Read: <span style={{ color: "oklch(0.80 0 0)" }}>{readTime}</span>
        </span>
        <span style={{ color: "oklch(0.28 0 0)", fontSize: "11px" }}>|</span>
        {/* WPH */}
        <span
          className="text-[11px] font-medium whitespace-nowrap"
          style={{ color: "oklch(0.60 0 0)" }}
          title="Words per hour (last 10 min)"
        >
          WPH:{" "}
          <span
            style={{
              color: wph > 0 ? "oklch(0.72 0.13 142)" : "oklch(0.45 0 0)",
            }}
          >
            {wph > 0 ? wph.toLocaleString() : "\u2014"}
          </span>
        </span>

        {/* Episode calculator */}
        <Popover
          open={episodeOpen}
          onOpenChange={(o) => {
            setEpisodeOpen(o);
            if (o) setEpisodeInput(String(episodeTarget));
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
              style={{
                color: episodeOpen
                  ? "oklch(var(--primary))"
                  : "oklch(0.48 0 0)",
                background: episodeOpen
                  ? "oklch(var(--primary) / 12%)"
                  : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!episodeOpen)
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "oklch(0.70 0 0)";
              }}
              onMouseLeave={(e) => {
                if (!episodeOpen)
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "oklch(0.48 0 0)";
              }}
              title="Episode calculator"
              data-ocid="editor.open_modal_button"
            >
              <Target size={13} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-0"
            style={{
              background: "oklch(0.13 0 0)",
              border: "1px solid oklch(0.22 0 0)",
            }}
            side="top"
            align="start"
            data-ocid="editor.popover"
          >
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid oklch(0.20 0 0)" }}
            >
              <p
                className="text-[13px] font-bold"
                style={{ color: "oklch(0.92 0 0)" }}
              >
                Episode Calculator
              </p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] whitespace-nowrap"
                  style={{ color: "oklch(0.60 0 0)" }}
                >
                  Target (words):
                </span>
                <input
                  type="number"
                  min={100}
                  max={999999}
                  value={episodeInput}
                  onChange={(e) => setEpisodeInput(e.target.value)}
                  onBlur={commitEpisodeTarget}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitEpisodeTarget();
                      setEpisodeOpen(false);
                    }
                  }}
                  className="flex-1 bg-transparent text-[12px] text-right px-2 py-1 rounded"
                  style={{
                    color: "oklch(0.90 0 0)",
                    border: "1px solid oklch(0.25 0 0)",
                  }}
                  data-ocid="editor.input"
                />
              </div>
              <div className="space-y-1">
                <div className="flex justify-between text-[11px]">
                  <span style={{ color: "oklch(0.55 0 0)" }}>
                    {wordCount.toLocaleString()} /{" "}
                    {episodeTarget.toLocaleString()} words
                  </span>
                  <span style={{ color: "oklch(var(--primary))" }}>
                    {Math.round(episodeProgress)}%
                  </span>
                </div>
                <Progress
                  value={episodeProgress}
                  className="h-1.5"
                  style={
                    { background: "oklch(0.20 0 0)" } as React.CSSProperties
                  }
                />
              </div>
              <div
                className="text-[11px] text-center py-1 px-2 rounded"
                style={{
                  background: "oklch(0.16 0 0)",
                  color:
                    etaLabel === "Done!"
                      ? "oklch(0.72 0.13 142)"
                      : "oklch(0.70 0 0)",
                }}
              >
                {wph === 0
                  ? "Start writing to calculate ETA"
                  : etaLabel === "Done!"
                    ? "Done! Episode complete!"
                    : `At your speed (${wph.toLocaleString()} WPH) \u2014 ${etaLabel} to finish`}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Daily Activity Ring */}
        <Popover
          open={dailyOpen}
          onOpenChange={(o) => {
            setDailyOpen(o);
            if (o) setDailyInput(String(dailyGoal));
          }}
        >
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center justify-center rounded transition-colors"
              style={{
                width: "30px",
                height: "30px",
                background: dailyOpen
                  ? "oklch(var(--primary) / 12%)"
                  : "transparent",
              }}
              title={`Daily goal: ${dailyWordsWritten}/${dailyGoal} words`}
              data-ocid="editor.open_modal_button"
            >
              <ActivityRing progress={dailyProgress} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-60 p-0"
            style={{
              background: "oklch(0.13 0 0)",
              border: "1px solid oklch(0.22 0 0)",
            }}
            side="top"
            align="start"
            data-ocid="editor.popover"
          >
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid oklch(0.20 0 0)" }}
            >
              <p
                className="text-[13px] font-bold"
                style={{ color: "oklch(0.92 0 0)" }}
              >
                Daily Writing Goal
              </p>
              <p
                className="text-[11px] mt-0.5"
                style={{ color: "oklch(0.50 0 0)" }}
              >
                {dailyWordsWritten.toLocaleString()} /{" "}
                {dailyGoal.toLocaleString()} words today
              </p>
            </div>
            <div className="px-4 py-3 space-y-3">
              <div className="flex items-center justify-center">
                <svg
                  width={80}
                  height={80}
                  viewBox="0 0 80 80"
                  style={{ transform: "rotate(-90deg)" }}
                  aria-hidden="true"
                >
                  <circle
                    cx={40}
                    cy={40}
                    r={34}
                    fill="none"
                    stroke="oklch(0.20 0 0)"
                    strokeWidth={8}
                  />
                  <circle
                    cx={40}
                    cy={40}
                    r={34}
                    fill="none"
                    stroke="oklch(var(--primary))"
                    strokeWidth={8}
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 34}
                    strokeDashoffset={
                      2 * Math.PI * 34 -
                      (dailyProgress / 100) * (2 * Math.PI * 34)
                    }
                    style={{
                      transition:
                        "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)",
                    }}
                  />
                </svg>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className="text-[11px] whitespace-nowrap"
                  style={{ color: "oklch(0.60 0 0)" }}
                >
                  Daily goal:
                </span>
                <input
                  type="number"
                  min={50}
                  max={99999}
                  value={dailyInput}
                  onChange={(e) => setDailyInput(e.target.value)}
                  onBlur={commitDailyGoal}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      commitDailyGoal();
                      setDailyOpen(false);
                    }
                  }}
                  className="flex-1 bg-transparent text-[12px] text-right px-2 py-1 rounded"
                  style={{
                    color: "oklch(0.90 0 0)",
                    border: "1px solid oklch(0.25 0 0)",
                  }}
                  data-ocid="editor.input"
                />
                <span
                  className="text-[11px]"
                  style={{ color: "oklch(0.50 0 0)" }}
                >
                  words
                </span>
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Character Quick-Peek */}
        <Popover open={charOpen} onOpenChange={setCharOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
              style={{
                color: charOpen ? "oklch(var(--primary))" : "oklch(0.48 0 0)",
                background: charOpen
                  ? "oklch(var(--primary) / 12%)"
                  : "transparent",
              }}
              onMouseEnter={(e) => {
                if (!charOpen)
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "oklch(0.70 0 0)";
              }}
              onMouseLeave={(e) => {
                if (!charOpen)
                  (e.currentTarget as HTMLButtonElement).style.color =
                    "oklch(0.48 0 0)";
              }}
              title="Character Bank"
              data-ocid="editor.open_modal_button"
            >
              <Users size={13} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            className="w-72 p-0"
            style={{
              background: "oklch(0.13 0 0)",
              border: "1px solid oklch(0.22 0 0)",
            }}
            side="top"
            align="start"
            data-ocid="editor.popover"
          >
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid oklch(0.20 0 0)" }}
            >
              <p
                className="text-[13px] font-bold"
                style={{ color: "oklch(0.92 0 0)" }}
              >
                Character Bank
              </p>
              <p
                className="text-[11px] mt-0.5"
                style={{ color: "oklch(0.50 0 0)" }}
              >
                {characters.length} character
                {characters.length !== 1 ? "s" : ""} detected
              </p>
            </div>
            <div className="max-h-56 overflow-y-auto">
              {characters.length === 0 ? (
                <div
                  className="px-4 py-6 text-center text-[12px]"
                  style={{ color: "oklch(0.45 0 0)" }}
                  data-ocid="editor.empty_state"
                >
                  No characters detected yet.
                  <br />
                  Type character names in ALL CAPS.
                </div>
              ) : (
                characters.map((name) => (
                  <div
                    key={name}
                    className="px-4 py-2.5"
                    style={{ borderBottom: "1px solid oklch(0.16 0 0)" }}
                  >
                    <p
                      className="text-[12px] font-semibold mb-1"
                      style={{ color: "oklch(var(--primary))" }}
                    >
                      {name}
                    </p>
                    <input
                      type="text"
                      value={characterMotes[name] ?? ""}
                      onChange={(e) =>
                        onUpdateCharacterMotes(name, e.target.value)
                      }
                      placeholder="Brief motive..."
                      className="w-full bg-transparent text-[11px] placeholder:opacity-40"
                      style={{
                        color: "oklch(0.70 0 0)",
                        borderBottom: "1px solid oklch(0.22 0 0)",
                        paddingBottom: "2px",
                      }}
                      data-ocid="editor.input"
                    />
                  </div>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* Export button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors"
              style={{ color: "oklch(0.48 0 0)" }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "oklch(0.70 0 0)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color =
                  "oklch(0.48 0 0)";
              }}
              title="Export"
              data-ocid="editor.open_modal_button"
            >
              <Download size={13} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-44"
            style={{
              background: "oklch(0.13 0 0)",
              border: "1px solid oklch(0.22 0 0)",
            }}
            side="top"
            align="start"
            data-ocid="editor.dropdown_menu"
          >
            <DropdownMenuItem
              onClick={onExportPdf}
              className="text-[12px] cursor-pointer"
              style={{ color: "oklch(0.80 0 0)" }}
              data-ocid="editor.button"
            >
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onExportTxt}
              className="text-[12px] cursor-pointer"
              style={{ color: "oklch(0.80 0 0)" }}
              data-ocid="editor.button"
            >
              Export as .txt
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mode toggle — only visible when actively writing (not in outline/project views) */}
      {isWriting !== false && (
        <div
          className="flex items-center rounded-full overflow-hidden flex-shrink-0"
          style={{ border: "1px solid oklch(0.22 0 0)" }}
        >
          <button
            type="button"
            onClick={() => onModeChange("screenplay")}
            className="px-3 py-0.5 text-[10px] font-bold tracking-widest uppercase transition-colors"
            style={{
              background:
                mode === "screenplay" ? "oklch(var(--primary))" : "transparent",
              color:
                mode === "screenplay"
                  ? "oklch(var(--primary-foreground))"
                  : "oklch(0.48 0 0)",
            }}
            data-ocid="editor.toggle"
          >
            Screenplay
          </button>
          <button
            type="button"
            onClick={() => onModeChange("novel")}
            className="px-3 py-0.5 text-[10px] font-bold tracking-widest uppercase transition-colors"
            style={{
              background:
                mode === "novel" ? "oklch(var(--primary))" : "transparent",
              color:
                mode === "novel"
                  ? "oklch(var(--primary-foreground))"
                  : "oklch(0.48 0 0)",
            }}
            data-ocid="editor.toggle"
          >
            Novel
          </button>
        </div>
      )}
    </footer>
  );
}
