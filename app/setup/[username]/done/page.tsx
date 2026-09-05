import { Suspense } from "react";
import { DoneLinks } from "@/components/done-links";
import { appOrigin } from "@/lib/app-origin";

export default async function DonePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  return (
    <Suspense
      fallback={
        <main className="mx-auto w-full max-w-xl px-5 py-16">
          <p className="text-muted">Preparing your links…</p>
        </main>
      }
    >
      <DoneLinks username={username} origin={appOrigin()} />
    </Suspense>
  );
}
