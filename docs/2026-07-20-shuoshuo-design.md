# 说说 (ShuoShuo) 页面设计文档

> 日期: 2026-07-20
> 状态: 待实现

## 1. 概述

新增「说说」页面，展示 Qexo 说说的日常动态内容。使用瀑布流（Waterfall/Masonry）布局展示说说卡片，数据来自 Qexo API。作为独立页面 `/shuoshuo` 运行，适配博客多端布局和明暗模式。

## 2. 数据源

### 2.1 Qexo Talks API

基于 Qexo SDK `showQexoTalks()` 的内部调用方式：

**获取说说列表**：
```plain
GET https://qexo.2005815.xyz/pub/talks/?page=1&limit=20
```

**响应格式**：
```json
{
  "status": true,
  "data": [
    {
      "id": "talk_id",
      "content": "<p>HTML 内容</p><img src='...'>",
      "time": 1700000000,
      "tags": ["日常", "随笔"],
      "like": 3,
      "liked": false
    }
  ],
  "count": 42
}
```

- `content`: 预渲染的 HTML 内容（可含图片、链接等）
- `time`: Unix 时间戳（秒）
- `tags`: 标签数组
- `like`: 点赞数
- `liked`: 当前是否已点赞

**点赞 API**：
```plain
POST https://qexo.2005815.xyz/pub/like_talk/
Content-Type: application/x-www-form-urlencoded
Body: id=talk_id
```

### 2.2 配置项

```yaml
shuoshuo:
  apiUrl: "https://qexo.2005815.xyz"       # Qexo 实例地址
  pageSize: 20                               # 每页条数
  avatar: "/img/avatar.webp"                 # 说说头像
  author: "cos"                              # 说说作者名
```

## 3. 页面结构

### 3.1 路由

- `/shuoshuo`（默认语言）
- `/[lang]/shuoshuo`（多语言）

使用 `TwoColumnLayout` + `HomeSider`，与现有页面保持一致。

### 3.2 布局

```plain
┌─ Cover ─────────────────────────────────────┐
│  说说                                       │
├─ Waterfall Grid ────────────────────────────┤
│  ┌──────┐    ┌──────┐    ┌──────┐          │
│  │ 卡片  │    │ 卡片  │    │ 卡片  │          │
│  │(高)   │    │(矮)   │    │(中)   │          │
│  │       │    │       │    │       │          │
│  └──────┘    └──────┘    └──────┘          │
│  ┌──────┐    ┌──────┐                      │
│  │ 卡片  │    │ 卡片  │                      │
│  │(矮)   │    │(高)   │                      │
│  └──────┘    └──────┘                      │
├─ Load More ─────────────────────────────────┤
│  [  加载更多  ]                              │
└─────────────────────────────────────────────┘
```

### 3.3 Astro 页面

与现有 `fcircle.astro` 模式一致，从 `site.yaml` 读取配置，传入 React 组件。

## 4. 核心组件 `ShuoShuo.tsx`

纯客户端 React 组件，通过 `client:load` 加载。

### 4.1 状态管理

| 状态 | 触发条件 | 显示内容 |
|------|---------|---------|
| `loading` | 初始加载 | 加载中动画 |
| `loaded` | 数据获取成功 | 瀑布流卡片 + 加载更多 |
| `error` | API 请求失败 | 错误提示 + 重试 |
| `empty` | `data` 为空数组 | "暂无说说" |

### 4.2 数据流

```plain
组件挂载
  │
  ├─ page = 1
  ├─ fetch({apiUrl}/pub/talks/?page=1&limit={pageSize})
  │     │
  │     ├─ 成功 → 更新 talks[]，page++
  │     │         渲染瀑布流卡片
  │     │
  │     └─ 失败 → 显示错误状态
  │
  └─ 用户点击「加载更多」
       └─ fetch 下一页 → 追加到 talks[] → 重新触发 waterfall 布局
```

### 4.3 瀑布流算法

纯 JS 实现的瀑布流布局（参考 liushen 主题的 `waterfall()` 函数）：

1. 所有卡片设为 `position: absolute`
2. 容器设为 `position: relative`
3. 第一行均匀分布各列起始位置
4. 后续卡片插入当前最矮的列下方
5. 窗口 resize 时重新计算布局
6. 图片加载完成后触发重新布局

### 4.4 卡片结构

```plain
┌── talk_item ───────────────────────────┐
│ ┌── talk_meta ───────────────────────┐ │
│ │ ┌──────┐                           │ │
│ │ │ 头像  │  昵称 + ✔徽章             │ │
│ │ │ 60px  │  2026-07-20 14:30        │ │
│ │ └──────┘                           │ │
│ └────────────────────────────────────┘ │
│ ─────────────────────────────────────── │ ← dashed border
│                                         │
│  talk_content（HTML，通过 dangerouslySet  │
│  InnerHTML 渲染 Qexo 返回的 HTML 内容）    │
│                                         │
│  图片由 Qexo 的 HTML 中的 <img> 标签控制   │
│  （Qexo 返回的 content 已含图片 HTML）     │
│                                         │
│ ─────────────────────────────────────── │ ← dashed border
│ ┌── talk_bottom ─────────────────────┐ │
│ │ #标签1  #标签2              ♥ 3    │ │
│ └───────────────────────────────────┘ │
└────────────────────────────────────────┘
```

