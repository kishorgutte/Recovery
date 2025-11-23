import { GoogleGenAI } from "@google/genai";
import { Consumer } from "../types";

// Safe access for environment variables to prevent browser crash if process is undefined
const getApiKey = () => {
  try {
    if (typeof process !== 'undefined' && process.env) {
      return process.env.API_KEY || '';
    }
  } catch (e) {
    // Ignore error
  }
  return '';
};

// REMOVED top-level initialization which causes crash
// const ai = new GoogleGenAI({ apiKey: API_KEY });

export const generateMessage = async (consumer: Consumer, type: 'SMS' | 'WhatsApp'): Promise<string> => {
  const apiKey = getApiKey();
  
  if (!apiKey) {
    // Return error string instead of crashing
    return "Error: API Key not configured. Please check environment variables.";
  }

  const prompt = `
    Act as a professional billing recovery agent for Mahadiscom (Maharashtra State Electricity Distribution Co. Ltd).
    Write a short, polite, but firm ${type} message to a consumer regarding their overdue electricity bill.
    
    Consumer Details:
    Name: ${consumer.name}
    Consumer No: ${consumer.consumerNo}
    Total Due: ₹${consumer.totalDue}
    Bill Due Date: ${consumer.billDueDate}
    Overdue Days: ${consumer.ageInDays}
    
    Requirements:
    1. Keep it under 40 words for SMS, or under 60 words for WhatsApp.
    2. Include the Consumer No and Amount clearly.
    3. If overdue days > 90, mention "Disconnection Notice".
    4. If overdue days < 30, be gentle.
    5. Do not add placeholders, output the final message text only.
    6. Language: English.
  `;

  try {
    // Initialize client ONLY when function is called
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Could not generate message.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error generating message. Please check connection.";
  }
};