"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { normalizeUsername, validateUsername } from "@/lib/username";

export function ClaimForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent) {
    event.preventDefault();
    const normalized = normalizeUsername(username);
    const problem = validateUsername(normalized);
    if (problem) {
      setError(problem);
      return;
    }
    router.push(`/setup/${normalized}`);
  }

  return (
    <form onSubmit={submit} className="mt-8 w-full max-w-md sm:mt-10">
      <label className="block">
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
          Username
        </span>
        <input
          value={username}
          onChange={(event) => {
            setUsername(event.target.value);
            setError(null);
          }}
          placeholder="alex"
          autoCapitalize="none"
          autoCorrect="off"
          className="mt-2 w-full min-w-0 border border-rule bg-open px-3 py-3 text-base sm:text-lg"
        />
      </label>
      <p className="mt-2 break-all font-mono text-sm text-muted">
        /{normalizeUsername(username) || "your-name"}
      </p>
      {error ? <p className="mt-2 text-sm text-accent">{error}</p> : null}
      <button
        type="submit"
        className="mt-6 min-h-11 w-full cursor-pointer bg-accent px-5 py-3 font-display text-lg font-semibold text-accent-ink sm:w-auto"
      >
        Create calendar
      </button>
    </form>
  );
}
