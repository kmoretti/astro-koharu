# 友链功能优化实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为友链页面增加远程数据源支持，新增网站截图和 RSS 订阅展示，优化卡片布局，集成延迟检测数据。

**Architecture:** 构建时在 Astro 页面 frontmatter 中异步获取远程数据 + 延迟数据，合并后作为 props 传入 React 组件。本地模式完全保持现有行为。使用 `yaml` 包解析远程 YAML。

**Tech Stack:** Astro 5.x, React 19, Motion, Tailwind CSS 4, `yaml` (已有依赖)

---

### Task 1: 扩展类型定义

**Files:**
- Modify: `src/lib/config/types.ts:99-119`

**变更内容：**
- `FriendLink` 新增 `siteshot?`, `feeds?`, `latency?`, `reachable?`, `updated?`
- `FriendsConfig` 新增 `dataSource?`, `remoteUrl?`, `latencyUrl?`

- [ ] **Step 1: 修改 `FriendLink` 接口，新增字段**

在 `src/lib/config/types.ts` 第 99-106 行，将：

```typescript
export interface FriendLink {
  site: string;
  url: string;
  owner: string;
  desc: string;
  image: string;
  color?: string;
}
```

改为：

```typescript
export interface FriendLink {
  site: string;
  url: string;
  owner: string;
  desc: string;
  image: string;
  color?: string;
  /** 网站截图 URL（远程数据源） */
  siteshot?: string;
  /** RSS 订阅地址 */
  feeds?: string;
  /** 站点延迟（秒，如 0.36），来自延迟检测 API */
  latency?: number;
  /** 站点是否可达 */
  reachable?: boolean;
  /** 最后更新日期 */
  updated?: string;
}
```

- [ ] **Step 2: 修改 `FriendsConfig` 接口，新增配置字段**

在第 116-119 行，将：

```typescript
export interface FriendsConfig {
  intro: FriendsIntro;
  data: FriendLink[];
}
```

改为：

```typescript
export interface FriendsConfig {
  /** 数据源选择: "local" | "remote"，默认 local */
  dataSource?: 'local' | 'remote';
  /** 远程友链数据 URL（dataSource 为 remote 时使用） */
  remoteUrl?: string;
  /** 站点延迟检测 URL（dataSource 为 remote 时使用） */
  latencyUrl?: string;
  intro: FriendsIntro;
  data: FriendLink[];
}
```

---

### Task 2: 更新 YAML 配置

**Files:**
- Modify: `config/site.yaml:214-251`

**变更内容：**
- 在 `friends:` 节新增 `dataSource`, `remoteUrl`, `latencyUrl`

- [ ] **Step 1: 在 `friends:` 节首行后插入新字段**

将：

```yaml
friends:
  intro:
```

改为：

```yaml
friends:
  dataSource: "local" # 数据源: "local"(本地) | "remote"(远程)
  remoteUrl: "https://friends-api.081531.xyz/source/_data/links.yml" # 远程友链数据 URL
  latencyUrl: "https://fc.081531.xyz/link.json" # 站点延迟检测 URL
  intro:
```

---

### Task 3: 更新 Friends Config 常量

**Files:**
- Modify: `src/constants/friends-config.ts`

**变更内容：**
- 导出 `friendsConfig` 对象（含 dataSource/remoteUrl/latencyUrl）
- 保持 `friendsData` 和 `friendsIntro` 向后兼容

- [ ] **Step 1: 重写 `src/constants/friends-config.ts`**

将整个文件内容替换为：

```typescript
import type { FriendLink, FriendsConfig, FriendsIntro } from '@lib/config/types';
import yamlConfig from '../../config/site.yaml';

// Re-export type for backwards compatibility
export type { FriendLink };

export const friendsConfig: FriendsConfig = {
  dataSource: yamlConfig.friends?.dataSource ?? 'local',
  remoteUrl: yamlConfig.friends?.remoteUrl,
  latencyUrl: yamlConfig.friends?.latencyUrl,
  intro: yamlConfig.friends?.intro ?? {
    title: 'Friends',
    subtitle: '',
    applyTitle: 'Apply for friend link',
    applyDesc: 'Leave a comment with the following format',
  },
  data: yamlConfig.friends?.data ?? [],
};

/** @deprecated Use friendsConfig.data instead */
export const friendsData: FriendLink[] = friendsConfig.data;

/** @deprecated Use friendsConfig.intro instead */
export const friendsIntro: FriendsIntro = friendsConfig.intro;
```

