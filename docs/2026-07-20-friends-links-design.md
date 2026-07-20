# 友链功能优化设计文档

> 日期: 2026-07-20
> 状态: 待实现

## 1. 概述

为友链页面增加远程数据源支持，新增网站截图（siteshot）和 RSS 订阅（feeds）字段展示，优化友链卡片样式，集成站点延迟检测数据。

## 2. 配置层

### 2.1 `config/site.yaml` 变更

在 `friends` 节新增：

```yaml
friends:
  # 数据源选择: "local" | "remote"
  dataSource: "local"
  # 远程友链数据 URL（dataSource 为 remote 时使用）
  remoteUrl: "https://friends-api.081531.xyz/source/_data/links.yml"
  # 站点延迟检测 URL（dataSource 为 remote 时使用）
  latencyUrl: "https://fc.081531.xyz/link.json"
  intro:
    title: 友情链接
    # ... 保持不变
  data:
    # ... 本地数据不变
```

- `dataSource: "local"` — 完全保持现有行为，读 `friends.data`
- `dataSource: "remote"` — 构建时拉取远程数据 + 延迟数据

### 2.2 `src/lib/config/types.ts` 变更

扩展 `FriendsConfig` 和 `FriendLink`：

```typescript
export interface FriendsConfig {
  dataSource?: 'local' | 'remote';     // 新增，默认 local
  remoteUrl?: string;                     // 新增
  latencyUrl?: string;                    // 新增
  intro: FriendsIntro;
  data: FriendLink[];
}

export interface FriendLink {
  site: string;      // 远程 name
  url: string;       // 远程 link
  owner: string;     // 远程无此字段，= site
  desc: string;      // 远程 descr
  image: string;     // 远程 avatar
  color?: string;    // 远程无此字段，通过 name 哈希生成
  // 以下为新增字段
  siteshot?: string; // 网站截图 URL
  feeds?: string;    // RSS 订阅地址
  // 延迟检测数据（仅 remote 模式）
  latency?: number;  // 秒，如 0.36
  reachable?: boolean;
  updated?: string;  // 最后更新日期
}

export interface FriendsIntro {
  title: string;
  subtitle?: string;
  applyTitle?: string;
  applyDesc?: string;
  exampleYaml?: string;
}
```

## 3. 数据加载层

### 3.1 新增 `src/lib/friends-loader.ts`

构建时数据加载器，职责：

1. 根据 `dataSource` 决定数据来源
2. local 模式：直接返回 `friends-config.ts` 的数据
3. remote 模式：
   - 用 `fetch()` 拉取 `remoteUrl` 的 YAML
   - 用 `fetch()` 拉取 `latencyUrl` 的 JSON
   - 解析 YAML（使用 `js-yaml` 或项目现有 YAML 工具）
   - 按 `name` + `link` 匹配延迟数据
   - 合并为 `FriendLink[]` 返回

```typescript
// 核心接口
export async function loadFriends(config: FriendsConfig): Promise<FriendLink[]>;

// 本地模式
function loadLocalFriends(data: FriendLink[]): FriendLink[];

// 远程模式
async function loadRemoteFriends(
  remoteUrl: string,
  latencyUrl: string,
): Promise<FriendLink[]>;

// 颜色生成：从 name 哈希稳定的 HSL 色
export function generateColorFromName(name: string): string;
```

### 3.2 数据合并逻辑

```typescript
// remote YAML → FriendLink 映射
{
  site: item.name,         // name → site
  url: item.link,          // link → url
  owner: item.name,        // name → owner（owner = site）
  desc: item.descr,        // descr → desc
  image: item.avatar,      // avatar → image
  color: generateColorFromName(item.name),
  siteshot: item.siteshot,
  feeds: item.feeds,
}

// latency JSON → 合并到 FriendLink
// 匹配条件：name + link 一致
// 合并字段：latency, reachable, updated
```

### 3.3 调用位置

在 `FriendsGrid` 组件中（构建时执行）：

