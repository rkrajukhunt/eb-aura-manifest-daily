import { exceedsExclamationBudget, findBannedLanguage } from '@aura/shared';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The banned-phrase lint (15 §5, product 14). Every user-facing string lives in
 * `src/copy/` precisely so this single test can audit all of them: a banned
 * phrase or guilt word anywhere in the catalog fails CI.
 *
 * This suite discovers copy modules from the filesystem — a new catalog file is
 * covered the moment it exists, with no registration step to forget.
 */

/** Every exported string in a module, however deeply nested. */
function collectStrings(value: unknown, path: string, out: Array<{ path: string; text: string }>) {
  if (typeof value === 'string') {
    out.push({ path, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => collectStrings(item, `${path}[${i}]`, out));
    return;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectStrings(child, `${path}.${key}`, out);
    }
  }
}

const copyDir = __dirname;
const copyFiles = readdirSync(copyDir).filter(
  (file) => file.endsWith('.ts') && !file.endsWith('.test.ts') && !file.endsWith('.d.ts'),
);

const catalog: Array<{ path: string; text: string }> = [];
for (const file of copyFiles) {
  const moduleExports: Record<string, unknown> = require(join(copyDir, file));
  collectStrings(moduleExports, file.replace(/\.ts$/, ''), catalog);
}

describe('copy lint (product 14 — requirements, not guidance)', () => {
  it('found catalog strings to audit — an empty catalog means discovery broke', () => {
    expect(catalog.length).toBeGreaterThan(0);
  });

  it('contains no banned phrases and no guilt/urgency vocabulary', () => {
    const violations = catalog
      .map(({ path, text }) => ({ path, text, hits: findBannedLanguage(text) }))
      .filter(({ hits }) => hits.length > 0);

    // The failure message names the string and the term, so the fix is obvious.
    expect(violations).toEqual([]);
  });

  it('stays within the exclamation budget (rule 5: at most one, none emotional)', () => {
    const violations = catalog.filter(({ text }) => exceedsExclamationBudget(text));

    expect(violations).toEqual([]);
  });

  it('never says "the user" — she is "you", by name where natural (rule 1)', () => {
    const violations = catalog.filter(({ text }) => /\bthe user\b/i.test(text));

    expect(violations).toEqual([]);
  });

  it('never exposes an error code (product 14 §errors, 05 §8)', () => {
    const violations = catalog.filter(({ text }) =>
      /\b(error\s*\d|code\s*\d|E\d{2,}|50[0-4]|40[0-9])\b/i.test(text),
    );

    expect(violations).toEqual([]);
  });
});
