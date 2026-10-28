import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // The Studio Admin used to live at /studio; it is now the only admin page.
      { source: "/studio", destination: "/admin", permanent: true },
      // My requests was folded into the public live board.
      { source: "/requests", destination: "/board", permanent: true },
    ];
  },
};

export default nextConfig;
