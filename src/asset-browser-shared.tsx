"use client";

import React, { type CSSProperties, type ReactNode } from 'react';
import type {
    AssetCollection,
    DownloadEntryResult,
    AssetTreeEntry,
    AssetVersionSummary,
    CreateDraftResult,
    PublishResult,
    SaveTextResult,
} from 'protobuf-typescript-client-gen/dist/asset_browser_client';

// ---------------------------------------------------------------------------
// Theme types
// ---------------------------------------------------------------------------

export type AssetBrowserThemeMode = 'light' | 'dark' | 'inherit';

export type AssetBrowserEditorTheme = 'vs' | 'vs-dark' | (string & {});

export type AssetBrowserWorkspaceAppearance = 'default' | 'console';

export type AssetBrowserMode = 'workspace' | 'browse-preview';

export type PreviewFileKind =
    | 'markdown'
    | 'json'
    | 'text'
    | 'yaml'
    | 'python'
    | (string & {});

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
}

export const LIGHT_THEME_VARS: AssetBrowserThemeVars = {
    '--stew-ab-bg': '#fcfcfd',
    '--stew-ab-fg': '#0f172a',
    '--stew-ab-muted-fg': '#64748b',
    '--stew-ab-border': 'rgba(148, 163, 184, 0.16)',
    '--stew-ab-surface': '#ffffff',
    '--stew-ab-surface-muted': '#f8fafc',
    '--stew-ab-surface-elevated': '#ffffff',
    '--stew-ab-sidebar-bg': '#f8fafc',
    '--stew-ab-topbar-bg': '#ffffff',
    '--stew-ab-footer-bg': '#f8fafc',
    '--stew-ab-accent': '#0ea5e9',
    '--stew-ab-accent-soft': 'rgba(14, 165, 233, 0.12)',
    '--stew-ab-accent-contrast': '#ffffff',
    '--stew-ab-selected-bg': 'rgba(14, 165, 233, 0.12)',
    '--stew-ab-shadow': '0 18px 50px rgba(15, 23, 42, 0.08)',
    '--stew-ab-decoration-a': 'rgba(15, 118, 110, 0.08)',
    '--stew-ab-decoration-b': 'rgba(14, 165, 233, 0.08)',
};

export const DARK_THEME_VARS: AssetBrowserThemeVars = {
    '--stew-ab-bg': '#0f172a',
    '--stew-ab-fg': '#e2e8f0',
    '--stew-ab-muted-fg': '#94a3b8',
    '--stew-ab-border': 'rgba(148, 163, 184, 0.12)',
    '--stew-ab-surface': '#1e293b',
    '--stew-ab-surface-muted': '#1e293b',
    '--stew-ab-surface-elevated': '#334155',
    '--stew-ab-sidebar-bg': '#1e293b',
    '--stew-ab-topbar-bg': '#1e293b',
    '--stew-ab-footer-bg': '#1e293b',
    '--stew-ab-accent': '#38bdf8',
    '--stew-ab-accent-soft': 'rgba(56, 189, 248, 0.14)',
    '--stew-ab-accent-contrast': '#0f172a',
    '--stew-ab-selected-bg': 'rgba(56, 189, 248, 0.14)',
    '--stew-ab-shadow': '0 18px 50px rgba(0, 0, 0, 0.32)',
    '--stew-ab-decoration-a': 'rgba(45, 212, 191, 0.10)',
    '--stew-ab-decoration-b': 'rgba(56, 189, 248, 0.10)',
};

export function resolveThemeVars(
    theme: AssetBrowserThemeMode = 'light',
    themeVars?: Partial<AssetBrowserThemeVars>,
    showDecorativeBackground = true,
): Record<string, string> {
    const base: AssetBrowserThemeVars =
        theme === 'dark' ? { ...DARK_THEME_VARS } :
            theme === 'inherit' ? { ...LIGHT_THEME_VARS } :
                { ...LIGHT_THEME_VARS };

    const merged: Record<string, string> = { ...base, ...themeVars };

    if (!showDecorativeBackground) {
        merged['--stew-ab-decoration-a'] = 'transparent';
        merged['--stew-ab-decoration-b'] = 'transparent';
    }

    return merged;
}

