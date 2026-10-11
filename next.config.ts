import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // The Studio Admin used to live at /studio; it is now the only admin page.
    return [{ source: "/studio", destination: "/admin", permanent: true }];
  },
};

export default nextConfig;
