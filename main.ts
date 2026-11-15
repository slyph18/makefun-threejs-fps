// Build an entry for the make.fun grader.
//
// Node 22 runs this TypeScript file directly, using only the standard library.
// The source entry consists of the game and its screenshots beside this script.
// The build copies both into MAKEFUN_OUTPUT_DIR (or /output), then asks the
// vendored make.fun library to turn that directory into dossier.json.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildDossier } from './vendor/makefun-threejs.ts';

const DEFAULT_OUTPUT_DIRECTORY = '/output';
const GAME_DIRECTORY_NAME = 'game';
const SCREENSHOTS_DIRECTORY_NAME = 'screenshots';
const DOSSIER_FILE_NAME = 'dossier.json';

// These numbers are the scorer's caps. The text cap limits what is embedded in
// the dossier; the others exist so this entry fails locally at the same limits
// the grader would apply.
const TEXT_MAX_BYTES = 163_840;
const SCREENSHOT_CAPS = {
  max: 4,
  max_bytes: 262_144,
} as const;
const GAME_MAX_FILES = 993;
const GAME_MAX_BYTES = 50_331_648;

function sourceDirectory(name: string): string {
  const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));
  return join(scriptDirectory, name);
}

function copyEntryDirectory(name: string, outputDirectory: string): void {
  const source = sourceDirectory(name);

  if (!existsSync(source)) {
    throw new Error(`Required entry directory is missing: ${name}`);
  }

  cpSync(source, join(outputDirectory, name), { recursive: true });
}

function main(): void {
  const outputDirectory = process.env.MAKEFUN_OUTPUT_DIR ?? DEFAULT_OUTPUT_DIRECTORY;

  mkdirSync(outputDirectory, { recursive: true });

  copyEntryDirectory(GAME_DIRECTORY_NAME, outputDirectory);
  copyEntryDirectory(SCREENSHOTS_DIRECTORY_NAME, outputDirectory);

  const dossier = buildDossier(outputDirectory, {
    text_max_bytes: TEXT_MAX_BYTES,
    screenshots: SCREENSHOT_CAPS,
    game_max_files: GAME_MAX_FILES,
    game_max_bytes: GAME_MAX_BYTES,
  });

  writeFileSync(join(outputDirectory, DOSSIER_FILE_NAME), dossier);
}

main();
