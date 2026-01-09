'use client';
import Giscus from '@giscus/react';
import { useTheme } from 'next-themes';

export default function GiscusComments() {
  const { theme } = useTheme();

  return (
    <Giscus
      repo="naraeng/naraeng-blog-giscus"
      repoId="R_kgDOQ2iFJQ"
      category="Announcements"
      categoryId="DIC_kwDOQ2iFJc4C0wB9"
      mapping="pathname"
      strict="0"
      reactionsEnabled="1"
      emitMetadata="0"
      inputPosition="top"
      theme={theme === 'dark' ? 'dark' : 'light'}
      lang="ko"
    />
  );
}
