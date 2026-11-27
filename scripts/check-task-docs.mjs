#!/usr/bin/env node
// Checks that the task documentation (task list in the spec, CHANGELOG) is consistent
// with the code changes on the current branch. Paths come from .claude/officina.json.
// Template from the "officina" plugin: copy it to scripts/check-task-docs.mjs.
//
//   node scripts/check-task-docs.mjs            invariants only
//   node scripts/check-task-docs.mjs --strict   + "task is closed" rules (used by task-close and CI)
//   node scripts/check-task-docs.mjs --hook     Claude Code Stop hook: invariants only, exit 2 on failure
//   node scripts/check-task-docs.mjs --docs     portfolio docs only: broken links, commands the project lacks (exit 1)
//   --base <ref>                                ref to diff against (default: git.base from config, then origin/main, main)
//
// No dependencies on purpose: it runs in CI before installing packages and as a hook.
import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONFIG = JSON.parse(readFileSync(join(ROOT, '.claude/officina.json'), 'utf8'));
const TASKS_FILE = CONFIG.sezioni.task.split('#')[0];
const CHANGELOG = CONFIG.changelog;
const CODE_DIRS = CONFIG.codice ?? ['src/'];
const MIGRATIONS = CONFIG.supabase?.migrazioni;
const DB_TYPES = CONFIG.supabase?.tipi;
const TASK_LINE = /^- \[( |x)\] (\d+\.\d+[a-z]?) /;

const args = process.argv.slice(2);
const hookMode = args.includes('--hook');
const strict = args.includes('--strict');
const docsMode = args.includes('--docs');
const baseFlag = args.indexOf('--base');
const baseArg = baseFlag === -1 ? undefined : args[baseFlag + 1];

