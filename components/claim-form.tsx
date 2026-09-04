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
    <form onSubmit={submit} className="mt-10 max-w-md">
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
          className="mt-2 w-full border border-rule bg-closed px-3 py-3 text-lg"
        />
      </label>
      <p className="mt-2 font-mono text-sm text-muted">
        /{normalizeUsername(username) || "your-name"}
      </p>
      {error ? <p className="mt-2 text-sm text-open">{error}</p> : null}
      <button
        type="submit"
        className="mt-6 bg-open px-5 py-3 font-display text-lg font-semibold text-open-ink"
      >
        Create calendar
      </button>
    </form>
  );
}
