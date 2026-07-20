# 友链朋友圈 (Friend Circle) 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 新增 `/fcircle` 独立页面，展示各友链博客的最新 RSS 文章动态，使用 flatpaper 手账风格渲染。

**Architecture:** Astro 页面 + React 客户端组件（`client:load`）。`FriendCircle.tsx` 在客户端 fetch `all.json`，渲染统计栏 + 文章卡片网格，支持分页。CSS 独立文件还原 flatpaper 手账风格（笔记纸背景、胶带、标签、微旋转）。

**Tech Stack:** Astro 5.x, React 19, CSS (flatpaper 风格，非 Tailwind)

---

### Task 1: 配置层 — site.yaml、类型、常量

**Files:**
- Modify: `config/site.yaml` (friends 节后新增 fcircle 节 + navigation 新增朋友圈项)
- Modify: `src/lib/config/types.ts` (新增 FcircleConfig 接口)
- Modify: `src/constants/friends-config.ts` (新增导出 fcircleConfig)

- [ ] **Step 1: 修改 `config/site.yaml`**，在 `friends` 节后新增：

```yaml
# =============================================================================
# Friend Circle (Friend-Circle-Lite) Configuration
# 友链朋友圈配置 - 展示各友链博客的最新 RSS 文章动态
# =============================================================================
fcircle:
  # Friend-Circle-Lite all.json 数据源 URL
  allJsonUrl: "https://fc.081531.xyz/all.json"
```

在 `navigation` 列表末尾新增：

```yaml
  - name: 朋友圈
    nameKey: nav.fcircle
    path: /fcircle
    icon: ri:rss-fill
```

- [ ] **Step 2: 修改 `src/lib/config/types.ts`**，在 `FriendsConfig` 接口定义后（第 137 行后）新增 `FcircleConfig`：

```typescript
// =============================================================================
// Friend Circle (Friend-Circle-Lite) Configuration
// =============================================================================

export interface FcircleConfig {
  /** Friend-Circle-Lite all.json 数据源 URL */
  allJsonUrl: string;
}
```

在 `SiteYamlConfig` 接口（第 606 行）的 `friends` 属性后新增 `fcircle`：

```typescript
export interface SiteYamlConfig {
  site: SiteBasicConfig;
  featuredCategories?: FeaturedCategory[];
  featuredSeries?: FeaturedSeriesItem[] | FeaturedSeriesItem;
  social?: SocialConfig;
  friends?: FriendsConfig;
  fcircle?: FcircleConfig;  // 新增
  announcements?: AnnouncementConfig[];
  // ... 其余不变
}
```

- [ ] **Step 3: 修改 `src/constants/friends-config.ts`**，在文件末尾新增导出：

```typescript
import type { FcircleConfig } from '@lib/config/types';

// ... 现有代码不变

export const fcircleConfig: FcircleConfig = {
  allJsonUrl: yamlConfig.fcircle?.allJsonUrl ?? 'https://fc.081531.xyz/all.json',
};
```

---

### Task 2: CSS 样式文件 — `public/css/fcircle.css`

**Files:**
- Create: `public/css/fcircle.css`

完整还原 flatpaper `friends-feed.styl` 的手账风格。使用博客现有 CSS 变量（`var(--ink)`, `var(--muted)`, `var(--paper)`, `var(--dash)`, `var(--color-accent)` 等），暗色模式通过 `.dark` 前缀适配。

- [ ] **Step 1: 创建 `public/css/fcircle.css`**

