import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex w-full max-w-6xl items-baseline justify-between gap-x-4 px-5 py-4">
        <Link
          href="/"
          className="shrink-0 font-display text-xl font-bold tracking-tight"
        >
          Book-me
        </Link>
        <p className="min-w-0 text-right font-mono text-[10px] uppercase leading-tight tracking-[0.14em] text-brass sm:text-[11px] sm:tracking-[0.22em]">
          <span className="sm:hidden">Open days</span>
          <span className="hidden sm:inline">Open days · pick a thing</span>
        </p>
      </div>
    </header>
  );
}
