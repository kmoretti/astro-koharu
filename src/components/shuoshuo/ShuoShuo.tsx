import { useCallback, useEffect, useRef, useState } from 'react';

interface TalkItem {
  id: string;
  content: string;
  time: number;
  tags: string[];
  like: number;
  liked: boolean;
}

interface TalksResponse {
  status: boolean;
  data: TalkItem[];
  count: number;
}

interface ShuoShuoProps {
  apiUrl: string;
  pageSize: number;
  avatar: string;
  author: string;
}

/* ---- Waterfall Layout ---- */

function layoutWaterfall(container: HTMLElement) {
  const items = Array.from(container.children) as HTMLElement[];
  if (!items.length) return;

  const gap = 12;
  const cw = container.offsetWidth;
  const cols = cw <= 600 ? 1 : cw <= 900 ? 2 : 3;
  const colW = cw <= 600 ? cw : (cw - gap * (cols - 1)) / cols;
  const heights = new Array(cols).fill(0);

  items.forEach((item) => {
    item.style.position = 'absolute';
    item.style.width = `${colW}px`;
    const min = heights.indexOf(Math.min(...heights));
    item.style.left = `${min * (colW + gap)}px`;
    item.style.top = `${heights[min]}px`;
    heights[min] += item.offsetHeight + gap;
  });

  container.style.height = `${Math.max(...heights)}px`;
}

/* ---- Helpers ---- */

