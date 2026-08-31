import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");

function readJson(path: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path, "utf-8"));
}

const rootPkg = readJson(join(ROOT, "package.json")) as {
  workspaces: string[];
};

// Dynamically discover all workspace package.json files
function discoverWorkspaces(): {
  name: string;
  dir: string;
  pkg: Record<string, unknown>;
}[] {
  const results: { name: string; dir: string; pkg: Record<string, unknown> }[] =
    [];

  for (const pattern of rootPkg.workspaces) {
    // Handle glob patterns like "apps/*" and "packages/*"
    const baseDir = pattern.replace("/*", "");
    const fullBase = join(ROOT, baseDir);

    if (!existsSync(fullBase)) continue;

    const entries = readdirSync(fullBase, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const pkgPath = join(fullBase, entry.name, "package.json");
      if (!existsSync(pkgPath)) continue;

      const pkg = readJson(pkgPath);
      results.push({
        name: pkg.name as string,
        dir: join(baseDir, entry.name),
        pkg,
      });
    }
  }

  return results;
}

const workspaces = discoverWorkspaces();

describe("Workspace Integrity", () => {
  it("should discover at least one workspace", () => {
    expect(workspaces.length).toBeGreaterThan(0);
  });

  describe.each(workspaces)("$name ($dir)", ({ name, dir, pkg }) => {
    it("should have a package.json with a name", () => {
      expect(name).toBeDefined();
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    });

    it("should have a build script", () => {
      const scripts = pkg.scripts as Record<string, string> | undefined;
      expect(scripts).toBeDefined();
      expect(scripts?.build).toBeDefined();
    });

    it("should have a typecheck script", () => {
      const scripts = pkg.scripts as Record<string, string> | undefined;
      expect(scripts).toBeDefined();
      expect(scripts?.typecheck).toBeDefined();
    });

    it("should not reference private repository packages", () => {
      const allDeps = {
        ...(pkg.dependencies as Record<string, string> | undefined),
        ...(pkg.devDependencies as Record<string, string> | undefined),
        ...(pkg.peerDependencies as Record<string, string> | undefined),
      };

      for (const [, version] of Object.entries(allDeps)) {
        expect(version).not.toContain("findmysensi-secure");
        expect(version).not.toMatch(/^file:/);
        expect(version).not.toMatch(/^link:/);
      }
    });

    it("should not use sibling filesystem references", () => {
      const allDeps = {
        ...(pkg.dependencies as Record<string, string> | undefined),
        ...(pkg.devDependencies as Record<string, string> | undefined),
      };

      for (const [, version] of Object.entries(allDeps)) {
        expect(version).not.toMatch(/^file:.*\.\.\//);
        expect(version).not.toMatch(/^link:.*\.\.\//);
      }
    });

    // Non-app packages should have proper exports
    if (!dir.startsWith("apps")) {
      it("should have an exports field for library packages", () => {
        expect(pkg.exports).toBeDefined();
      });
    }
  });
});

describe("Lockfile Integrity", () => {
  it("should have a package-lock.json", () => {
    expect(existsSync(join(ROOT, "package-lock.json"))).toBe(true);
  });

  it("should include all discovered workspaces in the lockfile", () => {
    const lockfile = readJson(join(ROOT, "package-lock.json")) as {
      packages: Record<string, unknown>;
    };

    const lockPackages = lockfile.packages || {};

    for (const ws of workspaces) {
      // Workspace packages appear as relative paths in the lockfile
      const wsKey = ws.dir.replace(/\\/g, "/");
      const hasEntry =
        wsKey in lockPackages ||
        `./${wsKey}` in lockPackages ||
        `${wsKey}` in lockPackages;

      // Also check by package name in the root node_modules
      const nodeModulesKey = `node_modules/${ws.name}`;
      const hasNodeModulesEntry = nodeModulesKey in lockPackages;

      expect(
        hasEntry || hasNodeModulesEntry,
        `Workspace "${ws.name}" (${ws.dir}) should be in package-lock.json`,
      ).toBe(true);
    }
  });
});

describe("Parent Workspace Boundary", () => {
  it("should not have a .git directory in the parent workspace", () => {
    const parentGit = resolve(ROOT, "..", ".git");
    expect(existsSync(parentGit)).toBe(false);
  });

  it("should not have a package.json in the parent workspace", () => {
    const parentPkg = resolve(ROOT, "..", "package.json");
    expect(existsSync(parentPkg)).toBe(false);
  });
});
