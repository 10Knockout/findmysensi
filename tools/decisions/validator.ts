import { readFileSync, readdirSync } from "node:fs";
import { resolve, join } from "node:path";
import { z } from "zod";

const ROOT = resolve(import.meta.dirname, "../..");
const DECISIONS_DIR = join(ROOT, "docs/decisions");

// Simple schema to ensure decision files follow the required structure
const DecisionSchema = z.object({
  title: z.string(),
  status: z.enum(["provisional", "approved", "superseded"]),
  decisions: z.record(z.unknown()),
  evidence: z.array(z.record(z.unknown())),
  approvals: z.array(
    z.object({
      reviewer: z.string(),
      date: z.string(),
      commit: z.string(),
    })
  ).optional(),
});

function main() {
  let hasErrors = false;
  const files = readdirSync(DECISIONS_DIR).filter((f) => f.endsWith(".json"));

  console.log(`Checking ${files.length} decision records...`);

  for (const file of files) {
    const path = join(DECISIONS_DIR, file);
    const content = readFileSync(path, "utf-8");

    try {
      const json = JSON.parse(content);
      const result = DecisionSchema.safeParse(json);

      if (!result.success) {
        console.error(`❌ ${file}: Schema validation failed`);
        for (const err of result.error.errors) {
          console.error(`   - ${err.path.join(".")}: ${err.message}`);
        }
        hasErrors = true;
      } else {
        console.log(`✅ ${file} (${result.data.status})`);
      }
    } catch (err: any) {
      console.error(`❌ ${file}: Invalid JSON - ${err.message}`);
      hasErrors = true;
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

main();