export function resolveEditorTheme(
    theme: AssetBrowserThemeMode = 'light',
    editorTheme?: AssetBrowserEditorTheme,
): string {
    if (editorTheme) {
        return editorTheme;
    }
    return theme === 'dark' ? 'vs-dark' : 'vs';
}

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
    onBeforeExport?: (
        target: { versionId: string; path: string },
        context: AssetBrowserActionContext,
    ) => MaybePromise<boolean | void>;
    onAfterExport?: (result: DownloadEntryResult, context: AssetBrowserActionContext) => MaybePromise<void>;
}

export const shellStyle: CSSProperties = {
    border: '1px solid var(--stew-ab-border, rgba(15, 23, 42, 0.12))',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'var(--stew-ab-bg, #fcfcfd)',
    boxShadow: 'var(--stew-ab-shadow, 0 18px 50px rgba(15, 23, 42, 0.08))',
    color: 'var(--stew-ab-fg, #0f172a)',
};

export const panelHandleStyle: CSSProperties = {
    width: 8,
    background: 'linear-gradient(180deg, rgba(148,163,184,0.15), rgba(148,163,184,0.35))',
};

export const sectionStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
};

export const cardHeaderStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '16px 18px',
    borderBottom: '1px solid var(--stew-ab-border, rgba(148, 163, 184, 0.18))',
    background: 'var(--stew-ab-topbar-bg, rgba(255,255,255,0.84))',
    backdropFilter: 'blur(10px)',
};

export const toolbarStyle: CSSProperties = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    padding: '14px 18px',
    borderBottom: '1px solid var(--stew-ab-border, rgba(148, 163, 184, 0.14))',
    background: 'var(--stew-ab-surface-muted, rgba(248,250,252,0.96))',
};

export const buttonBaseStyle: CSSProperties = {
    appearance: 'none',
    borderRadius: 999,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--stew-ab-border, rgba(148,163,184,0.24))',
    background: 'var(--stew-ab-surface, #ffffff)',
    color: 'var(--stew-ab-fg, #0f172a)',
};

export const primaryButtonStyle: CSSProperties = {
    ...buttonBaseStyle,
    borderColor: 'var(--stew-ab-accent-soft, rgba(14,165,233,0.28))',
    background: 'linear-gradient(135deg, var(--stew-ab-accent, #0ea5e9), #2563eb)',
    color: 'var(--stew-ab-accent-contrast, #ffffff)',
};

export const subHeaderStyle: CSSProperties = {
    padding: '14px 16px',
    borderBottom: '1px solid var(--stew-ab-border, rgba(148,163,184,0.14))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: 'var(--stew-ab-surface, rgba(255,255,255,0.72))',
};

export const selectStyle: CSSProperties = {
    borderRadius: 12,
    border: '1px solid var(--stew-ab-border, rgba(148,163,184,0.24))',
    background: 'var(--stew-ab-surface, #ffffff)',
    color: 'var(--stew-ab-fg, #0f172a)',
    padding: '10px 12px',
    fontSize: 13,
    minWidth: 0,
};

export const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace';

export function toneStyle(tone: WorkspaceTone): CSSProperties {
    if (tone === 'success') {
        return { color: '#166534', background: 'rgba(22,101,52,0.08)' };
    }
    if (tone === 'warning') {
        return { color: '#9a6700', background: 'rgba(202,138,4,0.12)' };
    }
    if (tone === 'error') {
        return { color: '#b42318', background: 'rgba(180,35,24,0.08)' };
    }
    return { color: 'var(--stew-ab-muted-fg, #334155)', background: 'rgba(148,163,184,0.10)' };
}

export function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}

