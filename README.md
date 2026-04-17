# stew-asset-browser-react

Stew 业务资产浏览 React UI SDK。

面向业务前端提供两层能力：

- `AssetBrowserWorkspace`：默认风格的完整工作台，内置文件树、Monaco 编辑器、Diff、草稿创建/保存/发布流程
- `AssetBrowserWorkspace mode="browse-preview"`：只读浏览/预览模式，可直接接收虚拟目录树与文档内容，不依赖 workspace 后端
- `AssetBrowserConsoleWorkspace`：直接复用 preview 页那套更偏业务控制台风格的成品工作台
- `AssetTree`、`AssetEditor`、`AssetDiffViewer`：便于业务侧按需组合的细粒度组件

## 安装

```json
{
  "dependencies": {
    "protobuf-typescript-client-gen": "github:ahaeureka/protobuf-typescript-client-gen",
    "stew-asset-browser-react": "github:ahaeureka/stew-asset-browser-react"
  }
}
```

浏览器端请直接使用 `asset_browser_client` 入口，避免把 Node 侧辅助模块打进前端包。

这两个包按独立仓库、独立依赖来使用。业务项目里应当分别声明这两个依赖，不要依赖 `workspace:*`、`link:` 或让 `stew-asset-browser-react` 代替你隐式安装 `protobuf-typescript-client-gen`。

当前这套 UI SDK 文档按已经落地的后端资产接口编写，不按 proto 里的预留字段做超前描述。

业务前端如果需要一份面向接入和升级的说明，请直接看 [docs/业务侧接入升级指引-20260407.md](docs/%E4%B8%9A%E5%8A%A1%E4%BE%A7%E6%8E%A5%E5%85%A5%E5%8D%87%E7%BA%A7%E6%8C%87%E5%BC%95-20260407.md)。

如果你的接入场景需要业务系统先生成版本号、再驱动资产浏览器完成发布与状态同步，另见 [docs/业务侧接入升级指引-20260410.md](docs/%E4%B8%9A%E5%8A%A1%E4%BE%A7%E6%8E%A5%E5%85%A5%E5%8D%87%E7%BA%A7%E6%8C%87%E5%BC%95-20260410.md)。

## 本地效果预览

这个包现在自带一个纯前端 mock 数据预览页，用来调目录树、编辑区和按钮视觉，不依赖后端接口。

如果你的目标不是做 mock，而是让业务前端直接拿到 preview 类似的成品页面效果，优先使用 `AssetBrowserConsoleWorkspace`，不要直接复制 `preview/main.tsx`。

```bash
cd /app/stew-asset-browser-react
pnpm preview
```

默认会启动一个本地 Vite 页面；如果只想校验静态构建，可执行：

```bash
cd /app/stew-asset-browser-react
pnpm preview:build
```

## 快速开始

```tsx
"use client";

import { useMemo } from "react";
import { AssetBrowserClient } from "protobuf-typescript-client-gen/dist/asset_browser_client";
import { AssetBrowserConsoleWorkspace } from "stew-asset-browser-react";

export default function AssetPage() {
  const client = useMemo(
    () => new AssetBrowserClient({
      baseUrl: "http://localhost:3012",
      timeout: 15000,
    }),
    [],
  );

  return (
    <AssetBrowserConsoleWorkspace
      client={client}
      assetSpace="configs"
      assetId="my-app"
      height={720}
    />
  );
}
```

### 最小可用入参说明

上面的最小示例里，几个核心入参的含义如下：

| 入参 | 类型 | 是否必填 | 含义 | 常见取值示例 |
|------|------|----------|------|--------------|
| `client` | `AssetBrowserClient` | 是 | UI SDK 底层请求客户端，负责调用 `/api/v1/assets/...` 接口 | `new AssetBrowserClient({ baseUrl: "http://localhost:3012" })` |
| `assetSpace` | `string` | 是 | 资产命名空间，通常按业务域分类 | `configs`、`workflows`、`prompts` |
| `assetId` | `string` | 是 | 某个具体资产集合的唯一标识 | `my-app`、`service-routing` |
| `height` | `number \| string` | 否 | 工作区整体高度 | `720`、`"80vh"` |

如果只想先把资产浏览面板挂上页面，通常只需要这 4 个参数。

## 直接复用 preview 页面效果

`AssetBrowserConsoleWorkspace` 是给业务前端使用的稳定入口，它把 preview 里沉淀出来的几项能力正式做成了 SDK API：

- 中文控制台式顶部栏与状态条
- 左侧资源目录区内置搜索、版本说明和导出入口
- 右侧统一的“编辑 / 预览 / 差异”切换
- 移动端下自动收敛成上下结构，而不是要求业务侧自己再写一层壳

示例：

```tsx
"use client";

import { useMemo } from "react";
import { AssetBrowserClient } from "protobuf-typescript-client-gen/dist/asset_browser_client";
import { AssetBrowserConsoleWorkspace } from "stew-asset-browser-react";

export default function AssetConsolePage() {
  const client = useMemo(
    () => new AssetBrowserClient({
      baseUrl: "http://localhost:3012",
      timeout: 15000,
    }),
    [],
  );

  return (
    <AssetBrowserConsoleWorkspace
      client={client}
      assetSpace="configs"
      assetId="gateway-routing"
      title="网关路由资产中心"
      height="calc(100vh - 96px)"
    />
  );
}
```

如果你已经接了 `AssetBrowserWorkspace`，但只是想切换成 preview 的产品化样式，也可以直接传：

```tsx
<AssetBrowserWorkspace
  client={client}
  assetSpace="configs"
  assetId="gateway-routing"
  appearance="console"
/>
```

## 只读浏览 / 预览模式

当你的页面只是要浏览目录树和预览文件，而不需要草稿、发布、版本编辑或后端 workspace client 时，可以直接把 `AssetBrowserWorkspace` 切到 `browse-preview` 模式。

这个模式的设计目标是：

- 不依赖 `AssetBrowserClient`
- 不要求 draft/version 上下文
- 支持静态文档或按路径懒加载文档
- Markdown 支持 `rendered / source / split` 三种查看方式

### 最小示例

