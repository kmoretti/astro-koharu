# astro-koharu Code Wiki

> 项目路径: `e:\kmoretti-github\astro-koharu\blog\`
>
> 本文档面向开发者，提供项目代码层面的结构化参考。与 `docs/overview/` 系列文档互补，本文档侧重模块职责、关键接口、数据流和依赖关系。

---

## 目录

1. [项目概述](#1-项目概述)
2. [整体架构](#2-整体架构)
3. [目录结构与模块职责](#3-目录结构与模块职责)
4. [核心模块详解](#4-核心模块详解)
   - [4.1 配置系统](#41-配置系统)
   - [4.2 内容系统](#42-内容系统)
   - [4.3 Markdown 插件管线](#43-markdown-插件管线)
   - [4.4 组件系统](#44-组件系统)
   - [4.5 状态管理](#45-状态管理)
   - [4.6 国际化系统](#46-国际化系统)
   - [4.7 工具库](#47-工具库)
5. [关键数据流](#5-关键数据流)
6. [依赖关系与约束](#6-依赖关系与约束)
7. [项目运行与开发命令](#7-项目运行与开发命令)
8. [CMS 子系统](#8-cms-子系统)
9. [构建时脚本](#9-构建时脚本)
10. [常见开发任务](#10-常见开发任务)

---

## 1. 项目概述

**astro-koharu**（小春日和）是一个基于 Astro 5.x 的现代化静态博客系统，从 Hexo Shoka 主题迁移而来。

| 属性 | 值 |
|------|-----|
| 框架 | Astro 5.x + React 19 |
| 样式 | Tailwind CSS 4.x |
| 包管理 | pnpm 9.15+ |
| 语言 | TypeScript (strict) |
| 状态管理 | Nanostores |
| 搜索 | Pagefind (静态全文搜索) |
| 动画 | Motion (Framer Motion 继任者) |
| 许可 | AGPL-3.0 |

---

## 2. 整体架构

### 2.1 架构分层

```plain
┌─────────────────────────────────────────────────────────┐
│                    Pages (路由层)                         │
│  src/pages/ —— 文件路由, getStaticPaths 生成静态页面     │
├─────────────────────────────────────────────────────────┤
│                  Components (组件层)                      │
│  src/components/ —— Astro 组件 (静态) + React 组件 (交互) │
├─────────────────────────────────────────────────────────┤
│                   Hooks (逻辑层)                          │
│  src/hooks/ —— React 自定义 Hooks                       │
├─────────────────────────────────────────────────────────┤
│          Lib (工具层) + Store (状态层)                    │
│  src/lib/ —— 纯函数工具集                                │
│  src/store/ —— Nanostores 全局状态                       │
├─────────────────────────────────────────────────────────┤
│               Constants (常量层)                          │
│  src/constants/ —— 配置常量、枚举、路由定义               │
├─────────────────────────────────────────────────────────┤
│              Types (类型层)                               │
│  src/types/ —— TypeScript 类型定义                       │
└─────────────────────────────────────────────────────────┘
```

### 2.2 Astro Islands 架构

页面默认生成**纯静态 HTML**，只有标记了 `client:*` 指令的 React 组件才会在客户端加载 JS。

**客户端指令使用分布**：

| 指令 | 加载时机 | 使用场景 |
|------|---------|---------|
| `client:load` | 页面加载立即 | 主题切换、导航、搜索 |
| `client:idle` | 浏览器空闲 | 菜单图标、非关键交互 |
| `client:visible` | 滚动到视口 | 图表、评论、底部组件 |
| `client:media` | 媒体查询匹配 | 响应式功能 |
| `client:only` | 仅客户端 | 依赖浏览器 API 的组件 |

### 2.3 构建产物

```plain
pnpm build → dist/
├── index.html
├── post/[slug]/index.html        # 每篇文章独立 HTML
├── posts/[page]/index.html       # 分页列表
├── categories/[...slug]/index.html
├── tags/[tag]/index.html
├── _astro/                       # JS/CSS bundles
└── pagefind/                     # Pagefind 搜索索引
```

---

## 3. 目录结构与模块职责

### 3.1 顶层目录

| 目录/文件 | 职责 |
|-----------|------|
| `src/` | 主要源码 |
| `cms/` | 独立本地 CMS 应用（React + Vite + Hono） |
| `config/` | YAML 格式的站点配置（`site.yaml`、`i18n-content.yaml`） |
| `public/` | 静态资源（字体、图片），直接复制到构建输出 |
| `scripts/` | Koharu CLI 工具 |
| `docker/` | Docker 部署配置 |
| `docs/` | 项目文档（含本文档） |

### 3.2 `src/` 源码目录

| 目录 | 职责 |
|------|------|
| `src/components/` | 60+ 组件，按功能分 14 个子目录 |
| `src/content/` | Astro Content Collections 配置 + 博客文章 |
| `src/layouts/` | 3 个布局模板 |
| `src/pages/` | 文件路由页面 |
| `src/lib/` | 工具函数库（15+ 子模块） |
| `src/hooks/` | 约 24 个 React 自定义 Hooks |
| `src/store/` | 8 个 Nanostores 状态模块 |
| `src/constants/` | 9 个常量/配置模块 |
| `src/styles/` | CSS 样式（Tailwind + 主题 + 组件样式） |
| `src/types/` | TypeScript 类型定义 |
| `src/i18n/` | 国际化翻译系统 |
| `src/scripts/` | 构建时生成脚本 |
| `src/assets/` | 构建时生成的资产（LQIP、相似度数据、摘要） |

### 3.3 组件子目录

| 目录 | 组件数量 | 描述 |
|------|---------|------|
| `components/layout/` | ~15 | Header/Footer/Navigator/Search/TableOfContents 等布局组件 |
| `components/post/` | ~12 | 文章列表、卡片、分页、相关文章、系列导航 |
| `components/markdown/` | ~20 | 代码块、音视频播放器、加密块、练习题、图表、灯箱 |
| `components/comment/` | ~6 | 评论系统适配（Giscus/Waline/Twikoo/Remark42） |
| `components/ui/` | ~12 | shadcn/ui 风格通用组件（Button/Dialog/Badge/Switch） |
| `components/theme/` | 1 | 主题切换 |
| `components/common/` | 3 | ErrorBoundary、LazyMotionProvider、CustomContent |
| `components/friends/` | - | 友链 |
| `components/bgm/` | - | 背景音乐播放器 |
| `components/category/` | - | 分类展示 |
| `components/embed/` | - | Tweet/CodePen 等嵌入 |
| `components/settings/` | - | 用户设置面板 |
| `components/christmas/` | - | 圣诞特效（雪花、彩灯） |

---

## 4. 核心模块详解

### 4.1 配置系统

配置分为两层：**YAML 配置**（运行时/构建时通用）+ **TypeScript 常量**（编译时）。

#### 4.1.1 YAML 配置 (config/)

| 文件 | 模块路径 | 内容 |
|------|---------|------|
| `config/site.yaml` | `src/lib/config/site.ts` | 站点信息、导航、社交、友链、公告、评论、分析、圣诞特效等一切站点级配置 |
| `config/i18n-content.yaml` | `src/lib/config/i18n-content.ts` | 分类名、系列标签、精选分类描述的多语言翻译 |
| `config/cms.yaml` | `cms` 子项目 | CMS 端口等配置 |

YAML 通过 `@rollup/plugin-yaml` 在 Vite 中直接导入为 JS 对象。

#### 4.1.2 TypeScript 常量 (src/constants/)

| 文件 | 导出内容 | 说明 |
|------|---------|------|
| `site-config.ts` | `siteConfig` | 从 YAML 读取并整理的站点配置对象 |
| `router.ts` | `routerConfig` | 导航路由树定义 |
| `enum.ts` | `HomeSiderType`, `HomeSiderSegmentType` | 枚举常量 |
| `category.ts` | `categoryMap` | 分类名 ↔ URL Slug 映射 |
| `announcements.ts` | `announcements` | 公告列表 |
| `layout.ts` | 布局相关常量 | 布局断点、尺寸 |
| `design-tokens.ts` | 设计令牌 | 颜色、间距等设计系统值 |
| `anim/spring.ts` | 弹簧动画预设 | Motion 动画参数 |
| `content-config.ts` | 内容配置 | 内容处理开关 |
| `friends-config.ts` | 友链配置 | 友链列表数据 |
| `code-block.ts` | 代码块配置 | 代码增强功能配置 |

### 4.2 内容系统

#### 4.2.1 内容集合 Schema (`src/content/config.ts`)

```typescript
const blogCollection = defineCollection({
  schema: z.object({
    title: z.string(),           // 文章标题（必填）
    description: z.string().optional(), // SEO 描述
    date: dateInSiteTimezone,    // 发布日期（自动时区处理）
    updated: dateInSiteTimezone.optional(), // 更新日期
    cover: z.string().optional(), // 封面图路径
    tags: z.array(z.string()).optional(), // 标签
    categories: z.array(z.string())       // 分类（兼容多层数组）
      .or(z.array(z.array(z.string())))
      .optional(),
    sticky: z.boolean().optional(), // 置顶
    draft: z.boolean().optional(),  // 草稿
    password: z.string().optional(), // 加密密码
    math: z.boolean().optional(),    // 数学公式开关
    quiz: z.boolean().optional(),    // 练习题开关
    keywords: z.array(z.string()).optional(), // SEO 关键词
    tocNumbering: z.boolean().optional().default(true), // 目录编号
    excludeFromSummary: z.boolean().optional(), // 排除 AI 摘要
  })
});
```

自定义 `dateInSiteTimezone` 转换器解决 gray-matter 将日期误解析为 UTC 的问题。

#### 4.2.2 内容目录结构

```plain
src/content/blog/
├── zh/ (默认语言，无前缀)
│   ├── life/           # 随笔类
│   ├── note/           # 笔记类
│   │   └── front-end/  # 前端笔记子分类
│   ├── tools/          # 工具类
│   └── weekly/         # 周刊类
├── en/                 # 英文版
│   ├── life/
│   ├── note/
│   ├── tools/
│   └── weekly/
└── ja/                 # 日文版
    ├── life/
    ├── note/
    ├── tools/
    └── weekly/
