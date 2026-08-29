import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Server-side Gemini API client (lazy-initialization & safe error handling)
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// In-memory ROM cache
const romCache = new Map<string, { data: Buffer; contentType: string }>();

// Multi-mirror ROM proxy endpoint to ensure 100% reliable game downloads
app.get("/api/roms", async (req, res) => {
  try {
    const rawPath = (req.query.path as string) || (req.query.url as string);
    if (!rawPath) {
      return res.status(400).json({ error: "Missing 'path' query parameter" });
    }

    // Clean and normalize path (e.g. "roms/polish/Familiada.d64")
    const cleanPath = decodeURIComponent(rawPath).replace(/^\/+/, "");

    // Check memory cache first
    if (romCache.has(cleanPath)) {
      const cached = romCache.get(cleanPath)!;
      res.setHeader("Content-Type", cached.contentType);
      res.setHeader("Cache-Control", "public, max-age=86400");
      res.setHeader("X-ROM-Cache", "HIT");
      return res.send(cached.data);
    }

    // List of mirror base URLs
    const mirrors = [
      `https://raw.githubusercontent.com/v3n0m3n0/Commodore64-Web-Emulator/main/${encodeURI(cleanPath)}`,
      `https://cdn.jsdelivr.net/gh/v3n0m3n0/Commodore64-Web-Emulator@main/${encodeURI(cleanPath)}`,
      `https://raw.githack.com/v3n0m3n0/Commodore64-Web-Emulator/main/${encodeURI(cleanPath)}`,
      `https://fastly.jsdelivr.net/gh/v3n0m3n0/Commodore64-Web-Emulator@main/${encodeURI(cleanPath)}`,
      `https://raw.githubusercontent.com/v3n0m3n0/Commodore64-Web-Emulator/main/${cleanPath}`,
    ];

    for (const mirrorUrl of mirrors) {
      try {
        const response = await fetch(mirrorUrl, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
        });

        if (response.ok) {
          const arrayBuf = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuf);
          const contentType = response.headers.get("content-type") || "application/octet-stream";

          // Save to cache
          romCache.set(cleanPath, { data: buffer, contentType });

          res.setHeader("Content-Type", contentType);
          res.setHeader("Cache-Control", "public, max-age=86400");
          res.setHeader("X-ROM-Cache", "MISS");
          return res.send(buffer);
        }
      } catch (mirrorErr) {
        // Continue to next mirror
      }
    }

    return res.status(404).json({
      error: `Could not fetch ROM '${cleanPath}' from any mirror`,
    });
  } catch (err: any) {
    console.error("ROM Proxy Error:", err);
    res.status(500).json({ error: err.message || "Failed to fetch ROM" });
  }
});

