import readline from "readline/promises";
import { stdin as input, stdout as output } from "process";


export const readLineInput = async (message: string = ""): Promise<string> => {
  const rl = readline.createInterface({ input, output });
  const data = await rl.question(message);
  rl.close();
  return data.trim();
}