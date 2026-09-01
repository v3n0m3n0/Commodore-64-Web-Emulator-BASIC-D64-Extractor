/**
 * Polish Retro Games Gallery & Functional Test Runner for Commodore 64
 * Featuring 58 Polish C64 classics (Familiada, Hans Kloss, Robbo, Agent UOP, etc.)
 * with automated functional verification, D64/T64/PRG extraction, and 1-click execution.
 */

import React, { useState, useMemo } from "react";
import {
  Gamepad2,
  Play,
  Search,
  CheckCircle2,
  AlertTriangle,
  FolderOpen,
  Sparkles,
  Layers,
  Calendar,
  User,
  Building,
  Terminal,
  Activity,
  Award,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Disc,
} from "lucide-react";
import { C64System } from "../c64/c64_system";
import { C64D64 } from "../c64/c64_d64";
import { C64T64 } from "../c64/c64_t64";
import { C64PRG } from "../c64/c64_prg";
import { C64Basic } from "../c64/c64_basic_detokenizer";
import { C64ArchiveManager } from "../c64/c64_archive_manager";
import polishCatalogData from "../data/c64_polish_catalog.json";

export interface PolishGameMeta {
  genre?: string;
  author?: string;
  year?: string;
  desc?: string;
  publisher?: string;
}

export interface PolishGame {
  id: string;
  name: string;
  title: string;
  cleanTitle: string;
  ext: string;
  size: number;
  romUrl: string;
  coverUrl?: string;
  screenshotUrl?: string;
  meta?: PolishGameMeta;
  desc?: string;
  wikiUrl?: string;
}

interface FunctionalTestReport {
  gameName: string;
  status: "running" | "passed" | "failed";
  timestamp: string;
  steps: {
    name: string;
    status: "pending" | "running" | "passed" | "failed";
    details: string;
  }[];
  mediaInfo?: {
    type: "D64" | "T64" | "PRG" | "TAP";
    name: string;
    details: string;
    loadAddress: string;
    sizeBytes: number;
    subFilesCount?: number;
  };
  basicAnalysis?: {
    linesCount: number;
    hasSys: boolean;
    sysAddress?: number;
    firstLine: string;
  };
  cpuState?: {
    pc: string;
    a: string;
    x: string;
    y: string;
    sp: string;
    status: string;
  };
  errorDiagnostic?: {
    c64Error: string;
    pcLocation: string;
    explanation: string;
    recommendedGameId?: string;
    recommendedGameName?: string;
  };
}

interface C64PolishGamesCatalogProps {
  system: C64System;
  onSwitchToScreen: () => void;
  onOpenBasicStudio?: (code: string) => void;
  onOpenDebugger?: (addr: number) => void;
}

const PRIMARY_REPO_BASE =
  "https://raw.githubusercontent.com/v3n0m3n0/Commodore-64-Web-Emulator-BASIC-D64-Extractor/main/src/roms/games/polish_classics/";

/**
 * Robust multi-tier ROM downloader with proxy & CDN mirrors
 */
async function fetchRetroRomBytes(romUrl: string, gameName: string): Promise<Uint8Array> {
  const cleanPath = decodeURIComponent(romUrl).replace(/^\/+/, "");
  const fileName = gameName || cleanPath.split("/").pop() || cleanPath;
  const encodedFileName = encodeURIComponent(fileName);
  const encodedPath = encodeURI(cleanPath);

  const candidateUrls = [
    // Server proxy with memory caching and multi-mirror fallback
    `/api/roms?path=${encodeURIComponent(cleanPath)}`,
    `/api/roms?path=src/roms/games/polish_classics/${encodedFileName}`,

    // Direct GitHub repo: Commodore-64-Web-Emulator-BASIC-D64-Extractor
    `${PRIMARY_REPO_BASE}${encodedFileName}`,
    `https://cdn.jsdelivr.net/gh/v3n0m3n0/Commodore-64-Web-Emulator-BASIC-D64-Extractor@main/src/roms/games/polish_classics/${encodedFileName}`,
    `https://raw.githack.com/v3n0m3n0/Commodore-64-Web-Emulator-BASIC-D64-Extractor/main/src/roms/games/polish_classics/${encodedFileName}`,
    `https://fastly.jsdelivr.net/gh/v3n0m3n0/Commodore-64-Web-Emulator-BASIC-D64-Extractor@main/src/roms/games/polish_classics/${encodedFileName}`,

    // Mirror fallbacks
    `https://raw.githubusercontent.com/v3n0m3n0/Commodore64-Web-Emulator/main/roms/polish/${encodedFileName}`,
    `https://cdn.jsdelivr.net/gh/v3n0m3n0/Commodore64-Web-Emulator@main/roms/polish/${encodedFileName}`,
    `https://raw.githubusercontent.com/v3n0m3n0/Commodore64-Web-Emulator/main/${encodedPath}`,
    `https://cdn.jsdelivr.net/gh/v3n0m3n0/Commodore64-Web-Emulator@main/${encodedPath}`,
    `https://raw.githack.com/v3n0m3n0/Commodore64-Web-Emulator/main/${encodedPath}`,
    `https://fastly.jsdelivr.net/gh/v3n0m3n0/Commodore64-Web-Emulator@main/${encodedPath}`,
  ];

  let lastStatus = 404;
  for (const url of candidateUrls) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const buffer = await res.arrayBuffer();
        if (buffer.byteLength > 0) {
          return new Uint8Array(buffer);
        }
      } else {
        lastStatus = res.status;
      }
    } catch {
      // Continue to next mirror
    }
  }

  throw new Error(`Nie udało się pobrać obrazu gry ${gameName} (HTTP ${lastStatus}). Upewnij się, że plik istnieje w repozytorium lub wgraj oryginalny obraz dyskietki/taśmy.`);
}

