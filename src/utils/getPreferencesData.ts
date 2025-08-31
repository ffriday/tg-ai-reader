  import { readFileSync } from "fs";

  export const getPreferencesData = (path: string) => {
    try {
      const raw = readFileSync(path, "utf8");
      const data = JSON.parse(raw);
      return data;
    } catch (error) {
      console.error("Error reading or parsing preferences data:", error);
      return null;
    }
  };