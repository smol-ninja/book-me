export function appOrigin(request?: Request): string {
  const configured = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  if (request) {
    const hostHeader =
      request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (hostHeader) {
      const host = hostHeader.split(",")[0]!.trim();
      const proto =
        request.headers.get("x-forwarded-proto") ??
        (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
      return `${proto}://${host}`;
    }
  }

  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://localhost:3000";
}

export function calendarShareUrls(
  origin: string,
  username: string,
  editKey: string,
): { publicUrl: string; editUrl: string; bookingsUrl: string } {
  const base = origin.replace(/\/$/, "");
  const key = encodeURIComponent(editKey);
  return {
    publicUrl: `${base}/${username}`,
    editUrl: `${base}/setup/${username}?key=${key}`,
    bookingsUrl: `${base}/setup/${username}/bookings?key=${key}`,
  };
}