```

#### 4.2.3 内容工具库 (`src/lib/content/`)

这是整个项目中最重要的工具模块，所有页面都依赖它。

| 文件 | 关键导出 | 说明 |
|------|---------|------|
| `posts.ts` | `getSortedPosts()`, `getPostById()`, `getPostsBySticky()` | 核心文章查询，单次遍历优化 |
| | `getHomePagePosts()` | 首页文章（置顶 + 非置顶，单次遍历优化） |
| | `getNonFeaturedPosts()` | 排除精选分类后的文章 |
| | `getRandomPosts()` | Fisher-Yates 洗牌算法随机取文 |
| | `getPostReadingTime()` | 阅读时间估算（WeakMap 缓存）|
| | `getAdjacentSeriesPosts()` | 系列文章上下篇导航 |
| `categories.ts` | `getCategoryList()` | 构建分类树（含层级与计数） |
| | `addCategoryRecursively()` | 递归收集子分类文章 |
| | `getCategoryByLink()` | 按分类路径获取分类信息 |
| `tags.ts` | `getAllTags()` | 获取所有标签（WeakMap 缓存，大小写不敏感）|
| | `tagToSlug()`, `buildTagPath()` | 标签 URL 处理 |
| `similarities.ts` | `getRelatedPosts()` | 基于语义相似度的相关文章推荐 |
| `transforms.ts` | `pickPost()`, `pickPosts()` | 灵活选取文章字段（slug/link/title/date/cover/tags...）|
| | `toPostRef()`, `toPostCardData()` | 数据转换便捷函数 |
| `cache.ts` | `memoize()` | 构建时 memoize 缓存（开发模式跳过）|
| `locale.ts` | `filterPostsByLocale()`, `getPostLocale()` | 内容国际化筛选 |
| `category-path.ts` | `buildCategoryPath()` | 分类路径构建（从 posts.ts 分离以打破循环依赖）|
| `category-translate.ts` | `translateCategoryName()` | 分类名多语言翻译 |

### 4.3 Markdown 插件管线

这是项目中最复杂的系统，负责从 Markdown 到 HTML 的完整转换。

#### 4.3.1 完整管线流程

```plain
Markdown 源文件
    │
    ▼