function fmtTime(ts: number): string {
  const d = new Date(ts < 10000000000 ? ts * 1000 : ts);
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

const BADGE = (
  <svg viewBox="0 0 512 512" style={{ display: 'block', width: 15, height: 15 }} aria-label="Verified">
    <title>Verified</title>
    <path
      d="m512 268c0 17.9-4.3 34.5-12.9 49.7s-20.1 27.1-34.6 35.4c.4 2.7.6 6.9.6 12.6 0 27.1-9.1 50.1-27.1 69.1-18.1 19.1-39.9 28.6-65.4 28.6-11.4 0-22.3-2.1-32.6-6.3-8 16.4-19.5 29.6-34.6 39.7-15 10.2-31.5 15.2-49.4 15.2-18.3 0-34.9-4.9-49.7-14.9-14.9-9.9-26.3-23.2-34.3-40-10.3 4.2-21.1 6.3-32.6 6.3-25.5 0-47.4-9.5-65.7-28.6-18.3-19-27.4-42.1-27.4-69.1 0-3 .4-7.2 1.1-12.6-14.5-8.4-26-20.2-34.6-35.4-8.5-15.2-12.8-31.8-12.8-49.7 0-19 4.8-36.5 14.3-52.3s22.3-27.5 38.3-35.1c-4.2-11.4-6.3-22.9-6.3-34.3 0-27 9.1-50.1 27.4-69.1s40.2-28.6 65.7-28.6c11.4 0 22.3 2.1 32.6 6.3 8-16.4 19.5-29.6 34.6-39.7 15-10.1 31.5-15.2 49.4-15.2s34.4 5.1 49.4 15.1c15 10.1 26.6 23.3 34.6 39.7 10.3-4.2 21.1-6.3 32.6-6.3 25.5 0 47.3 9.5 65.4 28.6s27.1 42.1 27.1 69.1c0 12.6-1.9 24-5.7 34.3 16 7.6 28.8 19.3 38.3 35.1 9.5 15.9 14.3 33.4 14.3 52.4zm-266.9 77.1 105.7-158.3c2.7-4.2 3.5-8.8 2.6-13.7-1-4.9-3.5-8.8-7.7-11.4-4.2-2.7-8.8-3.6-13.7-2.9-5 .8-9 3.2-12 7.4l-93.1 140-42.9-42.8c-3.8-3.8-8.2-5.6-13.1-5.4-5 .2-9.3 2-13.1 5.4-3.4 3.4-5.1 7.7-5.1 12.9 0 5.1 1.7 9.4 5.1 12.9l58.9 58.9 2.9 2.3c3.4 2.3 6.9 3.4 10.3 3.4 6.7-.1 11.8-2.9 15.2-8.7z"
      fill="#1da1f2"
    />
  </svg>
);

/* ---- Component ---- */

export default function ShuoShuo({ apiUrl, pageSize, avatar, author }: ShuoShuoProps) {
  const [talks, setTalks] = useState<TalkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<'loading' | 'loaded' | 'error' | 'empty'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const wfTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const doWaterfall = useCallback(() => {
    if (wfTimerRef.current) clearTimeout(wfTimerRef.current);
    wfTimerRef.current = setTimeout(() => {
      if (containerRef.current) layoutWaterfall(containerRef.current);
    }, 50);
  }, []);

  const baseUrl = apiUrl.replace(/\/+$/, '');

  const fetchTalks = useCallback(
    async (pageNum: number, append: boolean) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setState('loading');
      }
      try {
        const res = await fetch(`${baseUrl}/pub/talks/?page=${pageNum}&limit=${pageSize}`, {
          headers: { Accept: 'application/json' },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json: TalksResponse = await res.json();
        if (!json.status || !Array.isArray(json.data)) throw new Error('Invalid response');

        setTotal(json.count);
        setPage(pageNum);
        if (append) {
          setTalks((prev) => [...prev, ...json.data]);
        } else {
          setTalks(json.data);
          setState(json.data.length === 0 ? 'empty' : 'loaded');
        }
      } catch {
        if (!append) setState('error');
      } finally {
        if (append) setLoadingMore(false);
      }
    },
    [baseUrl, pageSize],
  );

  useEffect(() => {
    fetchTalks(1, false);
  }, [fetchTalks]);
  useEffect(() => {
    if (state === 'loaded') doWaterfall();
  }, [state, doWaterfall]);

  // Resize debounce
  useEffect(() => {
    if (state !== 'loaded') return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const h = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => {
        if (containerRef.current) layoutWaterfall(containerRef.current);
      }, 200);
    };
    window.addEventListener('resize', h);
    return () => {
      window.removeEventListener('resize', h);
      if (t) clearTimeout(t);
    };
  }, [state]);

  // Image load → re-layout
  useEffect(() => {
    if (state !== 'loaded' || !containerRef.current) return;
    const imgs = containerRef.current.querySelectorAll<HTMLImageElement>('.talk-content img');
    if (!imgs.length) return;
    let n = 0;
    imgs.forEach((img) => {
      if (img.complete) {
        n++;
        if (n === imgs.length) doWaterfall();
      } else img.addEventListener('load', doWaterfall, { once: true });
    });
  }, [state, doWaterfall]);

  const handleLike = useCallback(
    async (talkId: string) => {
      setTalks((prev) =>
        prev.map((t) => (t.id === talkId ? { ...t, liked: !t.liked, like: t.liked ? t.like - 1 : t.like + 1 } : t)),
      );
      try {
        await fetch(`${baseUrl}/pub/like_talk/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `id=${talkId}`,
        });
      } catch {
        setTalks((prev) =>
          prev.map((t) => (t.id === talkId ? { ...t, liked: !t.liked, like: t.liked ? t.like - 1 : t.like + 1 } : t)),
        );
      }
    },
    [baseUrl],
  );

  const handleLoadMore = useCallback(() => {
    if (!loadingMore) fetchTalks(page + 1, true);
  }, [fetchTalks, page, loadingMore]);

  const handleAvatarError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      const img = e.currentTarget;
      const p = img.parentElement;
      if (!p) return;
      const s = document.createElement('span');
      s.className = 'shuo-avatar shuo-avatar--text';
      s.textContent = author.charAt(0);
      p.replaceChild(s, img);
    },
    [author],
  );

  if (state === 'loading')
    return (
      <section className="shuoshuo-page">
        <p className="shuo-state">说说加载中...</p>
      </section>
    );
  if (state === 'error')
    return (
      <section className="shuoshuo-page">
        <p className="shuo-state is-error">
          说说加载失败。
          <br />
          <button
            type="button"
            onClick={() => fetchTalks(1, false)}
            style={{
              color: 'inherit',
              textDecoration: 'underline',
              cursor: 'pointer',
              border: 'none',
              background: 'none',
              marginTop: 8,
            }}
          >
            重新加载
          </button>
        </p>
      </section>
    );
  if (state === 'empty')
    return (
      <section className="shuoshuo-page">
        <p className="shuo-state">暂无说说。</p>
      </section>
    );

  const hasMore = talks.length < total;

  return (
    <section className="shuoshuo-page">
      <div className="shuo-waterfall" ref={containerRef}>
        {talks.map((talk) => (
          <div className="shuo-card" key={`shuo-${talk.id}`}>
            {/* Header */}
            <div className="shuo-card__meta">
              <div className="shuo-avatar-wrap">
                <img className="shuo-avatar" src={avatar} alt={author} onError={handleAvatarError} />
              </div>
              <div className="shuo-card__info">
                <div className="shuo-card__author">
                  {author}
                  <span className="shuo-card__badge">{BADGE}</span>
                </div>
                <div className="shuo-card__date">{fmtTime(talk.time)}</div>
              </div>
            </div>

            {/* Content */}
            {/* biome-ignore lint/security/noDangerouslySetInnerHtml: Qexo returns pre-rendered HTML */}
            <div className="talk-content" dangerouslySetInnerHTML={{ __html: talk.content }} />

            {/* Tags */}
            {talk.tags.length > 0 && (
              <div className="shuo-card__tags">
                {talk.tags.map((tag, i) => (
                  <span className="shuo-card__tag" key={`${talk.id}-t${i}`}>
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Bottom */}
            <div className="shuo-card__bottom">
              <button
                type="button"
                className={`shuo-card__like${talk.liked ? 'is-liked' : ''}`}
                onClick={() => handleLike(talk.id)}
                aria-label={talk.liked ? '取消点赞' : '点赞'}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="16"
                  height="16"
                  fill={talk.liked ? '#e25555' : 'none'}
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path
                    d={
                      talk.liked
                        ? 'M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z'
                        : 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'
                    }
                  />
                </svg>
                {talk.like > 0 && <span>{talk.like}</span>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          className={`shuo-more${loadingMore ? 'is-loading' : ''}`}
          type="button"
          onClick={handleLoadMore}
          disabled={loadingMore}
        >
          {loadingMore ? '加载中...' : '加载更多'}
        </button>
      )}
    </section>
  );
}
