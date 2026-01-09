import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, User } from 'lucide-react';
// import { ChevronLeft, ChevronRight } from 'lucide-react';
// import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getPostBySlug } from '@/lib/notion';
import { formatDate } from '@/lib/date';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypePrettyCode from 'rehype-pretty-code';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeRaw from 'rehype-raw';
import rehypeStringify from 'rehype-stringify';
import withSlugs from 'rehype-slug';
import withToc from '@stefanprobst/rehype-extract-toc';
import GiscusComments from '@/components/GiscusComment';

interface TocEntry {
  value: string;
  depth: number;
  id?: string;
  children?: Array<TocEntry>;
}

function TableOfContentsLink({ item }: { item: TocEntry }) {
  return (
    <div className="space-y-2">
      <Link
        key={item.id}
        href={`#${item.id}`}
        className={`hover:text-foreground text-muted-foreground block font-medium transition-colors`}
      >
        {item.value}
      </Link>
      {item.children && item.children.length > 0 && (
        <div className="space-y-2 pl-4">
          {item.children.map((subItem) => (
            <TableOfContentsLink key={subItem.id} item={subItem} />
          ))}
        </div>
      )}
    </div>
  );
}

interface BlogPostProps {
  params: Promise<{ slug: string }>;
}

// toc를 직렬화 가능한 형태로 변환하는 헬퍼 함수
function serializeToc(toc: unknown): TocEntry[] | undefined {
  if (!toc) return undefined;

  try {
    // JSON 직렬화/역직렬화를 통해 순수한 데이터 구조로 변환
    const serialized = JSON.parse(JSON.stringify(toc)) as unknown;

    // 배열인 경우 각 항목을 TocEntry 형태로 변환
    if (Array.isArray(serialized)) {
      return serialized.map((item: unknown) => {
        const entry = item as { value?: string; depth?: number; id?: string; children?: unknown };
        return {
          value: entry.value || '',
          depth: entry.depth || 1,
          id: entry.id || undefined,
          children: entry.children ? serializeToc(entry.children) : undefined,
        };
      });
    }

    return undefined;
  } catch {
    return undefined;
  }
}

export default async function BlogPost({ params }: BlogPostProps) {
  const { slug } = await params;
  const { markdown, post } = await getPostBySlug(slug);

  // unified를 사용하여 toc 추출 (processSync 사용, rehype-stringify 필요)
  let toc: TocEntry[] | undefined;

  try {
    const processor = unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeRaw)
      .use(withSlugs)
      .use(rehypeSanitize)
      .use(withToc)
      .use(rehypeStringify); // processSync를 사용하려면 stringify 필요

    const file = processor.processSync(markdown);

    // toc를 직렬화 가능한 형태로 변환
    toc = serializeToc((file.data as { toc?: unknown })?.toc);
  } catch (error) {
    // toc 추출 실패 시 빈 배열로 설정
    console.error('Failed to extract TOC:', error);
    toc = undefined;
  }

  return (
    <div className="container py-6 md:py-8 lg:py-12">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_1fr_200px] md:gap-8">
        <aside className="hidden md:block">{/* 추후 콘텐츠 추가 */}</aside>

        <section>
          {/* 블로그 헤더 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                {post.tags?.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <h1 className="text-3xl font-bold md:text-4xl">{post.title}</h1>
            </div>

            {/* 메타 정보 */}
            <div className="text-muted-foreground flex gap-4 text-sm">
              <div className="flex items-center gap-1">
                <User className="h-4 w-4" />
                <span>나래</span>
              </div>
              <div className="flex items-center gap-1">
                <CalendarDays className="h-4 w-4" />
                <span>{formatDate(post.date)}</span>
              </div>
            </div>
          </div>

          <Separator className="my-8" />

          {/* 모바일 전용 목차 */}
          {toc && toc.length > 0 && (
            <div className="sticky top-[var(--sticky-top)] mb-6 md:hidden">
              <details className="bg-muted/60 rounded-lg p-4 backdrop-blur-sm">
                <summary className="cursor-pointer text-lg font-semibold">목차</summary>
                <nav className="mt-3 space-y-3 text-sm">
                  {toc.map((item) => (
                    <TableOfContentsLink key={item.id} item={item} />
                  ))}
                </nav>
              </details>
            </div>
          )}

          {/* 블로그 본문 */}
          <div className="prose prose-neutral prose-sm dark:prose-invert max-w-none">
            <MDXRemote
              source={markdown}
              options={{
                parseFrontmatter: false,
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                  rehypePlugins: [withSlugs, rehypeSanitize, rehypePrettyCode],
                  format: 'md',
                },
              }}
            />
          </div>

          <Separator className="my-16" />

          <GiscusComments />

          {/* 이전/다음 포스트 네비게이션 */}
        </section>

        {/* sticky 기준 명확히 하려면 상위요소에 relative */}
        {toc && toc.length > 0 && (
          <aside className="relative hidden min-w-0 md:block">
            <div className="sticky top-[var(--sticky-top)]">
              <div className="bg-muted/60 max-w-[240px] space-y-4 rounded-lg p-6 backdrop-blur-sm">
                <h3 className="text-lg font-semibold">목차</h3>
                <nav className="space-y-3 text-sm">
                  {toc.map((item) => (
                    <TableOfContentsLink key={item.id} item={item} />
                  ))}
                </nav>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