┌─────────────────────────────────────┐
│ Remark 插件 (MDAST 操作)             │
├─────────────────────────────────────┤
│ 1. remarkShokaPreprocess ← 必须首个 │
│    - 解决 GFM 冲突 (+++ ~sub~ 等)   │
│    - 处理 :::容器 +++折叠 ;;;选项卡  │
│    - 处理 {% links %} {% media %}   │
│    - 转义定界符处理                  │
│ 2. remarkMath ← 必须在 spoiler 前   │
│    - 识别 $...$ 数学公式节点         │
│ 3. remarkShokaSpoiler               │
│    - !!text!! → <spoiler-span>      │
│ 4. remarkShokaRuby                  │
│    - {text^annotation} → <ruby>     │
│ 5. remarkIns + remarkMark           │
│    - ++text++ → <ins>               │
│    - ==text== → <mark>              │
│ 6. remarkDirective +                │
│    remarkEncryptedDirective         │
│    - :::encrypted{password="..."}   │
│ 7. remarkLinkEmbed                  │
│    - OG 预览 / Tweet / CodePen 嵌入 │
└─────────────────────────────────────┘
    │
    ▼ (Astro 内部 MDAST→HAST)
    │
    ▼
┌─────────────────────────────────────┐
│ Shiki 代码高亮                       │
├─────────────────────────────────────┤
│ - 亮色: github-light                │
│ - 暗色: github-dark                 │
│ - 排除 mermaid 语言 (由插件处理)     │
│ 转换器:                              │
│ 1. shokaMetaTransformer             │
│    - 解析 title/url/mark/command    │
│ 2. collapsibleCodeTransformer       │
│    - 长代码折叠 (阈值可配)           │
└─────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────┐
│ Rehype 插件 (HAST 操作)              │
├─────────────────────────────────────┤
│ 1. rehypeSlug                       │
│    - 标题添加 id 属性               │
│ 2. rehypeAutolinkHeadings           │
│    - 标题添加锚点链接               │
│ 3. rehypeShokaAttrs                 │
│    - [text]{.class} 属性语法         │
│ 4. rehypeImagePlaceholder           │
│    - lazy loading + <figure> 包装   │
│ 5. rehypeKatex                      │
│    - KaTeX 数学公式渲染             │
│ 6. rehypeEncryptedBlock ← 最后      │
│    - AES-256-GCM 加密块             │
│ 7. rehypeEncryptedPost ← 最后       │
│    - AES-256-GCM 全文加密           │
└─────────────────────────────────────┘
    │
    ▼
    最终 HTML
