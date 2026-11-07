import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { parseCliArgs, readJson } from './shared/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command-line arguments
const { flags } = parseCliArgs(process.argv.slice(2));
const jsonFilePath = flags.json || null;

if (!jsonFilePath) {
  console.error('❌ Error: -json flag is required');
  console.error('Usage: node batch-extract.js -json=path/to/extract-commands.json');
  process.exit(1);
}

// Check if JSON file exists - try multiple candidate paths
function resolveJsonPath(targetPath) {
  const candidates = [
    targetPath,
    targetPath.endsWith('.json') ? null : `${targetPath}.json`,
    path.join(__dirname, path.basename(targetPath)),
    path.join(
      __dirname,
      targetPath.endsWith('.json') ? path.basename(targetPath) : `${path.basename(targetPath)}.json`
    ),
  ].filter(Boolean);

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

const resolvedPath = resolveJsonPath(jsonFilePath);

if (!resolvedPath) {
  console.error(`❌ Error: JSON file not found: ${jsonFilePath}`);
  console.error('\n💡 Tip: Make sure the file exists. You can use:');
  console.error('  - node batch-extract.js -json=extract-commands.json (from utils directory)');
  console.error('  - node batch-extract.js -json=utils/extract-commands.json (from project root)');
  process.exit(1);
}

// Read and parse JSON
let commands;
try {
  const parsed = await readJson(resolvedPath);
  commands = parsed.commands || parsed;

  if (!Array.isArray(commands)) {
    throw new Error('JSON must contain a "commands" array or be an array');
  }
} catch (error) {
  console.error(`❌ Error parsing JSON file: ${error.message}`);
  process.exit(1);
}

console.log(`📂 Loaded ${commands.length} commands from ${resolvedPath}`);
console.log('═'.repeat(80));

let completed = 0;
let skipped = 0;
let failed = 0;
const results = [];

async function executeCommand(command, index) {
  const { url, start, end, download = true, dir, convert = '', groupId, selector } = command;

  console.log(`\n[${index + 1}/${commands.length}] Processing: ${url}`);

  if (dir && fs.existsSync(dir)) {
    console.log(`  ℹ️  Directory already exists: ${dir} (will reuse)`);
  }

  // Build arguments
  const args = ['extract.js', `-x1=${url}`];

  if (start && start > 0) args.push(`-x2=${start}`);
  if (end && end > 0) args.push(`-x3=${end}`);

  if (download) {
    args.push('-dwn=true');
    if (dir) args.push(`-dwn-dir=${dir}`);
  }

  if (convert) args.push(`-convert=${convert}`);
  if (groupId) args.push(`-g=${groupId}`);
  if (selector) args.push(`-s=${selector}`);

  return new Promise((resolve) => {
    const child = spawn('node', args, {
      cwd: __dirname,
      stdio: 'pipe',
    });

    let errorOutput = '';

    child.stdout.on('data', (data) => {
      const text = data.toString();
      process.stdout.write(text);
    });

    child.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log(`  ✅ Completed successfully`);
        completed++;
        results.push({ index: index + 1, url, status: 'SUCCESS' });
      } else {
        const isUrlError =
          errorOutput.includes('Error') ||
          errorOutput.includes('ENOTFOUND') ||
          errorOutput.includes('unreachable');

        if (isUrlError) {
          console.log(`  ⚠️  Skipped (URL error): ${url}`);
          skipped++;
          results.push({
            index: index + 1,
            url,
            status: 'SKIPPED',
            reason: 'URL unreachable or invalid',
          });
        } else {
          console.log(`  ❌ Failed with exit code: ${code}`);
          failed++;
          results.push({ index: index + 1, url, status: 'FAILED', code });
        }
      }
      resolve();
    });
  });
}

async function runBatch() {
  const startTime = Date.now();

  for (let i = 0; i < commands.length; i++) {
    await executeCommand(commands[i], i);
  }

  const elapsed = Math.round((Date.now() - startTime) / 1000);

  console.log('\n' + '═'.repeat(80));
  console.log('📊 BATCH PROCESSING SUMMARY');
  console.log('═'.repeat(80));
  console.log(`  ✅ Completed: ${completed}/${commands.length}`);
  console.log(`  ⚠️  Skipped:   ${skipped}/${commands.length}`);
  console.log(`  ❌ Failed:    ${failed}/${commands.length}`);
  console.log(`  ⏱️  Time elapsed: ${elapsed}s`);
  console.log('═'.repeat(80));

  if (failed > 0) {
    console.log('\n⚠️  Failed commands:');
    results
      .filter((r) => r.status === 'FAILED')
      .forEach((r) => console.log(`  [${r.index}] ${r.url}`));
  }

  if (skipped > 0) {
    console.log('\n⚠️  Skipped commands:');
    results
      .filter((r) => r.status === 'SKIPPED')
      .forEach((r) => console.log(`  [${r.index}] ${r.url} - ${r.reason}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

runBatch().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
