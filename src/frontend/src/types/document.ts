export type WritingMode = "screenplay" | "novel";

export type ScreenplayElementType =
  | "slugline"
  | "action"
  | "character"
  | "dialogue"
  | "parenthetical"
  | "transition"
  | "cameraAngle"
  | "endAct"
  | "startAct";

export interface ScriptLine {
  id: string;
  text: string;
  type: ScreenplayElementType;
}

export interface Beat {
  id: string;
  title: string;
  goal: string;
  conflict: string;
  sluglineRef?: string;
}

export interface WritefyDocument {
  id: string;
  title: string;
  content: string; // keep for backward compat / export
  lines?: ScriptLine[]; // per-line typed content
  mode: WritingMode;
  createdAt: string;
  updatedAt: string;
  beats?: Beat[];
  characterMotes?: Record<string, string>;
}

export const ELEMENT_CYCLE: ScreenplayElementType[] = [
  "slugline",
  "action",
  "character",
  "dialogue",
  "parenthetical",
  "transition",
  "cameraAngle",
  "endAct",
  "startAct",
];

export const ELEMENT_LABELS: Record<ScreenplayElementType, string> = {
  slugline: "Slugline",
  action: "Action",
  character: "Character",
  dialogue: "Dialogue",
  parenthetical: "Parenthetical",
  transition: "Transition",
  cameraAngle: "Camera Angle",
  endAct: "End Act",
  startAct: "Start Act",
};

export interface ElementMeta {
  hint: string;
  autoCaps: boolean;
  textAlign?: "left" | "center" | "right";
  marginLeft?: string;
  marginRight?: string;
  fontWeight?: string;
  fontStyle?: string;
}

export const ELEMENT_META: Record<ScreenplayElementType, ElementMeta> = {
  slugline: { hint: "INT./EXT. LOCATION - TIME", autoCaps: true },
  action: { hint: "What we see and hear", autoCaps: false },
  character: { hint: "Who is speaking", autoCaps: true, textAlign: "center" },
  dialogue: {
    hint: "What the character says",
    autoCaps: false,
    marginLeft: "3em",
    marginRight: "3em",
  },
  parenthetical: {
    hint: "(whispering) or (angrily)",
    autoCaps: false,
    marginLeft: "3em",
    marginRight: "3em",
    fontStyle: "italic",
  },
  transition: {
    hint: "FADE OUT: / CUT TO:",
    autoCaps: true,
    textAlign: "right",
  },
  cameraAngle: {
    hint: "CLOSE UP: / POV:",
    autoCaps: true,
    fontStyle: "italic",
  },
  endAct: {
    hint: "END OF ACT ONE",
    autoCaps: true,
    textAlign: "center",
    fontWeight: "700",
  },
  startAct: {
    hint: "ACT TWO",
    autoCaps: true,
    textAlign: "center",
    fontWeight: "700",
  },
};

/** Auto-next type after pressing Enter on a given type */
export const ELEMENT_AUTO_NEXT: Record<
  ScreenplayElementType,
  ScreenplayElementType
> = {
  slugline: "action",
  action: "action",
  character: "dialogue",
  dialogue: "action",
  parenthetical: "dialogue",
  transition: "slugline",
  cameraAngle: "action",
  endAct: "action",
  startAct: "action",
};