```

#### 4.3.2 插件源码文件 (`src/lib/markdown/`)

| 文件 | 类型 | 说明 |
|------|------|------|
| `remark-shoka-preprocess.ts` | Remark | 入口预处理器，重新解析并替换 AST |
| `shoka-preprocessor.ts` | 核心 | 预处理逻辑：容器/折叠/选项卡/友链/媒体/转义/半角转换 |
| `shoka-renderers.ts` | 渲染器 | HTML 渲染：`renderFriendLinks()`, `renderAudioMedia()`, `renderVideoMedia()` |
| `remark-shoka-spoiler.ts` | Remark | 剧透/隐藏文字插件 |
| `remark-shoka-effects.ts` | Remark | `remarkIns()` + `remarkMark()` 下划线/高亮 |
| `remark-shoka-ruby.ts` | Remark | 注音标注 `{text^annotation}` → `<ruby>` |
| `remark-encrypted-directive.ts` | Remark | 加密指令标记（实际加密在 rehype 阶段）|
| `remark-link-embed.ts` | Remark | 链接嵌入：Twitter/CodePen/OG 预览 |
| `link-utils.ts` | 工具 | `extractTweetId()`, `classifyLink()`, `isStandaloneLinkParagraph()` |
| `rehype-shoka-attrs.ts` | Rehype | 属性语法 `{.class}` 和 `[text]{.class}` |
| `rehype-image-placeholder.ts` | Rehype | 图片懒加载 + LQIP + `<figure>` 包装 |
| `rehype-encrypted-block.ts` | Rehype | 加密块：AES-256-GCM 加密子元素 |
| `rehype-encrypted-post.ts` | Rehype | 全文加密：读取 frontmatter password 字段 |
| `shiki-collapsible-transformer.ts` | Shiki | 可折叠长代码块 |
| `shiki-meta-transformer.ts` | Shiki | 解析代码块 meta 字符串属性 |

#### 4.3.3 加密系统 (`src/lib/crypto/`)

| 文件 | 关键导出 | 说明 |
|------|---------|------|
| `encrypt.ts` | `encryptBlock()`, `encryptPost()` | 构建时 AES-256-GCM 加密 |
| `decrypt.ts` | `decryptBlock()`, `decryptPost()` | 客户端浏览器 Web Crypto API 解密 |
| `constants.ts` | `PBKDF2_ITERATIONS = 100000` | 密钥派生迭代次数 |

#### 4.3.4 OG 链接嵌入缓存

- 位置：`.cache/og-data.json`
- 策略：构建时通过 `metascraper` 抓取 OG 数据
- 超时：5 秒
- 成功缓存：`previewCacheTime` 天
- 失败缓存：1 天（避免每次构建都重试失效链接）
- 缓存文件提交到 git 以加速 Vercel 构建

### 4.4 组件系统

#### 4.4.1 布局组件 (`src/components/layout/`)

| 组件 | 类型 | 职责 |
|------|------|------|
| `Header.astro` | Astro | 顶部导航栏，含 Logo、导航链接、主题切换入口 |
| `Footer.astro` | Astro | 页脚，含版权信息和社交链接 |
| `Navigator.tsx` | React | 主导航，交互式下拉菜单 |
| `DropdownNav.tsx` | React | 下拉导航子菜单 |
| `HomeSider.astro` | Astro | 首页侧边栏（信息/目录/系列切换） |
| `SearchDialog.tsx` | React | Pagefind 搜索对话框 |
| `MobileDrawer.astro` | Astro | 移动端抽屉菜单 |
| `FloatingGroup.tsx` | React | 浮动按钮组（返回顶部、搜索） |
| `TableOfContents/` | React | 桌面端目录树组件 |
| `MobilePostHeader/` | React | 移动端文章头部（标题、目录下拉） |
| `LanguageSwitcher.tsx` | React | 多语言切换 |
| `ScrollProgress.tsx` | React | 阅读进度条 |
| `Social.astro` | Astro | 社交链接图标 |

#### 4.4.2 Markdown 增强组件 (`src/components/markdown/`)

| 组件 | 说明 |
|------|------|
| `AudioPlayer.tsx` | 音频播放器（含 LRC 歌词解析、播放列表） |
| `VideoPlayer.tsx` | 视频播放器（含控制栏、播放列表） |
| `CodeBlockToolbar.tsx` | 代码块标题栏（语言标签、复制、全屏） |
| `CodeBlockFullscreen.tsx` | 代码块全屏模式 |
| `ImageLightbox.tsx` | 图片灯箱 |
| `EncryptedBlock.tsx` | 加密内容块客户端解密组件 |
| `EncryptedPost.tsx` | 加密文章客户端解密组件 |
| `QuizBlock.tsx` | 练习题容器（含单选题/多选题/判断题/填空题） |
| `MermaidToolbar.tsx` | Mermaid 图表工具栏 |
| `InfographicToolbar.tsx` | 信息图工具栏 |
| `DiagramFullscreen.tsx` | 图表全屏 |
| `ContentEnhancer.tsx` | 内容增强嵌入卡片 |
| `FriendLinksGrid.tsx` | 友链网格 |
| `NoteBlockIcon.tsx` | 提醒块图标 |

#### 4.4.3 文章组件 (`src/components/post/`)

| 组件 | 说明 |
|------|------|
| `PostList.astro` | 文章列表（文章列表、分类列表、标签列表共用） |
| `PostItemCard.astro` | 单篇文章卡片 |
| `CategoryCards.astro` | 分类卡片展示 |
| `FlippedCard.astro` | 翻转卡片效果 |
| `Paginator.astro` | 分页器 |
| `PostFooter.astro` | 文章底部区域 |
| `PostFooterLists.tsx` | 文章底部列表（相关/随机文章） |
| `RelatedPostList.tsx` | 基于语义相似度的相关文章 |
| `RandomPostList.tsx` | 随机文章列表 |
| `SeriesNavigation.tsx` | 系列文章上下篇导航 |
| `SeriesPostList.tsx` | 系列文章列表 |
| `SummaryPanel.tsx` | AI 摘要面板 |

#### 4.4.4 评论系统 (`src/components/comment/`)

| 组件 (React Shell + Astro Client) | 提供商 |
|-----------------------------------|--------|
| `Giscus.tsx` + `GiscusClient.astro` | GitHub Discussions |
| `Waline.tsx` + `WalineClient.astro` | Waline (自部署) |
| `Twikoo.tsx` + `TwikooClient.astro` | Twikoo (腾讯云) |
| `Remark42.astro` | Remark42 (自部署) |

评论系统选择通过 `config/site.yaml` 的 `comment.provider` 字段配置。

#### 4.4.5 UI 组件 (`src/components/ui/`)

基于 shadcn/ui 模式构建，使用 Radix UI 原语 + `class-variance-authority` 管理变体：

| 组件 | Radix 基础 | 说明 |
|------|-----------|------|
| `button.tsx` | - | 按钮（cva 变体：default/destructive/outline/ghost） |
| `badge.tsx` | - | 徽章 |
| `dialog.tsx` | `@radix-ui/react-dialog` | 模态对话框 |
| `dropdown-menu.tsx` | `@radix-ui/react-dropdown-menu` | 下拉菜单 |
| `popover.tsx` | `@radix-ui/react-popover` | 弹出框 |
| `switch.tsx` | `@radix-ui/react-switch` | 开关 |
| `input.tsx` | - | 输入框 |
| `segmented.tsx` | - | 分段控制器 |
| `divider.tsx` | - | 分割线 |
| `sonner.tsx` | `sonner` | Toast 通知 |
| `wave.tsx` | - | 波浪装饰动画 |

#### 4.4.6 Hooks (`src/hooks/`)

| Hook | 文件 | 说明 |
|------|------|------|
| `useMediaQuery` | `useMediaQuery.ts` | 媒体查询，导出 `useIsMobile`, `useIsTablet`, `usePrefersColorSchemeDark`, `usePrefersReducedMotion` |
| `useActiveHeading` | `useActiveHeading.ts` | 滚动时当前活跃标题跟踪（目录高亮） |
| `useCurrentHeading` | `useCurrentHeading.ts` | 基于 `useSyncExternalStore` 的当前标题 |
| `useHeadingTree` | `useHeadingTree.ts` | 构建目录树 (`findHeadingById`, `getParentIds`, `getSiblingIds`) |
| `useFloatingUI` | `useFloatingUI.ts` | Floating UI 定位封装 |
| `useScrollTrigger` | `useScrollTrigger.ts` | 滚动触发 (`useScrolledPast`, `useScrollY`) |
| `useCopyToClipboard` | `useCopyToClipboard.ts` | 剪贴板复制（带反馈状态） |
| `useKeyboardShortcut` | `useKeyboardShortcut.ts` | 键盘快捷键 (`useEscapeKey`) |
| `useControlledState` | `useControlledState.ts` | 受控/非受控状态模式 |
| `useExpandedState` | `useExpandedState.ts` | 展开/折叠状态 |
| `useIsMounted` | `useIsMounted.ts` | 客户端挂载检测（防 SSR 不匹配） |
| `useIsDarkTheme` | `useIsDarkTheme.ts` | 检测当前页面主题 |
| `useRetimer` | `useRetimer.ts` | 定时器管理 |
| `useZoomPan` | `useZoomPan.ts` | 全屏缩放平移 |
| `useSearchKeyboardNav` | `useSearchKeyboardNav.ts` | 搜索键盘导航 |
| `useAudioPlayer` | `useAudioPlayer.ts` | 音频播放器状态逻辑 |
| `useVideoPlayer` | `useVideoPlayer.ts` | 视频播放器状态逻辑 |
| `useMediaPlayer` | `useMediaPlayer.ts` | 媒体播放器共享逻辑 |
| `usePlaybackTime` | `usePlaybackTime.ts` | 播放时间跟踪 |
| `useBangumiData` | `useBangumiData.ts` | Bangumi 追番数据 |
| `useTranslation` | `useTranslation.ts` | i18n 翻译 Hook |

### 4.5 状态管理

使用 **Nanostores**（<1KB）实现全局状态管理，无需 Provider 包裹。

| Store | 类型定义 | 关键导出 | 说明 |
|-------|---------|---------|------|
| `app.ts` | `HomeSiderSegmentType` | `$homeSiderSegment` (atom) | 首页侧边栏分段状态 |
| `modal.ts` | `ModalType` | `$activeModal` (atom) | 统一模态框（drawer/search/codeFullscreen/diagramFullscreen/imageLightbox/settings） |
| | | `openModal()`, `closeModal()`, `toggleModal()` | 模态框操作方法 |
| | | `navigateImage()` | 图片灯箱前后导航 |
| `player.ts` | `PlayMode` | `$activePlayerId` (atom) | 全局媒体播放器 ID |
| | | `$playMode` (atom) | 播放模式：order/random/loop |
| | | 持久化到 localStorage | 音量/模式记忆 |
| `bgm.ts` | `boolean` | `$bgmPanelOpen` (atom) | BGM 面板独立开关（不与 modal 共享） |
| `locale.ts` | `Locale` | `$locale` (atom) | 当前语言，从 URL 路径同步，监听 `astro:page-load` |
| `settings.ts` | `Settings` | `$settings` (atom) | 阅读偏好 + 通用偏好 |
| | | `updateSettings()` | 更新设置并持久化 |
| `settings-constants.ts` | - | 字体预设、localStorage keys | 设置常量和默认值 |
| `announcement.ts` | - | `$readAnnouncementIds` (atom) | 公告已读状态 |
| | | `$activeAnnouncements` (computed) | 当前有效公告（基于日期范围）|
| | | `$unreadAnnouncements` (computed) | 未读公告计数 |
| `christmas.ts` | - | `$christmasEnabled` (atom) | 圣诞特效开关（软关闭/硬关闭两级） |
| | | `$ornamentHidden` (atom) | 圣诞装饰隐藏 |

### 4.6 国际化系统

#### 4.6.1 i18n 配置 (`src/i18n/config.ts`)

- 默认语言：`zh`（中文）
- 支持语言：`zh`, `en`, `ja`
- 由 `config/site.yaml` 的 `i18n` 字段控制
- 当配置了多语言时，自动启用 Astro 官方 i18n 路由（`prefixDefaultLocale: false`）

#### 4.6.2 翻译文件 (`src/i18n/translations/`)

| 文件 | 语言 |
|------|------|
| `zh.ts` | 中文（源语言，最完整） |
| `en.ts` | 英文 |
| `ja.ts` | 日文 |

翻译涵盖：导航、文章、搜索、评论、设置、归档、友链、标签、分类、404 等所有 UI 字符串。

#### 4.6.3 关键工具 (`src/i18n/`)

| 文件 | 关键导出 | 说明 |
|------|---------|------|
| `config.ts` | `locales`, `defaultLocale` | 语言配置 |
| `utils.ts` | `t(key, locale)` | 翻译查找函数 |
| `types.ts` | `Locale`, `TranslationKeys` | 翻译类型定义 |
| `content-types.ts` | 内容类型翻译 | 内容分类名翻译 |
| `content.ts` | 内容翻译工具 | 文章内容相关翻译 |

### 4.7 工具库

#### 4.7.1 通用工具 (`src/lib/`)

| 文件 | 关键导出 | 说明 |
|------|---------|------|
| `utils.ts` | `cn()` | `clsx` + `tailwind-merge` 合并 Tailwind 类名 |
| | `formatCompactNumber()` | 数字格式化（如 1.2k）|
| | `shuffleArray()` | Fisher-Yates 洗牌 |
| | `normalizeUrl()`, `normalizeHexColor()` | 标准化工具 |
| `date.ts` | `displayDate()`, `formatForSeo()` | 日期格式化 |
| | `parseDateInSiteTimezone()`, `reinterpretUtcAsTimezone()` | 时区处理 |
| `slug.ts` | `transliterateSlug()` | 非 ASCII slug 罗马化 |
| `route.ts` | `encodeSlug()`, `routeBuilder()` | 路由工具 |
| `sanitize.ts` | `sanitizeHtml()`, `stripHtmlToText()`, `extractTextFromMarkdown()` | HTML/Markdown 清理 |
| `lqip.ts` | `getGradientPlaceholder()` | LQIP 渐变色占位符 |

#### 4.7.2 领域工具 (`src/lib/`)

| 模块 | 文件 | 说明 |
|------|------|------|
| Bangumi | `bangumi/api.ts` | 追番 API 客户端（分页获取收藏） |
| SEO | `seo/og-image.ts` | OG 图片 URL 生成 |
| Quiz | `quiz/parse-quiz.ts` | 客户端练习题 DOM 解析 |
| 内容增强 | `content-enhancer-utils.ts` | Markdown 增强辅助函数 |
| RSS | `rss-utils.ts` | RSS 字段处理（含加密文章处理）|

---

## 5. 关键数据流

### 5.1 页面渲染数据流

```plain
Astro 构建时 (SSG)
┌─────────────────────────────────────────────────────┐
│  astro build                                        │
│    │                                                 │
│    ├─ 遍历 src/content/blog/ 读取所有 Markdown       │
│    │   → 应用 Markdown 插件管线 → 生成 HTML          │
│    │                                                 │
│    ├─ 调用 getStaticPaths() 生成静态路由             │
│    │   → posts/[...page].astro 分页                  │
│    │   → post/[...slug].astro 文章详情               │
│    │   → categories/ 分类页                          │
│    │   → tags/ 标签页                                │
│    │                                                 │
│    ├─ Pagefind 构建搜索索引                          │
│    │                                                 │
│    └─ 输出到 dist/ 目录                              │
└─────────────────────────────────────────────────────┘