```css
/* ============== FRIEND CIRCLE (fcircle) PAGE ============== */
/* Flatpaper hand-crafted notebook aesthetic                */
/* ========================================================== */

.fcircle-page {
  padding-bottom: 64px;
}

/* ---- Summary Bar ---- */

.fcircle-summary {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 18px;
}

.fcircle-summary__stat,
.fcircle-summary__updated,
.fcircle-summary__source {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 4px 10px;
  border: 1px dashed var(--dash);
  border-radius: 999px;
  background: var(--paper-warm);
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

.fcircle-summary__source {
  color: var(--color-accent-strong);
  transition: color 0.18s ease, border-color 0.18s ease, transform 0.18s ease;
}

.fcircle-summary__source:hover {
  color: var(--color-accent-strong);
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.dark .fcircle-summary__source {
  color: var(--color-accent-muted);
}

/* ---- State Messages ---- */

.fcircle-state {
  margin: 18px 0 8px;
  padding: 14px 16px;
  border: 1px dashed var(--dash);
  border-radius: 8px;
  background: var(--paper-warm);
  color: var(--muted);
  font-size: 13px;
  text-align: center;
}

.fcircle-state.is-error {
  color: #b35a4a;
  border-color: rgba(179, 90, 74, 0.34);
}

.dark .fcircle-state.is-error {
  color: #e39a8b;
  border-color: rgba(227, 154, 139, 0.32);
}

/* ---- Article Grid ---- */

.fcircle-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  align-items: stretch;
  gap: 16px;
  margin: 0;
  padding: 8px 0 0;
  list-style: none;
}

/* ---- Card ---- */

.fcircle-card {
  --feed-tilt: -0.25deg;
  --feed-tape: var(--tape-yellow, #f0d89e);
  --feed-tab: var(--tape-green, #b5cbac);
  --feed-tab-ink: #35533b;
  position: relative;
  display: grid;
  grid-template-columns: 58px minmax(0, 1fr);
  align-items: start;
  gap: 14px;
  height: 100%;
  min-height: 96px;
  padding: 19px 18px 16px 16px;
  border: 1px dashed var(--dash);
  border-radius: 8px;
  background:
    linear-gradient(90deg, transparent 0, transparent 54px, rgba(221, 208, 181, 0.42) 54px, rgba(221, 208, 181, 0.42) 55px, transparent 55px),
    repeating-linear-gradient(180deg, transparent 0 27px, rgba(221, 208, 181, 0.18) 27px 28px),
    var(--paper);
  box-shadow: 4px 5px 0 rgba(0, 0, 0, 0.08), var(--soft-shadow, 0 1px 3px rgba(0,0,0,0.06));
  isolation: isolate;
  transform: rotate(var(--feed-tilt));
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.fcircle-card:nth-child(4n+2) {
  --feed-tilt: 0.22deg;
  --feed-tape: var(--tape-pink, #e8b4b4);
  --feed-tab: var(--tape-blue, #a8c8e0);
  --feed-tab-ink: #2f4e66;
}

.fcircle-card:nth-child(4n+3) {
  --feed-tilt: -0.12deg;
  --feed-tape: var(--tape-green, #b5cbac);
  --feed-tab: var(--tape-yellow, #f0d89e);
  --feed-tab-ink: #6a5430;
}

.fcircle-card:nth-child(4n+4) {
  --feed-tilt: 0.3deg;
  --feed-tape: var(--tape-blue, #a8c8e0);
  --feed-tab: var(--tape-pink, #e8b4b4);
  --feed-tab-ink: #663f49;
}

/* Tape decoration */
.fcircle-card::before,
.fcircle-card::after {
  content: "";
  position: absolute;
  pointer-events: none;
}

.fcircle-card::before {
  top: -8px;
  left: 22px;
  z-index: 2;
  width: 38px;
  height: 15px;
  background-color: var(--feed-tape);
  background-image: repeating-linear-gradient(
    90deg,
    transparent 0 3px,
    rgba(0,0,0,0.06) 3px 4px
  );
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.12);
  filter: saturate(0.92);
  transform: rotate(-3deg);
}

/* Tab decoration */
.fcircle-card::after {
  top: 16px;
  right: -6px;
  z-index: -1;
  width: 6px;
  height: 48px;
  border: 1px dashed rgba(0, 0, 0, 0.12);
  border-left: 0;
  border-radius: 0 6px 6px 0;
  background: var(--feed-tab);
  box-shadow: 2px 3px 0 rgba(0, 0, 0, 0.08);
  transition: width 0.25s cubic-bezier(0.34, 1.56, 0.64, 1), right 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.fcircle-card:hover {
  transform: translateY(-3px) rotate(0deg);
  border-color: var(--color-accent);
  box-shadow: 6px 8px 0 rgba(0, 0, 0, 0.1);
}

.fcircle-card:hover::after {
  right: -14px;
  width: 14px;
}

/* Dark mode card */
.dark .fcircle-card {
  background:
    linear-gradient(90deg, transparent 0, transparent 54px, rgba(225, 230, 245, 0.1) 54px, rgba(225, 230, 245, 0.1) 55px, transparent 55px),
    repeating-linear-gradient(180deg, transparent 0 27px, rgba(225, 230, 245, 0.04) 27px 28px),
    var(--paper);
  box-shadow: 4px 5px 0 rgba(0, 0, 0, 0.18), var(--soft-shadow, 0 1px 3px rgba(0,0,0,0.06));
}

.dark .fcircle-card::before {
  box-shadow: 0 3px 8px rgba(0, 0, 0, 0.24);
}

.dark .fcircle-card::after {
  border-color: rgba(225, 230, 245, 0.1);
  box-shadow: 3px 4px 0 rgba(0, 0, 0, 0.16);
}

/* ---- Avatar ---- */

.fcircle-card__avatar-link {
  display: inline-grid;
  place-items: center;
  width: 58px;
  height: 58px;
  margin-top: 2px;
  border: 1px solid rgba(0, 0, 0, 0.12);
  border-radius: 8px;
  background: var(--paper-solid, var(--paper));
  box-shadow: 2px 3px 0 rgba(0, 0, 0, 0.08);
  transform: rotate(-2deg);
  transition: transform 0.22s ease, border-color 0.22s ease, box-shadow 0.22s ease;
}

.fcircle-card:hover .fcircle-card__avatar-link {
  border-color: var(--color-accent);
  box-shadow: 3px 5px 0 rgba(0, 0, 0, 0.1);
  transform: rotate(0deg) translateY(-1px);
}

.fcircle-card__avatar {
  display: inline-grid;
  place-items: center;
  width: 50px;
  height: 50px;
  border-radius: 6px;
  object-fit: cover;
  background: var(--color-accent-soft);
  color: var(--color-accent-strong);
  font-size: 18px;
  font-weight: 800;
}

img.fcircle-card__avatar {
  background: transparent;
}

.dark .fcircle-card__avatar-link {
  border-color: rgba(225, 230, 245, 0.12);
  background: var(--paper-warm, var(--paper));
  box-shadow: 2px 3px 0 rgba(0, 0, 0, 0.18);
}

.dark .fcircle-card:hover .fcircle-card__avatar-link {
  border-color: var(--color-accent-muted);
  box-shadow: 3px 5px 0 rgba(0, 0, 0, 0.22);
}

.dark .fcircle-card__avatar--text {
  color: var(--color-accent-muted);
}

/* ---- Card Body ---- */

.fcircle-card__body {
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
}

.fcircle-card__meta {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  gap: 6px 8px;
  color: var(--muted);
  font-size: 12px;
  line-height: 1.4;
}

.fcircle-card__author {
  max-width: 240px;
  min-width: 0;
  min-height: 24px;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--feed-tab);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--feed-tab-ink);
  font-weight: 700;
}

.dark .fcircle-card__author {
  color: var(--ink);
}

.fcircle-card__date {
  min-width: 0;
  padding: 0;
  border: none;
  background: transparent;
  font-size: 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fcircle-card__title {
  display: block;
  min-width: 0;
  margin-top: 1px;
  color: var(--ink);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.55;
  overflow-wrap: anywhere;
  text-decoration: none;
  transition: color 0.18s ease;
}

a.fcircle-card__title:hover {
  color: var(--color-accent-strong);
}

.dark a.fcircle-card__title:hover {
  color: var(--color-accent-muted);
}

/* ---- Load More Button ---- */

.fcircle-more {
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

.fcircle-more::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background: var(--paper-warm, var(--paper));
  z-index: -1;
  border-radius: 4px;
  box-shadow: inset 0 0 0 1px var(--dash);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}

.fcircle-more:hover,
.fcircle-more:focus-visible {
  color: var(--color-accent-strong);
  transform: translateY(-1px);
}

.fcircle-more:hover::before,
.fcircle-more:focus-visible::before {
  background: var(--color-accent-soft);
  box-shadow: inset 0 0 0 1px var(--color-accent);
}

.dark .fcircle-more::before {
  box-shadow: none;
}

/* ---- Responsive (≤640px) ---- */

@media (max-width: 640px) {
  .fcircle-list {
    grid-template-columns: 1fr;
  }

  .fcircle-card {
    grid-template-columns: 42px minmax(0, 1fr);
    gap: 10px;
    min-height: 84px;
    padding: 17px 12px 13px;
    transform: none;
  }

  .fcircle-card:hover {
    transform: translateY(-2px);
  }

  .fcircle-card::before {
    left: 16px;
  }

  .fcircle-card::after {
    top: 18px;
    right: -5px;
    width: 5px;
    height: 38px;
  }

  .fcircle-card:hover::after {
    right: -11px;
    width: 11px;
  }

  .fcircle-card__avatar-link,
  .fcircle-card__avatar {
    width: 42px;
    height: 42px;
  }

  .fcircle-card__avatar-link {
    border-radius: 7px;
  }

  .fcircle-card__avatar {
    width: 36px;
    height: 36px;
    border-radius: 5px;
    font-size: 15px;
  }

  .fcircle-card__author {
    max-width: 180px;
  }
}
```

