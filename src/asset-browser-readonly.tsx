"use client";

import React, {
    type CSSProperties,
    type ReactNode,
    useEffect,
    useMemo,
    useRef,
    useState,
    useCallback,
} from 'react';
import {
    Group as GroupPrimitive,
    Panel as PanelPrimitive,
    Separator as SeparatorPrimitive,
    type GroupProps,
    type PanelProps,
    type SeparatorProps,
} from 'react-resizable-panels';
import type { AssetTreeEntry } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import { AssetBrowserConsoleShell } from './asset-browser-console-shell';
import { AssetEditor } from './asset-editor';
import {
    buttonBaseStyle,
    cardHeaderStyle,
    collectInitialExpanded,
    EmptyMessage,
    formatBytes,
    panelHandleStyle,
    pill,
    primaryButtonStyle,
    resolveEditorTheme,
    resolveThemeVars,
    sectionStyle,
    shellStyle,
    type AssetBrowserEditorTheme,
    type AssetBrowserThemeMode,
    type AssetBrowserThemeVars,
    type AssetBrowserWorkspaceAppearance,
    type PreviewContext,
    type PreviewDocument,
    type PreviewFileKind,
    type PreviewMode,
    type PreviewTreeNode,
    selectStyle,
    toolbarStyle,
    type StatusMessage,
    toneStyle,
    type TreeNode,
} from './asset-browser-shared';
import { AssetTree } from './asset-tree';

function Group(props: GroupProps): React.ReactElement {
    return React.createElement(GroupPrimitive as unknown as React.ElementType, props);
}

function Panel(props: PanelProps): React.ReactElement {
    return React.createElement(PanelPrimitive as unknown as React.ElementType, props);
}

function Separator(props: SeparatorProps): React.ReactElement {
    return React.createElement(SeparatorPrimitive as unknown as React.ElementType, props);
}

interface PreviewNodeIndex {
    pathMap: Map<string, PreviewTreeNode>;
    treeNodes: TreeNode[];
    firstFilePath: string;
}

export interface AssetBrowserReadonlyProps {
    mode: 'browse-preview';
    tree: PreviewTreeNode[];
    documents?: Record<string, PreviewDocument>;
    onOpenDocument?: (path: string) => Promise<PreviewDocument>;
    initialSelectedPath?: string;
    defaultPreviewMode?: PreviewMode;
    previewModes?: PreviewMode[];
    title?: string;
    height?: number | string;
    className?: string;
    style?: CSSProperties;
    appearance?: AssetBrowserWorkspaceAppearance;
    theme?: AssetBrowserThemeMode;
    themeVars?: Partial<AssetBrowserThemeVars>;
    editorTheme?: AssetBrowserEditorTheme;
    showDecorativeBackground?: boolean;
    renderTreeNodeMeta?: (node: PreviewTreeNode) => ReactNode;
    renderPreviewToolbar?: (context: PreviewContext) => ReactNode;
    renderDocument?: (
        document: PreviewDocument,
        mode: PreviewMode,
        context: PreviewContext,
    ) => ReactNode;
}

