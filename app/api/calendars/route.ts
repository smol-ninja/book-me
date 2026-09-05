import { NextResponse } from "next/server";
import { appOrigin, calendarShareUrls } from "@/lib/app-origin";
import { createCalendar, HttpError } from "@/lib/calendar-service";
import { toPublicCalendar } from "@/lib/mappers";
import { notifyCalendarCreated } from "@/lib/whatsapp";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const { calendar, editKey } = await createCalendar(body);
    const { publicUrl, editUrl } = calendarShareUrls(
      appOrigin(request),
      calendar.username,
      editKey,
    );
    const whatsapp = await notifyCalendarCreated({
      creatorPhone: calendar.phoneE164,
      username: calendar.username,
      publicUrl,
      editUrl,
    });
    return NextResponse.json(
      {
        calendar: toPublicCalendar(calendar),
        editKey,
        whatsappSent: whatsapp.sent,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not save calendar." }, { status: 500 });
  }
}
