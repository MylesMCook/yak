import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	output: "standalone",
	cacheComponents: true,
	images: {
		remotePatterns: [
			{
				hostname: "avatar.vercel.sh",
			},
		],
	},
};

export default nextConfig;
