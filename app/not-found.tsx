import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto w-full min-w-0 max-w-xl px-5 py-8 sm:py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
        404
      </p>
      <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">No calendar here</h1>
      <p className="mt-4 text-lg text-muted">
        That username has not been claimed yet.
      </p>
      <Link href="/" className="mt-8 inline-block border-b border-open text-open">
        Create one
      </Link>
    </main>
  );
}
