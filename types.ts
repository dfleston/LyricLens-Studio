
export interface Character {
  id: string;
  name: string;
  images: string[]; // Support multiple reference images
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
  characters?: string[]; // Names of characters present
  firstFrame?: string; // Generated base64 image
  lastFrame?: string;  // Generated base64 image
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
  FRAME_DEV = 'FRAME_DEV', // New step for visual generation
  PRESENTATION = 'PRESENTATION'
}