export function AssetBrowserReadonly({
    tree,
    documents,
    onOpenDocument,
    initialSelectedPath,
    defaultPreviewMode = 'rendered',
    previewModes,
    title = 'Asset Browser',
    height = '100%',
    className,
    style,
    appearance = 'default',
    theme = 'light',
    themeVars,
    editorTheme,
    showDecorativeBackground = true,
    renderTreeNodeMeta,
    renderPreviewToolbar,
    renderDocument,
}: AssetBrowserReadonlyProps) {
    const [selectedPath, setSelectedPath] = useState('');
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['/']));
    const [treeQuery, setTreeQuery] = useState('');
    const [previewMode, setPreviewMode] = useState<PreviewMode>(defaultPreviewMode);
    const [documentCache, setDocumentCache] = useState<Record<string, PreviewDocument>>(() =>
        normalizePreviewDocuments(documents),
    );
    const [loadingDocument, setLoadingDocument] = useState(false);
    const [status, setStatus] = useState<StatusMessage | null>(null);
    const mountedRef = useRef(true);
    const appearanceIsConsole = appearance === 'console';

    const themeStyle = useMemo(
        () => resolveThemeVars(theme, themeVars, showDecorativeBackground),
        [showDecorativeBackground, theme, themeVars],
    );
    const resolvedEditorTheme = useMemo(
        () => resolveEditorTheme(theme, editorTheme),
        [editorTheme, theme],
    );
    const normalizedTree = useMemo(() => normalizePreviewTree(tree), [tree]);
    const previewIndex = useMemo(() => buildPreviewNodeIndex(normalizedTree), [normalizedTree]);
    const filteredTreeNodes = useMemo(
        () => filterTreeNodes(previewIndex.treeNodes, treeQuery),
        [previewIndex.treeNodes, treeQuery],
    );
    const visibleExpandedPaths = useMemo(
        () => treeQuery.trim() ? collectInitialExpanded(filteredTreeNodes) : expandedPaths,
        [expandedPaths, filteredTreeNodes, treeQuery],
    );
    const selectedNode = previewIndex.pathMap.get(selectedPath) ?? null;
    const selectedDocument = selectedPath ? documentCache[selectedPath] ?? null : null;
    const availablePreviewModes = useMemo(
        () => resolveAvailablePreviewModes(selectedDocument, previewModes, renderDocument),
        [previewModes, renderDocument, selectedDocument],
    );

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    useEffect(() => {
        setDocumentCache((current) => ({
            ...current,
            ...normalizePreviewDocuments(documents),
        }));
    }, [documents]);

    useEffect(() => {
        const nextSelectedPath = resolveInitialSelectedPath(
            normalizePreviewPath(initialSelectedPath || ''),
            previewIndex.pathMap,
            previewIndex.firstFilePath,
        );
        setSelectedPath((current) => {
            if (current && previewIndex.pathMap.has(current)) {
                return current;
            }
            return nextSelectedPath;
        });
        setExpandedPaths(collectInitialExpanded(previewIndex.treeNodes));
    }, [initialSelectedPath, previewIndex.firstFilePath, previewIndex.pathMap, previewIndex.treeNodes]);

    useEffect(() => {
        if (availablePreviewModes.length === 0) {
            return;
        }
        if (availablePreviewModes.includes(previewMode)) {
            return;
        }
        setPreviewMode(availablePreviewModes[0]);
    }, [availablePreviewModes, previewMode]);

    useEffect(() => {
        if (!selectedNode || selectedNode.isDirectory) {
            setLoadingDocument(false);
            if (!selectedNode) {
                setStatus(null);
            }
            return;
        }
        if (selectedDocument) {
            setLoadingDocument(false);
            setStatus(null);
            return;
        }
        if (!onOpenDocument) {
            setLoadingDocument(false);
            setStatus({ tone: 'warning', text: 'Selected file has no preview content.' });
            return;
        }

        let cancelled = false;
        setLoadingDocument(true);
        void onOpenDocument(selectedNode.path)
            .then((document) => {
                if (cancelled || !mountedRef.current) {
                    return;
                }
                const normalizedDocument = normalizePreviewDocument(document);
                setDocumentCache((current) => ({
                    ...current,
                    [normalizedDocument.path]: normalizedDocument,
                }));
                setStatus(null);
            })
            .catch((error) => {
                if (cancelled || !mountedRef.current) {
                    return;
                }
                setStatus({
                    tone: 'error',
                    text: error instanceof Error ? error.message : 'Failed to open preview document.',
                });
            })
            .finally(() => {
                if (cancelled || !mountedRef.current) {
                    return;
                }
                setLoadingDocument(false);
            });

        return () => {
            cancelled = true;
        };
    }, [onOpenDocument, selectedDocument, selectedNode]);

    const previewContext = useMemo<PreviewContext>(() => ({
        selectedPath,
        selectedNode,
        document: selectedDocument,
        previewMode,
        availablePreviewModes,
        loading: loadingDocument,
        setPreviewMode,
    }), [availablePreviewModes, loadingDocument, previewMode, selectedDocument, selectedNode, selectedPath]);

    const selectedMeta = selectedNode
        ? buildSelectedMeta(selectedNode, selectedDocument)
        : '从左侧目录树选择一个文件后开始预览。';
    const visibleTreeCount = useMemo(() => countTreeNodes(filteredTreeNodes), [filteredTreeNodes]);

    if (appearanceIsConsole) {
        return (
            <AssetBrowserConsoleShell
                className={className}
                style={style}
                height={height}
                heading={title}
                themeStyle={themeStyle}
                themeMode={theme}
                kicker="只读浏览"
                badges={(
                    <>
                        {pill('Mode', 'Browse preview')}
                        {pill('Entries', String(visibleTreeCount))}
                    </>
                )}
                controls={(
                    <label className="stew-asset-workspace__console-search-group">
                        <span className="stew-asset-workspace__console-control-label">搜索资源</span>
                        <input
                            value={treeQuery}
                            onChange={(event) => setTreeQuery(event.target.value)}
                            placeholder="按文件名或路径过滤目录树"
                            style={{
                                ...selectStyle,
                                minHeight: 38,
                                borderRadius: 12,
                                background: 'rgba(255,255,255,0.94)',
                            }}
                        />
                    </label>
                )}
                actions={null}
                status={status}
                sidebarTitle="资源目录"
                sidebarSubtitle={treeQuery.trim() ? `筛选后 ${visibleTreeCount} 项` : `共 ${visibleTreeCount} 项`}
                sidebarContent={(
                    <AssetTree
                        title={treeQuery.trim() ? '搜索结果' : '资源目录'}
                        nodes={filteredTreeNodes}
                        expandedPaths={visibleExpandedPaths}
                        selectedPath={selectedPath}
                        compact
                        emptyTitle={treeQuery.trim() ? '未找到匹配资源' : '暂无资源'}
                        emptyMessage={treeQuery.trim() ? '请调整关键字后重试。' : '当前没有可浏览的文件。'}
                        onSelect={(path) => setSelectedPath(path)}
                        onToggle={(path) => toggleExpandedPath(path, setExpandedPaths)}
                        renderNodeMeta={(node) => renderTreeNodeMeta
                            ? renderTreeNodeMeta(previewIndex.pathMap.get(node.path) ?? toPreviewTreeNode(node))
                            : renderDefaultTreeNodeMeta(previewIndex.pathMap.get(node.path) ?? toPreviewTreeNode(node))}
                    />
                )}
                mainTitle={selectedPath || '请选择资源'}
                mainSubtitle={selectedMeta}
                viewSwitcher={renderPreviewModeToolbar(previewContext, renderPreviewToolbar)}
                mainContent={renderPreviewPanel({
                    context: previewContext,
                    selectedNode,
                    selectedDocument,
                    loadingDocument,
                    renderDocument,
                    resolvedEditorTheme,
                    setSelectedPath,
                    previewIndex,
                })}
            />
        );
    }

    return (
        <section
            className={className}
            data-stew-theme={theme}
            style={{
                ...shellStyle,
                ...themeStyle,
                height,
                ...style,
            } as CSSProperties}
        >
            <div style={cardHeaderStyle}>
                <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--stew-ab-muted-fg, #64748b)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        Browse Preview
                    </div>
                    <div style={{ fontSize: 22, fontWeight: 700 }}>{title}</div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                        {pill('Mode', 'Browse preview')}
                        {pill('Entries', String(visibleTreeCount))}
                    </div>
                </div>
                {status ? (
                    <div style={{ ...toneStyle(status.tone), borderRadius: 14, padding: '10px 12px', fontSize: 13, maxWidth: 320 }}>
                        {status.text}
                    </div>
                ) : null}
            </div>

            <div style={toolbarStyle}>
                <label style={{ display: 'grid', gap: 6, minWidth: 260 }}>
                    <span style={{ fontSize: 12, color: 'var(--stew-ab-muted-fg, #64748b)', fontWeight: 600 }}>Search files</span>
                    <input
                        value={treeQuery}
                        onChange={(event) => setTreeQuery(event.target.value)}
                        placeholder="Filter by file name or path"
                        style={selectStyle}
                    />
                </label>
                <div style={{ display: 'flex', alignItems: 'flex-end', marginLeft: 'auto' }}>
                    {renderPreviewModeToolbar(previewContext, renderPreviewToolbar)}
                </div>
            </div>

            <div style={{ flex: 1, minHeight: 0 }}>
                <Group orientation="horizontal">
                    <Panel defaultSize={24} minSize={18}>
                        <div style={{ ...sectionStyle, background: 'var(--stew-ab-sidebar-bg, rgba(255,255,255,0.72))' }}>
                            <AssetTree
                                title={treeQuery.trim() ? 'Search results' : 'Files'}
                                nodes={filteredTreeNodes}
                                expandedPaths={visibleExpandedPaths}
                                selectedPath={selectedPath}
                                emptyTitle={treeQuery.trim() ? 'No matches' : 'No entries'}
                                emptyMessage={treeQuery.trim() ? 'Adjust the search to view more files.' : 'This preview tree is empty.'}
                                onSelect={(path) => setSelectedPath(path)}
                                onToggle={(path) => toggleExpandedPath(path, setExpandedPaths)}
                                renderNodeMeta={(node) => renderTreeNodeMeta
                                    ? renderTreeNodeMeta(previewIndex.pathMap.get(node.path) ?? toPreviewTreeNode(node))
                                    : renderDefaultTreeNodeMeta(previewIndex.pathMap.get(node.path) ?? toPreviewTreeNode(node))}
                            />
                        </div>
                    </Panel>
                    <Separator style={panelHandleStyle} />
                    <Panel defaultSize={76} minSize={32}>
                        <div style={sectionStyle}>
                            {renderPreviewPanel({
                                context: previewContext,
                                selectedNode,
                                selectedDocument,
                                loadingDocument,
                                renderDocument,
                                resolvedEditorTheme,
                                setSelectedPath,
                                previewIndex,
                            })}
                        </div>
                    </Panel>
                </Group>
            </div>
        </section>
    );
}