```tsx
"use client";

import {
  AssetBrowserWorkspace,
  type PreviewDocument,
  type PreviewTreeNode,
} from "stew-asset-browser-react";

const tree: PreviewTreeNode[] = [
  {
    path: "/docs",
    name: "docs",
    isDirectory: true,
    children: [
      {
        path: "/docs/README.md",
        name: "README.md",
        isDirectory: false,
        fileKind: "markdown",
      },
      {
        path: "/docs/schema.json",
        name: "schema.json",
        isDirectory: false,
        fileKind: "json",
      },
    ],
  },
];

const documents: Record<string, PreviewDocument> = {
  "/docs/README.md": {
    path: "/docs/README.md",
    fileKind: "markdown",
    content: "# Public Skill Snapshot\n\nThis page is rendered in readonly mode.",
  },
  "/docs/schema.json": {
    path: "/docs/schema.json",
    fileKind: "json",
    content: JSON.stringify({ version: 1, mode: "readonly" }, null, 2),
  },
};

export default function PublicSkillPage() {
  return (
    <AssetBrowserWorkspace
      mode="browse-preview"
      appearance="console"
      title="公开导出预览"
      tree={tree}
      documents={documents}
      defaultPreviewMode="rendered"
      height="calc(100vh - 96px)"
    />
  );
}
```

### 懒加载文档

如果文档内容不想一次性全量传入，也可以只传树，再按路径懒加载：

```tsx
<AssetBrowserWorkspace
  mode="browse-preview"
  tree={tree}
  onOpenDocument={async (path) => {
    const response = await fetch(`/api/public-assets?path=${encodeURIComponent(path)}`);
    const payload = await response.json();
    return {
      path,
      fileKind: payload.fileKind,
      content: payload.content,
    };
  }}
/>
```

### 只读模式 API

```ts
type AssetBrowserMode = "workspace" | "browse-preview"

type PreviewMode = "rendered" | "source" | "split"

interface PreviewTreeNode {
  path: string
  name: string
  isDirectory: boolean
  sizeBytes?: number
  fileKind?: "markdown" | "json" | "text" | "yaml" | "python"
  children?: PreviewTreeNode[]
}

interface PreviewDocument {
  path: string
  fileKind: string
  content: string
}
```

`browse-preview` 额外支持的核心 props：

- `tree`：只读目录树
- `documents`：静态文档字典
- `onOpenDocument(path)`：按路径懒加载文档
- `defaultPreviewMode`：默认查看模式
- `previewModes`：限制可切换的预览模式
- `renderTreeNodeMeta`：自定义树节点右侧 meta
- `renderPreviewToolbar`：自定义预览工具栏扩展区
- `renderDocument`：自定义文件渲染器

如果你只是想直接拿控制台式只读浏览器，也可以用：

```tsx
<AssetBrowserConsoleWorkspace
  mode="browse-preview"
  title="分享页只读预览"
  tree={tree}
  documents={documents}
/>
```

### 什么时候用 ConsoleWorkspace，什么时候用 ConsoleShell

这两个名字看起来接近，但职责不同。

`AssetBrowserConsoleWorkspace` 适合绝大多数业务接入场景：

- 你已经使用或准备使用 `AssetBrowserClient` 直连后端资产接口
- 你需要的是“可直接上线”的成品工作台，而不是自己再拼目录树、编辑器和 Diff
- 你希望直接拿到草稿创建、保存、发布、导出、版本切换这些完整行为
- 你只是想复用 preview 的页面效果，而不是重写内部状态管理

`AssetBrowserConsoleShell` 适合少数高级定制场景：

- 你只想复用 console 页面骨架和视觉层，不想复用默认的数据流
- 你的目录树、编辑区、Diff 或顶部动作来自你自己的状态管理、BFF、mock 系统或混合数据源
- 你要把现有业务组件塞进同一套控制台壳子里，而不是接受 `AssetBrowserWorkspace` 的完整工作流
- 你明确知道自己在接管 `sidebarContent`、`mainContent`、`viewSwitcher`、`actions` 这些插槽

可以简单理解成：

- `AssetBrowserConsoleWorkspace` = 带默认行为的成品页
- `AssetBrowserConsoleShell` = 只提供外层布局和视觉约束的页面壳

如果没有很强的自定义理由，优先选 `AssetBrowserConsoleWorkspace`。只有当你确认默认 workspace 的数据流和交互边界已经不适合你的页面时，再退到 `AssetBrowserConsoleShell`。

## AssetBrowserClient 入参说明

`AssetBrowserClient` 是 UI SDK 和业务自定义页面共用的数据访问层。

```tsx
const client = new AssetBrowserClient({
  baseUrl: "http://localhost:3012",
  timeout: 15000,
});
```

| 入参 | 类型 | 是否必填 | 含义 | 建议 |
|------|------|----------|------|------|
| `baseUrl` | `string` | 是 | Stew 网关地址。所有资产接口都基于这个地址发起请求 | 浏览器端一般传当前网关地址，如 `http://localhost:3012` |
| `timeout` | `number` | 否 | 单次请求超时时间，单位毫秒 | 开发环境可用 `15000`，跨地域或大文件场景可适当提高 |

注意：

- 浏览器端请从 `protobuf-typescript-client-gen/dist/asset_browser_client` 导入。
- 客户端默认携带 cookie，并会复用当前登录态。
- 如需先创建或兜底资产集合，可先调用 `client.ensureCollection()`，再挂载工作台。

## 与后端接口对齐说明

`AssetBrowserWorkspace` 当前直接建立在 `BusinessAssetBrowserService` 已实现的这批接口之上：

- 目录树：`ListAssetTree`
- 版本列表：`ListAssetVersions`
- 草稿创建/废弃/发布：`CreateDraftVersion`、`DiscardDraftVersion`、`PublishDraftVersion`
- 文本读取与草稿保存：`GetAssetEntryText`、`UpdateDraftTextEntry`
- 差异查看：`DiffAssetDraft`、`DiffAssetVersions`、`GetAssetDiffEntryDetail`
- 版本切换：`ActivateAssetVersion`
- 导出：`ExportAssetEntry`

当前已确认的行为边界：

- `initialFolder="/"` 时，后端返回整版资产的递归平铺条目，工作台在前端重建目录树
- 非根目录仍保持 direct children 语义
- `getVersion()` 现在会返回 `baseVersion`；当目标版本为 draft 时，还会返回 `draftDiffSummary`
- `diffDraft()` / `diffVersions()` 现在已实际支持 `diffMode`、`pathPrefix`
- 当 `diffMode="with_text"` 时，文本类差异会带上 `oldPreview`、`newPreview`、`unifiedDiff`、`textDiffStatus`

