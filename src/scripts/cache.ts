import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { ensureDir } from "@/scripts/io";

export type CacheEntry<T> = {
  value: T;
  createdAt: string;
};

export function hashString(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function buildCachePath(
  baseDir: string,
  key: string,
): { dir: string; filePath: string } {
  const prefix = key.slice(0, 2);
  const dir = path.join(baseDir, prefix);
  const filePath = path.join(dir, `${key}.json`);
  return { dir, filePath };
}

export class FileCache {
  baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
  }

  async get<T>(key: string, maxAgeMs?: number): Promise<T | null> {
    const { filePath } = buildCachePath(this.baseDir, key);
    try {
      const raw = await fs.readFile(filePath, "utf8");
      const entry = JSON.parse(raw) as CacheEntry<T>;
      if (!entry || !entry.createdAt) return null;
      if (maxAgeMs) {
        const createdAt = Date.parse(entry.createdAt);
        if (Number.isFinite(createdAt)) {
          const age = Date.now() - createdAt;
          if (age > maxAgeMs) return null;
        }
      }
      return entry.value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
      return null;
    }
  }

  async set<T>(key: string, value: T): Promise<void> {
    const { dir, filePath } = buildCachePath(this.baseDir, key);
    await ensureDir(dir);
    const entry: CacheEntry<T> = {
      value,
      createdAt: new Date().toISOString(),
    };
    await fs.writeFile(filePath, JSON.stringify(entry, null, 2), "utf8");
  }
}
