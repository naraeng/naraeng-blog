import type { NextConfig } from 'next';
import createMDX from '@next/mdx';

// npm run dev : development 환경
// npm run build -> npm run start : production 환경
// console.log(process.env.NODE_ENV);
// console.log(process.env.ENV_NAME);

const nextConfig: NextConfig = {
  typescript: {
    // 경고: 타입 에러가 있어도 프로덕션 빌드를 허용
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        hostname: 'picsum.photos',
      },
      {
        hostname: 'images.unsplash.com',
      },
      {
        hostname: 'prod-files-secure.s3.us-west-2.amazonaws.com',
      },
      {
        hostname: 'www.notion.so',
      },
    ],
  },
  pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
};

// Turbopack과 함께 사용할 때는 플러그인을 문자열로 지정해야 함
const withMDX = createMDX({
  options: {
    remarkPlugins: [['remark-gfm']],
    rehypePlugins: [],
  },
});

// MDX 설정을 Next.js 설정과 병합
export default withMDX(nextConfig);