```typescript
// Astro 组件内调用
const friends = await loadFriends(friendsConfig);
```

对 `local` 模式，现有数据流完全不变。

## 4. 组件变更

### 4.1 `FriendCard.tsx` — 重构

**保留**：
- 磁吸 3D 倾斜效果（`useMotionValue` + `useSpring` + `rotateX/rotateY`）
- 聚光灯效果（`radial-gradient` spotlight）
- Border glow 效果
- Motion 入场动画

**布局变更**（从垂直居中 → 左侧图文混合）：

```plain
┌────────────────────────────────────┐
│ ┌──────┐  ┌─────────────────────┐  │
│ │      │  │                     │  │
│ │ 头像  │  │  网站截图 (siteshot) │  │
│ │ 56px  │  │  h-24 rounded-lg   │  │
│ │      │  │                     │  │
│ └──────┘  └─────────────────────┘  │
│                                     │
│  站点名 · 站长 (font-bold text-base) │
│  描述文字 (text-sm text-secondary)  │
│                                     │
│  📡 360ms    📢 RSS    更新: 7天前  │
│  (按延迟着色)  (feeds图标)          │
└────────────────────────────────────┘
```

**新增**：
- `siteshot` 图片渲染（带 rounded-lg + object-cover）
- `feeds` 图标按钮（链接到 RSS 地址）
- 延迟数据展示区域（底部，与 feeds 同行）
- 卡片颜色自动生成（当远程数据无 color 时）
- `siteshot` 加载失败时的 fallback（显示纯色区域）

**删除**：
- 顶部渐变色彩条（被左侧图文布局取代）

### 4.2 `FriendsGrid.tsx` — 微调

- `client:load` → 改为在服务端构建时渲染（移除 client directive，使用 Astro 构建时数据注入）
- Grid: `grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4`
- 传递完整的 `FriendLink[]`（含新增字段）

### 4.3 `FriendRequestForm.tsx` — 不变

申请表单的逻辑和样式保持不变。

## 5. 延迟显示规则

| 条件 | 颜色 | 显示文本 |
|------|------|---------|
| `latency < 0.5` | `text-green-500` | `{latency*1000} ms` |
| `0.5 ≤ latency ≤ 2.0` | `text-yellow-500` | `{latency.toFixed(1)} s` |
| `latency > 2.0` | `text-red-500` | `{latency.toFixed(1)} s` |
| `reachable === false` | `text-red-500` | `不可达` |
| 无延迟数据 | 不显示 | — |

## 6. 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `config/site.yaml` | 新增 dataSource/remoteUrl/latencyUrl 字段 |
| 修改 | `src/lib/config/types.ts` | 扩展 FriendLink、FriendsConfig |
| 修改 | `src/constants/friends-config.ts` | 导出 dataSource 配置 |
| **新增** | `src/lib/friends-loader.ts` | 构建时数据加载器 |
| 修改 | `src/components/friends/FriendCard.tsx` | 重构卡片布局，新增截图/feeds/延迟 |
| 修改 | `src/components/friends/FriendsGrid.tsx` | 适配新数据流 |
| 修改 | `src/pages/friends.astro` | 适配构建时数据 |
| 修改 | `src/pages/[lang]/friends.astro` | 适配构建时数据 |

## 7. 未变更范围

- 友链申请表单（`FriendRequestForm.tsx`）
- 评论系统（`Comment` 组件）
- 友链页面整体布局（TwoColumnLayout + HomeSider）
- 现有本地数据格式和读取逻辑
- 国际化翻译文件

## 8. 边界情况处理

1. **远程数据获取失败**：fallback 到本地数据（如果有），否则显示空状态
2. **延迟 API 获取失败**：不显示延迟信息，卡片正常渲染
3. **siteshot 图片加载失败**：显示纯色占位区域 + 站点首字母
4. **feeds 为空**：不显示 RSS 图标
5. **延迟数据中部分站点不匹配**：不匹配的站点不显示延迟
6. **远程 YAML 格式异常**：try-catch 报错，回退到本地数据
