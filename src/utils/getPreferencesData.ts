import { readFileSync } from "fs";
import { logger } from './logger';

export const getPreferencesData = (path: string) => {
  try {
    const raw = readFileSync(path, "utf8");
    const data = JSON.parse(raw);
    
    // Validate the data structure
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid data format: expected object');
    }
    
    if (!Array.isArray(data.interesting) || !Array.isArray(data.uninteresting)) {
      throw new Error('Invalid data format: expected interesting and uninteresting arrays');
    }
    
    return data;
  } catch (error) {
    logger.error("Error reading or parsing preferences data:", error);
    throw error; // Re-throw instead of returning null
  }
};