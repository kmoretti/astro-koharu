# 说说 (ShuoShuo) 页面实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `/shuoshuo` 独立页面，展示 Qexo 说说数据，使用瀑布流布局渲染说说卡片。

**Architecture:** Astro 页面 + React 客户端组件（`client:load`）。`ShuoShuo.tsx` 在客户端 fetch Qexo API，渲染瀑布流说说卡片，支持点赞和分页。CSS 独立文件实现瀑布流布局和卡片样式。

**Tech Stack:** Astro 5.x, React 19, CSS (瀑布流 + 卡片样式)

---

### Task 1: 配置层 — site.yaml、类型、常量

**Files:**
- Modify: `config/site.yaml`
- Modify: `src/lib/config/types.ts`
- Modify: `src/constants/friends-config.ts`

- [ ] **Step 1: 修改 `config/site.yaml`**，在 `fcircle` 配置节之后新增 `shuoshuo` 节：

```yaml
# =============================================================================
# Shuoshuo (Qexo Talks) Configuration
# 说说配置 - 展示日常动态
# =============================================================================
shuoshuo:
  apiUrl: "https://qexo.2005815.xyz"  # Qexo 实例地址
  pageSize: 20                           # 每页说说数量
  avatar: "/img/avatar.webp"             # 说说头像
  author: "cos"                          # 说说作者名
```

在 `navigation` 列表末尾新增：

```yaml
  - name: 说说
    nameKey: nav.shuoshuo
    path: /shuoshuo
    icon: ri:message-2-fill
```

- [ ] **Step 2: 修改 `src/lib/config/types.ts`**，在 `FcircleConfig` 后新增 `ShuoshuoConfig`：

```typescript
// =============================================================================
// Shuoshuo (Qexo Talks) Configuration
// =============================================================================

export interface ShuoshuoConfig {
  /** Qexo 实例地址 */
  apiUrl: string;
  /** 每页说说数量 @default 20 */
  pageSize?: number;
  /** 说说头像 URL */
  avatar?: string;
  /** 说说作者名 */
  author?: string;
}
```

在 `SiteYamlConfig` 接口的 `fcircle` 属性后新增 `shuoshuo`：

```typescript
export interface SiteYamlConfig {
  // ...
  fcircle?: FcircleConfig;
  shuoshuo?: ShuoshuoConfig;  // 新增
  // ...
}
```

- [ ] **Step 3: 修改 `src/constants/friends-config.ts`**，在末尾新增导出：

更新 import 行：
```typescript
import type { FriendLink, FriendsConfig, FriendsIntro, FcircleConfig, ShuoshuoConfig } from '@lib/config/types';
```

在 `fcircleConfig` 后新增：
```typescript
export const shuoshuoConfig: ShuoshuoConfig = {
  apiUrl: yamlConfig.shuoshuo?.apiUrl ?? 'https://qexo.2005815.xyz',
  pageSize: yamlConfig.shuoshuo?.pageSize ?? 20,
  avatar: yamlConfig.shuoshuo?.avatar ?? '/img/avatar.webp',
  author: yamlConfig.shuoshuo?.author ?? 'cos',
};
```

---

### Task 2: CSS 样式文件 — `public/css/shuoshuo.css`

**Files:**
- Create: `public/css/shuoshuo.css`

- [ ] **Step 1: 创建 `public/css/shuoshuo.css`**

