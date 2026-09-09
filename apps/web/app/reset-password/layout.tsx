import type { Metadata } from "next";
import type { ReactNode } from "react";
import { noindexMetadata } from "../../src/lib/site.js";

// Session-bound / funnel routes: keep them out of search. See app/robots.ts.
export const metadata: Metadata = noindexMetadata;

export default function Layout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