---

### Task 4: 创建 Friends Loader

**Files:**
- Create: `src/lib/friends-loader.ts`

**变更内容：**
- 构建时数据加载器
- 支持本地/远程两种模式
- 远程模式下拉取 YAML + JSON 并合并
- 颜色哈希生成函数

- [ ] **Step 1: 创建 `src/lib/friends-loader.ts`**

写入以下内容：

```typescript
import { YAML } from 'yaml';
import type { FriendLink, FriendsConfig } from '@lib/config/types';

/**
 * Generate a stable pastel HSL color from a string name.
 * Used when remote friends data has no color field.
 */
export function generateColorFromName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash = hash & hash; // Convert to 32-bit integer
  }
  const hue = ((hash % 360) + 360) % 360;
  return `hsl(${hue}, 65%, 78%)`;
}

/**
 * Field mapping from remote YAML link_list item to FriendLink.
 */
interface RemoteLinkItem {
  name: string;
  link: string;
  avatar: string;
  descr: string;
  siteshot?: string;
  feeds?: string;
  friendslink?: string;
}

/**
 * Field mapping from latency JSON link_data item.
 */
interface LatencyItem {
  name: string;
  link: string;
  latency: number;
  reachable: boolean;
  updated: string;
}

/**
 * Load friends data based on config.dataSource.
 *
 * - "local": returns friendsConfig.data directly (existing behavior).
 * - "remote": fetches remote YAML + latency JSON, merges, returns.
 */
export async function loadFriends(config: FriendsConfig): Promise<FriendLink[]> {
  if (config.dataSource !== 'remote' || !config.remoteUrl) {
    return config.data;
  }

  try {
    const [remoteItems, latencyItems] = await Promise.all([
      fetchRemoteYaml(config.remoteUrl),
      config.latencyUrl ? fetchLatencyJson(config.latencyUrl) : [],
    ]);

    return remoteItems.map((item) => {
      const latencyMatch = latencyItems.find(
        (l) => l.name === item.name && l.link === item.link,
      );
      return {
        site: item.name,
        url: item.link,
        owner: item.name,
        desc: item.descr,
        image: item.avatar,
        color: generateColorFromName(item.name),
        siteshot: item.siteshot,
        feeds: item.feeds,
        latency: latencyMatch?.latency,
        reachable: latencyMatch?.reachable,
        updated: latencyMatch?.updated,
      };
    });
  } catch (err) {
    console.error('[friends-loader] Failed to load remote friends data:', err);
    console.warn('[friends-loader] Falling back to local friends data.');
    return config.data;
  }
}

async function fetchRemoteYaml(url: string): Promise<RemoteLinkItem[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch remote YAML: ${response.status}`);
  }
  const text = await response.text();
  const parsed = YAML.parse(text);

  // The remote YAML has structure: [{ class_name, class_desc, link_list: [...] }]
  // Extract link_list from each group and flatten
  const groups = Array.isArray(parsed) ? parsed : [parsed];
  const items: RemoteLinkItem[] = [];
  for (const group of groups) {
    if (group.link_list && Array.isArray(group.link_list)) {
      items.push(...group.link_list);
    }
  }
  return items;
}

async function fetchLatencyJson(url: string): Promise<LatencyItem[]> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch latency data: ${response.status}`);
  }
  const data = await response.json();
  return data.link_data ?? [];
}
```

- [ ] **Step 2: 确认 `yaml` 包已在 dependencies 中**

在项目根目录运行：

```bash
cd e:\kmoretti-github\astro-koharu\blog
pnpm ls yaml --depth 0
```

预期输出应包含 `yaml@^2.8.2`。

---

### Task 5: 重构 FriendsGrid 组件——支持 props 传递数据

**Files:**
- Modify: `src/components/friends/FriendsGrid.tsx`

**变更内容：**
- 不再直接 `import { friendsData }`
- 改为接收 `friends: FriendLink[]` prop
- 移除 `client:load` 依赖（由 Astro 页面传递数据）

- [ ] **Step 1: 重写 `FriendsGrid.tsx`**

将整个文件替换为：