```css
/* ============== SHUOSHUO (MOMENTS) PAGE ============== */
/* Waterfall masonry layout + card styling              */
/* ====================================================== */

.shuoshuo-page {
  padding-bottom: 64px;
}

/* ---- State Messages ---- */

.shuoshuo-state {
  margin: 18px 0 8px;
  padding: 14px 16px;
  border: 1px dashed var(--dash);
  border-radius: 8px;
  background: var(--paper-warm);
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.shuoshuo-state.is-error {
  color: #b35a4a;
  border-color: rgba(179, 90, 74, 0.34);
}

.dark .shuoshuo-state.is-error {
  color: #e39a8b;
  border-color: rgba(227, 154, 139, 0.32);
}

/* ---- Waterfall Container ---- */

.shuoshuo-waterfall {
  position: relative;
  width: 100%;
}

/* ---- Card ---- */

.shuoshuo-card {
  position: absolute;
  width: calc(33.333% - 10px);
  background: var(--paper);
  border: 1px dashed var(--dash);
  border-radius: 12px;
  box-shadow: 4px 5px 0 rgba(0, 0, 0, 0.06), 0 1px 3px rgba(0, 0, 0, 0.04);
  padding: 20px;
  transition: box-shadow 0.3s ease, transform 0.22s ease;
  overflow: hidden;
}

.shuoshuo-card:hover {
  box-shadow: 6px 8px 0 rgba(0, 0, 0, 0.08), 0 4px 12px rgba(0, 0, 0, 0.06);
  transform: translateY(-2px);
}

.dark .shuoshuo-card {
  background: var(--paper);
  box-shadow: 4px 5px 0 rgba(0, 0, 0, 0.18), 0 1px 3px rgba(0, 0, 0, 0.06);
}

.dark .shuoshuo-card:hover {
  box-shadow: 6px 8px 0 rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* ---- Meta (Header) ---- */

.shuoshuo-card__meta {
  display: flex;
  align-items: center;
  width: 100%;
  padding-bottom: 10px;
  border-bottom: 1px dashed var(--dash);
}

.shuoshuo-card__avatar {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  object-fit: cover;
  flex-shrink: 0;
  background: var(--color-accent-soft);
}

.shuoshuo-card__avatar--text {
  display: inline-grid;
  place-items: center;
  color: var(--color-accent-strong);
  font-size: 18px;
  font-weight: 800;
}

.shuoshuo-card__info {
  display: flex;
  flex-direction: column;
  margin-left: 10px;
  min-width: 0;
  flex: 1;
}

.shuoshuo-card__author {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #6dbdc3;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.4;
}

.shuoshuo-card__badge {
  display: inline-flex;
  align-items: center;
}

.shuoshuo-card__badge svg {
  width: 15px;
  height: 15px;
  display: block;
}

.shuoshuo-card__date {
  color: var(--muted);
  font-size: 12px;
  opacity: 0.7;
  margin-top: 1px;
}

/* ---- Content ---- */

.shuoshuo-card__content {
  margin-top: 10px;
  font-size: 14px;
  line-height: 1.7;
  color: var(--ink);
  word-wrap: break-word;
}

.shuoshuo-card__content img {
  max-width: 100%;
  border-radius: 10px;
  margin-top: 8px;
  display: block;
}

.shuoshuo-card__content a {
  color: var(--color-accent-strong);
  text-decoration: underline;
}

.shuoshuo-card__content p {
  margin: 0 0 6px;
}

.shuoshuo-card__content p:last-child {
  margin-bottom: 0;
}

/* ---- Bottom (Tags + Like) ---- */

.shuoshuo-card__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--dash);
  opacity: 0.9;
}

.shuoshuo-card__tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  min-width: 0;
  flex: 1;
}

.shuoshuo-card__tag {
  font-size: 12px;
  background: var(--paper-warm);
  border: 1px dashed var(--dash);
  border-radius: 12px;
  padding: 2px 10px;
  color: var(--muted);
  white-space: nowrap;
  transition: box-shadow 0.3s ease;
}

.shuoshuo-card__tag:hover {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12);
}

.dark .shuoshuo-card__tag {
  background: rgba(255, 255, 255, 0.06);
}

/* ---- Like Button ---- */

.shuoshuo-card__like {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  font-size: 13px;
  color: var(--muted);
  transition: color 0.2s ease;
  flex-shrink: 0;
  margin-left: 8px;
  user-select: none;
}

.shuoshuo-card__like:hover {
  color: #e25555;
}

.shuoshuo-card__like.is-liked {
  color: #e25555;
}

.shuoshuo-card__like svg {
  width: 16px;
  height: 16px;
  display: block;
}

/* ---- Load More Button ---- */

.shuoshuo-more {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 132px;
  margin: 28px auto 0;
  padding: 8px 18px;
  border: none;
  background: transparent;
  color: var(--ink-soft, var(--muted));
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  white-space: nowrap;
  transition: color 0.2s ease, transform 0.2s ease;
  z-index: 1;
}

.shuoshuo-more::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--paper-warm, var(--paper));
  z-index: -1;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px var(--dash);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.shuoshuo-more:hover,
.shuoshuo-more:focus-visible {
  color: var(--color-accent-strong);
  transform: translateY(-1px);
}

.shuoshuo-more:hover::before,
.shuoshuo-more:focus-visible::before {
  background: var(--color-accent-soft);
  box-shadow: inset 0 0 0 1px var(--color-accent);
}

.dark .shuoshuo-more::before {
  box-shadow: none;
}

.shuoshuo-more.is-loading {
  pointer-events: none;
  opacity: 0.7;
}

/* ---- Responsive ---- */

@media (max-width: 900px) {
  .shuoshuo-card {
    width: calc(50% - 6px);
  }
}

@media (max-width: 600px) {
  .shuoshuo-card {
    width: 100%;
    position: relative !important;
    top: auto !important;
    left: auto !important;
    margin-bottom: 12px;
  }

  .shuoshuo-waterfall {
    height: auto !important;
  }

  .shuoshuo-card__avatar {
    width: 42px;
    height: 42px;
  }
}
```