客户端运行时
┌─────────────────────────────────────────────────────┐
│  用户打开页面                                        │
│    │                                                 │
│    ├─ 静态 HTML 立即渲染                             │
│    │                                                 │
│    ├─ client:load 组件立即激活                       │
│    │   → 主题切换, Navigator, SearchDialog            │
│    │                                                 │
│    ├─ client:idle 组件空闲时激活                     │
│    │   → MenuIcon, 非关键交互                        │
│    │                                                 │
│    ├─ client:visible 可见时激活                      │
│    │   → 评论, 图表, 底部组件                        │
│    │                                                 │
│    └─ View Transitions 拦截导航                      │
│        → 无刷新页面切换                              │
│        → 触发 astro:page-load 事件                   │
│        → Store 更新 (locale, theme 等)               │
└─────────────────────────────────────────────────────┘
```

### 5.2 文章查询数据流

```plain
Content Collection (src/content/blog/)
    │
    ▼
getSortedPosts()      → 按日期降序排列所有文章
getPostsBySticky()    → 分离置顶/非置顶文章
getHomePagePosts()    → 首页: 置顶 + 最新非置顶
getNonFeaturedPosts() → 排除精选分类 → 文章列表页分页
getPostById()         → 单篇文章详情
getCategoryList()     → 构建分类树 → 分类页面
getAllTags()          → 聚合所有标签 → 标签页面
getAdjacentSeriesPosts() → 系列上下篇 → 文章底部导航
getRandomPosts()      → 随机推荐
getRelatedPosts()     → 语义相似度推荐 (similarities.json)
```

### 5.3 加密文章数据流

```plain
写作时：
  文章 frontmatter: password: "my-password"

