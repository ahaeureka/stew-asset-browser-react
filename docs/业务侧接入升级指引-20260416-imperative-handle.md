# 资产浏览器 SDK 升级指引 — 2026-04-16 (Imperative Handle & ReadOnly)

## 本次变更：外部版本切换 API 与只读模式

### 新增功能

1. **`ref` 暴露 `AssetBrowserWorkspaceHandle`**：宿主可在任意时机调用 `selectVersion()`、`refreshWorkspace()`、`clearDraftState()`，无需通过 `callbacks` 上下文
2. **`readOnly` prop**：隐藏创建草稿/废弃草稿/发布版本按钮，编辑器强制只读

### 背景

此前 `workspaceActions`（包含 `selectVersion()`、`refreshWorkspace()`、`clearDraftState()`）仅在 `onBefore*` 回调的 `context` 参数中可用，宿主无法在任意时机（如用户点击语言切换器）调用这些方法。

`initialVersionId` 只在组件首次挂载时生效，后续 re-render 传入新值不会触发版本切换。使用 React key hack（`key={versionId}`）会导致整个组件卸载重建，丢失编辑器状态。

### 使用方式

#### 外部版本切换

```tsx
import { useRef } from "react";
import {
    AssetBrowserConsoleWorkspace,
    type AssetBrowserWorkspaceHandle,
} from "stew-asset-browser-react";

const workspaceRef = useRef<AssetBrowserWorkspaceHandle>(null);

<AssetBrowserConsoleWorkspace
    ref={workspaceRef}
    client={client}
    assetSpace="skills"
    assetId={skillId}
/>

// 在任意时机调用
workspaceRef.current?.selectVersion("v20260410071619.57ef923d-zh-cn");
```

#### 只读模式

```tsx
<AssetBrowserConsoleWorkspace
    ref={workspaceRef}
    client={client}
    assetSpace="skills"
    assetId={skillId}
    readOnly={isLocalePreview}
/>
```

`readOnly={true}` 效果：

- 创建草稿、废弃草稿、发布版本按钮隐藏
- 编辑器强制只读
- 版本列表、版本对比、目录浏览、文件下载不受影响

#### Handle 方法说明

| 方法 | 类型 | 用途 |
|------|------|------|
| `selectVersion` | `(versionId: string) => void` | 切换到指定业务版本，触发目录树和编辑区重载 |
| `refreshWorkspace` | `() => Promise<void>` | 重新拉取 collection、versions 和当前版本树 |
| `clearDraftState` | `() => void` | 关闭 Diff、清空脏状态、清理编辑器缓存和标签页 |

### 向后兼容性

- 不传 `ref` 时行为完全不变
- 不传 `readOnly` 时默认为 `false`，行为不变
- 原有 `enableEditing` prop 仍然有效，`readOnly` 是额外的更高层级控制

### 业务侧升级方式

更新依赖并重新构建：

```bash
pnpm install
pnpm build
```

无需修改现有业务代码。新功能为纯新增 API。

### 技术细节

- 利用 React 19 的 ref-as-prop 特性，`ref` 直接作为普通 prop 传递，无需 `forwardRef`
- `useImperativeHandle` 将已有的 `createWorkspaceActions()` 暴露给外部 ref
- `readOnly` 在 `canEdit` 计算中增加 `!readOnly` 守卫，并在两套布局（console / default）的草稿操作按钮渲染处加前置判断
