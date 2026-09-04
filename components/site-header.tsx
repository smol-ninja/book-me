import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex w-full max-w-6xl items-baseline justify-between px-5 py-4">
        <Link href="/" className="font-display text-xl font-bold tracking-tight">
          Book-me
        </Link>
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
          Open days · pick a thing
        </p>
      </div>
    </header>
  );
}
