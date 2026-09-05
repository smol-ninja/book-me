"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { calendarShareUrls } from "@/lib/app-origin";

export function DoneLinks({
  username,
  origin,
}: {
  username: string;
  origin: string;
}) {
  const searchParams = useSearchParams();
  const key = searchParams.get("key");
  const whatsapp = searchParams.get("wa");
  const [copied, setCopied] = useState<string | null>(null);

  const urls = useMemo(
    () => (key ? calendarShareUrls(origin, username, key) : null),
    [origin, username, key],
  );
  const publicUrl = urls?.publicUrl ?? `${origin}/${username}`;

  async function copy(label: string, value: string) {
    await navigator.clipboard.writeText(value);
    setCopied(label);
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-xl px-5 py-8 sm:py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
        Ready to share
      </p>
      <h1 className="mt-2 break-all font-display text-3xl font-bold sm:text-4xl">
        /{username} is live
      </h1>
      <p className="mt-4 text-lg text-muted">
        Send the public URL to guests. Keep the edit link private — it is the
        only way back in.
      </p>
      {whatsapp === "1" ? (
        <p className="mt-3 text-muted">
          Both URLs were also texted to your phone so you have a record.
        </p>
      ) : null}
      {whatsapp === "0" ? (
        <p className="mt-3 text-muted">
          Copy both URLs now. SMS delivery may be delayed.
        </p>
      ) : null}

      <section className="mt-8 space-y-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Public URL
          </p>
          <p className="mt-1 break-all border border-rule bg-open px-3 py-2 font-mono text-sm">
            {publicUrl}
          </p>
          <button
            type="button"
            className="mt-2 min-h-11 cursor-pointer py-2 text-sm text-accent"
            onClick={() => void copy("public", publicUrl)}
          >
            {copied === "public" ? "Copied" : "Copy public URL"}
          </button>
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            Secret edit URL
          </p>
          <p className="mt-1 break-all border border-rule bg-open px-3 py-2 font-mono text-sm">
            {urls ? urls.editUrl : "Missing from this page. Check the link after save."}
          </p>
          {urls ? (
            <button
              type="button"
              className="mt-2 min-h-11 cursor-pointer py-2 text-sm text-accent"
              onClick={() => void copy("edit", urls.editUrl)}
            >
              {copied === "edit" ? "Copied" : "Copy edit URL"}
            </button>
          ) : null}
        </div>
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
            View bookings
          </p>
          <p className="mt-1 break-all border border-rule bg-open px-3 py-2 font-mono text-sm">
            {urls
              ? urls.bookingsUrl
              : "Missing from this page. Check the link after save."}
          </p>
          {urls ? (
            <div className="mt-2 flex flex-wrap gap-x-4">
              <button
                type="button"
                className="min-h-11 cursor-pointer py-2 text-sm text-accent"
                onClick={() => void copy("bookings", urls.bookingsUrl)}
              >
                {copied === "bookings" ? "Copied" : "Copy bookings URL"}
              </button>
              <Link
                href={`/setup/${username}/bookings?key=${encodeURIComponent(key ?? "")}`}
                className="inline-flex min-h-11 items-center py-2 text-sm text-accent"
              >
                Open bookings
              </Link>
            </div>
          ) : null}
        </div>
      </section>

      <Link
        href={`/${username}`}
        className="mt-10 inline-block min-h-12 w-full cursor-pointer bg-accent px-5 py-3 text-center font-display text-lg font-semibold text-accent-ink sm:w-auto"
      >
        Open booking page
      </Link>
    </main>
  );
}