```typescript
import { ErrorBoundary, ErrorFallback } from '@components/common';
import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { microDampingPreset } from '@constants/anim/spring';
import type { FriendLink } from '@constants/friends-config';
import { m } from 'motion/react';
import FriendCard from './FriendCard';

interface FriendsGridProps {
  friends: FriendLink[];
}

export default function FriendsGrid({ friends }: FriendsGridProps) {
  return (
    <LazyMotionProvider>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <div className="w-full">
          {/* Grid Container */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-4 xl:grid-cols-4 xl:gap-6">
            {friends.map((friend, index) => (
              <FriendCard key={friend.url} friend={friend} index={index} />
            ))}
          </div>

          {/* Empty State */}
          {friends.length === 0 && (
            <m.div
              className="flex min-h-[300px] flex-col items-center justify-center text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, ...microDampingPreset }}
            >
              <h3 className="mb-2 font-bold text-3xl text-gray-700 dark:text-gray-300">The Void is Empty</h3>
              <p className="text-gray-500 text-lg dark:text-gray-400">Be the first to connect!</p>
            </m.div>
          )}
        </div>
      </ErrorBoundary>
    </LazyMotionProvider>
  );
}
```

---

### Task 6: 重构 FriendCard 组件——新布局

**Files:**
- Modify: `src/components/friends/FriendCard.tsx`

**变更内容：**
- 保留磁吸 3D 倾斜、聚光灯、border glow 动画
- 布局从垂直居中改为左侧图文混合（头像 + 截图 + 文字 + 延迟/RSS）
- 新增 `siteshot` 渲染、`feeds` 图标、延迟数据显示
- 移除顶部渐变色彩条

- [ ] **Step 1: 重写 `FriendCard.tsx`**

将整个文件替换为：

