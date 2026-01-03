import Link from 'next/link';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, User } from 'lucide-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { getPostBySlug } from '@/lib/notion';
import { formatDate } from '@/lib/date';
import { MDXRemote } from 'next-mdx-remote/rsc';
import remarkGfm from 'remark-gfm';
import rehypeSanitize from 'rehype-sanitize';
import rehypePrettyCode from 'rehype-pretty-code';
import rehypeSlug from 'rehype-slug';
import { remark } from 'remark';
import { visit } from 'unist-util-visit';
import type { Heading, Root, Text, InlineCode } from 'mdast';
import type { VFile } from 'vfile';

interface TocEntry {
  value: string;
  depth: number;
  id?: string;
  children?: Array<TocEntry>;
}

function TableOfContentsLink({ item, index }: { item: TocEntry; index: number }) {
  const uniqueKey = item.id || `toc-${index}-${item.value}`;

  return (
    <div className="space-y-2">
      <Link
        href={`#${item.id || ''}`}
        className={`hover:text-foreground text-muted-foreground block font-medium transition-colors`}
      >
        {item.value}
      </Link>
      {item.children && item.children.length > 0 && (
        <div className="space-y-2 pl-4">
          {item.children.map((subItem, subIndex) => (
            <TableOfContentsLink key={`${uniqueKey}-${subIndex}`} item={subItem} index={subIndex} />
          ))}
        </div>
      )}
    </div>
  );
}

interface BlogPostProps {
  params: Promise<{ slug: string }>;
}

// 목차 추출을 위한 remark 플러그인
function extractToc() {
  return (tree: Root, file: VFile) => {
    const toc: TocEntry[] = [];
    const idCounter = new Map<string, number>();

    visit(tree, 'heading', (node: Heading) => {
      const depth = node.depth;
      const text = node.children
        .map((child) => {
          if (child.type === 'text') {
            return (child as Text).value;
          }
          if (child.type === 'inlineCode') {
            return (child as InlineCode).value;
          }
          return '';
        })
        .join('')
        .trim();

      if (!text) return; // 빈 텍스트는 건너뛰기

      // slug 생성 (개선된 버전)
      let id = text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-') // 연속된 하이픈 제거
        .replace(/^-|-$/g, '') // 앞뒤 하이픈 제거
        .trim();

      // 빈 id이거나 유효하지 않은 경우 fallback
      if (!id || id === '-') {
        id = `heading-${toc.length + 1}`;
      }

      // 중복 id 방지: 같은 id가 이미 있으면 카운터 추가
      const baseId = id;
      const count = idCounter.get(baseId) || 0;
      if (count > 0) {
        id = `${baseId}-${count}`;
      }
      idCounter.set(baseId, count + 1);

      toc.push({
        value: text,
        depth,
        id,
      });
    });

    // 계층 구조로 변환
    const buildToc = (items: TocEntry[]): TocEntry[] => {
      const result: TocEntry[] = [];
      const stack: TocEntry[] = [];

      for (const item of items) {
        // 스택에서 현재 depth보다 큰 항목 제거
        while (stack.length > 0 && stack[stack.length - 1].depth >= item.depth) {
          stack.pop();
        }

        const entry: TocEntry = { ...item };

        if (stack.length === 0) {
          result.push(entry);
        } else {
          const parent = stack[stack.length - 1];
          if (!parent.children) {
            parent.children = [];
          }
          parent.children.push(entry);
        }

        stack.push(entry);
      }

      return result;
    };

    file.data.toc = buildToc(toc);
  };
}

export default async function BlogPost({ params }: BlogPostProps) {
  const { slug } = await params;
  const { markdown, post } = await getPostBySlug(slug);

  // 목차 추출
  const processor = remark().use(extractToc);
  const file = await processor.process(markdown);
  const toc = (file.data as { toc?: TocEntry[] }).toc;

  return (
    <div className="container py-12">
      <div className="grid grid-cols-[240px_1fr_240px] gap-8">
        <aside>{/* 추후 콘텐츠 추가 */}</aside>

        <section>
          {/* 블로그 헤더 */}
          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                {post.tags?.map((tag) => (
                  <Badge key={tag}>{tag}</Badge>
                ))}
              </div>
              <h1 className="text-4xl font-bold">{post.title}</h1>
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

          {/* 블로그 본문 */}
          <div className="prose prose-neutral prose-sm dark:prose-invert max-w-none">
            <MDXRemote
              source={markdown}
              options={{
                parseFrontmatter: false,
                mdxOptions: {
                  remarkPlugins: [remarkGfm],
                  rehypePlugins: [rehypeSlug, rehypeSanitize, rehypePrettyCode],
                  format: 'md',
                },
              }}
            />
          </div>

          <Separator className="my-16" />

          {/* 이전/다음 포스트 네비게이션 */}
          <nav className="grid grid-cols-2 gap-8">
            <Link href="/blog/previous-post">
              <Card className="group hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base font-medium">
                    <ChevronLeft className="h-4 w-4" />
                    <span>시작하기</span>
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    Next.js를 시작하는 방법부터 프로젝트 구조, 기본 설정까지 상세히 알아봅니다.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>

            <Link href="/blog/next-post" className="text-right">
              <Card className="group hover:bg-muted/50 transition-colors">
                <CardHeader>
                  <CardTitle className="flex items-center justify-end gap-2 text-base font-medium">
                    <span>심화 가이드</span>
                    <ChevronRight className="h-4 w-4" />
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    Next.js의 고급 기능들을 활용하여 더 나은 웹 애플리케이션을 만드는 방법을
                    소개합니다.
                  </CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </nav>
        </section>
        {/* sticky 기준 명확히 하려면 상위요소에 relative */}
        <aside className="relative">
          <div className="sticky top-[var(--sticky-top)]">
            <div className="bg-muted/60 space-y-4 rounded-lg p-6 backdrop-blur-sm">
              <h3 className="text-lg font-semibold">목차</h3>
              <nav className="space-y-3 text-sm">
                {toc && toc.length > 0 ? (
                  toc.map((item, index) => (
                    <TableOfContentsLink
                      key={item.id || `toc-${index}`}
                      item={item}
                      index={index}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">목차가 없습니다.</p>
                )}
              </nav>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
