import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB; raise to accommodate 10MB file uploads via the
      // document upload server action. multipart/form-data overhead is small
      // (~20 KB for boundaries/headers), so 11MB gives a comfortable ceiling.
      bodySizeLimit: '11mb',
    },
  },
};

export default nextConfig;
