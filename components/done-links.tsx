"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";

export function DoneLinks({ username }: { username: string }) {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");
  const [copied, setCopied] = useState<string | null>(null);
  const origin = typeof window === "undefined" ? "" : window.location.origin;

  const publicUrl = useMemo(
    () => (origin ? `${origin}/${username}` : `/${username}`),
    [origin, username],
  );
  const editUrl = useMemo(
    () =>
      `${origin}/setup/${username}?key=${encodeURIComponent(key ?? "")}`,
    [origin, username, key],
  );

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  return (
    <main className="mx-auto w-full max-w-xl px-5 py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
        Ready to share
      </p>
      <h1 className="mt-2 font-display text-4xl font-bold">/{username} is live</h1>
      <p className="mt-4 text-lg text-muted">
        Send the public URL to guests. Keep the edit link private — it is the
        only way back in.
      </p>

      <section className="mt-8 space-y-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Public URL
          </p>
          <p className="mt-1 break-all border border-rule bg-closed px-3 py-2 font-mono text-sm">
            {publicUrl}
          </p>
          <button
            type="button"
            className="mt-2 text-sm text-open"
            onClick={() => void copy("public", publicUrl)}
          >
            {copied === "public" ? "Copied" : "Copy public URL"}
          </button>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Secret edit URL
          </p>
          <p className="mt-1 break-all border border-rule bg-closed px-3 py-2 font-mono text-sm">
            {key ? editUrl : "Missing from this page. Check the link after save."}
          </p>
          {key ? (
            <button
              type="button"
              className="mt-2 text-sm text-open"
              onClick={() => void copy("edit", editUrl)}
            >
              {copied === "edit" ? "Copied" : "Copy edit URL"}
            </button>
          ) : null}
        </div>
      </section>

      <Link
        href={`/${username}`}
        className="mt-10 inline-block bg-open px-5 py-3 font-display text-lg font-semibold text-open-ink"
      >
        Open booking page
      </Link>
    </main>
  );
}