export function needsLiteralUnescape(text: string): boolean {
    const escapedNewlines = (text.match(/\\n/g) ?? []).length;
    const octalSequences = (text.match(/\\[0-3][0-7]{2}/g) ?? []).length;
    const escapedQuotes = (text.match(/\\["']/g) ?? []).length;
    const escapedBackticks = (text.match(/\\`/g) ?? []).length;
    if (escapedNewlines === 0 && octalSequences === 0 && escapedQuotes === 0 && escapedBackticks === 0) {
        return false;
    }
    const realNewlines = (text.match(/\n/g) ?? []).length;
    return (escapedNewlines > 2 && realNewlines < escapedNewlines)
        || octalSequences > 2
        || escapedQuotes > 2
        || escapedBackticks > 1;
}

function decodeOctalEscapes(text: string): string {
    return text.replace(
        /(?:\\[0-3][0-7]{2})+/g,
        (seq) => {
            const bytes: number[] = [];
            for (const m of seq.matchAll(/\\([0-3][0-7]{2})/g)) {
                bytes.push(parseInt(m[1], 8));
            }
            try {
                return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
            } catch {
                return seq;
            }
        },
    );
}

export function unescapeLiteralNewlines(text: string): string {
    return decodeOctalEscapes(text)
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\`/g, '`')
        .replace(/\\\\/g, '\\');
}

export function languageFor(entry: AssetTreeEntry | null, hint: string): string {
    const value = (hint || entry?.languageHint || entry?.contentType || '').toLowerCase();
    const pathValue = (entry?.path || '').toLowerCase();
    if (value.includes('typescript')) return 'typescript';
    if (value.includes('javascript')) return 'javascript';
    if (value.includes('json')) return 'json';
    if (value.includes('yaml') || value.includes('yml')) return 'yaml';
    if (value.includes('toml')) return 'toml';
    if (/\.(md|markdown|mdown|mkd|mkdn|mdx)$/.test(pathValue)) return 'markdown';
    if (value.includes('markdown')) return 'markdown';
    if (value.includes('html')) return 'html';
    if (value.includes('css')) return 'css';
    if (value.includes('rust')) return 'rust';
    if (value.includes('python')) return 'python';
    if (value.includes('shell')) return 'shell';
    if (value.includes('xml')) return 'xml';
    if (value.includes('sql')) return 'sql';
    return 'plaintext';
}

export function buildTree(entries: AssetTreeEntry[]): TreeNode[] {
    const root: TreeNode = {
        id: '/',
        name: '/',
        path: '/',
        children: [],
        isDirectory: true,
    };
    const nodeMap = new Map<string, TreeNode>([['/', root]]);

    const sorted = [...entries].sort((left, right) => {
        if (left.entryKind !== right.entryKind) {
            return left.entryKind === 'directory' ? -1 : 1;
        }
        return left.path.localeCompare(right.path);
    });

    for (const entry of sorted) {
        const segments = entry.path.split('/').filter(Boolean);
        let currentPath = '';
        let parent = root;

        for (let index = 0; index < segments.length; index += 1) {
            const segment = segments[index] ?? '';
            currentPath += `/${segment}`;
            const isLeaf = index === segments.length - 1;
            const existing = nodeMap.get(currentPath);
            if (existing) {
                parent = existing;
                if (isLeaf) {
                    existing.entry = entry;
                    existing.isDirectory = entry.entryKind === 'directory';
                }
                continue;
            }

            const node: TreeNode = {
                id: currentPath,
                name: segment,
                path: currentPath,
                entry: isLeaf ? entry : undefined,
                children: [],
                isDirectory: isLeaf ? entry.entryKind === 'directory' : true,
            };
            parent.children.push(node);
            nodeMap.set(currentPath, node);
            parent = node;
        }
    }

    return root.children;
}

export function collectInitialExpanded(nodes: TreeNode[]): Set<string> {
    const expanded = new Set<string>(['/']);
    for (const node of nodes) {
        if (node.isDirectory) {
            expanded.add(node.path);
        }
        if (node.children.length > 0) {
            for (const child of collectInitialExpanded(node.children)) {
                expanded.add(child);
            }
        }
    }
    return expanded;
}

export function pill(label: string, value: string): ReactNode {
    return (
        <span
            key={`${label}:${value}`}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                borderRadius: 999,
                padding: '6px 10px',
                background: 'rgba(148,163,184,0.10)',
                color: 'var(--stew-ab-fg, #334155)',
                fontSize: 12,
                fontWeight: 600,
            }}
        >
            <span style={{ color: 'var(--stew-ab-muted-fg, #64748b)' }}>{label}</span>
            <span>{value}</span>
        </span>
    );
}

export function EmptyMessage({ title, message }: { title: string; message: string }) {
    return (
        <div style={{ height: '100%', display: 'grid', placeItems: 'center', padding: 24 }}>
            <div style={{ maxWidth: 320, textAlign: 'center', display: 'grid', gap: 8 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--stew-ab-fg, #0f172a)' }}>{title}</div>
                <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--stew-ab-muted-fg, #64748b)' }}>{message}</div>
            </div>
        </div>
    );
}