/**
 * Action Games Collection Types for Commodore 64
 */

export interface GameRomEntry {
  id: string;
  name?: string;
  title: string;
  year?: number | string;
  publisher?: string;
  author?: string;
  format: "PRG" | "BASIC" | "D64" | "TAP" | "T64" | "CRT";
  genre: string;
  description: string;
  romUrl?: string;
  directDownloadUrl?: string;
  size?: number;
  controls?: string;
  code?: string;
}

export const ACTION_GAMES: GameRomEntry[] = [];