## 资产导出

这套 UI SDK 现在同时覆盖“浏览 / 编辑 / Diff / 导出”四类常见资产操作。

导出语义约定如下：

- 选中文件时：直接下载该文件
- 选中目录时：服务端递归打包为 zip 后下载
- 未指定路径或选中根目录时：导出整个版本内容的 zip

对应的底层 HTTP 接口为：

```text
GET /api/v1/assets/{assetSpace}/{assetId}/export?version_id=...&path=...
```

该接口由 `BusinessAssetBrowserService.ExportAssetEntry` 统一定义，返回 `google.api.HttpBody`；浏览器侧通过映射后的 HTTP 下载端点消费。

### AssetBrowserClient 导出方法

```tsx
const result = await client.downloadEntry("configs", "gateway-routing", {
  versionId: "v20260401",
  path: "/templates",
});

console.log(result.filename);
console.log(result.contentType);
```

返回值说明：

| 字段 | 类型 | 含义 |
|------|------|------|
| `blob` | `Blob` | 浏览器可直接保存的二进制内容 |
| `filename` | `string` | 服务端返回的建议下载文件名 |
| `contentType` | `string` | HTTP 响应的内容类型；目录导出通常为 `application/zip` |

### 在 React 中触发下载

```tsx
async function handleExport() {
  const result = await client.downloadEntry("configs", "gateway-routing", {
    versionId: "v20260401",
    path: "/templates",
  });

  const url = URL.createObjectURL(result.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = result.filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
```

### AssetBrowserWorkspace 的默认导出行为

`AssetBrowserWorkspace` 会内置导出动作：

- 顶部工具栏支持导出当前选中条目
- 目录节点导出时自动请求 zip
- 文件节点导出时保持原始文件类型
- 业务侧仍可通过 `renderToolbarEnd`、`renderTreeNodeActions` 等扩展槽覆盖或补充导出入口

## AssetBrowserWorkspace 入参说明

`AssetBrowserWorkspace` 是推荐的完整工作台组件，适合业务前端直接嵌入。

### 基础属性

| 入参 | 类型 | 是否必填 | 默认值 | 含义 | 典型用法 |
|------|------|----------|--------|------|----------|
| `client` | `AssetBrowserClient` | 是 | 无 | 资产请求客户端 | 统一复用页面级 `client` 实例 |
| `assetSpace` | `string` | 是 | 无 | 资产空间 | `configs` |
| `assetId` | `string` | 是 | 无 | 资产集合 ID | `my-app` |
| `initialVersionId` | `string` | 否 | 自动选择草稿或活跃版本 | 首次挂载时优先打开的版本 | 用于从“版本历史列表”跳转进来 |
| `initialFolder` | `string` | 否 | `/` | 初次加载目录树时的起始目录；传 `/` 时后端会返回整棵子树的平铺条目，组件会在前端重建目录树 | `/`、`/templates`、`/src` |
| `height` | `number \| string` | 否 | `780` | 容器高度 | `820`、`"75vh"` |
| `title` | `string` | 否 | 集合 displayName 或 `assetSpace/assetId` | 自定义标题 | `"路由规则编辑"` |
| `className` | `string` | 否 | 无 | 外层容器 class | 接入业务样式系统时使用 |
| `style` | `CSSProperties` | 否 | 无 | 外层容器内联样式 | 调整宽高、圆角、阴影 |
| `enableEditing` | `boolean` | 否 | `true` | 是否允许草稿编辑 | 只读审阅页可传 `false` |
| `readOnly` | `boolean` | 否 | `false` | 只读模式：隐藏创建草稿/废弃草稿/发布版本按钮，编辑器强制只读 | 翻译版本预览、版本回溯查看 |
| `defaultDraftDescription` | `string` | 否 | `Edit assets` | 点击“Create draft”时默认带上的说明 | `"审批后修改配置"` |
| `theme` | `'light' \| 'dark' \| 'inherit'` | 否 | `'light'` | 主题模式 | inherit 模式下完全跟随宿主 CSS 变量 |
| `themeVars` | `Partial<AssetBrowserThemeVars>` | 否 | 无 | 覆盖默认 token，传入 CSS 变量值 | `{ '--stew-ab-bg': 'var(--background)' }` |
| `editorTheme` | `'vs' \| 'vs-dark' \| string` | 否 | 自动跟随 `theme` | Monaco 编辑器主题 | `'vs-dark'` |
| `showDecorativeBackground` | `boolean` | 否 | `true` | 是否显示装饰性渐变背景 | 嵌入宿主时建议 `false` |
### 版本 ID 语义

- `initialVersionId`、`selectedVersionId`、`compareVersionId`、`draftVersionId`、`collection.activeVersionId` 都是业务版本号
- 这些值对应后端的 `asset_versions.version_id`，不是数据库内部 UUID
- 网关为了兼容旧调用，入参暂时仍接受 UUID，但 UI SDK 与新业务代码都应只保存和传递业务版本号

### assetSpace 和 assetId 怎么获取

这两个参数不是 UI SDK 自动生成的，而是你业务系统里“资产集合”的唯一标识。

- `assetSpace`：表示业务分类或命名空间
- `assetId`：表示这个分类下的某一个具体资产集合

可以把它理解为：

- `assetSpace` 决定“这是哪一类资产”
- `assetId` 决定“这一类资产里的哪一个实例”

常见来源有 3 种。

#### 方式 1：业务侧按约定直接写死

如果页面本身就是某个固定资产的专用编辑页，最简单的方式就是直接写死。

例如：

- `assetSpace = "configs"`
- `assetId = "gateway-routing"`

```tsx
<AssetBrowserWorkspace
  client={client}
  assetSpace="configs"
  assetId="gateway-routing"
/>
```

适用场景：

- 一个页面只服务于一个固定配置
- 一个业务模块只编辑一个固定工作流或模板

#### 方式 2：从业务路由参数获取

如果你的前端页面本来就有业务主键，通常可以直接把路由参数映射成 `assetId`。

例如路由：

- `/services/order-service/assets`
- `/workflow/order-review/assets`

可以约定：

- `assetSpace = "services"`
- `assetId = serviceName`

或：

