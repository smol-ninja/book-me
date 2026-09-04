import { NextResponse } from "next/server";
import {
  getCalendarByUsername,
  HttpError,
  updateCalendar,
} from "@/lib/calendar-service";
import { editKeysMatch } from "@/lib/edit-key";
import { toPublicCalendar } from "@/lib/mappers";

type RouteContext = { params: Promise<{ username: string }> };

export async function GET(request: Request, context: RouteContext) {
  const { username } = await context.params;
  const calendar = await getCalendarByUsername(username);
  if (!calendar) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const editKey = new URL(request.url).searchParams.get("key");
  const publicCalendar = toPublicCalendar(calendar);
  if (editKey && editKeysMatch(editKey, calendar.editKeyHash)) {
    return NextResponse.json({
      ...publicCalendar,
      phone: calendar.phoneE164,
      canEdit: true,
    });
  }

  return NextResponse.json(publicCalendar);
}

export async function PUT(request: Request, context: RouteContext) {
  try {
    const { username } = await context.params;
    const body: unknown = await request.json();
    const calendar = await updateCalendar(username, body);
    return NextResponse.json({ calendar: toPublicCalendar(calendar) });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not update calendar." }, { status: 500 });
  }
}
