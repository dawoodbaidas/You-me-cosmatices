import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  images: {
    qualities: [70, 75, 90],
    formats: ['image/webp'],
    remotePatterns: process.env.NEXT_PUBLIC_SUPABASE_URL
      ? [new URL('/storage/v1/object/public/product-images/**', process.env.NEXT_PUBLIC_SUPABASE_URL)]
      : [],
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ]
  },
}

export default nextConfig
