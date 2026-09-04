import { NextResponse } from "next/server";
import { createBooking } from "@/lib/booking-service";
import { HttpError } from "@/lib/calendar-service";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const booking = await createBooking(body);
    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    if (error instanceof HttpError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error(error);
    return NextResponse.json({ error: "Could not complete booking." }, { status: 500 });
  }
}
