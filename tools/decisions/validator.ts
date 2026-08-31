import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { z } from "zod";

const ROOT = resolve(import.meta.dirname, "../..");
const DECISIONS_DIR = join(ROOT, "docs/decisions");

const DecisionSchema = z.object({
  title: z.string(),
  status: z.enum(["provisional", "proposed", "approved", "superseded"]),
  decisions: z.record(z.string(), z.unknown()).optional(),
  evidence: z.array(z.record(z.string(), z.unknown())).optional(),
  approvals: z
    .array(
      z.object({
        reviewer: z.string(),
        date: z.string(),
        commit: z.string(),
      }),
    )
    .optional(),
  context: z.string().optional(),
  decision: z.string().optional(),
  consequences: z.array(z.string()).optional(),
  rules: z.record(z.string(), z.unknown()).optional(),
  rationale: z.string().optional(),
  approval: z.record(z.string(), z.unknown()).optional(),
  topic: z.string().optional(),
  id: z.string().optional(),
  signatures: z.array(z.string()).optional(),
});

function main() {
  let hasErrors = false;
  const files = readdirSync(DECISIONS_DIR).filter((f) => f.endsWith(".json"));

  console.log(`Checking ${files.length} decision records...`);

  for (const file of files) {
    const path = join(DECISIONS_DIR, file);
    const content = readFileSync(path, "utf-8");

    try {
      const json: unknown = JSON.parse(content);
      const result = DecisionSchema.safeParse(json);

      if (!result.success) {
        console.error(`❌ ${file}: Schema validation failed`);
        const issues = result.error.issues;
        for (const err of issues) {
          console.error(`   - ${err.path.join(".")}: ${err.message}`);
        }
        hasErrors = true;
      } else {
        console.log(`✅ ${file} (${result.data.status})`);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ ${file}: Invalid JSON - ${message}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

main();