构建时 (rehype-encrypted-post.ts)：
  1. 检测 frontmatter.password
  2. 将所有文章 HTML 序列化
  3. AES-256-GCM 加密 + PBKDF2 密钥派生
  4. 存储 data-cipher/data-iv/data-salt 到 HTML

客户端 (EncryptedPost.tsx)：
  1. 用户输入密码
  2. PBKDF2 派生密钥
  3. AES-256-GCM 解密
  4. 将解密后的 HTML 插入 DOM
```

---

## 6. 依赖关系与约束

### 6.1 模块依赖流向（防循环依赖）

```plain
pages/*.astro / pages/*.tsx
    │
    ▼
components/* (Astro + React)
    │
    ▼
hooks/* (React Hooks)
    │
    ├──► lib/* (纯函数)
    │       │
    │       └──► constants/* (配置常量)
    │
    └──► store/* (Nanostores)

types/* 可被任何层引用，但不引用其他层
```

### 6.2 关键约束

| 约束 | 说明 |
|------|------|
| **无循环依赖** | `category-path.ts` 从 `posts.ts` 分离出来就是为了打破循环依赖 |
| **三层模块嵌套** | 模块目录最多 3 层嵌套 |
| **纯函数优先** | `lib/` 中所有函数应为纯函数，副作用在边界隔离 |
| **测试优先级** | `lib/` > `hooks/` > `components/` |
| **依赖卫生** | 无循环依赖；>100KB 的依赖应动态导入 |
| **接口最小化** | 通过 `index.ts` barrel export 暴露最小公共 API |

### 6.3 关键外部依赖

| 依赖 | 用途 | 备注 |
|------|------|------|
| `astro` 5.x | 框架核心 | - |
| `@astrojs/react` | React 集成 | - |
| `tailwindcss` 4.x | CSS 框架 | 通过 Vite 插件集成 |
| `motion` 11.x | 动画库 | Framer Motion 继任者 |
| `nanostores` | 状态管理 | <1KB |
| `pagefind` + `astro-pagefind` | 静态全文搜索 | - |
| `astro-icon` | 图标系统 | Iconify 图标集 |
| `mermaid` 11.x | 图表渲染 | - |
| `three` + `@react-three/fiber` | 3D 渲染（雪花效果）| 条件性打包 |
| `@blocknote/core` | 富文本编辑器 | 仅 CMS 使用 |
| `@radix-ui/*` | 无障碍 UI 原语 | shadcn/ui 基础 |
| `shiki` | 代码语法高亮 | 通过 Astro 集成 |
| `zod` | Schema 验证 | Content Collections |
| `date-fns` + `date-fns-tz` | 日期处理 | - |
| `es-toolkit` | 工具函数 | 替代 lodash |
| `sanitize-html` | HTML 消毒 | - |

### 6.4 条件性依赖

部分依赖只在特定场景下打包：

- **Three.js**（~879KB）：仅在 `christmas.features.snowfall` 启用时通过 `conditionalSnowfall()` Vite 插件打包
- **@antv/infographic**：仅在内容使用信息图代码块时加载
- **Umami 分析**：仅在 `site.yaml` 中配置 analytics.umami 时启用
- **评论系统**：根据 `comment.provider` 配置加载对应提供商

---

## 7. 项目运行与开发命令

### 7.1 环境要求

- Node.js 18+
- pnpm 9.15.1+（项目指定版本）

### 7.2 命令速查

| 命令 | 说明 |
|------|------|
| `pnpm dev` | 启动开发服务器，默认 `http://localhost:4321` |
| `pnpm build` | 生产构建 |
| `pnpm preview` | 预览生产构建 |
| `pnpm check` | Astro 类型检查 |
| `pnpm lint` | Biome 代码检查 |
| `pnpm lint:fix` | 自动修复代码问题 |
| `pnpm knip` | 检测未使用的文件/依赖 |
| `pnpm koharu` | 启动交互式 Koharu CLI |
| `pnpm koharu generate all` | 一次性生成 LQIP + 摘要 + 相似度 |
| `pnpm cms` | 启动本地 CMS 管理界面 |
| `pnpm change` | 使用 git-cliff 生成变更日志 |

### 7.3 环境变量

| 变量 | 默认值 | 说明 |
|------|--------|------|
| `ANALYZE` | 未设置 | 设为 `true` 时启用 Sonda 包体积分析 |
| `BLOG_PORT` | 4321 | 开发服务器端口 |

### 7.4 Docker 部署

项目提供 Docker 镜像支持：

```bash
# 从项目根目录构建
docker build -f blog/Dockerfile -t astro-koharu .
docker run -p 8080:80 astro-koharu
```

Docker 配置位于 `docker/` 目录，使用 Nginx 作为静态文件服务器。

---

## 8. CMS 子系统

CMS 是一个独立子项目，提供本地可视化内容管理能力。

### 8.1 技术栈

| 技术 | 用途 |
|------|------|
| React 19 | 前端框架 |
| Vite 7 | 构建工具 |
| Hono | 后端 API 框架 |
| BlockNote | 富文本编辑器 |
| Tailwind CSS 4 | 样式 |

### 8.2 目录结构

```plain
cms/
├── src/
│   ├── api/               # API 层
│   │   ├── create.ts      # 创建文章
│   │   ├── list.ts        # 文章列表
│   │   ├── read.ts        # 读取文章
│   │   ├── write.ts       # 写入文章
│   │   ├── toggle-draft.ts # 切换草稿状态
│   │   ├── toggle-sticky.ts # 切换置顶
│   │   └── og-data.ts     # OG 数据管理
│   ├── components/        # 前端组件
│   │   ├── post-editor/   # 文章编辑器（画布/侧边栏）
│   │   ├── embed/         # 嵌入内容
│   │   └── ui/            # UI 组件
│   ├── hooks/             # CMS Hooks
│   ├── lib/               # CMS 工具
│   │   ├── api.ts         # API 客户端
│   │   ├── config.ts      # CMS 配置
│   │   ├── frontmatter.ts # 前置元数据处理
│   │   ├── markdown-render.ts # Markdown 渲染
│   │   └── validation.ts  # 数据验证
│   ├── styles/            # CMS 样式
│   └── types/             # CMS 类型
├── server.ts              # Hono 服务器入口
└── vite.config.ts         # Vite 构建配置
```

### 8.3 API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/list` | GET | 文章列表 |
| `/api/read` | GET | 读取单篇文章 |
| `/api/write` | POST | 写入文章 |
| `/api/create` | POST | 创建文章 |
| `/api/toggle-draft` | POST | 切换草稿状态 |
| `/api/toggle-sticky` | POST | 切换置顶状态 |
| `/api/og-data` | GET | OG 数据 |
| `/api/og-cache` | POST | 更新 OG 缓存 |

### 8.4 安全措施

- 默认仅监听 localhost
- 可选 API key 认证

---

## 9. 构建时脚本

| 脚本文件 | 命令 | 说明 |
|---------|------|------|
| `src/scripts/generateLqips.ts` | `koharu generate lqips` | 使用 sharp 生成图片 LQIP 渐变色数据，输出到 `src/assets/lqips.json` |
| `src/scripts/generateSummaries.ts` | `koharu generate summaries` | 使用 HuggingFace Transformers（本地）或 xsai 生成文章 AI 摘要，输出到 `src/assets/summaries.json` |
| `src/scripts/generateSimilarities.ts` | `koharu generate similarities` | 计算文章间语义相似度向量，输出到 `src/assets/similarities.json` |
| `src/scripts/koharu.tsx` | `pnpm koharu` | 交互式 CLI，整合以上所有脚本 |
| `scripts/save-slugs.ts` | - | Slug 迁移工具 |

---

## 10. 常见开发任务

### 10.1 添加新文章

在 `src/content/blog/zh/` 对应分类目录下创建 Markdown 文件：

```markdown
---
title: 文章标题
date: 2025-12-29 21:55:00
tags:
  - 标签1
  - 标签2
categories:
  - 笔记
cover: /img/cover.webp
description: SEO 描述
---

文章正文...
```

### 10.2 添加新页面

1. 在 `src/pages/` 下创建 `.astro` 或 `.md` 文件
2. 如需动态路由，实现 `getStaticPaths()`
3. 在 `Layout.astro` 的 `<slot />` 中渲染内容

### 10.3 添加新组件

1. 在对应子目录创建组件文件（Astro 或 React）
2. 在 `index.ts` barrel export 中导出
3. 在页面中使用，按需添加 `client:*` 指令

### 10.4 修改站点配置

编辑 `config/site.yaml`，修改后重启开发服务器。主要配置段：

- `site.*` — 站点基本信息
- `navigation` — 导航菜单
- `social` — 社交链接
- `comment` — 评论系统（修改后需重启）
- `christmas` — 圣诞特效
- `bgm` — 背景音乐

### 10.5 添加新语言

1. 在 `config/site.yaml` 的 `i18n` 中添加语言代码
2. 在 `src/i18n/translations/` 中创建翻译文件
3. 在 `config/i18n-content.yaml` 中添加分类翻译
4. 在 `src/content/blog/` 下创建对应语言目录并添加翻译文章

### 10.6 修改 Markdown 渲染

Markdown 插件位于 `src/lib/markdown/`，修改后需重启开发服务器。注意管线顺序敏感：

- Remark 插件：`astro.config.mjs` 的 `markdown.remarkPlugins`
- Rehype 插件：`astro.config.mjs` 的 `markdown.rehypePlugins`
- Shiki 转换器：`astro.config.mjs` 的 `markdown.shikiConfig.transformers`

---

> 本文档由代码分析自动生成，覆盖项目核心模块和关键数据流。
> 与 `docs/overview/` 系列文档互补使用，可获取更详细的主题讲解。