function renderPreviewModeToolbar(
    context: PreviewContext,
    renderPreviewToolbar?: (context: PreviewContext) => ReactNode,
) {
    const canRenderToolbar = context.document && context.availablePreviewModes.length > 0;
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {canRenderToolbar ? (
                <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(148,163,184,0.10)', borderRadius: 10, padding: 2 }}>
                    {context.availablePreviewModes.map((mode) => (
                        <button
                            key={mode}
                            type="button"
                            style={modeButtonStyle(mode === context.previewMode)}
                            onClick={() => context.setPreviewMode(mode)}
                        >
                            {previewModeLabel(mode)}
                        </button>
                    ))}
                </div>
            ) : null}
            {renderPreviewToolbar ? renderPreviewToolbar(context) : null}
        </div>
    );
}

const previewCopyButtonStyle: CSSProperties = {
    ...buttonBaseStyle,
    position: 'absolute',
    top: 8,
    right: 10,
    zIndex: 2,
    minHeight: 30,
    padding: '0 10px',
    fontSize: 12,
};

function PreviewPanelWithCopy({ content, children }: { content: string; children: ReactNode }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = useCallback(async () => {
        if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
            await navigator.clipboard.writeText(content);
        } else {
            const textarea = document.createElement('textarea');
            textarea.value = content;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.focus();
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
    }, [content]);

    return (
        <div style={{ position: 'relative', height: '100%', minHeight: 0 }}>
            {content ? (
                <button type="button" style={previewCopyButtonStyle} onClick={() => void handleCopy()}>
                    {copied ? '已复制' : '复制'}
                </button>
            ) : null}
            {children}
        </div>
    );
}

