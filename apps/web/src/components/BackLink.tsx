import Link from "next/link";

interface BackLinkProps {
  readonly href: string;
  readonly label: string;
}

export function BackLink({ href, label }: BackLinkProps) {
  return (
    <Link href={href} className="app-back-link">
      <svg
        aria-hidden="true"
        viewBox="0 0 16 16"
        width="16"
        height="16"
        focusable="false"
      >
        <path d="M9.75 3.25 5 8l4.75 4.75M5.25 8H13" />
      </svg>
      {label}
    </Link>
  );
}