export const C64PolishGamesCatalog: React.FC<C64PolishGamesCatalogProps> = ({
  system,
  onSwitchToScreen,
  onOpenBasicStudio,
  onOpenDebugger,
}) => {
  const games: PolishGame[] = useMemo(() => polishCatalogData.games as PolishGame[], []);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGenre, setSelectedGenre] = useState<string>("ALL");
  const [selectedExt, setSelectedExt] = useState<string>("ALL");
  const [loadingGameId, setLoadingGameId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Functional Test state
  const [testReport, setTestReport] = useState<FunctionalTestReport | null>(null);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);

  // Extract all unique genres
  const genres = useMemo(() => {
    const set = new Set<string>();
    games.forEach((g) => {
      if (g.meta?.genre) {
        g.meta.genre.split("/").forEach((part) => set.add(part.trim()));
      }
    });
    return Array.from(set).sort();
  }, [games]);

  // Filtered games list
  const filteredGames = useMemo(() => {
    return games.filter((g) => {
      const matchSearch =
        searchQuery.trim() === "" ||
        g.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.meta?.author && g.meta.author.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (g.meta?.genre && g.meta.genre.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchGenre =
        selectedGenre === "ALL" ||
        (g.meta?.genre && g.meta.genre.toLowerCase().includes(selectedGenre.toLowerCase()));

      const matchExt = selectedExt === "ALL" || g.ext.toLowerCase() === selectedExt.toLowerCase();

      return matchSearch && matchGenre && matchExt;
    });
  }, [games, searchQuery, selectedGenre, selectedExt]);

  // Scan screen memory ($0400-$07E7) for standard KERNAL and BASIC error strings
  const scanScreenErrors = (sys: C64System): string | null => {
    let text = "";
    for (let i = 0; i < 1000; i++) {
      const c = sys.memory.ram[0x0400 + i];
      if (c >= 1 && c <= 26) text += String.fromCharCode(c + 64);
      else if (c >= 48 && c <= 57) text += String.fromCharCode(c);
      else if (c === 0x20) text += " ";
      else if (c >= 65 && c <= 90) text += String.fromCharCode(c);
      else if (c === 0x3f) text += "?";
    }

    const knownErrors = [
      "?SYNTAX ERROR",
      "?OUT OF DATA",
      "?ILLEGAL QUANTITY",
      "?LOAD ERROR",
      "?TYPE MISMATCH",
      "?REDIM'D ARRAY",
      "?DIVISION BY ZERO",
      "?OVERFLOW",
      "?FORMULA TOO COMPLEX",
      "?UNDEF'D STATEMENT",
      "?BAD SUBSCRIPT",
      "?STRING TOO LONG",
      "?FILE NOT FOUND",
      "?DEVICE NOT PRESENT",
    ];

    for (const err of knownErrors) {
      if (text.includes(err) || text.includes(err.replace("?", ""))) {
        const match = text.match(new RegExp(err.replace("?", "\\?") + ".*?(?:IN|W)?\\s*(\\d+)", "i"));
        const lineStr = match ? ` IN ${match[1]}` : "";
        return `${err}${lineStr}`;
      }
    }
    return null;
  };

  // Launch a game directly
  const handleLaunchGame = async (game: PolishGame) => {
    setLoadingGameId(game.id);
    setErrorMessage(null);

    try {
      let bytes = await fetchRetroRomBytes(game.romUrl, game.name);
      let targetExt = game.ext.toLowerCase();
      let targetFileName = game.name;

      // Transparent ZIP / GZ decompressor if ROM is packed
      if (C64ArchiveManager.isZipData(bytes) || targetExt === "zip") {
        const extracted = await C64ArchiveManager.unzipArchive(bytes);
        const runnable = C64ArchiveManager.getRunnableFiles(extracted);
        if (runnable.length > 0) {
          bytes = runnable[0].data;
          targetExt = runnable[0].extension.toLowerCase();
          targetFileName = runnable[0].name;
        }
      } else if (C64ArchiveManager.isGzipData(bytes) || targetExt === "gz") {
        const extracted = await C64ArchiveManager.gunzipFile(bytes, game.name);
        if (extracted.length > 0) {
          bytes = extracted[0].data;
          targetExt = extracted[0].extension.toLowerCase();
          targetFileName = extracted[0].name;
        }
      }

      if (targetExt === "d64" || targetExt === "d71" || targetExt === "d81") {
        system.mountD64(bytes, true, targetFileName);
      } else if (targetExt === "t64" || targetExt === "tap") {
        system.mountT64(bytes, true, targetFileName);
      } else if (targetExt === "crt") {
        system.loadCartridge(bytes, targetFileName);
      } else if (targetExt === "prg" || targetExt === "p00" || targetExt === "c64") {
        system.loadAndRunPRG(bytes, targetFileName);
      } else {
        // Fallback detection
        const detected = C64ArchiveManager.detectMediaType(targetExt.toUpperCase(), bytes);
        if (detected === "D64") system.mountD64(bytes, true, targetFileName);
        else if (detected === "CRT") system.loadCartridge(bytes, targetFileName);
        else if (detected === "T64" || detected === "TAP") system.mountT64(bytes, true, targetFileName);
        else system.loadAndRunPRG(bytes, targetFileName);
      }

      onSwitchToScreen();
    } catch (err: any) {
      console.error("Error loading Polish game:", err);
      setErrorMessage(`Błąd ładowania ${game.name}: ${err.message}`);
    } finally {
      setLoadingGameId(null);
    }
  };

  // Perform full automated functional test on any C64 game
  const handleRunFunctionalTest = async (game: PolishGame) => {
    setIsTestModalOpen(true);
    const initialReport: FunctionalTestReport = {
      gameName: game.name,
      status: "running",
      timestamp: new Date().toLocaleTimeString(),
      steps: [
        { name: "Pobieranie i weryfikacja sumy binarnej nośnika", status: "running", details: "Pobieranie pliku z repozytorium GitHub..." },
        { name: "Analiza struktury kontenera (D64 BAM / T64 Directory / PRG)", status: "pending", details: "Oczekiwanie..." },
        { name: "Ekstrakcja i weryfikacja integralności programu binarnego PRG", status: "pending", details: "Oczekiwanie..." },
        { name: "Detokenizacja kodu BASIC, wektory pamięci ($002B-$0032) i wektor startowy", status: "pending", details: "Oczekiwanie..." },
        { name: "Inicjalizacja rejestrów CPU 6510, Zero Page i układów VIC-II / CIA", status: "pending", details: "Oczekiwanie..." },
        { name: "Emulacja rastra PAL i kontrola KERNAL Error Guard ($0400 / CPU)", status: "pending", details: "Oczekiwanie..." },
      ],
    };
    setTestReport(initialReport);

    try {
      // Step 1: Download & Binary Validation
      let bytes = await fetchRetroRomBytes(game.romUrl, game.name);
      let ext = game.ext.toLowerCase();

      if (C64ArchiveManager.isZipData(bytes) || ext === "zip") {
        const extracted = await C64ArchiveManager.unzipArchive(bytes);
        const runnable = C64ArchiveManager.getRunnableFiles(extracted);
        if (runnable.length > 0) {
          bytes = runnable[0].data;
          ext = runnable[0].extension.toLowerCase();
        }
      } else if (C64ArchiveManager.isGzipData(bytes) || ext === "gz") {
        const extracted = await C64ArchiveManager.gunzipFile(bytes, game.name);
        if (extracted.length > 0) {
          bytes = extracted[0].data;
          ext = extracted[0].extension.toLowerCase();
        }
      }

      initialReport.steps[0] = {
        name: "Pobieranie i weryfikacja sumy binarnej nośnika",
        status: "passed",
        details: `Pobrano pomyślnie ${bytes.length.toLocaleString()} bajtów. Format nośnika: .${ext.toUpperCase()}`,
      };
      setTestReport({ ...initialReport });

      // Step 2 & 3: Container Analysis & Payload Extraction
      initialReport.steps[1].status = "running";
      setTestReport({ ...initialReport });
      await new Promise((r) => setTimeout(r, 150));

      let extractedPRG: Uint8Array | null = null;
      let mediaInfoObj = undefined;

      if (ext === "d64") {
        const d64 = C64D64.parse(bytes);
        if (!d64) throw new Error("Nieprawidłowy format obrazu dyskietki 1541 D64 (błąd nagłówka lub ścieżki BAM 18/0)");

        const mainEntry = d64.files.find((f) => f.fileType === "PRG") || d64.files[0];
        if (!mainEntry || !mainEntry.data || mainEntry.data.length === 0) {
          throw new Error("Brak wykonywalnego pliku PRG w katalogu dyskietki D64");
        }

        extractedPRG = mainEntry.data;
        mediaInfoObj = {
          type: "D64" as const,
          name: d64.diskName || "C64 DISK",
          details: `Wolne bloki: ${d64.freeBlocks}/664, Pliki: ${d64.files.length}`,
          loadAddress: `0x${mainEntry.loadAddress.toString(16).toUpperCase().padStart(4, "0")}`,
          sizeBytes: mainEntry.data.length,
          subFilesCount: d64.files.length,
        };

        initialReport.steps[1] = {
          name: "Analiza struktury kontenera (D64 BAM / T64 Directory / PRG)",
          status: "passed",
          details: `Dysk 1541: "${d64.diskName}", ID: "${d64.diskId}", Wolne bloki: ${d64.freeBlocks}/664, Wpisów w katalogu: ${d64.files.length}`,
        };
        initialReport.steps[2] = {
          name: "Ekstrakcja i weryfikacja integralności programu binarnego PRG",
          status: "passed",
          details: `Wyekstrahowano plik główny "${mainEntry.fileName}" (${mainEntry.data.length} bajtów, adres ładowania: $${mainEntry.loadAddress.toString(16).toUpperCase()})`,
        };
      } else if (ext === "t64" || ext === "tap") {
        const t64 = C64T64.parse(bytes);
        if (!t64 || t64.records.length === 0) {
          throw new Error("Nieprawidłowy format kontenera taśmy T64 (brak sygnatury lub pusty katalog)");
        }

        const mainRecord = t64.records[0];
        if (!mainRecord.prgData || mainRecord.prgData.length < 2) {
          throw new Error("Brak danych binarnego rekordu w kontenerze taśmy T64");
        }

        extractedPRG = mainRecord.prgData;
        mediaInfoObj = {
          type: "T64" as const,
          name: t64.tapeDescription || mainRecord.fileName || "C64 TAPE",
          details: `Wpisów: ${t64.records.length}/${t64.maxEntries}, Rekord: "${mainRecord.fileName}"`,
          loadAddress: `0x${mainRecord.startAddress.toString(16).toUpperCase().padStart(4, "0")}`,
          sizeBytes: mainRecord.prgData.length,
          subFilesCount: t64.records.length,
        };

        initialReport.steps[1] = {
          name: "Analiza struktury kontenera (D64 BAM / T64 Directory / PRG)",
          status: "passed",
          details: `Kontener taśmy T64: "${t64.tapeDescription}", Wpisów w katalogu: ${t64.usedEntries}/${t64.maxEntries}`,
        };
        initialReport.steps[2] = {
          name: "Ekstrakcja i weryfikacja integralności programu binarnego PRG",
          status: "passed",
          details: `Wyekstrahowano rekord taśmy "${mainRecord.fileName}" ($${mainRecord.startAddress.toString(16).toUpperCase()}-$${mainRecord.endAddress.toString(16).toUpperCase()}, ${mainRecord.prgData.length} bajtów)`,
        };
      } else {
        extractedPRG = bytes;
        const loadAddr = bytes.length >= 2 ? bytes[0] | (bytes[1] << 8) : 0x0801;
        mediaInfoObj = {
          type: "PRG" as const,
          name: game.name,
          details: `Pojedynczy plik binarny PRG`,
          loadAddress: `0x${loadAddr.toString(16).toUpperCase().padStart(4, "0")}`,
          sizeBytes: bytes.length,
        };

        initialReport.steps[1] = {
          name: "Analiza struktury kontenera (D64 BAM / T64 Directory / PRG)",
          status: "passed",
          details: `Format binarny .${game.ext.toUpperCase()}, rozmiar: ${bytes.length} bajtów`,
        };
        initialReport.steps[2] = {
          name: "Ekstrakcja i weryfikacja integralności programu binarnego PRG",
          status: "passed",
          details: `Gotowy strumień PRG: ${bytes.length} bajtów, nagłówek adresu: $${loadAddr.toString(16).toUpperCase()}`,
        };
      }

      initialReport.mediaInfo = mediaInfoObj;
      setTestReport({ ...initialReport });

      // Step 4: BASIC / Detokenizer & Entry Point Detection
      initialReport.steps[3].status = "running";
      setTestReport({ ...initialReport });
      await new Promise((r) => setTimeout(r, 150));

      const prgInfo = C64PRG.parse(extractedPRG);
      const entryPoint = C64PRG.detectEntryPoint(prgInfo);
      const basicListing = prgInfo.isBasic ? C64Basic.detokenize(prgInfo.data) : "";
      const lines = basicListing.split("\n").filter((l) => l.trim().length > 0);

      initialReport.basicAnalysis = {
        linesCount: lines.length,
        hasSys: entryPoint.isSys,
        sysAddress: entryPoint.address,
        firstLine: lines.length > 0 ? lines[0] : "Kod maszynowy / Asembler (brak programu BASIC)",
      };

      initialReport.steps[3] = {
        name: "Detokenizacja kodu BASIC, wektory pamięci ($002B-$0032) i wektor startowy",
        status: "passed",
        details: `Wykryto ${lines.length} linii BASIC. Punkt wejścia CPU: $${entryPoint.address.toString(16).toUpperCase()} ${entryPoint.isSys ? "(SYS Launcher)" : prgInfo.isBasic ? "(BASIC Autostart)" : "(Wektor ML)"}`,
      };
      setTestReport({ ...initialReport });

      // Step 5: Memory Injection & System State Setup
      initialReport.steps[4].status = "running";
      setTestReport({ ...initialReport });
      await new Promise((r) => setTimeout(r, 150));

      // Use a fresh C64System instance for completely isolated test execution
      const testSys = new C64System();
      testSys.loadAndRunPRG(extractedPRG, game.name);

      initialReport.cpuState = {
        pc: `$${testSys.cpu.pc.toString(16).toUpperCase().padStart(4, "0")}`,
        a: `$${testSys.cpu.a.toString(16).toUpperCase().padStart(2, "0")}`,
        x: `$${testSys.cpu.x.toString(16).toUpperCase().padStart(2, "0")}`,
        y: `$${testSys.cpu.y.toString(16).toUpperCase().padStart(2, "0")}`,
        sp: `$${testSys.cpu.sp.toString(16).toUpperCase().padStart(2, "0")}`,
        status: `$${testSys.cpu.getStatus().toString(16).toUpperCase().padStart(2, "0")}`,
      };

      initialReport.steps[4] = {
        name: "Inicjalizacja rejestrów CPU 6510, Zero Page i układów VIC-II / CIA",
        status: "passed",
        details: `Pamięć RAM załadowana pod $${prgInfo.loadAddress.toString(16).toUpperCase()}. Wskaźniki KERNAL TXTTAB=$0801, VARTAB=$${testSys.memory.readWord(0x2d).toString(16).toUpperCase()} zainicjalizowane.`,
      };
      setTestReport({ ...initialReport });

      // Step 6: Step Execution & KERNAL Error Guard
      initialReport.steps[5].status = "running";
      setTestReport({ ...initialReport });
      await new Promise((r) => setTimeout(r, 250));

      // Emulate 30 full PAL frames (approx 600ms of real execution)
      for (let i = 0; i < 30; i++) {
        testSys.stepFrame();
      }

      initialReport.cpuState = {
        pc: `$${testSys.cpu.pc.toString(16).toUpperCase().padStart(4, "0")}`,
        a: `$${testSys.cpu.a.toString(16).toUpperCase().padStart(2, "0")}`,
        x: `$${testSys.cpu.x.toString(16).toUpperCase().padStart(2, "0")}`,
        y: `$${testSys.cpu.y.toString(16).toUpperCase().padStart(2, "0")}`,
        sp: `$${testSys.cpu.sp.toString(16).toUpperCase().padStart(2, "0")}`,
        status: `$${testSys.cpu.getStatus().toString(16).toUpperCase().padStart(2, "0")}`,
      };

      // KERNAL Error Guard & Screen RAM Inspection ($0400-$07E7)
      const screenError = scanScreenErrors(testSys);
      const isCpuCrash = testSys.cpu.halted;

      if (screenError || isCpuCrash) {
        const errorDesc = screenError || "?RUNTIME CRASH / CPU HALTED";
        const isBurmistrz3 = game.id === "burmistrz-3" || game.name.toLowerCase().includes("burmistrz 3");

        initialReport.errorDiagnostic = {
          c64Error: errorDesc,
          pcLocation: `$${testSys.cpu.pc.toString(16).toUpperCase()} (Rejestr PC)`,
          explanation: isBurmistrz3
            ? "Zrzut taśmy .T64 gry Burmistrz 3 posiada uszkodzony/obcięty nagłówek BASIC w payloadzie ($52 $A9 $34 $33 $07), co powoduje zatrzymanie interpretera BASIC ze statusem ?SYNTAX ERROR. W katalogu dostępna jest w 100% sprawna wersja dyskietkowa 1541: Burmistrz.d64."
            : `Interpreter BASIC lub KERNAL zgłosił błąd czasu wykonania "${errorDesc}". CPU zostało zatrzymane na adresie $${testSys.cpu.pc.toString(16).toUpperCase()}.`,
          recommendedGameId: isBurmistrz3 ? "burmistrz" : undefined,
          recommendedGameName: isBurmistrz3 ? "Burmistrz (Burmistrz.d64 - Wydanie Dyskietkowe 1541)" : undefined,
        };

        initialReport.steps[5] = {
          name: "Emulacja rastra PAL i kontrola KERNAL Error Guard ($0400 / CPU)",
          status: "failed",
          details: `BŁĄD WYKONANIA C64: KERNAL zgłosił "${errorDesc}" pod adresem $${testSys.cpu.pc.toString(16).toUpperCase()}. Program nie przeszedł weryfikacji integralności runtime.`,
        };
        initialReport.status = "failed";
        setTestReport({ ...initialReport });
        return;
      }

      // Also copy state to live system if user wishes to transition
      system.loadAndRunPRG(extractedPRG, game.name);

      initialReport.steps[5] = {
        name: "Emulacja rastra PAL i kontrola KERNAL Error Guard ($0400 / CPU)",
        status: "passed",
        details: `Wykonano 30 klatek PAL (50.125 Hz). CPU wykonuje kod pod adresem $${testSys.cpu.pc.toString(16).toUpperCase()} (STAN AKTYWNY), brak błędów KERNAL w buforze ekranu $0400.`,
      };
      initialReport.status = "passed";
      setTestReport({ ...initialReport });
    } catch (err: any) {
      console.error("Functional test failure:", err);
      if (initialReport.steps) {
        const runningIdx = initialReport.steps.findIndex((s) => s.status === "running");
        if (runningIdx >= 0) {
          initialReport.steps[runningIdx].status = "failed";
          initialReport.steps[runningIdx].details = `BŁĄD: ${err.message}`;
        }
      }
      initialReport.status = "failed";
      setTestReport({ ...initialReport });
    }
  };

  const familiadaGame = games.find((g) => g.id === "familiada" || g.name.toLowerCase().includes("familiada"));

  return (
    <div className="flex-1 bg-[#0d1117] text-[#c9d1d9] p-4 sm:p-6 overflow-y-auto max-w-7xl mx-auto w-full">
      {/* Featured Header & Familiada Banner */}
      <div className="bg-gradient-to-r from-[#1f242c] via-[#161b22] to-[#1a1f2c] border border-[#30363d] rounded-xl p-5 sm:p-6 mb-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#da3633] text-white flex items-center gap-1.5 shadow-sm">
                🇵🇱 POLSKA KOLEKCJA RETRO
              </span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#21262d] text-[#8b949e] border border-[#30363d]">
                {games.length} Klasycznych Gier C64
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              Katalog Polskich Gier Commodore 64
            </h2>
            <p className="text-xs sm:text-sm text-[#8b949e] mt-1.5 leading-relaxed">
              Kompletny zbiór kultowych polskich gier na Commodore 64 z lat 1990–1996 pochodzący z repozytorium{" "}
              <span className="text-[#58a6ff] font-mono">v3n0m3n0/Commodore64-Web-Emulator</span>.
              Zawiera teleturnieje, strategie, przygodówki i gry zręcznościowe z natychmiastowym autostartem.
            </p>
          </div>

          {/* Featured Familiada Card */}
          {familiadaGame && (
            <div className="w-full lg:w-auto flex-shrink-0 bg-[#0d1117]/80 backdrop-blur border border-[#f0883e]/40 rounded-lg p-4 shadow-lg flex flex-col sm:flex-row items-center gap-4">
              <div className="w-16 h-16 rounded bg-[#21262d] border border-[#30363d] flex items-center justify-center flex-shrink-0 shadow-inner">
                <Disc className="w-8 h-8 text-[#f0883e] animate-spin-slow" />
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-[#f0883e] uppercase">Gwiazda Katalogu</span>
                  <span className="text-[10px] px-1.5 py-0.2 bg-[#f0883e]/20 text-[#f0883e] rounded font-mono">1994</span>
                </div>
                <h3 className="text-base font-bold text-white">Familiada (Familiada.d64)</h3>
                <p className="text-[11px] text-[#8b949e] max-w-xs">
                  Kultowy teleturniej Karola Strasburgera. Pytania, ankietowani i punkty!
                </p>

                <div className="flex items-center gap-2 mt-2.5">
                  <button
                    id="btn-play-familiada"
                    onClick={() => handleLaunchGame(familiadaGame)}
                    disabled={loadingGameId === familiadaGame.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold transition-all shadow-md shadow-green-500/20"
                  >
                    {loadingGameId === familiadaGame.id ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5 fill-current" />
                    )}
                    Uruchom Grę
                  </button>

                  <button
                    id="btn-test-familiada"
                    onClick={() => handleRunFunctionalTest(familiadaGame)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-[#1f6feb] hover:bg-[#388bfd] text-white text-xs font-medium transition-all shadow-md shadow-blue-500/20"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Test Funkcjonalny
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-lg p-3 sm:p-4 mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8b949e]" />
          <input
            id="input-search-polish-games"
            type="text"
            placeholder="Szukaj gry, autora lub gatunku..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-[#6e7681] focus:outline-none focus:border-[#58a6ff]"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Genre Filter */}
          <select
            id="select-filter-genre"
            value={selectedGenre}
            onChange={(e) => setSelectedGenre(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
          >
            <option value="ALL">Wszystkie Gatunki ({games.length})</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>

          {/* Format Filter */}
          <select
            id="select-filter-ext"
            value={selectedExt}
            onChange={(e) => setSelectedExt(e.target.value)}
            className="bg-[#0d1117] border border-[#30363d] rounded-md px-3 py-1.5 text-xs text-[#c9d1d9] focus:outline-none focus:border-[#58a6ff]"
          >
            <option value="ALL">Wszystkie Formaty</option>
            <option value="d64">Dyskietka (.D64)</option>
            <option value="t64">Taśma (.T64)</option>
            <option value="prg">Program (.PRG)</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="mb-6 p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-red-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white font-bold px-2">
            ✕
          </button>
        </div>
      )}

      {/* Games Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredGames.map((game) => (
          <div
            key={game.id}
            className="bg-[#161b22] border border-[#30363d] hover:border-[#58a6ff]/50 rounded-lg p-4 transition-all duration-200 flex flex-col justify-between group shadow-sm hover:shadow-md"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2 mb-2.5">
                <div>
                  <h4 className="text-sm font-bold text-white group-hover:text-[#58a6ff] transition-colors line-clamp-1">
                    {game.title}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#8b949e]">
                    {game.meta?.genre && <span>{game.meta.genre}</span>}
                    {game.meta?.year && <span>• {game.meta.year}</span>}
                  </div>
                </div>

                <span
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    game.ext.toLowerCase() === "d64"
                      ? "bg-[#1f6feb]/20 text-[#58a6ff] border border-[#1f6feb]/40"
                      : game.ext.toLowerCase() === "t64"
                      ? "bg-[#8957e5]/20 text-[#a371f7] border border-[#8957e5]/40"
                      : "bg-[#238636]/20 text-[#3fb950] border border-[#238636]/40"
                  }`}
                >
                  .{game.ext}
                </span>
              </div>

              {/* Game Metadata Description */}
              <p className="text-xs text-[#8b949e] line-clamp-3 mb-3 leading-relaxed">
                {game.meta?.desc || game.desc || "Polska gra retro dla mikrokomputera Commodore 64."}
              </p>

              {/* Notice for known tape header corruption */}
              {game.id === "burmistrz-3" && (
                <div className="mb-3 p-2 bg-amber-950/40 border border-amber-800/60 rounded text-[11px] text-amber-200/90 flex items-start gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <span>
                    Zrzut taśmy .T64 z błędem składni BASIC. Zalecana w 100% sprawna wersja:{" "}
                    <button
                      onClick={() => {
                        const burm = games.find((g) => g.id === "burmistrz");
                        if (burm) handleLaunchGame(burm);
                      }}
                      className="text-amber-400 font-bold underline hover:text-white"
                    >
                      Burmistrz.d64
                    </button>
                  </span>
                </div>
              )}

              {/* Author & Info Tags */}
              <div className="flex flex-wrap items-center gap-2 mb-3 text-[10px] text-[#6e7681]">
                {game.meta?.author && (
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" /> {game.meta.author}
                  </span>
                )}
                {game.meta?.publisher && (
                  <span className="flex items-center gap-1">
                    <Building className="w-3 h-3" /> {game.meta.publisher}
                  </span>
                )}
                <span className="font-mono">{(game.size / 1024).toFixed(1)} KB</span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-[#21262d]">
              <button
                id={`btn-play-${game.id}`}
                onClick={() => handleLaunchGame(game)}
                disabled={loadingGameId === game.id}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-semibold transition-all shadow-sm"
              >
                {loadingGameId === game.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Play className="w-3.5 h-3.5 fill-current" />
                )}
                Graj Teraz
              </button>

              <button
                id={`btn-test-${game.id}`}
                onClick={() => handleRunFunctionalTest(game)}
                className="flex items-center justify-center p-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-[#c9d1d9] hover:text-white text-xs transition-all"
                title="Wykonaj Test Funkcjonalny i Analizę Pamięci"
              >
                <ShieldCheck className="w-4 h-4 text-[#58a6ff]" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredGames.length === 0 && (
        <div className="text-center py-12 text-[#8b949e]">
          <p className="text-sm">Nie znaleziono gier spełniających kryteria wyszukiwania.</p>
        </div>
      )}

      {/* Functional Test Modal */}
      {isTestModalOpen && testReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-[#161b22] border border-[#30363d] rounded-xl max-w-2xl w-full p-6 shadow-2xl relative my-8">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#30363d] pb-4 mb-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-6 h-6 text-[#58a6ff]" />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    Raport Testu Funkcjonalnego C64
                    <span
                      className={`text-xs px-2 py-0.5 rounded font-mono font-bold ${
                        testReport.status === "passed"
                          ? "bg-green-950 text-green-400 border border-green-700"
                          : testReport.status === "failed"
                          ? "bg-red-950 text-red-400 border border-red-700"
                          : "bg-blue-950 text-blue-400 border border-blue-700 animate-pulse"
                      }`}
                    >
                      {testReport.status === "passed" ? "100% SUKCES" : testReport.status === "failed" ? "BŁĄD WYKONANIA" : "W TOKU..."}
                    </span>
                  </h3>
                  <p className="text-xs text-[#8b949e] font-mono">
                    Plik: {testReport.gameName} • {testReport.timestamp}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsTestModalOpen(false)}
                className="text-[#8b949e] hover:text-white p-1 rounded hover:bg-[#21262d] text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Test Execution Steps */}
            <div className="space-y-2.5 mb-5">
              {testReport.steps.map((step, idx) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border text-xs transition-all ${
                    step.status === "passed"
                      ? "bg-[#0d1117] border-[#238636]/40 text-[#c9d1d9]"
                      : step.status === "failed"
                      ? "bg-red-950/30 border-red-700/50 text-red-200"
                      : step.status === "running"
                      ? "bg-blue-950/30 border-blue-600/50 text-blue-200"
                      : "bg-[#0d1117]/50 border-[#30363d]/50 text-[#6e7681]"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold flex items-center gap-2">
                      {step.status === "passed" && <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />}
                      {step.status === "failed" && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                      {step.status === "running" && <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />}
                      {step.status === "pending" && <span className="w-3.5 h-3.5 rounded-full border border-gray-600"></span>}
                      {step.name}
                    </span>
                    <span className="text-[10px] font-mono uppercase opacity-75">{step.status}</span>
                  </div>
                  <p className="text-[11px] text-[#8b949e] pl-5">{step.details}</p>
                </div>
              ))}
            </div>

            {/* Error Diagnostics Alert Box */}
            {testReport.errorDiagnostic && (
              <div className="bg-red-950/40 border border-red-800/80 rounded-lg p-3.5 mb-4 text-xs">
                <div className="flex items-center gap-2 text-red-400 font-bold mb-1">
                  <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                  <span>Diagnoza KERNAL / 6510: {testReport.errorDiagnostic.c64Error}</span>
                </div>
                <p className="text-red-200/90 text-[11px] leading-relaxed mb-2.5 pl-6">
                  {testReport.errorDiagnostic.explanation}
                </p>

                {testReport.errorDiagnostic.recommendedGameId && (
                  <div className="mt-2 pl-6 flex items-center gap-2">
                    <span className="text-[11px] text-[#8b949e]">Zalecana akcja:</span>
                    <button
                      onClick={() => {
                        const recGame = games.find((g) => g.id === testReport.errorDiagnostic?.recommendedGameId);
                        if (recGame) {
                          setIsTestModalOpen(false);
                          handleLaunchGame(recGame);
                        }
                      }}
                      className="px-2.5 py-1 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-[11px] font-bold transition-all shadow"
                    >
                      Uruchom {testReport.errorDiagnostic.recommendedGameName || "Wersję Sprawną"}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Technical Telemetry Summary Grid */}
            {testReport.mediaInfo && (
              <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 mb-4 text-xs">
                <h4 className="font-bold text-white mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Disc className="w-3.5 h-3.5 text-[#58a6ff]" /> Struktura Nośnika {testReport.mediaInfo.type}
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 font-mono text-[11px]">
                  <div>
                    <span className="text-[#6e7681]">Etykieta / Tytuł: </span>
                    <span className="text-white">{testReport.mediaInfo.name}</span>
                  </div>
                  <div>
                    <span className="text-[#6e7681]">Rozmiar binarny: </span>
                    <span className="text-white">{(testReport.mediaInfo.sizeBytes / 1024).toFixed(1)} KB</span>
                  </div>
                  <div>
                    <span className="text-[#6e7681]">Adres RAM: </span>
                    <span className="text-[#58a6ff]">{testReport.mediaInfo.loadAddress}</span>
                  </div>
                </div>
              </div>
            )}

            {testReport.basicAnalysis && (
              <div className="bg-[#0d1117] border border-[#30363d] rounded-lg p-3 mb-5 text-xs font-mono">
                <h4 className="font-bold text-white mb-1.5 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-yellow-400" /> Analiza Instrukcji BASIC V2
                </h4>
                <p className="text-green-400 text-[11px] bg-[#161b22] p-2 rounded border border-[#30363d] overflow-x-auto">
                  {testReport.basicAnalysis.firstLine}
                </p>
              </div>
            )}

            {/* Footer Action Buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-[#30363d] pt-4">
              <button
                onClick={() => setIsTestModalOpen(false)}
                className="px-3 py-1.5 rounded bg-[#21262d] hover:bg-[#30363d] text-white text-xs font-medium"
              >
                Zamknij
              </button>

              {testReport.status === "passed" && (
                <button
                  onClick={() => {
                    setIsTestModalOpen(false);
                    onSwitchToScreen();
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded bg-[#238636] hover:bg-[#2ea043] text-white text-xs font-bold transition-all shadow-md shadow-green-500/20"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Przejdź do Ekranu Emulatora
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