---

### Task 3: React 组件 — `FriendCircle.tsx`

**Files:**
- Create: `src/components/friends/FriendCircle.tsx`

- [ ] **Step 1: 创建 `src/components/friends/FriendCircle.tsx`**

```tsx
import { useState, useEffect, useCallback } from 'react';

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
  return raw
    .map((item) => {
      const link = String(item?.link || '').trim();
      const title = String(item?.title || '').trim();
      if (!link || !title) return null;
      const key = link.replace(/\/+$/, '').toLowerCase();
      if (seen.has(key)) return null;
      seen.add(key);
      return {
        title,
        link,
        author: String(item.author || '').trim(),
        avatar: String(item.avatar || '').trim(),
        created: item.created,
        published: item.published,
        updated: item.updated,
      };
    })
    .filter(Boolean) as ArticleData[]
    .sort((a, b) => {
      const dateA = parseDate(a) || 0;
      const dateB = parseDate(b) || 0;
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
    return () => { cancelled = true; };
  }, [allJsonUrl]);

  const handleLoadMore = useCallback(() => {
    setShown((prev) => Math.min(prev + PAGE_SIZE, articles.length));
  }, [articles.length]);

  const handleAvatarError = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>, author: string) => {
      const img = e.currentTarget;
      // Replace img with text fallback
      const parent = img.parentElement;
      if (!parent) return;
      const span = document.createElement('span');
      span.className = 'fcircle-card__avatar fcircle-card__avatar--text';
      span.textContent = fallbackAvatarChar(author);
      parent.replaceChild(span, img);
    },
    []
  );

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
          <a href={allJsonUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
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
            {typeof stats.friends_num === 'number' && (
              <span className="fcircle-summary__stat">友链 {stats.friends_num}</span>
            )}
            {typeof stats.active_num === 'number' && (
              <span className="fcircle-summary__stat">活跃 {stats.active_num}</span>
            )}
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
          {typeof stats.friends_num === 'number' && (
            <span className="fcircle-summary__stat">友链 {stats.friends_num}</span>
          )}
          {typeof stats.active_num === 'number' && (
            <span className="fcircle-summary__stat">活跃 {stats.active_num}</span>
          )}
          {typeof stats.article_num === 'number' && (
            <span className="fcircle-summary__stat">文章 {stats.article_num}</span>
          )}
          {stats.last_updated_time && (
            <span className="fcircle-summary__updated">更新于 {stats.last_updated_time}</span>
          )}
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
                <span className="fcircle-card__avatar fcircle-card__avatar--text">
                  {fallbackAvatarChar(article.author)}
                </span>
              )}
            </a>
            <div className="fcircle-card__body">
              <div className="fcircle-card__meta">
                <span className="fcircle-card__author">{article.author || '未知'}</span>
                <time className="fcircle-card__date">{dateLabel(article)}</time>
              </div>
              <a
                className="fcircle-card__title"
                href={article.link}
                target="_blank"
                rel="noopener noreferrer"
              >
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
```

