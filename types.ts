
export interface Character {
  id: string;
  name: string;
  imageUrl?: string;
}

export interface StoryboardSegment {
  id: string;
  sectionTitle: string;
  lyrics: string;
  visuals: string;
  cameraWork: string;
  lightingMood: string;
  mermaidDiagram?: string;
  isProcessing?: boolean;
  characters?: string[]; // IDs or names of characters present in this scene
}

export interface StoryboardProject {
  rawText: string;
  narrativeSeed: string;
  sceneMarkers: number[];
  segments: StoryboardSegment[];
  characters: Character[];
  step: AppStep;
  version: string;
}

export enum AppStep {
  PASTE_LYRICS = 'PASTE_LYRICS',
  DEFINE_SCENES = 'DEFINE_SCENES',
  PRODUCTION = 'PRODUCTION',
  RESOURCES = 'RESOURCES',
  PRESENTATION = 'PRESENTATION'
}
