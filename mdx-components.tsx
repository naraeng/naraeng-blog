import type { MDXComponents } from 'mdx/types';
import { Button } from '@/components/ui/button';

export function useMDXComponents(components: MDXComponents): MDXComponents {
  return {
    // MDX에서 사용할 수 있는 컴포넌트 제공
    Button,
    // 사용자가 전달한 컴포넌트도 병합
    ...components,
  };
}