```typescript
import { LazyMotionProvider } from '@components/common/LazyMotionProvider';
import { microDampingPreset } from '@constants/anim/spring';
import type { FriendLink } from '@constants/friends-config';
import { useIsMounted } from '@hooks/useIsMounted';
import { useStore } from '@nanostores/react';
import { m, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'motion/react';
import { type MouseEvent, useRef } from 'react';
import { cn, normalizeHexColor } from '@/lib/utils';
import { christmasEnabled } from '@/store/christmas';

interface FriendCardProps {
  friend: FriendLink;
  index: number;
}

interface CSSCustomProperties extends React.CSSProperties {
  '--card-color'?: string;
}

const DEFAULT_COLOR = '#ffc0cb';
const DEFAULT_AVATAR = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg width="100%" height="100%" viewBox="0 0 100 100" version="1.1" xmlns="http://www.w3.org/2000/svg">
  <rect width="100" height="100" fill="#ffc0cb"/>
  <circle cx="30" cy="45" r="6" fill="#fff"/>
  <circle cx="70" cy="45" r="6" fill="#fff"/>
  <path d="M 35 65 Q 50 75 65 65" stroke="#fff" stroke-width="4" fill="none" stroke-linecap="round"/>
  <circle cx="20" cy="55" r="6" fill="#ff9eb5" opacity="0.5"/>
  <circle cx="80" cy="55" r="6" fill="#ff9eb5" opacity="0.5"/>
</svg>
`)}`;

/**
 * Format latency value for display.
 */
function formatLatency(latency: number): string {
  if (latency < 0.5) return `${Math.round(latency * 1000)} ms`;
  return `${latency.toFixed(1)} s`;
}

/**
 * Get color class and text for latency display.
 */
function getLatencyDisplay(latency?: number, reachable?: boolean): { color: string; text: string } | null {
  if (reachable === false) return { color: 'text-red-500', text: '不可达' };
  if (latency === undefined || latency === null) return null;
  if (latency < 0.5) return { color: 'text-green-500', text: formatLatency(latency) };
  if (latency <= 2.0) return { color: 'text-yellow-500', text: formatLatency(latency) };
  return { color: 'text-red-500', text: formatLatency(latency) };
}

export default function FriendCard({ friend, index }: FriendCardProps) {
  const cardRef = useRef<HTMLAnchorElement>(null);
  const isMounted = useIsMounted();
  const isChristmasEnabled = useStore(christmasEnabled);

  // Motion values for magnetic hover
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [15, -15]), microDampingPreset);
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-15, 15]), microDampingPreset);

  // Spotlight effect
  const sheenX = useTransform(x, [-0.5, 0.5], ['0%', '100%']);
  const sheenY = useTransform(y, [-0.5, 0.5], ['0%', '100%']);

  const spotlight = useMotionTemplate`radial-gradient(
    600px circle at ${sheenX} ${sheenY},
    rgba(255,255,255,0.15),
    transparent 40%
  )`;

  const handleMouseMove = (e: MouseEvent<HTMLAnchorElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) / rect.width);
    y.set((e.clientY - centerY) / rect.height);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const cardColor = normalizeHexColor(friend.color || DEFAULT_COLOR);
  const avatarImage = friend.image || DEFAULT_AVATAR;
  const latencyDisplay = getLatencyDisplay(friend.latency, friend.reachable);

  return (
    <LazyMotionProvider>
      <m.a
        href={friend.url}
        target="_blank"
        ref={cardRef}
        className={cn(
          'friend-card group !no-underline hover:!no-underline relative block w-full cursor-pointer select-none transition-transform duration-300 ease-easeOut',
          { 'z-5': isMounted && isChristmasEnabled },
        )}
        style={{ perspective: '1000px' }}
        transition={{
          duration: 0.5,
          delay: index * 0.05,
          ...microDampingPreset,
        }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        <m.div
          className="relative w-full rounded-2xl bg-white p-3 shadow-xl ring-1 ring-gray-900/5 dark:bg-gray-800 dark:ring-white/10"
          style={{
            transformStyle: 'preserve-3d',
            rotateX,
            rotateY,
          }}
        >
          {/* ── Top area: avatar + siteshot side by side ── */}
          <div className="mb-3 flex gap-3">
            {/* Avatar */}
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border-4 border-white bg-white shadow-lg dark:border-gray-800 dark:bg-gray-800">
              <img
                src={avatarImage}
                alt={friend.owner}
                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                loading="lazy"
              />
            </div>

            {/* Site screenshot */}
            <div className="relative flex-1 overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-700">
              {friend.siteshot ? (
                <img
                  src={friend.siteshot}
                  alt={`${friend.site} screenshot`}
                  className="h-24 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                  onError={(e) => {
                    const target = e.currentTarget;
                    target.style.display = 'none';
                    const fallback = target.nextElementSibling;
                    if (fallback) fallback.classList.remove('hidden');
                  }}
                />
              ) : null}
              {/* Fallback when no siteshot or load fails */}
              <div
                className={cn(
                  'flex h-24 w-full items-center justify-center',
                  friend.siteshot ? 'hidden' : '',
                )}
                style={{ background: `linear-gradient(135deg, ${cardColor}, ${cardColor}80)` }}
              >
                <span className="font-bold text-3xl text-white/80">
                  {friend.site.charAt(0)}
                </span>
              </div>
            </div>
          </div>

          {/* ── Text content ── */}
          <div className="flex flex-col gap-1 px-1">
            <div className="flex items-center gap-2">
              <p
                className="truncate font-bold text-gray-900 text-sm transition-colors group-hover:text-(--card-color) dark:text-white"
                style={{ '--card-color': cardColor } as CSSCustomProperties}
              >
                {friend.site}
              </p>
              {friend.owner !== friend.site && (
                <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 font-medium text-[10px] text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                  {friend.owner}
                </span>
              )}
            </div>
            <p className="line-clamp-2 text-xs text-gray-600 dark:text-gray-300">{friend.desc}</p>
          </div>

          {/* ── Footer: latency + feeds + updated ── */}
          <div className="mt-2 flex items-center gap-3 px-1">
            {/* Latency */}
            {latencyDisplay && (
              <span className={`flex items-center gap-1 font-medium text-[11px] ${latencyDisplay.color}`}>
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-current" />
                {latencyDisplay.text}
              </span>
            )}

            {/* RSS Feed */}
            {friend.feeds && (
              <a
                href={friend.feeds}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-medium text-[11px] text-orange-500 transition-colors hover:text-orange-600"
                onClick={(e) => e.stopPropagation()}
              >
                <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.18 15.64a2.18 2.18 0 0 1 2.18 2.18C8.36 19 7.38 20 6.18 20C5 20 4 19 4 17.82a2.18 2.18 0 0 1 2.18-2.18M4 4.44A15.56 15.56 0 0 1 19.56 20h-2.83A12.73 12.73 0 0 0 4 7.27V4.44m0 5.66a9.9 9.9 0 0 1 9.9 9.9h-2.83A7.07 7.07 0 0 0 4 12.93v-2.83Z" />
                </svg>
                RSS
              </a>
            )}

            {/* Updated date */}
            {friend.updated && (
              <span className="ml-auto font-medium text-[10px] text-gray-400 dark:text-gray-500">
                {friend.updated}
              </span>
            )}
          </div>

          {/* Spotlight Overlay */}
          <m.div
            className="pointer-events-none absolute inset-0 z-10 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
            style={{ background: spotlight }}
          />

          {/* Border Glow */}
          <div
            className="absolute inset-0 -z-10 rounded-2xl opacity-0 blur-xl transition-opacity duration-500 group-hover:opacity-60"
            style={{ background: cardColor }}
          />
        </m.div>
      </m.a>
    </LazyMotionProvider>
  );
}
```

