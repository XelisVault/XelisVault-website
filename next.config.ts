import type { NextConfig } from "next";
const nextConfig: NextConfig = { reactStrictMode: false, typescript: { ignoreBuildErrors: true }, images: { unoptimized: true }, devIndicators: false };
export default nextConfig;