### 4.5 字段映射

| 卡片元素 | API 字段 | 处理逻辑 |
|---------|---------|---------|
| 头像 | 配置的 `avatar` | `<img>` 加载失败回退显示首字母 |
| 昵称 | 配置的 `author` | + 蓝色 ✔ 徽章 SVG |
| 日期 | `time`（Unix 秒） | → `YYYY-MM-DD HH:mm` |
| 正文 | `content`（HTML） | 使用 `dangerouslySetInnerHTML` 直接渲染 Qexo 返回的 HTML |
| 标签 | `tags`（数组） | `#标签` 格式，圆角 pill 样式 |
| 点赞数 | `like` | 心形图标 + 数字 |

### 4.6 点赞交互

- 点击心形图标 → `POST {apiUrl}/pub/like_talk/` body: `id=talkId`
- 成功 → 切换 `liked` 状态，更新 `like` 计数
- 失败 → 静默失败（不影响 UI）

### 4.7 加载更多

- 每次加载 `pageSize`（默认 20）条
- 点击「加载更多」按钮追加下一页数据
- 若 `talks.length >= count` 则隐藏按钮
- 加载更多时显示 loading 指示器

## 5. 样式文件

### 5.1 新建 `public/css/shuoshuo.css`

瀑布流容器 + 卡片样式，使用博客现有 CSS 变量适配明暗模式。

**瀑布流容器**：
- `.shuoshuo-page` — 页面容器
- `.shuoshuo-waterfall` — 瀑布流容器（`position: relative`）
- `.shuoshuo-state` — 状态提示

**卡片**：
- `.shuoshuo-card` — 单张卡片（`position: absolute`，圆角 12px）
- `.shuoshuo-card__meta` — 头部（头像 + 昵称 + 日期）
- `.shuoshuo-card__avatar` — 头像（60px，圆角 12px）
- `.shuoshuo-card__info` — 昵称 + 徽章 + 日期
- `.shuoshuo-card__author` — 昵称
- `.shuoshuo-card__date` — 日期
- `.shuoshuo-card__content` — 正文 HTML 渲染区
- `.shuoshuo-card__bottom` — 底部（标签 + 点赞）
- `.shuoshuo-card__tags` — 标签容器
- `.shuoshuo-card__tag` — 单个标签（圆角 pill）
- `.shuoshuo-card__like` — 点赞按钮

**其他**：
- `.shuoshuo-more` — 加载更多按钮（复用 fcircle 按钮样式）
- 暗色模式（`.dark` 前缀）
- 响应式（三栏 → 两栏 → 单栏）

### 5.2 设计风格

以 liushen 主题的 shuoshuo 卡片风格为基础，适配博客现有设计语言：

- 卡片背景：`var(--paper)` / `var(--card-bg)`
- 圆角：12px
- 阴影：`var(--card-box-shadow)`，hover 加深
- 虚线分隔：`1px dashed var(--dash)`
- 标签：灰色背景圆角 pill
- 点赞心形：红色填充/描边切换
- 头像：12px 圆角
- 日期：半透明灰色

## 6. 配置层

### 6.1 `config/site.yaml` 变更

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

navigation 新增：

```yaml
  - name: 说说
    nameKey: nav.shuoshuo
    path: /shuoshuo
    icon: ri:message-2-fill
```

### 6.2 类型定义

```typescript
export interface ShuoshuoConfig {
  apiUrl: string;
  pageSize?: number;
  avatar?: string;
  author?: string;
}
```

### 6.3 常量导出

按 `fcircleConfig` 模式新增 `shuoshuoConfig` 导出。

## 7. 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 修改 | `config/site.yaml` | 新增 `shuoshuo` 配置节 + navigation 说说项 |
| 修改 | `src/lib/config/types.ts` | 新增 `ShuoshuoConfig` 接口 |
| 修改 | `src/constants/friends-config.ts` | 新增 `shuoshuoConfig` 导出 |
| **新增** | `src/pages/shuoshuo.astro` | 说说页面 |
| **新增** | `src/pages/[lang]/shuoshuo.astro` | 多语言说说页面 |
| **新增** | `src/components/shuoshuo/ShuoShuo.tsx` | 核心 React 组件 |
| **新增** | `public/css/shuoshuo.css` | 瀑布流 + 卡片样式 |
| 修改 | `src/i18n/translations/zh.ts` | 添加 `nav.shuoshuo: '说说'` |
| 修改 | `src/i18n/translations/en.ts` | 添加 `nav.shuoshuo: 'Moments'` |
| 修改 | `src/i18n/translations/ja.ts` | 添加 `nav.shuoshuo: 'ひとこと'` |

## 8. 未变更范围

- 现有 `/friends`、`/fcircle` 页面及组件
- 评论系统
- 现有数据加载逻辑

## 9. 边界情况处理

1. **API 请求失败**：显示错误提示 + 重试按钮
2. **返回数据为空**：显示"暂无说说"空状态
3. **`content` HTML 含无效标签**：Qexo 已过滤，直接渲染
4. **图片加载失败**：显示图片占位
5. **点赞请求失败**：静默失败，不倒扣点赞数
6. **瀑布流容器 resize**：防抖重新计算
7. **翻页加载中**：按钮显示 loading 状态，防止重复点击
8. **所有数据已加载**：隐藏加载更多按钮