- `assetSpace = "workflows"`
- `assetId = workflowCode`

```tsx
export default function ServiceAssetPage({ params }: { params: { serviceName: string } }) {
  return (
    <AssetBrowserWorkspace
      client={client}
      assetSpace="services"
      assetId={params.serviceName}
    />
  );
}
```

适用场景：

- 一个业务对象对应一个资产集合
- 资产集合 ID 和业务主键天然一致

#### 方式 3：先调用列表接口，再让用户选择

如果前端并不知道具体有哪些资产集合，就先调用列表接口获取可选项，再把用户选中的 `assetSpace` 和 `assetId` 传给工作台。

```tsx
const { collections } = await client.listCollections({
  assetSpace: "configs",
  pageSize: 20,
});

collections.forEach((item) => {
  console.log(item.assetSpace, item.assetId, item.displayName);
});
```

返回的每个集合对象里都会包含：

- `item.assetSpace`
- `item.assetId`
- `item.displayName`

业务前端通常会先渲染一个下拉框或列表，用户选中后再挂载工作台。

```tsx
const [target, setTarget] = useState<{ assetSpace: string; assetId: string } | null>(null);

return target ? (
  <AssetBrowserWorkspace
    client={client}
    assetSpace={target.assetSpace}
    assetId={target.assetId}
  />
) : null;
```

#### 一般如何设计这两个字段

推荐约定如下：

- `assetSpace` 用来表达业务域：如 `configs`、`workflows`、`prompts`、`services`
- `assetId` 用来表达具体对象：如 `order-service`、`gateway-routing`、`invoice-template`

一个直观例子：

| 业务对象 | assetSpace | assetId |
|----------|------------|---------|
| 网关路由配置 | `configs` | `gateway-routing` |
| 订单审核流程 | `workflows` | `order-review` |
| 某服务的提示词模板 | `prompts` | `customer-support-v1` |

如果你还没有统一约定，建议先由后端或资产注册逻辑固定这两个字段的命名规则，再让前端直接消费。

### 如何设计 assetSpace 和 assetId 命名规范

团队落地时，最重要的不是“名字好不好看”，而是这两个字段是否稳定、可预测、可长期演进。

建议把命名规范控制在下面 4 条。

#### 1. `assetSpace` 表示资产大类，不表示具体实例

`assetSpace` 应该是一个稳定的业务分类，而不是某个页面、某个用户、某个临时对象。

推荐：

- `configs`
- `workflows`
- `prompts`
- `services`
- `templates`

不推荐：

- `config-page`
- `zhangsan-assets`
- `temp-debug`

判断标准：

- 看这个值时，应该能回答“这是一类什么资产”
- 不应该回答“这是哪个人的哪次操作”

#### 2. `assetId` 表示具体业务对象，最好直接复用业务主键

`assetId` 推荐直接复用业务系统里已经稳定存在的主键或编码。

推荐：

- 服务名：`order-service`
- 工作流编码：`order-review`
- 模板编码：`invoice-template`
- 配置对象名：`gateway-routing`

不推荐：

- `第一个流程`
- `2026-04-05-test`
- `新的配置副本`

判断标准：

- 同一个业务对象，下次进来仍然能得到同一个 `assetId`
- 不依赖展示文案，不依赖人工临时命名

#### 3. 统一使用小写 kebab-case

为了降低前后端协作成本，推荐统一使用：

- 全小写
- 单词之间用 `-` 分隔
- 不用空格
- 不用中文
- 不用驼峰

推荐：

- `gateway-routing`
- `order-review`
- `customer-support-v1`

不推荐：

- `GatewayRouting`
- `orderReview`
- `customer_support_v1`
- `订单审核流程`

这样做的好处：

- URL、数据库、日志、接口参数保持一致
- 避免大小写和编码问题
- 便于前后端、脚本、运维统一处理

#### 4. 版本信息不要塞进 `assetSpace`，谨慎塞进 `assetId`

通常版本属于“资产内容的生命周期”，不属于资产集合的命名本身。

推荐：

- `assetSpace = "prompts"`
- `assetId = "customer-support"`
- 用版本系统管理 `v1`、`v2`、草稿、发布

只有在“版本本身就是独立业务对象”时，才建议把版本写进 `assetId`，例如：

- `customer-support-v1`
- `customer-support-v2`

否则不推荐：

- `configs-v2`
- `gateway-routing-20260405`

因为这会让同一资产对象不断生成新的集合 ID，不利于持续编辑、版本追踪和权限绑定。

### 推荐命名模板

可以直接在团队里采用下面这套约定。

| 资产类型 | assetSpace | assetId 推荐规则 | 示例 |
|----------|------------|------------------|------|
| 服务配置 | `configs` | 直接用配置对象名或服务名 | `gateway-routing`、`order-service` |
| 业务流程 | `workflows` | 用流程编码 | `order-review`、`refund-approval` |
| 提示词模板 | `prompts` | 用提示词业务名 | `customer-support`、`risk-check` |
| 服务级资产 | `services` | 直接用 serviceName | `user-service`、`billing-service` |
| 页面模板 | `templates` | 用模板编码 | `invoice-template`、`email-notice` |

### 一个团队内可直接执行的约定示例

可以把规范收敛成下面 5 条：

1. `assetSpace` 只能取固定枚举：`configs`、`workflows`、`prompts`、`services`、`templates`。
2. `assetId` 必须复用业务主键、业务编码或 serviceName，不允许临时起名。
3. 全部使用小写 kebab-case。
4. 展示名称放在 `displayName`，不要把展示文案直接当作 `assetId`。
5. 版本由资产版本体系管理，不要默认拼进集合命名。

### 正反例对比

| 场景 | 推荐 | 不推荐 | 原因 |
|------|------|--------|------|
| 网关路由配置 | `configs / gateway-routing` | `gateway-config / route-v2` | 类别不稳定，版本混入集合 ID |
| 订单审核流程 | `workflows / order-review` | `workflow-page / 订单审核流程` | 展示文案不适合作为稳定主键 |
| 用户服务资产 | `services / user-service` | `service / UserService` | 大小写和风格不统一 |
| 客服提示词 | `prompts / customer-support` | `prompt-assets / cs-template-test` | 语义不清，带测试临时命名 |

### 事件与联动属性