function renderPreviewPanel({
    context,
    selectedNode,
    selectedDocument,
    loadingDocument,
    renderDocument,
    resolvedEditorTheme,
    setSelectedPath,
    previewIndex,
}: {
    context: PreviewContext;
    selectedNode: PreviewTreeNode | null;
    selectedDocument: PreviewDocument | null;
    loadingDocument: boolean;
    renderDocument?: (document: PreviewDocument, mode: PreviewMode, context: PreviewContext) => ReactNode;
    resolvedEditorTheme: string;
    setSelectedPath: (path: string) => void;
    previewIndex: PreviewNodeIndex;
}) {
    if (!selectedNode) {
        return <EmptyMessage title="尚未选择文件" message="请先从左侧目录树选择一个文件。" />;
    }

    if (selectedNode.isDirectory) {
        return <EmptyMessage title="当前为目录" message="请选择文件节点后查看内容。" />;
    }

    if (loadingDocument) {
        return <EmptyMessage title="正在加载文件" message="请稍候，正在获取预览内容。" />;
    }

    if (!selectedDocument) {
        return <EmptyMessage title="暂无可用预览" message="当前文件没有可用的只读内容。" />;
    }

    if (renderDocument) {
        return (
            <PreviewPanelWithCopy content={selectedDocument.content}>
                {renderDocument(selectedDocument, context.previewMode, context)}
            </PreviewPanelWithCopy>
        );
    }

    const selectedEntry = createPreviewAssetEntry(selectedNode, selectedDocument);
    const editorMode = toEditorMode(context.previewMode, selectedDocument.fileKind);

    return (
        <AssetEditor
            selectedPath={selectedDocument.path}
            selectedEntry={selectedEntry}
            modelPath={`file:///stew-preview${selectedDocument.path}`}
            language={languageForPreviewDocument(selectedDocument.fileKind, selectedDocument.path)}
            editorTheme={resolvedEditorTheme}
            value={selectedDocument.content}
            canEdit={false}
            dirty={false}
            saving={false}
            entryRevision={0}
            mode={editorMode}
            compact={false}
            showModeSwitch={false}
            showBuiltinActions={false}
            showHeader={false}
            onOpenMarkdownPath={(path) => {
                const normalizedPath = normalizePreviewPath(path);
                if (previewIndex.pathMap.has(normalizedPath)) {
                    setSelectedPath(normalizedPath);
                }
            }}
            onChange={() => undefined}
        />
    );
}

