/**
 * Renders every harness scene to its file in apps/new-landing/public/.
 *
 *   node scripts/shots.mjs            # all scenes
 *   node scripts/shots.mjs ask-proposal growth-scoreboard
 *
 * Serves the built harness on a loopback port and drives headless Chrome once
 * per scene, at the exact pixel size media.ts documents. No extension, no
 * browser profile, nothing signed in.
 */
import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { readFile, mkdir, rm, access } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const here = path.dirname(fileURLToPath(import.meta.url));
const pkg = path.resolve(here, '..');
const dist = path.join(pkg, 'harness-dist');
const publicDir = path.resolve(pkg, '../new-landing/public');

const PORT = 5288;

const CHROME = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  `${process.env.LOCALAPPDATA ?? ''}/Google/Chrome/Application/chrome.exe`,
  '/usr/bin/google-chrome',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.json': 'application/json',
};

const chromePath = () => {
  const found = CHROME.find((p) => existsSync(p));
  if (!found) throw new Error(`Chrome not found. Looked in:\n  ${CHROME.join('\n  ')}`);
  return found;
};

/** The scene list, read from the harness bundle's own source of truth. */
const loadScenes = async () => {
  const src = await readFile(path.join(pkg, 'harness/scenes.ts'), 'utf8');
  const scenes = [];
  const re =
    /id:\s*'([^']+)',\s*out:\s*'([^']+)',\s*width:\s*(\d+),\s*height:\s*(\d+)/g;
  for (const m of src.matchAll(re)) {
    scenes.push({ id: m[1], out: m[2], width: Number(m[3]), height: Number(m[4]) });
  }
  if (!scenes.length) throw new Error('no scenes parsed from harness/scenes.ts');
  return scenes;
};

const serve = () =>
  new Promise((resolve) => {
    const server = createServer(async (req, res) => {
      const url = new URL(req.url, `http://localhost:${PORT}`);
      let file = path.join(dist, url.pathname);
      if (url.pathname === '/' || url.pathname === '/harness/') file = path.join(dist, 'harness/index.html');
      try {
        const body = await readFile(file);
        res.writeHead(200, { 'content-type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(404).end('not found');
      }
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });

const run = (cmd, args, opts = {}) =>
  new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { stdio: 'inherit', shell: false, ...opts });
    p.on('error', reject);
    p.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });

const shoot = async (scene, profile) => {
  const out = path.join(publicDir, scene.out);
  await mkdir(path.dirname(out), { recursive: true });
  await run(chromePath(), [
    '--headless=new',
    '--disable-gpu',
    '--hide-scrollbars',
    '--force-device-scale-factor=1',
    `--window-size=${scene.width},${scene.height}`,
    `--screenshot=${out}`,
    '--virtual-time-budget=12000',
    `--user-data-dir=${profile}`,
    `http://127.0.0.1:${PORT}/harness/index.html?scene=${scene.id}`,
  ]);
  return out;
};

const main = async () => {
  const wanted = process.argv.slice(2);
  const all = await loadScenes();
  const scenes = wanted.length ? all.filter((s) => wanted.includes(s.id)) : all;
  if (!scenes.length) {
    console.error(`No scene matched. Known: ${all.map((s) => s.id).join(', ')}`);
    process.exit(1);
  }

  console.log('building harness…');
  // Vite's own API rather than a spawned binary: one less shell to get wrong,
  // and it works the same on Windows as it does in CI.
  const { build } = await import('vite');
  await build({ root: pkg, configFile: path.join(pkg, 'vite.harness.config.ts'), logLevel: 'warn' });
  await access(path.join(dist, 'harness/index.html'));

  const server = await serve();
  const profile = path.join(os.tmpdir(), 'ghostly-shots-profile');
  try {
    for (const scene of scenes) {
      const out = await shoot(scene, profile);
      console.log(`  ${scene.id.padEnd(20)} ${scene.width}x${scene.height}  ->  ${path.relative(process.cwd(), out)}`);
    }
  } finally {
    server.close();
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }
  console.log(`\n${scenes.length} shot(s) written to ${publicDir}`);
};

await main();
