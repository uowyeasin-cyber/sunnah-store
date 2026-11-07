import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Shows "Continue with Google" only once the Google keys are set in Vercel.
  // Basic browser protections on every page: no framing by other sites, no MIME sniffing, no full URLs leaked to other sites.
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
    ] }];
  },
  env: { NEXT_PUBLIC_GOOGLE_ON: /\.apps\.googleusercontent\.com$/.test(process.env.GOOGLE_CLIENT_ID || '') ? '1' : '' },
};

export default nextConfig;