function git(...gitArgs) {
  try {
    return execFileSync('git', gitArgs, {
      cwd: ROOT,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

function lines(text) {
  return text ? text.split('\n').filter(Boolean) : [];
}

// A Stop hook that already blocked once must let Claude stop, or it loops.
function stopHookAlreadyFired() {
  try {
    return JSON.parse(readFileSync(0, 'utf8')).stop_hook_active === true;
  } catch {
    return false;
  }
}

/** Task ids of the task list, split by checkbox state, plus the ids listed more than once. */
function parseTasks(markdown) {
  const done = new Set();
  const seen = new Map();
  for (const line of markdown.split('\n')) {
    const match = TASK_LINE.exec(line);
    if (!match) continue;
    const [, box, id] = match;
    seen.set(id, (seen.get(id) ?? 0) + 1);
    if (box === 'x') done.add(id);
  }
  const duplicates = [...seen].filter(([, count]) => count > 1).map(([id]) => id);
  return { done, duplicates };
}

function resolveMergeBase() {
  for (const ref of [baseArg, CONFIG.git?.base && `origin/${CONFIG.git.base}`, CONFIG.git?.base, 'origin/main', 'main'].filter(Boolean)) {
    const mergeBase = git('merge-base', 'HEAD', ref);
    if (mergeBase) return mergeBase;
  }
  return git('rev-parse', 'HEAD');
}

/** Portfolio docs: README, docs_da_aggiornare, ADR. Links must point to existing files; package scripts must exist. */
function checkDocs() {
  const problems = [];
  const adrDir = CONFIG.adr?.cartella;
  const adrFiles = adrDir && existsSync(join(ROOT, adrDir))
    ? readdirSync(join(ROOT, adrDir)).filter((f) => f.endsWith('.md') && f !== 'TEMPLATE.md').map((f) => `${adrDir}/${f}`)
    : [];
  const files = [...new Set(['README.md', ...(CONFIG.docs_da_aggiornare ?? []), ...adrFiles])]
    .filter((f) => existsSync(join(ROOT, f)));
  const pkgPath = join(ROOT, 'package.json');
  const scripts = existsSync(pkgPath) ? JSON.parse(readFileSync(pkgPath, 'utf8')).scripts ?? {} : null;
  const PNPM_BUILTINS = new Set(['install', 'i', 'add', 'remove', 'rm', 'exec', 'dlx', 'create', 'update', 'up', 'why',
    'list', 'ls', 'outdated', 'store', 'init', 'audit', 'link', 'unlink', 'prune', 'publish', 'pack', 'setup', 'env', 'import']);
  for (const file of files) {
    const text = readFileSync(join(ROOT, file), 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, i) => {
      const where = `${file}:${i + 1}`;
      for (const [, target] of line.matchAll(/\[[^\]]*\]\(([^)\s]+)\)/g)) {
        if (/^(https?:|mailto:|#)/.test(target)) continue;
        const path = normalize(join(dirname(file), decodeURI(target.split('#')[0])));
        if (!existsSync(join(ROOT, path))) problems.push(`${where}: link to ${target}, but ${path} does not exist.`);
      }
      if (!scripts) return;
      for (const [cited, tool, a, b] of line.matchAll(/\b(pnpm|npm run|bun run)\s+([a-z][\w:.\/-]*)(?:\s+([a-z][\w:.\/-]*))?/g)) {
        let name = a;
        if (tool === 'pnpm') {
          if (a === 'run') name = b;
          else if (PNPM_BUILTINS.has(a)) continue;
        }
        if (!name || name.includes('/') || /\.(ts|js|mjs)$/.test(name)) continue; // a file, not a script
        if (!(name in scripts)) problems.push(`${where}: \`${tool === 'pnpm' && a !== 'run' ? `pnpm ${name}` : cited.split(/\s+/).slice(0, 3).join(' ')}\` is cited, but package.json has no "${name}" script.`);
      }
    });
  }
  return problems;
}

if (docsMode) {
  const problems = checkDocs();
  for (const p of problems) console.error(`error: ${p}`);
  if (problems.length === 0) console.log('check-task-docs --docs: ok');
  process.exit(problems.length ? 1 : 0);
}

if (hookMode && stopHookAlreadyFired()) process.exit(0);

const errors = [];
const warnings = [];

const current = parseTasks(readFileSync(join(ROOT, TASKS_FILE), 'utf8'));
if (current.duplicates.length > 0) {
  errors.push(
    `${TASKS_FILE} lists these tasks more than once: ${current.duplicates.join(', ')}. Keep one line per task.`,
  );
}

const mergeBase = resolveMergeBase();
if (mergeBase) {
  // Committed, staged, unstaged and untracked changes since the branch left the base.
  const changed = new Set([
    ...lines(git('diff', '--name-only', mergeBase)),
    ...lines(git('ls-files', '--others', '--exclude-standard')),
  ]);
  const touches = (prefix) => [...changed].some((file) => file.startsWith(prefix));

  const baseDoc = git('show', `${mergeBase}:${TASKS_FILE}`);
  const baseDone = baseDoc ? parseTasks(baseDoc).done : new Set();
  const newlyDone = [...current.done].filter((id) => !baseDone.has(id));

  if (newlyDone.length > 0 && !changed.has(CHANGELOG)) {
    errors.push(
      `Task ${newlyDone.join(', ')} is ticked in ${TASKS_FILE} but ${CHANGELOG} has no new entry.`,
    );
  }

  if (strict) {
    const watched = [...CODE_DIRS, ...(MIGRATIONS ? [MIGRATIONS] : [])];
    if (watched.some(touches) && !changed.has(CHANGELOG)) {
      errors.push(`Code changed under ${watched.join(' or ')} but ${CHANGELOG} has no new entry.`);
    }
    if (MIGRATIONS && DB_TYPES && touches(MIGRATIONS) && !changed.has(DB_TYPES)) {
      warnings.push(
        `A migration changed but ${DB_TYPES} did not. Regenerate the types${CONFIG.dopo_migrazione ? ` (\`${CONFIG.dopo_migrazione}\`)` : ''} and commit the result if it differs (policy-only migrations legitimately leave it unchanged).`,
      );
    }
  }
}

// Portfolio docs: warnings only in --strict, so a stale README never blocks a task.
if (strict) warnings.push(...checkDocs().map((p) => `docs: ${p}`));

for (const warning of warnings) console.error(`warning: ${warning}`);
for (const error of errors) console.error(`error: ${error}`);

if (errors.length === 0) {
  if (!hookMode) console.log('check-task-docs: ok');
  process.exit(0);
}
// Exit code 2 makes a Claude Code hook feed stderr back to the model.
process.exit(hookMode ? 2 : 1);
