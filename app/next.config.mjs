/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  eslint: {
    // No .eslintrc is shipped with this standalone prototype; type-checking
    // (not lint) is the build gate per the verification requirements.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
