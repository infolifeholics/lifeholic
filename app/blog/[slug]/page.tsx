import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight, CalendarDays, Clock } from 'lucide-react';
import { getBlogPosts, getBlogPostBySlug } from '@/lib/data';
import { db } from '@/lib/firebase';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { renderMarkdown } from '@/lib/markdown';
import { BlogComments } from '@/components/blog/comments';
import { ShareButton } from '@/components/blog/share-button';
import { NewsletterBlock } from '@/components/site/newsletter-block';
import { getBlogRoute } from '@/lib/routes';

export async function generateStaticParams() {
  const posts = await getBlogPosts();
  return posts.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) return { title: 'Post not found' };
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `https://thelifeholics.com/blog/${post.slug}` },
    openGraph: {
      type: 'article',
      title: post.title,
      description: post.excerpt,
      publishedTime: post.published_at,
      authors: [post.author],
      images: post.cover ? [{ url: post.cover, width: 1200, height: 630, alt: post.title }] : [],
    },
  };
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getBlogPostBySlug(slug);
  if (!post) notFound();

  let comments: any[] = [];
  try {
    const qComments = query(
      collection(db, 'blog_comments'),
      where('post_id', '==', post.id),
      where('approved', '==', true),
      orderBy('created_at', 'desc')
    );
    const snap = await getDocs(qComments);
    comments = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Could not fetch comments from Firestore (probably empty collection):', err);
  }

  const all = await getBlogPosts();
  const related = all.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 3);
  const fallback = all.filter((p) => p.slug !== post.slug).slice(0, 3);
  const relatedFinal = related.length ? related : fallback;

  const html = renderMarkdown(post.body);

  return (
    <article className="pt-28">
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 text-xs text-muted-foreground" aria-label="Breadcrumb">
          <Link href="/blog" className="hover:text-foreground">Journal</Link>
          <span>/</span>
          <span className="text-foreground">{post.category}</span>
        </nav>

        <div className="mt-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" /> {post.category}
          </span>
          <h1 className="mt-5 font-display text-4xl font-medium leading-[1.1] tracking-tight text-foreground sm:text-5xl text-balance">
            {post.title}
          </h1>
          <p className="mt-5 text-pretty text-lg text-muted-foreground">{post.excerpt}</p>
          <div className="mt-6 flex items-center justify-between border-y border-border/60 py-4">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" /> {new Date(post.published_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> {post.reading_minutes} min read</span>
            </div>
            <ShareButton title={post.title} />
          </div>
        </div>
      </div>

      {post.cover && (
        <div className="mx-auto mt-10 max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative aspect-[16/9] overflow-hidden rounded-[2rem] border border-border/60 shadow-float">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={post.cover} alt={post.title} className="h-full w-full object-cover" />
          </div>
        </div>
      )}

      <div className="mx-auto mt-12 max-w-3xl px-4 sm:px-6 lg:px-8">
        <div
          className="prose prose-neutral max-w-none"
          dangerouslySetInnerHTML={{ __html: html }}
        />

        <div className="mt-12 flex flex-wrap gap-2">
          {post.tags.map((t) => (
            <span key={t} className="rounded-full bg-secondary px-3 py-1 text-xs text-muted-foreground">#{t}</span>
          ))}
        </div>

        <div className="mt-10 rounded-3xl border border-border/60 bg-secondary/40 p-6">
          <p className="font-display text-lg text-foreground">By {post.author}</p>
          <p className="mt-2 text-sm text-muted-foreground">Slow, thoughtful writing on healing and the inner life.</p>
          <Link href="/blog" className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to the journal
          </Link>
        </div>

        <section className="mt-16">
          <BlogComments postId={post.id} initial={comments} />
        </section>
      </div>

      {relatedFinal.length > 0 && (
        <section className="mt-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <h2 className="font-display text-3xl font-medium tracking-tight text-foreground">Keep reading</h2>
            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {relatedFinal.map((p) => (
                <Link key={p.id} href={getBlogRoute(p.slug)} className="group block h-full">
                  <article className="group h-full overflow-hidden rounded-3xl border border-border/60 bg-card/60 shadow-soft transition-all duration-500 ease-soft hover:-translate-y-1.5 hover:shadow-float">
                    <div className="relative aspect-[16/10] overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={p.cover || ''} alt={p.title} className="h-full w-full object-cover transition-transform duration-1000 ease-soft group-hover:scale-105" />
                    </div>
                    <div className="p-5">
                      <h3 className="font-display text-lg font-medium text-foreground">{p.title}</h3>
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.excerpt}</p>
                      <span className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-foreground">
                        Read <ArrowUpRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </article>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <NewsletterBlock />
    </article>
  );
}
