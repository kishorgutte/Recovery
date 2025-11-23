// import { GoogleGenAI } from "@google/genai";
import { Consumer } from "../types";

// NOTE: This service is currently disabled to prevent "App not loading" errors in preview environments.
// The GoogleGenAI import can cause crashes if the environment doesn't support it or if API keys are missing on load.

export const generateMessage = async (consumer: Consumer, type: 'SMS' | 'WhatsApp'): Promise<string> => {
  return "AI Message generation is currently disabled.";
  
  /* 
  // UNCOMMENT TO ENABLE AI FEATURES
  
  const getApiKey = () => {
    try {
      if (typeof process !== 'undefined' && process.env) {
        return process.env.API_KEY || '';
      }
    } catch (e) {
      return '';
    }
    return '';
  };

  const apiKey = getApiKey();
  
  if (!apiKey) {
    return "Error: API Key not configured.";
  }

  const prompt = `
    Act as a professional billing recovery agent...
    [Prompt Details]
  `;

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    return response.text || "Could not generate message.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating message.";
  }
  */
};
