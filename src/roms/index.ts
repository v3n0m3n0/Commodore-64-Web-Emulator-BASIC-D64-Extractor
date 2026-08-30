/**
 * Commodore 64 ROMs & Game Directory Catalog
 * 
 * Provides structured access to:
 * - System ROMs: BASIC V2, KERNAL, CHARGEN (from /src/system)
 * - Game categories: Action, Arcade, Adventure, Polish Classics, Demos
 */

export * from "./games";
export * as ActionGames from "./games/action";
export * as ArcadeGames from "./games/arcade";
export * as AdventureGames from "./games/adventure";
export * as PolishClassics from "./games/polish_classics";
export * as DemosceneRoms from "./games/demos";

// System ROM references available from the /src/system sibling directory
export { getBasicRomBytes, BASIC_V2_METADATA } from "../system/basic";
export { getKernalRomBytes, KERNAL_ROM_METADATA } from "../system/kernal";
export { getChargenRomBytes, CHARGEN_ROM_METADATA } from "../system/chargen";
