import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["twilio", "@prisma/client"],
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
