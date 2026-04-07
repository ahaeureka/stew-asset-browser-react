import type { CSSProperties, ReactNode } from 'react';
import type { AssetCollection, DownloadEntryResult, AssetTreeEntry, AssetVersionSummary, CreateDraftResult, PublishResult, SaveTextResult } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
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
export declare function languageFor(entry: AssetTreeEntry | null, hint: string): string;
export declare function buildTree(entries: AssetTreeEntry[]): TreeNode[];
export declare function collectInitialExpanded(nodes: TreeNode[]): Set<string>;
export declare function pill(label: string, value: string): ReactNode;
export declare function EmptyMessage({ title, message }: {
    title: string;
    message: string;
}): import("react/jsx-runtime").JSX.Element;
export {};
