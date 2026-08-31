#!/usr/bin/env node

/**
 * Architecture Boundary Checker
 *
 * Ensures no private repository dependencies, no sibling filesystem imports,
 * no database URLs/tokens, and no production secrets exist in public code.
 *
 * Exit 0 = clean, Exit 1 = violations found.
 */

import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, extname } from "node:path";

const ROOT = new URL("../../", import.meta.url).pathname.replace(
  /^\/([A-Z]:)/,
  "$1",
);

const VIOLATIONS = [];

// Patterns that must never appear in public source
const FORBIDDEN_PATTERNS = [
  // Private repository references
  {
    pattern: /findmysensi-secure/g,
    description: "Reference to private repository",
  },
  // Sibling filesystem imports
  {
    pattern: /['"]\.\.\/\.\.\/\.\.\/findmysensi-secure/g,
    description: "Sibling filesystem import",
  },
  {
    pattern: /['"]file:\.\.\/findmysensi-secure/g,
    description: "File protocol sibling reference",
  },
  {
    pattern: /['"]link:\.\.\/findmysensi-secure/g,
    description: "Link protocol sibling reference",
  },
  // Database URLs/tokens that should never be in public
  { pattern: /libsql:\/\//g, description: "Turso/libSQL connection URL" },
  {
    pattern: /TURSO_DATABASE_URL/g,
    description: "Turso database URL variable",
  },
  { pattern: /TURSO_AUTH_TOKEN/g, description: "Turso auth token variable" },
  // Production secrets
  { pattern: /BETTER_AUTH_SECRET/g, description: "Better Auth secret" },
  { pattern: /BREVO_API_KEY/g, description: "Brevo API key" },
  { pattern: /TURNSTILE_SECRET/g, description: "Turnstile secret key" },
  { pattern: /EDGE_ORIGIN_SECRET/g, description: "Edge-to-origin secret" },
];

// File extensions to scan
const SCANNABLE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".yaml",
  ".yml",
  ".toml",
]);

// Directories to skip
const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  "dist",
  "build",
  "out",
  "coverage",
  ".turbo",
  ".vercel",
  ".superpowers",
]);

// Files/patterns excluded from forbidden-pattern scanning.
// Documentation legitimately references the private repo by name.
// The checker and test files contain the patterns as detection rules.
const EXCLUDED_FILES = [
  /\.md$/,
  /check-boundaries\.mjs$/,
  /workspace-integrity\.spec\.ts$/,
];

function walkDir(dir) {
  const files = [];
  try {
    const entries = readdirSync(dir);
    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) continue;
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        files.push(...walkDir(fullPath));
      } else if (stat.isFile() && SCANNABLE_EXTENSIONS.has(extname(entry))) {
        files.push(fullPath);
      }
    }
  } catch {
    // Skip unreadable directories
  }
  return files;
}

function checkFile(filePath) {
  // Skip files that legitimately reference forbidden patterns
  if (EXCLUDED_FILES.some((re) => re.test(filePath))) return;

  const content = readFileSync(filePath, "utf-8");
  const relPath = relative(ROOT, filePath);

  for (const { pattern, description } of FORBIDDEN_PATTERNS) {
    // Reset regex state
    pattern.lastIndex = 0;
    const match = pattern.exec(content);
    if (match) {
      // Find line number
      const lineNum = content.substring(0, match.index).split("\n").length;
      VIOLATIONS.push({
        file: relPath,
        line: lineNum,
        description,
        match: match[0],
      });
    }
  }
}

// Check that no workspace dependency points to a private/sibling package
function checkPackageManifests() {
  const files = walkDir(ROOT).filter((f) => f.endsWith("package.json"));

  for (const filePath of files) {
    try {
      const pkg = JSON.parse(readFileSync(filePath, "utf-8"));
      const relPath = relative(ROOT, filePath);

      for (const depField of [
        "dependencies",
        "devDependencies",
        "peerDependencies",
      ]) {
        const deps = pkg[depField];
        if (!deps) continue;
        for (const [name, version] of Object.entries(deps)) {
          if (
            typeof version === "string" &&
            (version.startsWith("file:") ||
              version.startsWith("link:") ||
              version.includes("findmysensi-secure"))
          ) {
            VIOLATIONS.push({
              file: relPath,
              line: 0,
              description: `Forbidden dependency version: ${name}@${version}`,
              match: version,
            });
          }
        }
      }
    } catch {
      // Skip non-JSON files
    }
  }
}

console.log("🔍 Running architecture boundary check...\n");
console.log(`   Root: ${ROOT}`);

const allFiles = walkDir(ROOT);
console.log(`   Scanning ${allFiles.length} files...\n`);

for (const file of allFiles) {
  checkFile(file);
}

checkPackageManifests();

if (VIOLATIONS.length === 0) {
  console.log("✅ All architecture boundary checks passed.\n");
  process.exit(0);
} else {
  console.error(`❌ Found ${VIOLATIONS.length} boundary violation(s):\n`);
  for (const v of VIOLATIONS) {
    console.error(`   ${v.file}:${v.line} — ${v.description}`);
    console.error(`     Match: "${v.match}"\n`);
  }
  process.exit(1);
}