---

### Task 7: 更新友链页面——build-time 数据加载

**Files:**
- Modify: `src/pages/friends.astro`
- Modify: `src/pages/[lang]/friends.astro`

**变更内容：**
- 在 frontmatter 中调用 `loadFriends()`
- 传递 `friends` 给 `FriendsGrid`

- [ ] **Step 1: 修改 `src/pages/friends.astro`**

将 frontmatter 和数据传递修改为：

```astro
---
import FriendRequestForm from '@components/friends/FriendRequestForm';
import FriendsGrid from '@components/friends/FriendsGrid';
import HomeSider from '@components/layout/HomeSider.astro';
import Cover from '@components/ui/cover/Cover.astro';
import { CONTENT_PADDING } from '@constants/layout';
import { friendsConfig } from '@constants/friends-config';
import { siteConfig } from '@constants/site-config';
import { loadFriends } from '@lib/friends-loader';
import Layout from '@layouts/Layout.astro';
import TwoColumnLayout from '@layouts/TwoColumnLayout.astro';
import { Comment } from '@/components/comment';
import { getLocaleFromUrl, t } from '@/i18n';

const locale = getLocaleFromUrl(Astro.url.pathname);
const title = `${t(locale, 'friends.title')} | ${siteConfig.title}`;
const description = t(locale, 'friends.title');
const friends = await loadFriends(friendsConfig);
---

<Layout title={title} description={description}>
  <TwoColumnLayout>
    <Cover slot="cover" title={t(locale, 'friends.title')} />
    <HomeSider slot="sider" />
    <div
      class={`bg-gradient-start shadow-box tablet:shadow-none flex flex-col gap-10 overflow-hidden ${CONTENT_PADDING.standard}`}
    >
      <div class="mt-4">
        <FriendsGrid friends={friends} client:load />
      </div>
      <div class="mb-4">
        <FriendRequestForm client:visible />
        <Comment />
      </div>
    </div>
  </TwoColumnLayout>
</Layout>
```

注意：`FriendsGrid` 保留 `client:load` 指令，因为 Motion 动画和鼠标事件处理器需要在客户端 hydrate。数据在 Astro 构建时获取并序列化为 HTML，hydrate 时 React 组件直接读取序列化的 props。

- [ ] **Step 2: 确认 `src/pages/[lang]/friends.astro` 无需修改**

该文件只是根 `friends.astro` 的代理，数据流由根页面处理。

---

### Task 8: 构建验证

- [ ] **Step 1: 运行 lint 检查**

```bash
cd e:\kmoretti-github\astro-koharu\blog
pnpm lint:fix
```

预期：所有文件通过 lint。

- [ ] **Step 2: 运行类型检查**

```bash
pnpm check
```

预期：无类型错误。

- [ ] **Step 3: 运行构建**

```bash
pnpm build
```

预期：构建成功，`dist/friends/index.html` 和 `dist/en/friends/index.html` 生成。

- [ ] **Step 4: 本地模式验证**

用 `pnpm dev` 启动开发服务器，访问 `/friends` 页面。
- 卡片布局应为左侧头像 + 截图 + 右侧文字
- 磁吸 hover 效果正常工作
- 延迟/RSS 不显示（本地模式无此数据）

- [ ] **Step 5: 远程模式验证**

将 `config/site.yaml` 中 `dataSource: "remote"`，重新 `pnpm dev`，访问 `/friends` 页面。
- 卡片显示来自远程 API 的友链数据
- 延迟数据显示在卡片底部
- RSS 图标可点击
- 切换回 `dataSource: "local"` 恢复本地数据
