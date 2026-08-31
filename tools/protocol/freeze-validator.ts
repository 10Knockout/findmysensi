import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "../..");
const DOCS_DIR = join(ROOT, "docs/protocol/v1");

const requiredDocs = [
  "http.md",
  "binary.md",
  "ticket.md",
  "settings.md",
  "limits.md",
  "compatibility.md",
  "approval.json",
];

function main() {
  let hasErrors = false;

  console.log("Validating Protocol V1 Freeze...");

  for (const doc of requiredDocs) {
    const path = join(DOCS_DIR, doc);
    if (!existsSync(path)) {
      console.error(`❌ Missing mandatory protocol spec: ${doc}`);
      hasErrors = true;
    } else {
      console.log(`✅ Found ${doc}`);
    }
  }

  const approvalPath = join(DOCS_DIR, "approval.json");
  if (existsSync(approvalPath)) {
    const approval = JSON.parse(readFileSync(approvalPath, "utf-8"));
    if (approval.status !== "approved") {
      console.error(
        `❌ Protocol is not approved. Status is: ${approval.status}`,
      );
      hasErrors = true;
    } else {
      console.log(
        `✅ Protocol approved by ${approval.reviewer} on ${approval.date}`,
      );
    }
  }

  if (hasErrors) {
    process.exit(1);
  }
}

main();
