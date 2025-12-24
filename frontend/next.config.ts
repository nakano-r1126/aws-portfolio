import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export", // S3静的ホスティング用
  trailingSlash: true, // /login/ のようにスラッシュを付ける
};

export default nextConfig;
