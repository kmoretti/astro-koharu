# 友链朋友圈 (Friend Circle) 设计文档

> 日期: 2026-07-20
> 状态: 待实现

## 1. 概述

为博客新增「友链朋友圈」功能，展示各友链博客的最新 RSS 文章动态。基于 Friend-Circle-Lite 项目提供的 `all.json` 数据，采用 flatpaper 手账风格呈现，作为独立页面 `/fcircle` 运行。

## 2. 配置层

### 2.1 `config/site.yaml` 变更

在 `friends` 节之后新增 `fcircle` 节：

```yaml
# 友链朋友圈配置
fcircle:
  allJsonUrl: "https://fc.081531.xyz/all.json"  # Friend-Circle-Lite all.json 数据源
```

同时导航菜单新增 `/fcircle` 项：

```yaml
navigation:
  # ... 现有项保持不变
  - name: 朋友圈
    nameKey: nav.fcircle        # 需要新增 i18n 翻译
    path: /fcircle
    icon: ri:rss-fill
```

### 2.2 `src/lib/config/types.ts` 变更

新增 `FcircleConfig` 接口：

```typescript
export interface FcircleConfig {
  allJsonUrl: string;  // Friend-Circle-Lite all.json 数据源 URL
}
```

### 2.3 `src/constants/friends-config.ts` 变更

新增导出 `fcircleConfig`：

```typescript
export const fcircleConfig: FcircleConfig = {
  allJsonUrl: yamlConfig.fcircle?.allJsonUrl ?? 'https://fc.081531.xyz/all.json',
};
```

## 3. 数据格式

`all.json` 的数据结构（来自 Friend-Circle-Lite）：

```typescript
interface AllJsonPayload {
  statistical_data: {
    friends_num: number;      // 友链总数
    active_num: number;       // 活跃友链数
    article_num: number;      // 文章总数
    last_updated_time: string; // 最后更新时间，如 "2026-07-19 18:00"
  };
  article_data: Array<{
    title: string;            // 文章标题
    link: string;             // 文章链接
    author: string;           // 作者/站点名称
    avatar: string;           // 头像 URL
    created?: string;         // 创建时间
    published?: string;       // 发布时间
    updated?: string;         // 更新时间
  }>;
}
```

## 4. 页面结构

### 4.1 页面路由

- `/fcircle`（默认语言）
- `/[lang]/fcircle`（多语言）

使用 `TwoColumnLayout` + `HomeSider`，与现有页面保持一致。

### 4.2 Astro 页面（`fcircle.astro`）

```astro
---
// 获取配置，渲染布局骨架
// React 组件以 client:load 加载
---
<Layout>
  <TwoColumnLayout>
    <Cover slot="cover" title="朋友圈" />
    <HomeSider slot="sider" />
    <div class="...">
      <FriendCircle allJsonUrl={fcircleConfig.allJsonUrl} client:load />
    </div>
  </TwoColumnLayout>
</Layout>
```

## 5. 核心组件 `FriendCircle.tsx`

纯客户端 React 组件，通过 `client:load` 加载。

### 5.1 状态管理

| 状态 | 显示内容 |
|------|---------|
| `loading` | 加载中提示（"正在展开友链清册..."） |
| `loaded` | 统计栏 + 文章卡片网格 + 加载更多按钮 |
| `error` | 错误提示（ "数据加载失败" + 重试链接） |
| `empty` | 空状态提示（"暂无文章"） |

### 5.2 组件结构

```plain
┌─ Cover ─────────────────────────────────────┐
│  朋友圈                                       │
├─ Summary Bar ────────────────────────────────┤
│  [友链数 6]  [活跃 6]  [文章 42]  [更新于 ...] │
├─ Article Grid ───────────────────────────────┤
│  ┌────────────┐  ┌────────────┐  ┌──────────┐ │
│  │ 📄 文章卡片  │  │ 📄 文章卡片  │  │ 📄 文章卡片 │ │
│  │ (flatpaper  │  │ (flatpaper  │  │ (flatpaper │ │
│  │  手账风格)   │  │  手账风格)   │  │  手账风格)  │ │
│  └────────────┘  └────────────┘  └──────────┘ │
│  ┌────────────┐  ┌────────────┐               │
│  │ 📄 文章卡片  │  │ 📄 文章卡片  │               │
│  └────────────┘  └────────────┘               │
├─ Load More ───────────────────────────────────┤
│  [  加载更多  ]                                 │
└───────────────────────────────────────────────┘
```

### 5.3 统计栏（Summary Bar）

显示在卡片网格上方，四个统计信息：

| 元素 | 数据源 | 样式 |
|------|--------|------|
| 友链数 | `statistical_data.friends_num` | 虚线边框圆角 pill |
| 活跃数 | `statistical_data.active_num` | 虚线边框圆角 pill |
| 文章数 | `statistical_data.article_num` | 虚线边框圆角 pill |
| 更新时间 | `statistical_data.last_updated_time` | 虚线边框圆角 pill |

布局：`flex wrap gap-2`，每项 `border-dashed rounded-full px-2.5 py-1 text-xs`。

### 5.4 文章卡片（Article Card）

每张卡片的布局和装饰完全还原 flatpaper 的 friends-feed 设计：

**布局**：
```plain
┌─────────────────────────────────┐
│        [胶带]                    │
│  ┌──────┐  ┌──────────────────┐ │
│  │      │  │  [作者名]  [日期]  │ │[标签]
│  │ 头像  │  │                   │ │
│  │ 58px  │  │  文章标题 (链接)    │ │
│  │      │  │                   │ │
│  └──────┘  └──────────────────┘ │
└─────────────────────────────────┘
```