---

### Task 4: Astro 页面

**Files:**
- Create: `src/pages/fcircle.astro` (默认语言)
- Create: `src/pages/[lang]/fcircle.astro` (多语言)

- [ ] **Step 1: 创建 `src/pages/fcircle.astro`**

```astro
---
import FriendCircle from '@components/friends/FriendCircle';
import HomeSider from '@components/layout/HomeSider.astro';
import Cover from '@components/ui/cover/Cover.astro';
import { fcircleConfig } from '@constants/friends-config';
import { CONTENT_PADDING } from '@constants/layout';
import { siteConfig } from '@constants/site-config';
import Layout from '@layouts/Layout.astro';
import TwoColumnLayout from '@layouts/TwoColumnLayout.astro';
import { getLocaleFromUrl, t } from '@/i18n';

const locale = getLocaleFromUrl(Astro.url.pathname);
const title = `朋友圈 | ${siteConfig.title}`;
const description = '友链朋友圈 - 各友链博客的最新文章动态';
---

<link rel="stylesheet" href="/css/fcircle.css">

<Layout title={title} description={description}>
  <TwoColumnLayout>
    <Cover slot="cover" title="朋友圈" />
    <HomeSider slot="sider" />
    <div
      class={`bg-gradient-start shadow-box tablet:shadow-none flex flex-col gap-10 overflow-hidden ${CONTENT_PADDING.standard}`}
    >
      <div class="mt-4">
        <FriendCircle allJsonUrl={fcircleConfig.allJsonUrl} client:load />
      </div>
    </div>
  </TwoColumnLayout>
</Layout>
```