function resolveAvailablePreviewModes(
    document: PreviewDocument | null,
    previewModes: PreviewMode[] | undefined,
    renderDocument: AssetBrowserReadonlyProps['renderDocument'],
): PreviewMode[] {
    const requestedModes = Array.from(new Set((previewModes ?? []).filter(isPreviewMode)));
    if (!document) {
        return requestedModes;
    }

    if (renderDocument) {
        return requestedModes.length > 0 ? requestedModes : ['source'];
    }

    if (document.fileKind === 'markdown') {
        return requestedModes.length > 0 ? requestedModes : ['rendered', 'source', 'split'];
    }

    return requestedModes.filter((mode) => mode === 'source');
}

function normalizePreviewTree(nodes: PreviewTreeNode[]): PreviewTreeNode[] {
    return nodes.map((node) => ({
        ...node,
        path: normalizePreviewPath(node.path || node.name),
        children: normalizePreviewTree(node.children ?? []),
    }));
}

function buildPreviewNodeIndex(nodes: PreviewTreeNode[]): PreviewNodeIndex {
    const pathMap = new Map<string, PreviewTreeNode>();
    let firstFilePath = '';

    function visit(node: PreviewTreeNode): TreeNode {
        pathMap.set(node.path, node);
        if (!node.isDirectory && !firstFilePath) {
            firstFilePath = node.path;
        }
        return {
            id: node.path,
            name: node.name,
            path: node.path,
            children: node.children?.map(visit) ?? [],
            isDirectory: node.isDirectory,
        };
    }

    return {
        pathMap,
        treeNodes: nodes.map(visit),
        firstFilePath,
    };
}

function normalizePreviewDocuments(
    documents: Record<string, PreviewDocument> | undefined,
): Record<string, PreviewDocument> {
    if (!documents) {
        return {};
    }

    return Object.fromEntries(
        Object.entries(documents).map(([path, document]) => {
            const normalizedDocument = normalizePreviewDocument({
                ...document,
                path: document.path || path,
            });
            return [normalizedDocument.path, normalizedDocument];
        }),
    );
}

function normalizePreviewDocument(document: PreviewDocument): PreviewDocument {
    return {
        ...document,
        path: normalizePreviewPath(document.path),
    };
}

function normalizePreviewPath(path: string): string {
    if (!path) {
        return '';
    }
    return path.startsWith('/') ? path : `/${path}`;
}

function resolveInitialSelectedPath(
    initialSelectedPath: string,
    pathMap: Map<string, PreviewTreeNode>,
    firstFilePath: string,
): string {
    if (initialSelectedPath && pathMap.has(initialSelectedPath)) {
        return initialSelectedPath;
    }
    if (firstFilePath) {
        return firstFilePath;
    }
    return pathMap.values().next().value?.path ?? '';
}

function toggleExpandedPath(
    path: string,
    setExpandedPaths: React.Dispatch<React.SetStateAction<Set<string>>>,
) {
    setExpandedPaths((current) => {
        const next = new Set(current);
        if (next.has(path)) {
            next.delete(path);
        } else {
            next.add(path);
        }
        return next;
    });
}