| 入参 | 类型 | 含义 | 使用场景 |
|------|------|------|----------|
| `callbacks` | `AssetBrowserWorkspaceCallbacks` | 草稿创建、保存、发布、切换等业务钩子 | 接审批、埋点、二次确认、下游流程 |
| `onError` | `(error) => void` | 统一接收组件内部请求或动作异常 | 展示 toast、写日志、上报 Sentry |
| `onStateChange` | `(state) => void` | 同步当前工作区状态 | 在页面外部展示“当前版本”“是否有草稿”等摘要 |

### 渲染插槽属性

| 入参 | 类型 | 含义 | 常见用途 |
|------|------|------|----------|
| `renderHeaderExtras` | `(context) => ReactNode` | 在头部状态区追加内容 | 显示审批单号、发布批次 |
| `renderToolbarStart` | `(context) => ReactNode` | 在工具栏左侧插入自定义 UI | 资产标签、环境提示 |
| `renderToolbarEnd` | `(context) => ReactNode` | 在工具栏右侧插入自定义 UI | “触发流程”“提交审批”按钮 |
| `renderEditorActions` | `(context) => ReactNode` | 在编辑器操作区插入按钮 | “格式化”“校验语法”“同步元数据” |
| `renderDiffActions` | `(context) => ReactNode` | 在 Diff 区顶部插入按钮 | “导出变更单”“生成评审摘要” |
| `renderFooter` | `(context) => ReactNode` | 在底部状态栏插入内容 | 显示当前路径、草稿 ID、审批状态 |
| `renderTreeNodeMeta` | `(node) => ReactNode` | 自定义树节点右侧元信息 | 替换默认文件大小显示 |
| `renderTreeNodeActions` | `(node) => ReactNode` | 在树节点右侧追加操作 | 收藏、标记、快捷菜单 |

## 外部版本切换（Imperative Handle）

从这一版起，`AssetBrowserWorkspace` 和 `AssetBrowserConsoleWorkspace` 支持通过 `ref` 在任意时机调用内部动作，无需依赖 `callbacks` 上下文。

### 类型定义

```ts
interface AssetBrowserWorkspaceHandle {
    /** 切换到指定业务版本，触发树和编辑区重载。 */
    selectVersion(versionId: string): void;
    /** 重新拉取 collection、versions 和目录树。 */
    refreshWorkspace(): Promise<void>;
    /** 关闭 Diff、清空脏状态、清理编辑器缓存和标签页。 */
    clearDraftState(): void;
}
```

### 基本示例

```tsx
"use client";

import { useRef, useMemo } from "react";
import { AssetBrowserClient } from "protobuf-typescript-client-gen/dist/asset_browser_client";
import {
    AssetBrowserConsoleWorkspace,
    type AssetBrowserWorkspaceHandle,
} from "stew-asset-browser-react";

export default function SkillEditorPage() {
    const client = useMemo(
        () => new AssetBrowserClient({ baseUrl: "http://localhost:3012" }),
        [],
    );
    const workspaceRef = useRef<AssetBrowserWorkspaceHandle>(null);

    function handleLanguageSwitch(locale: string) {
        const localeVersionId = `v1.0.0-${locale}`;
        workspaceRef.current?.selectVersion(localeVersionId);
    }

    return (
        <>
            <nav>
                <button type="button" onClick={() => handleLanguageSwitch("en-us")}>English</button>
                <button type="button" onClick={() => handleLanguageSwitch("zh-cn")}>Chinese</button>
            </nav>
            <AssetBrowserConsoleWorkspace
                ref={workspaceRef}
                client={client}
                assetSpace="skills"
                assetId="my-skill"
                readOnly={false}
            />
        </>
    );
}
```

### 与 `readOnly` 配合使用

翻译版本或历史回溯等只读场景，可同时传入 `readOnly` 隐藏草稿操作按钮：

```tsx
const [isLocalePreview, setLocalePreview] = useState(false);

<AssetBrowserConsoleWorkspace
    ref={workspaceRef}
    client={client}
    assetSpace="skills"
    assetId="my-skill"
    readOnly={isLocalePreview}
/>
```

`readOnly={true}` 时的效果：

- 创建草稿、废弃草稿、发布版本按钮隐藏
- 编辑器强制只读（无论当前版本是否为草稿）
- 版本列表、版本对比、目录浏览、文件下载等功能不受影响

### 与现有 `callbacks.workspaceActions` 的关系

`ref` 暴露的三个方法与 `callbacks` 上下文中 `workspaceActions` 提供的方法完全一致。差异仅在于调用时机：

| 方式 | 可调用时机 | 适用场景 |
|------|-----------|---------|
| `ref.current.selectVersion(...)` | 任意时机 | 语言切换、外部按钮触发版本跳转 |
| `context.workspaceActions.selectVersion(...)` | 仅在 `onBefore*` 回调内 | 宿主接管发布流程后切版本 |

两者可以同时使用，互不冲突。

## callbacks 详细说明

`callbacks` 用来把 UI 工作流和业务逻辑接起来。

### 回调列表

| 回调 | 参数 | 返回值 | 触发时机 | 常见用途 |
|------|------|--------|----------|----------|
| `onWorkspaceLoaded` | `context` | `void \| Promise<void>` | 工作区完成首次加载后 | 初始化业务摘要、埋点 |
| `onSelectionChange` | `context` | `void \| Promise<void>` | 选中文件或目录变化时 | 联动右侧业务信息面板 |
| `onVersionChange` | `context` | `void \| Promise<void>` | 当前版本切换时 | 更新版本说明 |
| `onCompareVersionChange` | `context` | `void \| Promise<void>` | Diff 对比版本切换时 | 重刷评审信息 |
| `onDirtyChange` | `context` | `void \| Promise<void>` | 编辑器脏状态变化时 | 离开页面前提醒 |
| `onDiffVisibilityChange` | `(visible, context)` | `void \| Promise<void>` | Diff 面板显示状态变化时 | 埋点或切换外部布局 |
| `onStatusChange` | `(status, context)` | `void \| Promise<void>` | 顶部状态文案变化时 | 页面外部同步 toast |
| `onBeforeCreateDraft` | `context` | `boolean \| void \| Promise<boolean \| void>` | 创建草稿前 | 权限校验、确认框；`context.workspaceActions` 可用 |
| `onAfterCreateDraft` | `(result, context)` | `void \| Promise<void>` | 草稿创建后 | 记录草稿号、发通知 |
| `onBeforeDiscardDraft` | `context` | `boolean \| void \| Promise<boolean \| void>` | 丢弃草稿前 | 二次确认；`context.workspaceActions` 可用 |
| `onAfterDiscardDraft` | `context` | `void \| Promise<void>` | 丢弃草稿后 | 刷新外部审批状态 |
| `onBeforePublishDraft` | `context` | `boolean \| void \| Promise<boolean \| void>` | 发布草稿前 | 发布确认、风险校验；`context.workspaceActions` 可用 |
| `onAfterPublishDraft` | `(result, context)` | `void \| Promise<void>` | 发布成功后 | 刷新业务详情页 |
| `onBeforeSave` | `(text, context)` | `boolean \| void \| Promise<boolean \| void>` | 保存前 | 自定义校验、格式检查 |
| `onAfterSave` | `(result, context)` | `void \| Promise<void>` | 保存成功后 | 同步触发工作流 |

