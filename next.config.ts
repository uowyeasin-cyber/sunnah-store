import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Shows "Continue with Google" only once the Google keys are set in Vercel.
  env: { NEXT_PUBLIC_GOOGLE_ON: /\.apps\.googleusercontent\.com$/.test(process.env.GOOGLE_CLIENT_ID || '') ? '1' : '' },
};

export default nextConfig;
