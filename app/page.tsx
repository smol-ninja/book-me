import { ClaimForm } from "@/components/claim-form";

export default function HomePage() {
  return (
    <main className="mx-auto flex w-full min-w-0 max-w-6xl flex-1 flex-col px-5 py-8 sm:py-12 md:py-16">
      <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-brass">
        No account · one URL · one calendar
      </p>
      <h1 className="mt-4 max-w-3xl font-display text-4xl font-bold leading-[1.05] sm:text-5xl md:text-6xl">
        Open the days you can host.
        <br />
        Let people pick the thing.
      </h1>
      <p className="mt-5 max-w-xl text-lg text-muted sm:mt-6 sm:text-xl">
        Paint blue days, attach dinner or badminton, share the link. Guests pick
        an item, then a time, with a thirty-minute buffer between bookings.
      </p>
      <ClaimForm />
    </main>
  );
}