---

### Task 3: React 组件 — `ShuoShuo.tsx`

**Files:**
- Create: `src/components/shuoshuo/ShuoShuo.tsx`
- Create: `src/components/shuoshuo/` (directory)

- [ ] **Step 1: 创建目录和 `src/components/shuoshuo/ShuoShuo.tsx`**

```tsx
import { useState, useEffect, useCallback, useRef } from 'react';

/* ---- Types ---- */

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

/* ---- Helpers ---- */

function formatTime(unixSeconds: number): string {
  const ts = unixSeconds < 10000000000 ? unixSeconds * 1000 : unixSeconds;
  const date = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const BADGE_SVG = (
  <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block' }}>
    <path d="m512 268c0 17.9-4.3 34.5-12.9 49.7s-20.1 27.1-34.6 35.4c.4 2.7.6 6.9.6 12.6 0 27.1-9.1 50.1-27.1 69.1-18.1 19.1-39.9 28.6-65.4 28.6-11.4 0-22.3-2.1-32.6-6.3-8 16.4-19.5 29.6-34.6 39.7-15 10.2-31.5 15.2-49.4 15.2-18.3 0-34.9-4.9-49.7-14.9-14.9-9.9-26.3-23.2-34.3-40-10.3 4.2-21.1 6.3-32.6 6.3-25.5 0-47.4-9.5-65.7-28.6-18.3-19-27.4-42.1-27.4-69.1 0-3 .4-7.2 1.1-12.6-14.5-8.4-26-20.2-34.6-35.4-8.5-15.2-12.8-31.8-12.8-49.7 0-19 4.8-36.5 14.3-52.3s22.3-27.5 38.3-35.1c-4.2-11.4-6.3-22.9-6.3-34.3 0-27 9.1-50.1 27.4-69.1s40.2-28.6 65.7-28.6c11.4 0 22.3 2.1 32.6 6.3 8-16.4 19.5-29.6 34.6-39.7 15-10.1 31.5-15.2 49.4-15.2s34.4 5.1 49.4 15.1c15 10.1 26.6 23.3 34.6 39.7 10.3-4.2 21.1-6.3 32.6-6.3 25.5 0 47.3 9.5 65.4 28.6s27.1 42.1 27.1 69.1c0 12.6-1.9 24-5.7 34.3 16 7.6 28.8 19.3 38.3 35.1 9.5 15.9 14.3 33.4 14.3 52.4zm-266.9 77.1 105.7-158.3c2.7-4.2 3.5-8.8 2.6-13.7-1-4.9-3.5-8.8-7.7-11.4-4.2-2.7-8.8-3.6-13.7-2.9-5 .8-9 3.2-12 7.4l-93.1 140-42.9-42.8c-3.8-3.8-8.2-5.6-13.1-5.4-5 .2-9.3 2-13.1 5.4-3.4 3.4-5.1 7.7-5.1 12.9 0 5.1 1.7 9.4 5.1 12.9l58.9 58.9 2.9 2.3c3.4 2.3 6.9 3.4 10.3 3.4 6.7-.1 11.8-2.9 15.2-8.7z" fill="#1da1f2" />
  </svg>
);

/* ---- Waterfall Layout ---- */

function layoutWaterfall(container: HTMLElement) {
  const items = Array.from(container.children) as HTMLElement[];
  if (!items.length) return;

  const gap = 12;
  const containerWidth = container.offsetWidth;
  const colCount = containerWidth <= 600 ? 1 : containerWidth <= 900 ? 2 : 3;
  const colWidth = containerWidth <= 600 ? containerWidth : (containerWidth - gap * (colCount - 1)) / colCount;
  const colHeights = new Array(colCount).fill(0);

  items.forEach((item) => {
    item.style.position = 'absolute';
    item.style.width = `${colWidth}px`;
    item.style.top = '0px';
    item.style.left = '0px';

    const minCol = colHeights.indexOf(Math.min(...colHeights));
    const x = minCol * (colWidth + gap);
    const y = colHeights[minCol];

    item.style.left = `${x}px`;
    item.style.top = `${y}px`;
    colHeights[minCol] = y + item.offsetHeight + gap;
  });

  container.style.height = `${Math.max(...colHeights)}px`;
}

/* ---- Component ---- */

export default function ShuoShuo({ apiUrl, pageSize, avatar, author }: ShuoShuoProps) {
  const [talks, setTalks] = useState<TalkItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [state, setState] = useState<'loading' | 'loaded' | 'error' | 'empty'>('loading');
  const [loadingMore, setLoadingMore] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const talksRef = useRef<TalkItem[]>([]);

  // Keep ref in sync
  talksRef.current = talks;

  // Fetch data
  const fetchTalks = useCallback(async (pageNum: number, append: boolean) => {
    if (append) {
      setLoadingMore(true);
    } else {
      setState('loading');
    }

    try {
      const url = `${apiUrl.replace(/\/+$/, '')}/pub/talks/?page=${pageNum}&limit=${pageSize}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: TalksResponse = await res.json();

      if (!json.status || !Array.isArray(json.data)) {
        throw new Error('Invalid response');
      }

      if (append) {
        setTalks((prev) => [...prev, ...json.data]);
      } else {
        setTalks(json.data);
      }
      setTotal(json.count);
      setPage(pageNum);

      if (json.data.length === 0 && !append) {
        setState('empty');
      } else {
        setState('loaded');
      }
    } catch {
      if (!append) {
        setState('error');
      }
    } finally {
      if (append) {
        setLoadingMore(false);
      }
    }
  }, [apiUrl, pageSize]);

  // Initial load
  useEffect(() => {
    fetchTalks(1, false);
  }, [fetchTalks]);

  // Re-layout after talks change
  useEffect(() => {
    if (state !== 'loaded') return;
    const timer = setTimeout(() => {
      if (containerRef.current) {
        layoutWaterfall(containerRef.current);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [talks, state]);

  // Re-layout on window resize (debounced)
  useEffect(() => {
    if (state !== 'loaded') return;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const handleResize = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (containerRef.current) {
          layoutWaterfall(containerRef.current);
        }
      }, 200);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (timer) clearTimeout(timer);
    };
  }, [state]);

  // Load more
  const handleLoadMore = useCallback(() => {
    if (loadingMore) return;
    fetchTalks(page + 1, true);
  }, [fetchTalks, page, loadingMore]);

  // Like
  const handleLike = useCallback(async (talkId: string) => {
    const talk = talksRef.current.find((t) => t.id === talkId);
    if (!talk) return;

    try {
      const url = `${apiUrl.replace(/\/+$/, '')}/pub/like_talk/`;
      await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `id=${talkId}`,
      });

      setTalks((prev) =>
        prev.map((t) =>
          t.id === talkId
            ? { ...t, liked: !t.liked, like: t.liked ? t.like - 1 : t.like + 1 }
            : t
        )
      );
    } catch {
      // Silent fail
    }
  }, [apiUrl]);

  // Avatar error fallback
  const handleAvatarError = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    const parent = img.parentElement;
    if (!parent) return;
    const span = document.createElement('span');
    span.className = 'shuoshuo-card__avatar shuoshuo-card__avatar--text';
    span.textContent = author.charAt(0);
    parent.replaceChild(span, img);
  }, [author]);

  // Images in content - re-layout after images load
  const handleContentRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const imgs = node.querySelectorAll('img');
    if (imgs.length === 0) return;
    let loaded = 0;
    imgs.forEach((img) => {
      if (img.complete) {
        loaded++;
        if (loaded === imgs.length) {
          setTimeout(() => {
            if (containerRef.current) layoutWaterfall(containerRef.current);
          }, 100);
        }
      } else {
        img.addEventListener('load', () => {
          if (containerRef.current) layoutWaterfall(containerRef.current);
        }, { once: true });
      }
    });
  }, []);

  // Loading state
  if (state === 'loading') {
    return (
      <section className="shuoshuo-page">
        <p className="shuoshuo-state">说说加载中...</p>
      </section>
    );
  }

  // Error state
  if (state === 'error') {
    return (
      <section className="shuoshuo-page">
        <p className="shuoshuo-state is-error">
          说说加载失败。
          <br />
          <button
            onClick={() => fetchTalks(1, false)}
            style={{ color: 'inherit', textDecoration: 'underline', cursor: 'pointer', border: 'none', background: 'none', marginTop: '8px' }}
          >
            重新加载
          </button>
        </p>
      </section>
    );
  }

  // Empty state
  if (state === 'empty') {
    return (
      <section className="shuoshuo-page">
        <p className="shuoshuo-state">暂无说说。</p>
      </section>
    );
  }

  // Loaded state
  const hasMore = talks.length < total;

  return (
    <section className="shuoshuo-page">
      <div className="shuoshuo-waterfall" ref={containerRef}>
        {talks.map((talk) => (
          <div className="shuoshuo-card" key={talk.id}>
            {/* Meta */}
            <div className="shuoshuo-card__meta">
              <img
                className="shuoshuo-card__avatar"
                src={avatar}
                alt={author}
                onError={handleAvatarError}
              />
              <div className="shuoshuo-card__info">
                <div className="shuoshuo-card__author">
                  {author}
                  <span className="shuoshuo-card__badge">{BADGE_SVG}</span>
                </div>
                <div className="shuoshuo-card__date">{formatTime(talk.time)}</div>
              </div>
            </div>

            {/* Content */}
            <div
              className="shuoshuo-card__content"
              dangerouslySetInnerHTML={{ __html: talk.content }}
              ref={handleContentRef}
            />

            {/* Bottom */}
            <div className="shuoshuo-card__bottom">
              <div className="shuoshuo-card__tags">
                {talk.tags.map((tag, i) => (
                  <span className="shuoshuo-card__tag" key={`${talk.id}-tag-${i}`}>
                    #{tag}
                  </span>
                ))}
              </div>
              <span
                className={`shuoshuo-card__like${talk.liked ? ' is-liked' : ''}`}
                onClick={() => handleLike(talk.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') handleLike(talk.id); }}
              >
                <svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
                  <path
                    transform="scale(0.03,0.03)"
                    d={talk.liked
                      ? "M0 190.9V185.1C0 115.2 50.52 55.58 119.4 44.1C164.1 36.51 211.4 51.37 244 84.02L256 96L267.1 84.02C300.6 51.37 347 36.51 392.6 44.1C461.5 55.58 512 115.2 512 185.1V190.9C512 232.4 494.8 272.1 464.4 300.4L283.7 469.1C276.2 476.1 266.3 480 256 480C245.7 480 235.8 476.1 228.3 469.1L47.59 300.4C17.23 272.1 .0003 232.4 .0003 190.9L0 190.9z"
                      : "M244 84L255.1 96L267.1 84.02C300.6 51.37 347 36.51 392.6 44.1C461.5 55.58 512 115.2 512 185.1V190.9C512 232.4 494.8 272.1 464.4 300.4L283.7 469.1C276.2 476.1 266.3 480 256 480C245.7 480 235.8 476.1 228.3 469.1L47.59 300.4C17.23 272.1 0 232.4 0 190.9V185.1C0 115.2 50.52 55.58 119.4 44.1C164.1 36.51 211.4 51.37 244 84C243.1 84 244 84.01 244 84L244 84zM255.1 163.9L210.1 117.1C188.4 96.28 157.6 86.4 127.3 91.44C81.55 99.07 48 138.7 48 185.1V190.9C48 219.1 59.71 246.1 80.34 265.3L256 429.3L431.7 265.3C452.3 246.1 464 219.1 464 190.9V185.1C464 138.7 430.4 99.07 384.7 91.44C354.4 86.4 323.6 96.28 301.9 117.1L255.1 163.9z"
                    }
                    fill={talk.liked ? "#e25555" : "currentColor"}
                  />
                </svg>
                {talk.like > 0 && <span>{talk.like}</span>}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Load More */}
      {hasMore && (
        <button
          className={`shuoshuo-more${loadingMore ? ' is-loading' : ''}`}
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
```

---

### Task 4: Astro 页面

**Files:**
- Create: `src/pages/shuoshuo.astro`
- Create: `src/pages/[lang]/shuoshuo.astro`

- [ ] **Step 1: 创建 `src/pages/shuoshuo.astro`**

```astro
---
import ShuoShuo from '@components/shuoshuo/ShuoShuo';
import HomeSider from '@components/layout/HomeSider.astro';
import Cover from '@components/ui/cover/Cover.astro';
import { shuoshuoConfig } from '@constants/friends-config';
import { CONTENT_PADDING } from '@constants/layout';
import { siteConfig } from '@constants/site-config';
import Layout from '@layouts/Layout.astro';
import TwoColumnLayout from '@layouts/TwoColumnLayout.astro';

const title = `说说 | ${siteConfig.title}`;
const description = '说说 - 日常动态';
---

<link rel="stylesheet" href="/css/shuoshuo.css">

<Layout title={title} description={description}>
  <TwoColumnLayout>
    <Cover slot="cover" title="说说" />
    <HomeSider slot="sider" />
    <div
      class={`bg-gradient-start shadow-box tablet:shadow-none flex flex-col gap-10 overflow-hidden ${CONTENT_PADDING.standard}`}
    >
      <div class="mt-4">
        <ShuoShuo
          apiUrl={shuoshuoConfig.apiUrl}
          pageSize={shuoshuoConfig.pageSize ?? 20}
          avatar={shuoshuoConfig.avatar ?? '/img/avatar.webp'}
          author={shuoshuoConfig.author ?? 'cos'}
          client:load
        />
      </div>
    </div>
  </TwoColumnLayout>
</Layout>
```

- [ ] **Step 2: 创建 `src/pages/[lang]/shuoshuo.astro`**

```astro
---
import { getLocaleStaticPaths } from '../_shared/utils';
import ShuoshuoPage from '../shuoshuo.astro';
export const getStaticPaths = getLocaleStaticPaths;
---
<ShuoshuoPage />
```

---

### Task 5: i18n 翻译 — 添加 `nav.shuoshuo` 键

**Files:**
- Modify: `src/i18n/translations/zh.ts`
- Modify: `src/i18n/translations/en.ts`
- Modify: `src/i18n/translations/ja.ts`

- [ ] **Step 1: 在 `zh.ts` 的 nav 区域添加 `'nav.shuoshuo': '说说'`**

在 `'nav.bangumi': '追番'` 之后添加（保持字母序/位置一致）。

- [ ] **Step 2: 在 `en.ts` 的 nav 区域添加 `'nav.shuoshuo': 'Moments'`**

- [ ] **Step 3: 在 `ja.ts` 的 nav 区域添加 `'nav.shuoshuo': 'ひとこと'`**

---

## 自检清单

1. **Spec 覆盖**：
   - ✅ 独立页面 `/shuoshuo` + `/[lang]/shuoshuo` — Task 4
   - ✅ 瀑布流布局 — Task 2 (CSS) + Task 3 (waterfall algorithm)
   - ✅ Qexo API 数据获取 — Task 3
   - ✅ 卡片（头像/昵称/日期/内容/标签/点赞） — Task 3
   - ✅ 加载更多分页 — Task 3
   - ✅ 加载中/错误/空状态 — Task 3
   - ✅ 导航菜单添加 — Task 1
   - ✅ 配置层（site.yaml + types + config） — Task 1
   - ✅ 暗色模式 — Task 2
   - ✅ 响应式（三栏 → 两栏 → 单栏） — Task 2
   - ✅ i18n 翻译 — Task 5

2. **占位符扫描**：无 TBD/TODO 占位符

3. **类型一致性**：`ShuoshuoConfig` 在 types.ts 定义，friends-config.ts 导出，ShuoShuo 组件通过 props 接收
