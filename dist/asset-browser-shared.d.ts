import React, { type CSSProperties, type ReactNode } from 'react';
import type { AssetCollection, DownloadEntryResult, AssetTreeEntry, AssetVersionSummary, CreateDraftResult, PublishResult, SaveTextResult } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
export type AssetBrowserThemeMode = 'light' | 'dark' | 'inherit';
export type AssetBrowserEditorTheme = 'vs' | 'vs-dark' | (string & {});
export type AssetBrowserWorkspaceAppearance = 'default' | 'console';
export type AssetBrowserMode = 'workspace' | 'browse-preview';
export type PreviewFileKind = 'markdown' | 'json' | 'text' | 'yaml' | 'python' | (string & {});
export type PreviewMode = 'rendered' | 'source' | 'split';
export interface PreviewTreeNode {
    path: string;
    name: string;
    isDirectory: boolean;
    sizeBytes?: number;
    fileKind?: PreviewFileKind;
    children?: PreviewTreeNode[];
}
export interface PreviewDocument {
    path: string;
    fileKind: PreviewFileKind;
    content: string;
    sizeBytes?: number;
}
export interface AssetBrowserThemeVars {
    '--stew-ab-bg': string;
    '--stew-ab-fg': string;
    '--stew-ab-muted-fg': string;
    '--stew-ab-border': string;
    '--stew-ab-surface': string;
    '--stew-ab-surface-muted': string;
    '--stew-ab-surface-elevated': string;
    '--stew-ab-sidebar-bg': string;
    '--stew-ab-topbar-bg': string;
    '--stew-ab-footer-bg': string;
    '--stew-ab-accent': string;
    '--stew-ab-accent-soft': string;
    '--stew-ab-accent-contrast': string;
    '--stew-ab-selected-bg': string;
    '--stew-ab-shadow': string;
    '--stew-ab-decoration-a': string;
    '--stew-ab-decoration-b': string;
    '--stew-ab-link': string;
    '--stew-ab-code-bg': string;
    '--stew-ab-code-fg': string;
    '--stew-ab-heading-border': string;
    '--stew-ab-blockquote-border': string;
    '--stew-ab-blockquote-bg': string;
    '--stew-ab-table-border': string;
    '--stew-ab-table-header-bg': string;
    '--stew-ab-highlight-bg': string;
    '--stew-ab-highlight-ring': string;
    '--stew-ab-directory-icon': string;
}
export declare const LIGHT_THEME_VARS: AssetBrowserThemeVars;
export declare const DARK_THEME_VARS: AssetBrowserThemeVars;
export declare function resolveThemeVars(theme?: AssetBrowserThemeMode, themeVars?: Partial<AssetBrowserThemeVars>, showDecorativeBackground?: boolean): Record<string, string>;
export declare function resolveEditorTheme(theme?: AssetBrowserThemeMode, editorTheme?: AssetBrowserEditorTheme): string;
export type WorkspaceTone = 'neutral' | 'success' | 'warning' | 'error';
export interface StatusMessage {
    tone: WorkspaceTone;
    text: string;
}
export interface TreeNode {
    id: string;
    name: string;
    path: string;
    entry?: AssetTreeEntry;
    children: TreeNode[];
    isDirectory: boolean;
}
export interface PreviewContext {
    selectedPath: string;
    selectedNode: PreviewTreeNode | null;
    document: PreviewDocument | null;
    previewMode: PreviewMode;
    availablePreviewModes: PreviewMode[];
    loading: boolean;
    setPreviewMode: (mode: PreviewMode) => void;
}
export interface AssetBrowserWorkspaceState {
    collection: AssetCollection | null;
    versions: AssetVersionSummary[];
    /** Business version ID currently selected in the workspace. */
    selectedVersionId: string;
    /** Business version ID selected as the diff baseline. */
    compareVersionId: string;
    selectedPath: string;
    hasDraft: boolean;
    dirty: boolean;
    loading: boolean;
}
export interface AssetBrowserActionContext {
    assetSpace: string;
    assetId: string;
    collection: AssetCollection | null;
    versions: AssetVersionSummary[];
    selectedVersion: AssetVersionSummary | null;
    compareVersion: AssetVersionSummary | null;
    selectedEntry: AssetTreeEntry | null;
    selectedPath: string;
    /** Business version ID of the current draft, when present. */
    draftVersionId: string;
    dirty: boolean;
    loading: boolean;
    showDiff: boolean;
    status: StatusMessage | null;
    /** Imperative actions for workspace state control. Available in onBefore* callbacks. */
    workspaceActions?: AssetBrowserWorkspaceActions;
}
/** Workspace control actions exposed in onBefore* callback contexts. */
export interface AssetBrowserWorkspaceActions {
    /** Reload collection, versions, and tree from the server while preserving valid selections when possible. */
    refreshWorkspace: () => Promise<void>;
    /** Switch the selected version. Triggers tree reload via the version-change effect. */
    selectVersion: (versionId: string) => void;
    /** Clear diff visibility, reset dirty state, and clear cached editor sessions/tabs. */
    clearDraftState: () => void;
}
/** Imperative handle exposed via ref for external workspace control. */
export interface AssetBrowserWorkspaceHandle {
    /** Switch the selected version. Triggers tree reload via the version-change effect. */
    selectVersion(versionId: string): void;
    /** Reload collection, versions, and tree from the server. */
    refreshWorkspace(): Promise<void>;
    /** Clear diff visibility, reset dirty state, and clear cached editor sessions/tabs. */
    clearDraftState(): void;
}
type MaybePromise<T> = T | Promise<T>;
export interface AssetBrowserWorkspaceCallbacks {
    onWorkspaceLoaded?: (context: AssetBrowserActionContext) => MaybePromise<void>;
    onSelectionChange?: (context: AssetBrowserActionContext) => MaybePromise<void>;
    onVersionChange?: (context: AssetBrowserActionContext) => MaybePromise<void>;
    onCompareVersionChange?: (context: AssetBrowserActionContext) => MaybePromise<void>;
    onDirtyChange?: (context: AssetBrowserActionContext) => MaybePromise<void>;
    onDiffVisibilityChange?: (visible: boolean, context: AssetBrowserActionContext) => MaybePromise<void>;
    onStatusChange?: (status: StatusMessage | null, context: AssetBrowserActionContext) => MaybePromise<void>;
    onBeforeCreateDraft?: (context: AssetBrowserActionContext) => MaybePromise<boolean | void>;
    onAfterCreateDraft?: (result: CreateDraftResult, context: AssetBrowserActionContext) => MaybePromise<void>;
    onBeforeDiscardDraft?: (context: AssetBrowserActionContext) => MaybePromise<boolean | void>;
    onAfterDiscardDraft?: (context: AssetBrowserActionContext) => MaybePromise<void>;
    onBeforePublishDraft?: (context: AssetBrowserActionContext) => MaybePromise<boolean | void>;
    onAfterPublishDraft?: (result: PublishResult, context: AssetBrowserActionContext) => MaybePromise<void>;
    onBeforeSave?: (text: string, context: AssetBrowserActionContext) => MaybePromise<boolean | void>;
    onAfterSave?: (result: SaveTextResult, context: AssetBrowserActionContext) => MaybePromise<void>;
    onBeforeExport?: (target: {
        versionId: string;
        path: string;
    }, context: AssetBrowserActionContext) => MaybePromise<boolean | void>;
    onAfterExport?: (result: DownloadEntryResult, context: AssetBrowserActionContext) => MaybePromise<void>;
}
export declare const shellStyle: CSSProperties;
export declare const panelHandleStyle: CSSProperties;
export declare const sectionStyle: CSSProperties;
export declare const cardHeaderStyle: CSSProperties;
export declare const toolbarStyle: CSSProperties;
export declare const buttonBaseStyle: CSSProperties;
export declare const primaryButtonStyle: CSSProperties;
export declare const subHeaderStyle: CSSProperties;
export declare const selectStyle: CSSProperties;
export declare const monoFont = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace";
export declare function toneStyle(tone: WorkspaceTone): CSSProperties;
export declare function formatBytes(bytes: number): string;
export declare function needsLiteralUnescape(text: string): boolean;
export declare function unescapeLiteralNewlines(text: string): string;
export declare function languageFor(entry: AssetTreeEntry | null, hint: string): string;
export declare function buildTree(entries: AssetTreeEntry[]): TreeNode[];
export declare function collectInitialExpanded(nodes: TreeNode[]): Set<string>;
export declare function pill(label: string, value: string): ReactNode;
export declare function EmptyMessage({ title, message }: {
    title: string;
    message: string;
}): React.JSX.Element;
export declare function LoadingOverlay({ title, message, }: {
    title?: string;
    message?: string;
}): React.JSX.Element;
export {};
