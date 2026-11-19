// Leonida Legend — a GTA VI trophy guide and tracker for gta6-trophy-guide-01.
// Node 22, standard library only. The guide is plain static files in app/:
// index.html opens it, app.js renders the checklist, roadmap and missable
// views from app/data/trophies.json, and style.css gives it its own look.
// Nothing is fetched over the network at run time. This program hands the
// guide in: it copies app/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json with the vendored make.fun
// library, so the judge reads our screenshots and our source.
// Leave vendor/makefun-frontend.ts as it is: the scorer requires the
// dossier to be byte for byte what its own copy of that library writes.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Fail loudly instead of handing in an empty output: the guide itself must
// be here, and so must its screenshots, before anything is copied.
if (!existsSync(join(here, 'app', 'index.html'))) throw new Error('app/index.html is missing');
if (!existsSync(join(here, 'screenshots'))) throw new Error('screenshots/ is missing');

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the
// bytes; the others refuse an entry the scorer would refuse (more than 4
// screenshots or one over 256 KiB; more than 993 files and directories in
// app/ or 48 MiB of app files: app/ counts beside /output's own 1000-entry
// cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);