约定：

- `onBefore...` 返回 `false` 会中断后续动作。
- 回调可以是异步函数。
- `context` 里会带上当前 `assetSpace`、`assetId`、`selectedPath`、`draftVersionId`、`selectedVersion`、`showDiff` 等运行时信息。
- `context` 中出现的所有版本相关字段也都是业务版本号。
- `onBefore...` 回调的 `context` 中额外包含 `workspaceActions`，可用于在拦截默认行为后主动刷新工作台状态（见下方"宿主接管发布流程"）。

### 宿主接管发布流程

从这一版开始，`onBeforePublishDraft` 的 `context.workspaceActions` 暴露了工作台级动作，允许宿主在阻止默认发布后，自己完成业务编排，再把 SDK 内部状态切到新版本。

适用场景：

- 业务系统先生成自己的版本号，再把它作为 `versionId` 传给资产发布接口
- 发布前还要写业务数据库、提交审批单、生成审计记录或触发其他编排步骤
- 发布成功后，希望工作台直接刷新到新版本，而不是通过 remount 整个组件来强制重建状态

当前可用动作如下：

| 动作 | 类型 | 用途 |
|------|------|------|
| `refreshWorkspace` | `() => Promise<void>` | 重新拉取 collection、versions 和当前版本树；若当前选版仍存在，会尽量保留 |
| `selectVersion` | `(versionId: string) => void` | 切换到指定业务版本，触发树和编辑区重载 |
| `clearDraftState` | `() => void` | 关闭 Diff、清空脏状态、清理编辑器缓存和标签页 |

推荐顺序：

1. 在 `onBeforePublishDraft` 中先完成宿主自己的业务编排
2. 调用业务后端发布 draft，并把宿主生成的业务版本号作为 `versionId` 传给发布接口
3. 调用 `refreshWorkspace()` 拉取最新 collection 和版本列表
4. 调用 `selectVersion(newVersionId)` 切到刚发布出的版本
5. 调用 `clearDraftState()` 清理发布前的编辑态和 Diff
6. 返回 `false`，阻止 SDK 再走一次默认 publish

示例：

```tsx
<AssetBrowserWorkspace
  client={client}
  assetSpace="skills"
  assetId={skillId}
  callbacks={{
    onBeforePublishDraft: async (context) => {
      const actions = context.workspaceActions;
      if (!actions || !context.draftVersionId) {
        return false;
      }

      const businessVersionId = await createBusinessVersionId();

      await fetch(`/api/skills/${context.assetId}/publish`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          draftVersionId: context.draftVersionId,
          versionId: businessVersionId,
        }),
      });

      await actions.refreshWorkspace();
      actions.selectVersion(businessVersionId);
      actions.clearDraftState();
      return false;
    },
  }}
/>
```

说明：

- `versionId` 仍然由宿主业务系统决定，SDK 不负责生成业务版本号
- 若宿主没有返回 `false`，SDK 仍会继续走默认发布流程
- `onAfterPublishDraft` 只会在 SDK 默认发布成功后触发；如果发布完全由宿主接管，请在 `onBeforePublishDraft` 内自行处理宿主侧后续逻辑

### 回调示例 1：保存前做业务校验

```tsx
<AssetBrowserWorkspace
  client={client}
  assetSpace="configs"
  assetId="gateway-policy"
  callbacks={{
    onBeforeSave: async (text, context) => {
      if (!context.selectedPath.endsWith(".yaml")) {
        return true;
      }

      if (!text.includes("version:")) {
        alert("YAML 配置必须包含 version 字段");
        return false;
      }

      return true;
    },
  }}
/>
```

### 回调示例 2：发布后通知业务系统

```tsx
<AssetBrowserWorkspace
  client={client}
  assetSpace="workflows"
  assetId="order-review"
  callbacks={{
    onAfterPublishDraft: async (result, context) => {
      await fetch("/api/workflow/publish-callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetSpace: context.assetSpace,
          assetId: context.assetId,
          versionId: result.publishedVersion.versionId,
        }),
      });
    },
  }}
/>
```

## 业务扩展点

`AssetBrowserWorkspace` 已预留业务联动能力：

- 回调钩子：`onBeforeCreateDraft`、`onAfterSave`、`onAfterPublishDraft`、`onSelectionChange` 等
- 渲染插槽：`renderToolbarEnd`、`renderEditorActions`、`renderFooter` 等
- 状态联动：`onStateChange`

```tsx
<AssetBrowserWorkspace
  client={client}
  assetSpace="configs"
  assetId="my-app"
  callbacks={{
    onBeforeDiscardDraft: () => window.confirm("确认丢弃草稿？"),
    onAfterSave: (_result, context) => {
      console.log("saved", context.selectedPath);
    },
  }}
  renderToolbarEnd={(context) => (
    <button type="button" onClick={() => console.log("workflow", context.selectedPath)}>
      Trigger workflow
    </button>
  )}
/>
```

### 插槽示例：在工具栏中注入业务动作

```tsx
<AssetBrowserWorkspace
  client={client}
  assetSpace="configs"
  assetId="my-app"
  renderToolbarEnd={(context) => (
    <button
      type="button"
      onClick={() => {
        console.log("submit workflow", {
          path: context.selectedPath,
          draftVersionId: context.draftVersionId,
        });
      }}
    >
      提交审批
    </button>
  )}
  renderFooter={(context) => (
    <div>
      当前路径: {context.selectedPath || "-"}，当前草稿: {context.draftVersionId || "-"}
    </div>
  )}
/>
```