- [ ] **Step 2: 创建 `src/pages/[lang]/fcircle.astro`**

```astro
---
import { getLocaleStaticPaths } from '../_shared/utils';
import FcirclePage from '../fcircle.astro';
export const getStaticPaths = getLocaleStaticPaths;
---
<FcirclePage />
```

---

### Task 5: (可选) i18n 翻译 — 添加 `nav.fcircle` 键

**Files:**
- Modify: `src/i18n/translations/*.json` 或对应的翻译文件

- [ ] **Step 1: 查找 i18n 翻译文件路径，添加 nav.fcircle 键**

在 `src/i18n/` 目录下找到翻译文件，添加 `nav.fcircle` 的翻译值。例如中文为 `"朋友圈"`，英文为 `"Circle"`。

---

## 自检清单

1. **Spec 覆盖**：
   - ✅ 独立页面 `/fcircle` + `/[lang]/fcircle` — Task 4
   - ✅ flatpaper 手账风格 — Task 2
   - ✅ all.json 客户端 fetch — Task 3
   - ✅ 统计栏（友链数/活跃数/文章数/更新时间） — Task 3
   - ✅ 文章卡片（头像/作者/日期/标题） — Task 3
   - ✅ 加载更多（20 篇/页） — Task 3
   - ✅ 加载中/错误/空状态 — Task 3
   - ✅ 导航菜单添加 — Task 1
   - ✅ 配置层（site.yaml + types + config） — Task 1
   - ✅ 胶带/标签/笔记纸背景/旋转 — Task 2
   - ✅ 暗色模式 — Task 2
   - ✅ 响应式（≤640px 单列） — Task 2

2. **占位符扫描**：无 TBD/TODO 占位符

3. **类型一致性**：`FcircleConfig` 在 types.ts 定义，在 friends-config.ts 导出，FriendCircle 组件通过 props 接收 `allJsonUrl: string`
