/**
 * Commodore 64 ROM Ingestion & Catalog Generator
 * Scans C:\Users\KB\Desktop\Antigravity\Commodore 64 Web Emulator\src\roms recursively,
 * parses all authentic Commodore 64 media and music assets,
 * and generates a unified, high-performance catalog in src/data/c64_roms_catalog.json.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, "..");
const ROMS_DIR = path.resolve(ROOT_DIR, "src", "roms");
const OUTPUT_JSON = path.resolve(ROOT_DIR, "src", "data", "c64_roms_catalog.json");

// Recognized Commodore 64 and Amiga/C64 tracker file extensions
const SUPPORTED_EXTENSIONS = new Set([
  ".d64",
  ".g64",
  ".d71",
  ".d81",
  ".t64",
  ".tap",
  ".prg",
  ".p00",
  ".crt",
  ".zip",
  ".gz",
  ".sid",
  ".mod",
  ".xm",
  ".s3m",
  ".it",
]);

export interface RomCatalogEntry {
  id: string;
  name: string;
  title: string;
  cleanTitle: string;
  ext: string;
  format: string;
  size: number;
  category: string;
  subCategory: string;
  relPath: string;
  romUrl: string;
}

export interface RomCatalog {
  generatedAt: string;
  totalEntries: number;
  totalSizeBytes: number;
  categories: Record<string, number>;
  formats: Record<string, number>;
  entries: RomCatalogEntry[];
}

function cleanTitle(rawName: string, ext: string): string {
  let base = rawName.slice(0, rawName.length - ext.length);
  // Remove trailing version/disk numbers like (1985), #1, [cr], etc.
  base = base
    .replace(/\[.*?\]/g, "")
    .replace(/\(.*?\)/g, "")
    .replace(/_+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return base || rawName;
}

function getFormatLabel(ext: string): string {
  const clean = ext.replace(/^\./, "").toUpperCase();
  switch (clean) {
    case "D64":
    case "G64":
    case "D71":
    case "D81":
      return "D64";
    case "T64":
      return "T64";
    case "TAP":
      return "TAP";
    case "PRG":
    case "P00":
      return "PRG";
    case "CRT":
      return "CRT";
    case "ZIP":
    case "GZ":
      return "ZIP";
    case "SID":
      return "SID";
    case "MOD":
    case "XM":
    case "S3M":
    case "IT":
      return "TRACKER";
    default:
      return clean;
  }
}

function sanitizeId(relPath: string): string {
  return relPath
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function scanDirectory(dir: string, entries: RomCatalogEntry[]) {
  if (!fs.existsSync(dir)) return;

  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      scanDirectory(fullPath, entries);
    } else if (item.isFile()) {
      const ext = path.extname(item.name).toLowerCase();
      if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

      const stat = fs.statSync(fullPath);
      const relToRoot = path.relative(ROOT_DIR, fullPath).replace(/\\/g, "/");
      const relToRoms = path.relative(ROMS_DIR, fullPath).replace(/\\/g, "/");
      const segments = relToRoms.split("/");
      const category = segments[0] || "general";
      const subCategory = segments.length > 1 ? segments.slice(0, -1).join("/") : category;

      const baseTitle = cleanTitle(item.name, path.extname(item.name));
      const format = getFormatLabel(ext);

      entries.push({
        id: sanitizeId(relToRoms),
        name: item.name,
        title: baseTitle,
        cleanTitle: baseTitle.toUpperCase(),
        ext: ext.replace(/^\./, ""),
        format,
        size: stat.size,
        category,
        subCategory,
        relPath: relToRoot,
        romUrl: `/api/roms?path=${encodeURIComponent(relToRoot)}`,
      });
    }
  }
}

export function ingestRoms(): RomCatalog {
  console.log(`Starting ingestion of ROMs from: ${ROMS_DIR}`);
  const startTime = Date.now();

  const entries: RomCatalogEntry[] = [];
  scanDirectory(ROMS_DIR, entries);

  // Sort deterministically by Category -> Title
  entries.sort((a, b) => {
    if (a.category !== b.category) {
      return a.category.localeCompare(b.category);
    }
    return a.title.localeCompare(b.title);
  });

  const categoriesCount: Record<string, number> = {};
  const formatsCount: Record<string, number> = {};
  let totalSize = 0;

  for (const entry of entries) {
    categoriesCount[entry.category] = (categoriesCount[entry.category] || 0) + 1;
    formatsCount[entry.format] = (formatsCount[entry.format] || 0) + 1;
    totalSize += entry.size;
  }

  const catalog: RomCatalog = {
    generatedAt: new Date().toISOString(),
    totalEntries: entries.length,
    totalSizeBytes: totalSize,
    categories: categoriesCount,
    formats: formatsCount,
    entries,
  };

  // Ensure target folder exists
  const outDir = path.dirname(OUTPUT_JSON);
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(catalog, null, 2), "utf-8");

  const durationMs = Date.now() - startTime;
  console.log(`\n=== INGESTION SUMMARY ===`);
  console.log(`Total Media Assets Ingested: ${entries.length.toLocaleString()}`);
  console.log(`Total Storage: ${(totalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`Duration: ${durationMs} ms`);
  console.log(`Output: ${OUTPUT_JSON}\n`);

  console.log("Breakdown by Format:");
  for (const [fmt, count] of Object.entries(formatsCount)) {
    console.log(`  - ${fmt.padEnd(8)}: ${count.toString().padStart(5)}`);
  }

  console.log("\nBreakdown by Category:");
  for (const [cat, count] of Object.entries(categoriesCount)) {
    console.log(`  - ${cat.padEnd(12)}: ${count.toString().padStart(5)}`);
  }

  return catalog;
}

// Execute directly if run via CLI
if (process.argv[1] && process.argv[1].includes("ingest_roms")) {
  ingestRoms();
}
