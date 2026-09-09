import type { Metadata } from "next";
import type { ReactNode } from "react";
import { noindexMetadata } from "../../src/lib/site.js";

// Per-ticket result pages are session-bound; keep them out of search.
export const metadata: Metadata = noindexMetadata;

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
