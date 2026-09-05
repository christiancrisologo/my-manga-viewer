import fs from 'fs';
import path from 'path';

/**
 * Pause execution for a given number of milliseconds.
 * @param {number} ms
 * @returns {Promise<void>}
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Return a random duration (in ms) between min and max.
 * @param {number} minMs
 * @param {number} maxMs
 * @returns {number}
 */
export function randomDelay(minMs = 1000, maxMs = 3000) {
  return minMs + Math.floor(Math.random() * (maxMs - minMs));
}

/**
 * Generate a short random alphanumeric ID.
 * @param {number} length
 * @returns {string}
 */
export function generateId(length = 7) {
  return Math.random().toString(36).substring(2, 2 + length);
}

/**
 * Parse CLI arguments supporting flags (-key=value, --key=value, -flag, --flag) and positionals.
 * @param {string[]} argv - Typically process.argv.slice(2)
 * @returns {{ flags: Record<string, string | boolean>, positionals: string[] }}
 */
export function parseCliArgs(argv) {
  const flags = {};
  const positionals = [];

  for (const arg of argv) {
    if (arg.startsWith('-') || arg.startsWith('--')) {
      const stripped = arg.replace(/^--?/, '');
      const eqIndex = stripped.indexOf('=');

      if (eqIndex !== -1) {
        const key = stripped.substring(0, eqIndex);
        const value = stripped.substring(eqIndex + 1);
        flags[key] = value;
      } else {
        flags[stripped] = true;
      }
    } else {
      positionals.push(arg);
    }
  }

  return { flags, positionals };
}

/**
 * Read and parse a JSON file.
 * @param {string} filePath
 * @returns {Promise<any>}
 */
export async function readJson(filePath) {
  const content = await fs.promises.readFile(filePath, 'utf8');
  return JSON.parse(content);
}

/**
 * Write data to a JSON file formatted with indentation.
 * @param {string} filePath
 * @param {any} data
 * @param {number} spaces
 * @returns {Promise<void>}
 */
export async function writeJson(filePath, data, spaces = 2) {
  const content = JSON.stringify(data, null, spaces);
  await fs.promises.writeFile(filePath, content, 'utf8');
}

/**
 * Ensure directory exists synchronously.
 * @param {string} dirPath
 */
export function ensureDir(dirPath) {
  if (dirPath && !fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}
