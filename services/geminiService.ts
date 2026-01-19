
import { GoogleGenAI, Type } from "@google/genai";
import { StoryboardSegment, Character } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateSceneContent = async (
  lyrics: string, 
  context: string, 
  seed: string, 
  characters: Character[]
): Promise<Partial<StoryboardSegment>> => {
  const charContext = characters.length > 0 
    ? `CHARACTERS IN STORY: ${characters.map(c => c.name).join(', ')}.` 
    : '';

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `As a video director, provide visual instructions for this specific song segment.
    
    NARRATIVE ANGLE/DIRECTION: ${seed || "Cinematic and faithful to the lyrics"}
    ${charContext}
    
    CONTEXT: ${context}
    SEGMENT LYRICS: ${lyrics}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          visuals: { type: Type.STRING, description: "Action happening in the scene. Use character names if applicable." },
          cameraWork: { type: Type.STRING, description: "Camera movement and angles" },
          lightingMood: { type: Type.STRING, description: "Lighting style and color palette" },
          sectionTitle: { type: Type.STRING, description: "Logical name (e.g. Verse 1)" }
        },
        required: ["visuals", "cameraWork", "lightingMood", "sectionTitle"]
      }
    }
  });

  const text = response.text;
  if (!text) throw new Error("No response from AI");
  return JSON.parse(text.trim());
};

export const generateDiagram = async (segment: StoryboardSegment): Promise<string> => {
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Create a Mermaid.js flowchart representing the flow of the following film scene description. Use clean, professional syntax. Do not include markdown blocks.
    SCENE: ${segment.visuals}
    CAMERA: ${segment.cameraWork}`,
  });

  return response.text || '';
};
