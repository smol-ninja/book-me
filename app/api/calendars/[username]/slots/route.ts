import { NextResponse } from "next/server";
import { listSlots } from "@/lib/booking-service";
import { HttpError } from "@/lib/calendar-service";

type RouteContext = { params: Promise<{ username: string }> };

export async function GET(request: Request, context: RouteContext) {
  try {
    const { username } = await context.params;
    const url = new URL(request.url);
    const date = url.searchParams.get("date") ?? "";
    const itemId = url.searchParams.get("itemId") ?? "";
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !itemId) {
      return NextResponse.json(
        { error: "date and itemId are required." },
        { status: 400 },
      );
    }
    const slots = await listSlots(username, date, itemId);
    return NextResponse.json({ slots });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not load slots." }, { status: 500 });
  }
}