// Gemini Copilot chat / analysis endpoint
app.post("/api/gemini/copilot", async (req, res) => {
  try {
    const { prompt, systemInstruction, model = "gemini-3.7-flash", telemetry } = req.body;

    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured in the server environment. Please set GEMINI_API_KEY in Settings > Secrets.",
      });
    }

    // Prepare contextual prompt with live C64 telemetry if provided
    let fullPrompt = prompt;
    if (telemetry) {
      fullPrompt = `[LIVE COMMODORE 64 TELEMETRY]
CPU Registers: A=$${telemetry.a?.toString(16).padStart(2, "0").toUpperCase() || "00"} X=$${telemetry.x?.toString(16).padStart(2, "0").toUpperCase() || "00"} Y=$${telemetry.y?.toString(16).padStart(2, "0").toUpperCase() || "00"} SP=$${telemetry.sp?.toString(16).padStart(2, "0").toUpperCase() || "FF"} PC=$${telemetry.pc?.toString(16).padStart(4, "0").toUpperCase() || "E5CD"} Flags=${telemetry.flags || "NV-BDIZC"}
Port $01: $${telemetry.port01?.toString(16).padStart(2, "0").toUpperCase() || "37"}
Raster Line: ${telemetry.rasterLine ?? "N/A"} | PAL/NTSC: ${telemetry.standard || "PAL"}
Active Program / Media: ${telemetry.mediaName || "Standard BASIC prompt"}

Current Screen Text Buffer ($0400-$07E7):
\`\`\`
${telemetry.screenText || "READY."}
\`\`\`

Current Detokenized BASIC Program:
\`\`\`basic
${telemetry.basicCode || "10 REM NO PROGRAM LOADED"}
\`\`\`

Disassembly at PC ($${telemetry.pc?.toString(16).padStart(4, "0").toUpperCase() || "E5CD"}):
\`\`\`assembly
${telemetry.disassembly || "NOP"}
\`\`\`

[USER INSTRUCTION / QUESTION]
${prompt}`;
    }

    const defaultSystemInstruction =
      "Jesteś elitarnym inżynierem systemowym Commodore 64 oraz ekspertem asemblera MOS 6510 / 6502 (Commodore 64 AI Studio Copilot).\n" +
      "Zasady generowania kodu Asemblera 6502 / 6510:\n" +
      "1. Zawsze określaj adres początkowy programu (np. * = $C000 lub * = $0801 dla autostartu BASIC z nagłówkiem SYS).\n" +
      "2. Zawsze podawaj krótkie instrukcje wywołania z poziomu BASIC (np. 'SYS 49152' dla $C000 lub 'SYS 2061' dla $080D).\n" +
      "3. Kod asemblera umieszczaj ZAWSZE w bloku markdown ```assembly ... ``` z czytelnymi komentarzami.\n" +
      "4. Korzystaj ze standardowych wektorów KERNAL ($FF81-$FFF3), rejestrów VIC-II ($D000-$D02E), SID ($D400-$D41C) i CIA ($DC00/$DD00).\n" +
      "5. W przypadku BASIC V2: linie numerowane (10, 20...), słowa kluczowe WIELKIMI LITERAMI, kod w bloku ```basic ... ```.";

    const response = await ai.models.generateContent({
      model: model === "gemini-3.1-pro" ? "gemini-3.1-pro-preview" : "gemini-3.7-flash",
      contents: fullPrompt,
      config: {
        systemInstruction: systemInstruction || defaultSystemInstruction,
        temperature: req.body.temperature ?? 0.7,
      },
    });

    const text = response.text || "";
    res.json({ text, model });
  } catch (error: any) {
    console.error("Gemini Copilot Error:", error);
    res.status(500).json({
      error: error.message || "Failed to generate AI response",
    });
  }
});

// Code Generation Endpoint (BASIC / 6502 Assembly)
app.post("/api/gemini/generate-code", async (req, res) => {
  try {
    const { task, type = "basic", telemetry } = req.body;
    const ai = getGeminiClient();
    if (!ai) {
      return res.status(503).json({
        error: "GEMINI_API_KEY is not configured.",
      });
    }

    const prompt = `Write a Commodore 64 program in ${type === "asm" ? "6502 Machine Code Assembly" : "Commodore BASIC V2"} that achieves the following:
${task}

${type === "asm" ? "Include origin address (* = $C000 or * = $0801 with BASIC SYS header), complete comments, and correct KERNAL routine calls." : "Use valid Commodore BASIC V2 with line numbers starting at 10, uppercase keywords, and correct POKEs."}
Return the code cleanly in a markdown code block.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: prompt,
      config: {
        systemInstruction: "You are an expert Commodore 64 programmer. Output accurate, bug-free C64 BASIC V2 or 6502 assembly code ready for execution.",
      },
    });

    res.json({ code: response.text, type });
  } catch (error: any) {
    console.error("Gemini Code Gen Error:", error);
    res.status(500).json({ error: error.message || "Code generation failed" });
  }
});

// Vite middleware & Static Serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Commodore 64 Web Emulator Server running on port ${PORT}`);
  });
}

start();