## 细粒度组件

如果业务前端已有自己的布局容器，可只复用局部组件：

```tsx
import {
  AssetTree,
  AssetEditor,
  AssetDiffViewer,
} from "stew-asset-browser-react";
```

适用场景：

- 在已有业务表单页面内嵌一个资产树
- 保留自定义顶部工具栏和权限按钮
- 只需要编辑器或只需要 Diff 面板

### AssetTree 入参

| 入参 | 类型 | 含义 | 示例 |
|------|------|------|------|
| `nodes` | `TreeNode[]` | 目录树结构数据 | `buildTree(entries)` 的结果 |
| `expandedPaths` | `Set<string>` | 当前展开的目录路径集合 | `new Set(["/", "/templates"])` |
| `selectedPath` | `string` | 当前选中的文件或目录路径 | `"/templates/main.yaml"` |
| `loading` | `boolean` | 是否显示加载态 | `true` |
| `onSelect` | `(path, entry) => void` | 点击节点时触发 | 切换当前文件 |
| `onToggle` | `(path) => void` | 展开/折叠目录时触发 | 更新 `expandedPaths` |
| `renderNodeMeta` | `(node) => ReactNode` | 自定义右侧元信息 | 显示作者、校验状态 |
| `renderNodeActions` | `(node) => ReactNode` | 自定义节点操作区 | 收藏、更多操作 |

### AssetEditor 入参

| 入参 | 类型 | 含义 | 示例 |
|------|------|------|------|
| `selectedPath` | `string` | 当前正在编辑的路径 | `"/rules/route.yaml"` |
| `selectedEntry` | `AssetTreeEntry \| null` | 当前条目元信息 | 文件大小、content-type 等 |
| `language` | `string` | Monaco 语言模式 | `yaml`、`json`、`typescript` |
| `value` | `string` | 编辑器文本 | 文件当前内容 |
| `canEdit` | `boolean` | 是否可编辑 | 草稿版本下通常为 `true` |
| `dirty` | `boolean` | 内容是否已修改 | 用于控制 Save 按钮 |
| `saving` | `boolean` | 保存中状态 | 保存时显示 `Saving...` |
| `entryRevision` | `number` | 当前文件 revision | 用于乐观锁提示 |
| `onChange` | `(value) => void` | 内容修改时触发 | 同步本地 state |
| `onSave` | `() => void` | 点击保存时触发 | 调用 `saveDraftText` |
| `actions` | `ReactNode` | 注入额外按钮 | 格式化、校验 |

### AssetDiffViewer 入参

| 入参 | 类型 | 含义 | 示例 |
|------|------|------|------|
| `label` | `string` | 当前 diff 顶部说明 | `v1 -> v2` |
| `language` | `string` | DiffEditor 语言模式 | `yaml` |
| `summary` | `AssetDiffSummary \| null` | Diff 汇总信息 | 总变更数、修改数 |
| `entries` | `AssetDiffEntry[]` | 变更条目列表 | `diff.entries` |
| `selectedPath` | `string` | 当前聚焦的变更文件 | `"/a/b.yaml"` |
| `originalText` | `string` | 左侧文本 | 基线版本内容 |
| `modifiedText` | `string` | 右侧文本 | 新版本内容 |
| `onSelectEntry` | `(path) => void` | 点击 diff 条目时触发 | 切换当前 diff 文件 |
| `actions` | `ReactNode` | 顶部扩展操作 | 导出 diff、生成摘要 |

### 组合示例

```tsx
import { useState } from "react";
import {
  AssetTree,
  AssetEditor,
  AssetDiffViewer,
} from "stew-asset-browser-react";

export default function CustomAssetLayout() {
  const [selectedPath, setSelectedPath] = useState("/rules/route.yaml");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 16 }}>
      <AssetTree
        nodes={treeNodes}
        expandedPaths={expandedPaths}
        selectedPath={selectedPath}
        onSelect={(path) => setSelectedPath(path)}
        onToggle={togglePath}
      />
      <AssetEditor
        selectedPath={selectedPath}
        selectedEntry={selectedEntry}
        language="yaml"
        value={editorText}
        canEdit
        dirty={dirty}
        entryRevision={entryRevision}
        onChange={setEditorText}
        onSave={saveCurrentFile}
      />
    </div>
  );
}
```

## 主题与宿主设计系统集成

SDK 支持三种主题模式，通过 `theme` prop 控制：

- `light`（默认）：使用内置浅色 token
- `dark`：使用内置暗色 token
- `inherit`：使用浅色默认值，但允许宿主通过 `themeVars` 完全接管配色

### 基本用法

```tsx
// 暗色模式
<AssetBrowserConsoleWorkspace
  client={client}
  assetSpace="skills"
  assetId="my-skill"
  theme="dark"
  editorTheme="vs-dark"
/>
```

### 对接宿主设计系统

```tsx
// 完全跟随宿主系统的 CSS 变量
<AssetBrowserConsoleWorkspace
  client={client}
  assetSpace="skills"
  assetId="my-skill"
  theme="inherit"
  editorTheme="vs-dark"
  showDecorativeBackground={false}
  themeVars={{
    "--stew-ab-bg": "var(--background)",
    "--stew-ab-fg": "var(--foreground)",
    "--stew-ab-border": "var(--border)",
    "--stew-ab-surface": "var(--background)",
    "--stew-ab-surface-muted": "var(--background-secondary)",
    "--stew-ab-sidebar-bg": "var(--background-secondary)",
    "--stew-ab-accent": "var(--color-primary)",
    "--stew-ab-accent-soft": "rgba(var(--color-primary-rgb), 0.12)",
    "--stew-ab-link": "var(--color-link)",
    "--stew-ab-code-bg": "var(--color-code-bg)",
    "--stew-ab-heading-border": "var(--border)",
    "--stew-ab-table-border": "var(--border)",
    "--stew-ab-table-header-bg": "var(--background-secondary)",
    "--stew-ab-directory-icon": "var(--color-warning)",
  }}
/>
```

### 关闭装饰渐变

默认根容器在浅色模式下会渲染微弱的 teal/blue 装饰渐变。当 SDK 嵌入宿主页面时，可通过 `showDecorativeBackground={false}` 禁用，避免与宿主背景冲突。

