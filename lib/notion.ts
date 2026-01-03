import { Client } from '@notionhq/client';
import type { Post, TagFilterItem } from '@/types/blog';
import type {
  PageObjectResponse,
  UserObjectResponse,
} from '@notionhq/client/build/src/api-endpoints';
import { NotionToMarkdown } from 'notion-to-md';

export const notion = new Client({
  auth: process.env.NOTION_API_KEY,
  notionVersion: '2025-09-03',
});
const n2m = new NotionToMarkdown({ notionClient: notion });

function getPostMetadata(page: PageObjectResponse): Post {
  const { properties } = page;

  const getCoverImage = (cover: PageObjectResponse['cover']) => {
    if (!cover) return '';

    switch (cover.type) {
      case 'external':
        return cover.external.url;
      case 'file':
        return cover.file.url;
      default:
        return '';
    }
  };

  return {
    id: page.id,
    title: properties.Title.type === 'title' ? (properties.Title.title[0]?.plain_text ?? '') : '',
    description:
      properties.Description.type === 'rich_text'
        ? (properties.Description.rich_text[0]?.plain_text ?? '')
        : '',
    coverImage: getCoverImage(page.cover),
    tags:
      properties.Tags.type === 'multi_select'
        ? properties.Tags.multi_select.map((tag) => tag.name)
        : [],
    author:
      properties.Author.type === 'people'
        ? ((properties.Author.people[0] as UserObjectResponse)?.name ?? '')
        : '',
    date: properties.Date.type === 'date' ? (properties.Date.date?.start ?? '') : '',
    modifiedDate: page.last_edited_time,
    slug:
      properties.Slug.type === 'rich_text'
        ? (properties.Slug.rich_text[0]?.plain_text ?? page.id)
        : page.id,
  };
}

export const getPostBySlug = async (
  slug: string
): Promise<{
  markdown: string;
  post: Post;
}> => {
  // Step 1: Database 정보 가져오기 (data_sources 배열 포함)
  const databaseResponse = await notion.request({
    method: 'get',
    path: `databases/${process.env.NOTION_DATABASE_ID}`,
  });

  // Step 2: 첫 번째 Data Source ID 추출
  const dataSources = (databaseResponse as { data_sources?: Array<{ id: string; name: string }> })
    .data_sources;

  if (!dataSources || dataSources.length === 0) {
    throw new Error('No data sources found in database');
  }

  const dataSourceId = dataSources[0].id;

  // Step 3: dataSources.query 메서드로 쿼리
  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: {
      and: [
        {
          property: 'Slug',
          rich_text: {
            equals: slug,
          },
        },
        {
          property: 'Status',
          select: {
            equals: 'Published',
          },
        },
      ],
    },
  });

  const page = response.results.find((page): page is PageObjectResponse => 'properties' in page);

  if (!page) {
    throw new Error('Post not found');
  }

  const mdBlocks = await n2m.pageToMarkdown(response.results[0].id);
  const { parent } = n2m.toMarkdownString(mdBlocks);

  return {
    markdown: parent,
    post: getPostMetadata(page),
  };
};

// Database와 Data Source ID를 가져오는 헬퍼 함수
async function getDataSourceId() {
  const databaseResponse = await notion.request({
    method: 'get',
    path: `databases/${process.env.NOTION_DATABASE_ID}`,
  });

  const dataSources = (databaseResponse as { data_sources?: Array<{ id: string; name: string }> })
    .data_sources;

  if (!dataSources || dataSources.length === 0) {
    throw new Error('No data sources found in database');
  }

  return dataSources[0].id;
}

export const getPublishedPosts = async (tag?: string): Promise<Post[]> => {
  const dataSourceId = await getDataSourceId();

  const response = await notion.dataSources.query({
    data_source_id: dataSourceId,
    filter: {
      and: [
        {
          property: 'Status',
          select: {
            equals: 'Published',
          },
        },
        ...(tag && tag !== '전체'
          ? [
              {
                property: 'Tags',
                multi_select: {
                  contains: tag,
                },
              },
            ]
          : []),
      ],
    },
    sorts: [
      {
        property: 'Date',
        direction: 'descending',
      },
    ],
  });

  return response.results
    .filter((page): page is PageObjectResponse => 'properties' in page)
    .map(getPostMetadata);
};

export const getTags = async (): Promise<TagFilterItem[]> => {
  const posts = await getPublishedPosts();

  // 모든 태그를 추출하고 각 태그의 출현 횟수를 계산
  const tagCount = posts.reduce(
    (acc, post) => {
      post.tags?.forEach((tag) => {
        acc[tag] = (acc[tag] || 0) + 1;
      });
      return acc;
    },
    {} as Record<string, number>
  );

  // TagFilterItem 형식으로 변환
  const tags: TagFilterItem[] = Object.entries(tagCount).map(([name, count]) => ({
    id: name,
    name,
    count,
  }));

  // "전체" 태그 추가
  tags.unshift({
    id: 'all',
    name: '전체',
    count: posts.length,
  });

  // 태그 이름 기준으로 정렬 ("전체" 태그는 항상 첫 번째에 위치하도록 제외)
  const [allTag, ...restTags] = tags;
  const sortedTags = restTags.sort((a, b) => a.name.localeCompare(b.name));

  return [allTag, ...sortedTags];
};
