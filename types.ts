
export interface StoryboardSegment {
  id: string;
  sectionTitle: string;
  lyrics: string;
  visuals: string;
  cameraWork: string;
  lightingMood: string;
  mermaidDiagram?: string;
  isProcessing?: boolean;
}

export interface StoryboardProject {
  rawText: string;
  narrativeSeed: string;
  sceneMarkers: number[];
  segments: StoryboardSegment[];
  step: AppStep;
  version: string;
}

export enum AppStep {
  PASTE_LYRICS = 'PASTE_LYRICS',
  DEFINE_SCENES = 'DEFINE_SCENES',
  PRODUCTION = 'PRODUCTION'
}