function renderDefaultTreeNodeMeta(node: PreviewTreeNode): ReactNode {
    if (node.isDirectory) {
        return null;
    }

    const metaParts = [
        node.fileKind ? String(node.fileKind).toUpperCase() : '',
        typeof node.sizeBytes === 'number' ? formatBytes(node.sizeBytes) : '',
    ].filter(Boolean);

    return metaParts.length > 0 ? metaParts.join(' · ') : null;
}

function createPreviewAssetEntry(
    node: PreviewTreeNode,
    document: PreviewDocument,
): AssetTreeEntry {
    return {
        path: node.path,
        parentPath: parentPathFor(node.path),
        entryKind: 'file',
        contentType: previewContentType(document.fileKind),
        languageHint: languageForPreviewDocument(document.fileKind, document.path),
        sizeBytes: document.sizeBytes ?? node.sizeBytes ?? new TextEncoder().encode(document.content).length,
        isTextPreviewable: true,
    } as AssetTreeEntry;
}

function buildSelectedMeta(
    node: PreviewTreeNode,
    document: PreviewDocument | null,
): string {
    if (node.isDirectory) {
        return '目录节点';
    }

    const sizeBytes = document?.sizeBytes ?? node.sizeBytes;
    const parts = [
        document?.fileKind || node.fileKind || 'text',
        typeof sizeBytes === 'number' ? formatBytes(sizeBytes) : '',
    ].filter(Boolean);
    return parts.join(' · ');
}

function previewContentType(fileKind: PreviewFileKind): string {
    switch (fileKind) {
        case 'markdown':
            return 'text/markdown';
        case 'json':
            return 'application/json';
        case 'yaml':
            return 'application/yaml';
        case 'python':
            return 'text/x-python';
        default:
            return 'text/plain';
    }
}

function languageForPreviewDocument(fileKind: PreviewFileKind, path: string): string {
    switch (fileKind) {
        case 'markdown':
            return 'markdown';
        case 'json':
            return 'json';
        case 'yaml':
            return 'yaml';
        case 'python':
            return 'python';
        default:
            return /\.(ts|tsx)$/.test(path) ? 'typescript' : /\.(js|jsx)$/.test(path) ? 'javascript' : 'plaintext';
    }
}

function toEditorMode(mode: PreviewMode, fileKind: PreviewFileKind): 'edit' | 'preview' | 'split' {
    if (fileKind !== 'markdown') {
        return 'edit';
    }
    if (mode === 'rendered') {
        return 'preview';
    }
    if (mode === 'split') {
        return 'split';
    }
    return 'edit';
}

function previewModeLabel(mode: PreviewMode): string {
    switch (mode) {
        case 'rendered':
            return '渲染';
        case 'split':
            return '分栏';
        default:
            return '源码';
    }
}

function modeButtonStyle(active: boolean): CSSProperties {
    return {
        appearance: 'none',
        border: 0,
        borderRadius: 8,
        padding: '6px 10px',
        fontSize: 12,
        fontWeight: 600,
        cursor: 'pointer',
        background: active ? 'rgba(14,165,233,0.12)' : 'transparent',
        color: active ? '#0284c7' : '#64748b',
    };
}

function parentPathFor(path: string): string {
    const segments = path.split('/').filter(Boolean);
    if (segments.length <= 1) {
        return '/';
    }
    return `/${segments.slice(0, -1).join('/')}`;
}

function filterTreeNodes(nodes: TreeNode[], query: string): TreeNode[] {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return nodes;
    }

    return nodes
        .map((node) => {
            const filteredChildren = filterTreeNodes(node.children, normalizedQuery);
            const matched = node.name.toLowerCase().includes(normalizedQuery)
                || node.path.toLowerCase().includes(normalizedQuery);

            if (!matched && filteredChildren.length === 0) {
                return null;
            }

            return {
                ...node,
                children: filteredChildren,
            } satisfies TreeNode;
        })
        .filter((node): node is TreeNode => node !== null);
}

function countTreeNodes(nodes: TreeNode[]): number {
    return nodes.reduce((total, node) => total + 1 + countTreeNodes(node.children), 0);
}

function toPreviewTreeNode(node: TreeNode): PreviewTreeNode {
    return {
        path: node.path,
        name: node.name,
        isDirectory: node.isDirectory,
        children: node.children.map(toPreviewTreeNode),
    };
}

function isPreviewMode(mode: string): mode is PreviewMode {
    return mode === 'rendered' || mode === 'source' || mode === 'split';
}