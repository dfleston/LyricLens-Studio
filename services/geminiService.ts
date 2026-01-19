
import { GoogleGenAI, Type } from "@google/genai";
import { StoryboardSegment, Character } from "../types";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const generateSceneContent = async (
  lyrics: string, 
  context: string, 
  seed: string, 
  characters: Character[]
): Promise<Partial<StoryboardSegment>> => {
  const charContext = characters.length > 0 
    ? `CHARACTERS IN STORY: ${characters.map(c => c.name).join(', ')}.` 
    : '';

  try {
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

    // The GenerateContentResponse object features a text property (not a method)
    const text = response.text;
    if (!text) throw new Error("No response from AI");
    return JSON.parse(text.trim());
  } catch (error: any) {
    if (error?.message?.includes('429') || error?.status === 'RESOURCE_EXHAUSTED') {
      throw new Error("QUOTA_EXHAUSTED: API rate limit reached. Please wait a moment before trying again.");
    }
    throw error;
  }
};

export const generateDiagram = async (segment: StoryboardSegment): Promise<string> => {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Create a Mermaid.js flowchart (graph TD) representing the cinematic flow of the following film scene. 
      
      STRICT SYNTAX RULES:
      1. Use 'graph TD'.
      2. ALL node labels MUST be wrapped in double quotes. 
         - CORRECT: A["Character @Name"]
         - INCORRECT: A[Character @Name]
      3. Do not use special characters outside of quotes.
      4. If a name starts with @, it MUST be inside double quotes.
      
      SCENE DESCRIPTION: ${segment.visuals}
      CAMERA: ${segment.cameraWork}`,
    });

    // Directly access the .text property
    return response.text || '';
  } catch (error: any) {
    if (error?.message?.includes('429')) throw new Error("QUOTA_EXHAUSTED");
    throw error;
  }
};

export const generateFrame = async (
  segment: StoryboardSegment, 
  characters: Character[],
  type: 'FIRST' | 'LAST',
  seed: string
): Promise<string> => {
  const model = 'gemini-2.5-flash-image';
  
  const mentionedChars = characters.filter(c => 
    segment.visuals.toLowerCase().includes(c.name.toLowerCase()) ||
    segment.cameraWork.toLowerCase().includes(c.name.toLowerCase())
  );

  const parts: any[] = [];
  
  mentionedChars.forEach(char => {
    (char.images || []).slice(0, 2).forEach(img => {
      const parts_img = img.split(',');
      if (parts_img.length < 2) return;
      const base64Data = parts_img[1];
      const mimeType = parts_img[0].split(';')[0].split(':')[1];
      parts.push({
        inlineData: { data: base64Data, mimeType }
      });
    });
  });

  const prompt = `Generate a high-quality cinematic ${type} FRAME for a music video scene.
  SCENE DESCRIPTION: ${segment.visuals}
  CAMERA WORK: ${segment.cameraWork}
  LIGHTING & MOOD: ${segment.lightingMood}
  NARRATIVE DIRECTION: ${seed}
  
  The provided images are character references. Ensure characters match these references exactly.
  ${type === 'FIRST' ? 'Capture the starting moment.' : 'Capture the peak of motion.'}
  
  Style: Photorealistic, cinematic 35mm film.`;

  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model,
      contents: { parts },
      config: {
          imageConfig: { aspectRatio: "16:9" }
      }
    });

    // Find the image part, do not assume it is the first part.
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
      }
    }
  } catch (error: any) {
    if (error?.message?.includes('429')) throw new Error("QUOTA_EXHAUSTED");
    throw error;
  }

  throw new Error("No image generated");
};
