import { existsSync, readFileSync, writeFileSync } from "fs";
import { isString } from '@/utils/isString';

export function setEnv(key: string, value: string, replace: boolean = false) {
  const envPath = ".env";
  let lines: string[] = [];

  if (existsSync(envPath)) {
    lines = readFileSync(envPath, "utf8").split("\n");

    const currentVariable = lines.find((line) => line.startsWith(`${key}=`));
    if (isString(currentVariable) && isString(currentVariable.split("=")[1]) && !replace) {
      return;
    }

    lines = lines.filter((line) => !line.startsWith(key + "=") && line.trim() !== "");
  }

  lines.push(`${key}=${value}`);

  writeFileSync(envPath, lines.join("\n") + "\n", "utf8");
}