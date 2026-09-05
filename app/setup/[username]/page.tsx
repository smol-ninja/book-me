import { SetupForm } from "@/components/setup-form";
import { getCalendarByUsername } from "@/lib/calendar-service";
import { editKeysMatch } from "@/lib/edit-key";
import { toPublicCalendar } from "@/lib/mappers";
import { normalizeUsername, validateUsername } from "@/lib/username";

export const dynamic = "force-dynamic";

export default async function SetupPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ key?: string }>;
}) {
  const { username: raw } = await params;
  const { key } = await searchParams;
  const username = normalizeUsername(raw);
  const usernameError = validateUsername(username);

  if (usernameError) {
    return (
      <main className="mx-auto w-full max-w-xl px-5 py-16">
        <h1 className="font-display text-4xl font-bold">Invalid username</h1>
        <p className="mt-4 text-lg text-muted">{usernameError}</p>
      </main>
    );
  }

  const calendar = await getCalendarByUsername(username);
  const canEdit = Boolean(
    calendar && key && editKeysMatch(key, calendar.editKeyHash),
  );

  return (
    <SetupForm
      username={username}
      editKey={canEdit ? (key ?? null) : null}
      taken={Boolean(calendar) && !canEdit}
      initial={
        calendar
          ? {
              ...toPublicCalendar(calendar),
              ...(canEdit
                ? {
                    phone: calendar.phoneE164,
                    email: calendar.email,
                    canEdit: true,
                  }
                : {}),
            }
          : null
      }
    />
  );
}
