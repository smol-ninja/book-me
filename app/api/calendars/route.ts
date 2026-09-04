import { NextResponse } from "next/server";
import { createCalendar, HttpError } from "@/lib/calendar-service";
import { toPublicCalendar } from "@/lib/mappers";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const { calendar, editKey } = await createCalendar(body);
    return NextResponse.json(
      { calendar: toPublicCalendar(calendar), editKey },
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