### Monaco 编辑器主题

`editorTheme` 默认跟随 `theme`：light 对应 `vs`，dark 对应 `vs-dark`。可以显式传入任意 Monaco 内置或自定义主题名。

### CSS 变量清单

所有视觉样式均通过 `--stew-ab-*` 前缀的 CSS 变量驱动，业务侧可通过 `themeVars` prop 或宿主 CSS 覆盖任意变量。

#### 基础布局变量

| 变量名 | 含义 | 浅色默认值 |
|--------|------|-----------|
| `--stew-ab-bg` | 根容器背景 | `#fcfcfd` |
| `--stew-ab-fg` | 主文本色 | `#0f172a` |
| `--stew-ab-muted-fg` | 次要文本 | `#64748b` |
| `--stew-ab-border` | 通用边框色 | `rgba(148, 163, 184, 0.16)` |
| `--stew-ab-surface` | 卡片/面板背景 | `#ffffff` |
| `--stew-ab-surface-muted` | 低对比面 | `#f8fafc` |
| `--stew-ab-surface-elevated` | 浮层/弹窗背景 | `#ffffff` |
| `--stew-ab-sidebar-bg` | 侧栏背景 | `#f8fafc` |
| `--stew-ab-topbar-bg` | 顶栏背景 | `#ffffff` |
| `--stew-ab-footer-bg` | 底栏背景 | `#f8fafc` |
| `--stew-ab-shadow` | 容器阴影 | `0 18px 50px rgba(15, 23, 42, 0.08)` |
| `--stew-ab-decoration-a` | 装饰渐变 A | `rgba(15, 118, 110, 0.08)` |
| `--stew-ab-decoration-b` | 装饰渐变 B | `rgba(14, 165, 233, 0.08)` |

#### 强调色与交互变量

| 变量名 | 含义 | 浅色默认值 |
|--------|------|-----------|
| `--stew-ab-accent` | 主色调 | `#0ea5e9` |
| `--stew-ab-accent-soft` | 主色低饱和 | `rgba(14, 165, 233, 0.12)` |
| `--stew-ab-accent-contrast` | 主色上的文字 | `#ffffff` |
| `--stew-ab-selected-bg` | 选中态背景 | `rgba(14, 165, 233, 0.12)` |
| `--stew-ab-highlight-bg` | 高亮闪烁背景 | `rgba(14, 165, 233, 0.10)` |
| `--stew-ab-highlight-ring` | 高亮外圈阴影 | `rgba(14, 165, 233, 0.16)` |

#### 内容渲染变量

| 变量名 | 含义 | 浅色默认值 |
|--------|------|-----------|
| `--stew-ab-link` | 链接/活跃 Tab 文字色 | `#0284c7` |
| `--stew-ab-code-bg` | 行内代码背景 | `#e2e8f0` |
| `--stew-ab-code-fg` | 行内代码文字色 | `#0369a1` |
| `--stew-ab-heading-border` | Markdown 标题下划线 | `#e2e8f0` |
| `--stew-ab-blockquote-border` | 引用块左线 | `#cbd5e1` |
| `--stew-ab-blockquote-bg` | 引用块背景 | `#f8fafc` |
| `--stew-ab-table-border` | 表格边框 | `#e2e8f0` |
| `--stew-ab-table-header-bg` | 表头背景 | `#f8fafc` |
| `--stew-ab-directory-icon` | 目录节点图标色 | `#b45309` |

#### 暗色模式对照

暗色模式通过 `theme="dark"` 启用，所有变量自动切换为暗色预设。核心差异：

| 变量名 | 暗色值 |
|--------|--------|
| `--stew-ab-bg` | `#0f172a` |
| `--stew-ab-fg` | `#e2e8f0` |
| `--stew-ab-surface` | `#1e293b` |
| `--stew-ab-accent` | `#38bdf8` |
| `--stew-ab-link` | `#38bdf8` |
| `--stew-ab-code-bg` | `#334155` |
| `--stew-ab-code-fg` | `#7dd3fc` |
| `--stew-ab-heading-border` | `#334155` |
| `--stew-ab-table-border` | `#334155` |
| `--stew-ab-directory-icon` | `#f59e0b` |

完整类型定义见 `AssetBrowserThemeVars`。

### 定制示例：Indigo 品牌色

```tsx
<AssetBrowserConsoleWorkspace
  client={client}
  assetSpace="configs"
  assetId="gateway-routing"
  theme="light"
  themeVars={{
    "--stew-ab-accent": "#6366f1",
    "--stew-ab-accent-soft": "rgba(99, 102, 241, 0.12)",
    "--stew-ab-accent-contrast": "#ffffff",
    "--stew-ab-selected-bg": "rgba(99, 102, 241, 0.10)",
    "--stew-ab-link": "#4f46e5",
    "--stew-ab-code-fg": "#4f46e5",
    "--stew-ab-highlight-bg": "rgba(99, 102, 241, 0.10)",
    "--stew-ab-highlight-ring": "rgba(99, 102, 241, 0.16)",
    "--stew-ab-directory-icon": "#c026d3",
  }}
/>
```

### 纯 CSS 覆盖（不使用 themeVars）

如果使用 `theme="inherit"`，也可以在宿主 CSS 中直接定义变量：

```css
.my-asset-container {
  --stew-ab-accent: #6366f1;
  --stew-ab-link: #4f46e5;
  --stew-ab-code-bg: #eef2ff;
  --stew-ab-code-fg: #4338ca;
  --stew-ab-heading-border: #e0e7ff;
  --stew-ab-table-border: #e0e7ff;
  --stew-ab-table-header-bg: #eef2ff;
}
```

```tsx
<div className="my-asset-container">
  <AssetBrowserConsoleWorkspace
    client={client}
    assetSpace="configs"
    assetId="gateway-routing"
    theme="inherit"
    showDecorativeBackground={false}
  />
</div>
```

## Dashboard 示例

仓库内已提供真实接入页，可直接参考：

- `stew-dashboard/app/(console)/assets/page.tsx`

这个页面展示了：

- 如何实例化 `AssetBrowserClient`
- 如何用 `callbacks` 对接业务保存/发布逻辑
- 如何用 `renderToolbarEnd` 和 `renderFooter` 注入业务 UI