**CSS 装饰**：
- `::before` 胶带（washi tape）: 位于卡片左上角，4 种颜色变体（黄/粉/绿/蓝），有条纹纹理和阴影
- `::after` 标签（tab）: 位于卡片右侧，4 种颜色变体，悬停时向右展开
- 背景：左侧 54px 竖线分隔 + 横线笔记本内页效果
- 旋转：通过 CSS 变量 `--feed-tilt` 控制，`nth-child(4n+1)` 到 `(4n+4)` 各有不同角度

**悬停效果**：
- `translateY(-3px)` + `rotate(0deg)` 旋转归零
- 边框变为主题色（`var(--color-accent)`）
- 右侧标签向右展开（`right: -14px; width: 14px`）
- 阴影加深

**暗色模式**：
- 背景渐变透明度调整
- 胶带/标签阴影加深
- 文字颜色适配

**响应式（≤640px）**：
- 单列网格
- 头像缩小至 42px
- 卡片内边距减小
- 胶带/标签尺寸适配
- 取消卡片旋转

### 5.5 卡片内容渲染规则

| 字段 | 来源 | 行为 |
|------|------|------|
| 头像 | `article.avatar` | `<img>` 加载，失败时回退显示作者首字母 |
| 作者名 | `article.author` | 纯文本，背景色继承卡片的 feed-tab 颜色 |
| 日期 | `article.created/published/updated` | 优先 created → published → updated，格式原文显示 |
| 文章标题 | `article.title` | 链接到 `article.link`，`target="_blank"` |
| 文章链接 | `article.link` | 包裹标题 |

### 5.6 加载更多

- 初始显示 20 篇（由 `pageSize` 控制）
- 点击「加载更多」按钮追加下一批 20 篇
- 所有文章加载完后隐藏按钮
- 按钮样式：纸质感按钮（`box-shadow` + 虚线边框），悬停时变为主题色

### 5.7 交互流程

```plain
组件挂载
  │
  ├─ 显示 "正在展开友链清册..."（加载中状态）
  │
  ├─ fetch(allJsonUrl)
  │     │
  │     ├─ 成功 → 解析 payload
  │     │         ├─ 无 article_data → 显示 "暂无文章"
  │     │         └─ 有文章 → 渲染统计栏 + 前 20 篇文章
  │     │                     [加载更多] 按钮可见
  │     │
  │     └─ 失败 → 显示 "数据加载失败" + 链接到 all.json
  │
  └─ 用户点击「加载更多」
       └─ 追加渲染下 20 篇，直到全部显示
```

## 6. 样式文件

### 6.1 新建 `public/css/fcircle.css`

纯 CSS（非 Tailwind），还原 flatpaper `friends-feed.styl` 的全部样式：

- `.fcircle-page` — 页面容器
- `.fcircle-summary` — 统计栏（flex wrap，虚线边框 pills）
- `.fcircle-state` — 状态提示（加载中/错误/空）
- `.fcircle-list` — CSS Grid 卡片网格
- `.fcircle-card` — 单张卡片（grid 2 列布局 + 纸背景 + 装饰）
- `.fcircle-card__avatar-link` — 头像包裹链接
- `.fcircle-card__avatar` — 头像图片
- `.fcircle-card__body` — 文字内容区
- `.fcircle-card__meta` — 元信息行（作者 + 日期）
- `.fcircle-card__author` — 作者名
- `.fcircle-card__date` — 日期
- `.fcircle-card__title` — 文章标题
- `.fcircle-more` — 加载更多按钮
- 暗色模式（`.dark` 前缀）
- 响应式（`@media max-width: 640px`）

使用 CSS 变量（`var(--ink)`, `var(--muted)`, `var(--paper)` 等）与博客现有主题变量联动，确保暗色模式自动适配。

## 7. 导航配置

在 `site.yaml` 的 `navigation` 中添加：

```yaml
  - name: 朋友圈
    nameKey: nav.fcircle
    path: /fcircle
    icon: ri:rss-fill
```

如需多语言，在 i18n 翻译文件中添加 `nav.fcircle` 键。

## 8. 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `config/site.yaml` | 新增 `fcircle` 节 + navigation 新增朋友圈项 |
| 修改 | `src/lib/config/types.ts` | 新增 `FcircleConfig` 接口 |
| 修改 | `src/constants/friends-config.ts` | 新增导出 `fcircleConfig` |
| **新增** | `src/pages/fcircle.astro` | 默认语言朋友圈页面 |
| **新增** | `src/pages/[lang]/fcircle.astro` | 多语言朋友圈页面 |
| **新增** | `src/components/friends/FriendCircle.tsx` | 核心 React 组件 |
| **新增** | `public/css/fcircle.css` | flatpaper 手账风格 CSS |

## 9. 未变更范围

- 现有 `/friends` 友链页面及其组件（FriendGrid, FriendCard, FriendRequestForm）
- 评论系统
- i18n 翻译文件（只需新增 `nav.fcircle` 键）
- 友链数据加载逻辑（`friends-loader.ts`）

## 10. 边界情况处理

1. **all.json 请求失败**：显示错误提示 + 直接链接到 all.json 源文件
2. **article_data 为空数组**：显示空状态提示
3. **article_data 中某项字段缺失**：`normalizeFclArticles` 函数过滤无效项（无 title 或无 link 的跳过）
4. **头像加载失败**：回退显示作者首字母（同 flatpaper 实现）
5. **日期格式异常**：显示原文，不强制解析
6. **滚动加载/分页**：用「加载更多」按钮手动分页，不支持无限滚动
7. **卡片颜色多样性**：`nth-child(4n+1~4)` 循环不同颜色组合，保证视觉丰富度
