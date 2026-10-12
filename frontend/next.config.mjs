/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  trailingSlash: true,
  basePath: "/web",
  images: { unoptimized: true },
};

export default nextConfig;