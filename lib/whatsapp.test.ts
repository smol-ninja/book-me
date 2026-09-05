import { describe, expect, it } from "vitest";
import { calendarCreatedWhatsAppBody } from "@/lib/whatsapp";

describe("calendarCreatedWhatsAppBody", () => {
  it("includes the public and secret edit URLs", () => {
    const body = calendarCreatedWhatsAppBody({
      username: "ada",
      publicUrl: "https://book-me-delta.vercel.app/ada",
      editUrl: "https://book-me-delta.vercel.app/setup/ada?key=secret",
    });
    expect(body).toContain("https://book-me-delta.vercel.app/ada");
    expect(body).toContain(
      "https://book-me-delta.vercel.app/setup/ada?key=secret",
    );
    expect(body).toContain("keep this private");
  });
});
