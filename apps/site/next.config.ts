import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
	agentRules: false,
	allowedDevOrigins: ['sonde.localhost', '*.sonde.localhost'],
};

export default nextConfig;
