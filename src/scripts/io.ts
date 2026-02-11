import fs from "node:fs/promises";

export async function readText(filePath: string): Promise<string> {
  return fs.readFile(filePath, "utf8");
}

export async function readTextSafe(
  filePath: string,
  fallback: string
): Promise<{ data: string; error?: Error }> {
  try {
    const data = await readText(filePath);
    return { data };
  } catch (error) {
    return { data: fallback, error: error as Error };
  }
}

export async function readJsonSafe<T>(
  filePath: string,
  fallback: T
): Promise<{ data: T; error?: Error }> {
  try {
    const raw = await readText(filePath);
    const data = JSON.parse(raw) as T;
    return { data };
  } catch (error) {
    return { data: fallback, error: error as Error };
  }
}

export async function ensureDir(dirPath: string): Promise<void> {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function writeText(filePath: string, content: string): Promise<void> {
  await fs.writeFile(filePath, content, "utf8");
}

export async function writeJson<T>(filePath: string, data: T): Promise<void> {
  const payload = JSON.stringify(data, null, 2);
  await writeText(filePath, `${payload}\n`);
}
