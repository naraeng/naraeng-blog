import Link from 'next/link';
import { PostCard } from './PostCard';
import { Post } from '@/types/blog';

interface PostListProps {
  posts: Post[];
}

export default function PostList({ posts }: PostListProps) {
  return (
    <div className="grid gap-4">
      {posts.map((post) => (
        <Link href={`/blog/${post.slug}`} key={post.id}>
          <PostCard post={post} />
        </Link>
      ))}
    </div>
  );
}
