import { useCallback, useEffect, useState } from 'react';

interface ArticleData {
  title: string;
  link: string;
  author: string;
  avatar: string;
  created?: string;
  published?: string;
  updated?: string;
}

interface StatisticalData {
  friends_num: number;
  active_num: number;
  article_num: number;
  last_updated_time: string;
}

interface AllJsonPayload {
  statistical_data: StatisticalData;
  article_data: ArticleData[];
}

interface FriendCircleProps {
  allJsonUrl: string;
}

const PAGE_SIZE = 20;

function normalizeFclArticles(payload: AllJsonPayload | null): ArticleData[] {
  const raw = payload && Array.isArray(payload.article_data) ? payload.article_data : [];
  const seen = new Set<string>();
  const result: ArticleData[] = [];
  for (const item of raw) {
    const link = String(item?.link || '').trim();
    const title = String(item?.title || '').trim();
    if (!link || !title) continue;
    const key = link.replace(/\/+$/, '').toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({
      title,
      link,
      author: String(item.author || '').trim(),
      avatar: String(item.avatar || '').trim(),
      created: item.created,
      published: item.published,
      updated: item.updated,
    });
  }
  return result.sort((a, b) => {
    const dateA = parseDate(a);
    const dateB = parseDate(b);
    return dateB - dateA;
  });
}

function parseDate(article: ArticleData): number {
  const raw = article.created || article.published || article.updated;
  if (!raw) return 0;
  const normalized = raw.replace(/\//g, '-').replace(' ', 'T');
  const ts = Date.parse(normalized);
  return isNaN(ts) ? 0 : ts;
}

function dateLabel(article: ArticleData): string {
  return article.created || article.published || article.updated || '未知';
}

function fallbackAvatarChar(author: string): string {
  return (author || '?').charAt(0);
}

export default function FriendCircle({ allJsonUrl }: FriendCircleProps) {
  const [state, setState] = useState<'loading' | 'loaded' | 'error' | 'empty'>('loading');
  const [articles, setArticles] = useState<ArticleData[]>([]);
  const [stats, setStats] = useState<StatisticalData | null>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setState('loading');
      try {
        const res = await fetch(allJsonUrl, {
          headers: { Accept: 'application/json,text/plain,*/*' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const payload: AllJsonPayload = await res.json();
        if (cancelled) return;

        const normalized = normalizeFclArticles(payload);
        setStats(payload.statistical_data || null);
        setArticles(normalized);
        setShown(Math.min(PAGE_SIZE, normalized.length));

        if (normalized.length === 0) {
          setState('empty');
        } else {
          setState('loaded');
        }
      } catch {
        if (!cancelled) {
          setState('error');
        }
      }
    }

    fetchData();
    return () => {
      cancelled = true;
    };
  }, [allJsonUrl]);

  const handleLoadMore = useCallback(() => {
    setShown((prev) => Math.min(prev + PAGE_SIZE, articles.length));
  }, [articles.length]);

  const handleAvatarError = useCallback((e: React.SyntheticEvent<HTMLImageElement>, author: string) => {
    const img = e.currentTarget;
    const parent = img.parentElement;
    if (!parent) return;
    const span = document.createElement('span');
    span.className = 'fcircle-card__avatar fcircle-card__avatar--text';
    span.textContent = fallbackAvatarChar(author);
    parent.replaceChild(span, img);
  }, []);

  // Loading state
  if (state === 'loading') {
    return (
      <section className="fcircle-page">
        <p className="fcircle-state">正在展开友链清册...</p>
      </section>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <section className="fcircle-page">
        <p className="fcircle-state is-error">
          数据加载失败。
          <br />
          <a
            href={allJsonUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'inherit', textDecoration: 'underline' }}
          >
            直接查看数据源
          </a>
        </p>
      </section>
    );
  }

  // Empty state
  if (state === 'empty') {
    return (
      <section className="fcircle-page">
        {stats && (
          <div className="fcircle-summary">
            {typeof stats.friends_num === 'number' && <span className="fcircle-summary__stat">友链 {stats.friends_num}</span>}
            {typeof stats.active_num === 'number' && <span className="fcircle-summary__stat">活跃 {stats.active_num}</span>}
            <span className="fcircle-summary__stat">文章 0</span>
          </div>
        )}
        <p className="fcircle-state">暂无友链文章。</p>
      </section>
    );
  }

  // Loaded state
  const visibleArticles = articles.slice(0, shown);
  const hasMore = shown < articles.length;

  return (
    <section className="fcircle-page">
      {/* Summary Bar */}
      {stats && (
        <div className="fcircle-summary">
          {typeof stats.friends_num === 'number' && <span className="fcircle-summary__stat">友链 {stats.friends_num}</span>}
          {typeof stats.active_num === 'number' && <span className="fcircle-summary__stat">活跃 {stats.active_num}</span>}
          {typeof stats.article_num === 'number' && <span className="fcircle-summary__stat">文章 {stats.article_num}</span>}
          {stats.last_updated_time && <span className="fcircle-summary__updated">更新于 {stats.last_updated_time}</span>}
          <a className="fcircle-summary__source" href={allJsonUrl} target="_blank" rel="noopener noreferrer">
            数据源
          </a>
        </div>
      )}

      {/* Article Grid */}
      <ul className="fcircle-list">
        {visibleArticles.map((article, index) => (
          <li className="fcircle-card" key={`${article.link}-${index}`}>
            <a
              className="fcircle-card__avatar-link"
              href={article.link}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={article.author || article.title}
            >
              {article.avatar ? (
                <img
                  className="fcircle-card__avatar"
                  src={article.avatar}
                  alt={article.author || ''}
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={(e) => handleAvatarError(e, article.author)}
                />
              ) : (
                <span className="fcircle-card__avatar fcircle-card__avatar--text">{fallbackAvatarChar(article.author)}</span>
              )}
            </a>
            <div className="fcircle-card__body">
              <div className="fcircle-card__meta">
                <span className="fcircle-card__author">{article.author || '未知'}</span>
                <time className="fcircle-card__date">{dateLabel(article)}</time>
              </div>
              <a className="fcircle-card__title" href={article.link} target="_blank" rel="noopener noreferrer">
                {article.title}
              </a>
            </div>
          </li>
        ))}
      </ul>

      {/* Load More */}
      {hasMore && (
        <button className="fcircle-more" type="button" onClick={handleLoadMore}>
          加载更多
        </button>
      )}
    </section>
  );
}
