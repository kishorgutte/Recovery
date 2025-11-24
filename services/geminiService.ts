import { Consumer } from "../types";

// NOTE: AI Features are currently disabled to ensure offline stability.
// This file serves as a placeholder to prevent import errors in other components.

export const generateMessage = async (consumer: Consumer, type: 'SMS' | 'WhatsApp'): Promise<string> => {
  return "AI generation disabled.";
};
