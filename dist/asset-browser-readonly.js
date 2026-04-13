"use client";
import React, { useEffect, useMemo, useRef, useState, } from 'react';
import { Group as GroupPrimitive, Panel as PanelPrimitive, Separator as SeparatorPrimitive, } from 'react-resizable-panels';
import { AssetBrowserConsoleShell } from './asset-browser-console-shell';
import { AssetEditor } from './asset-editor';
import { cardHeaderStyle, collectInitialExpanded, EmptyMessage, formatBytes, panelHandleStyle, pill, resolveEditorTheme, resolveThemeVars, sectionStyle, shellStyle, selectStyle, toolbarStyle, toneStyle, } from './asset-browser-shared';
import { AssetTree } from './asset-tree';
function Group(props) {
    return React.createElement(GroupPrimitive, props);
}
function Panel(props) {
    return React.createElement(PanelPrimitive, props);
}
function Separator(props) {
    return React.createElement(SeparatorPrimitive, props);
}
export function AssetBrowserReadonly({ tree, documents, onOpenDocument, initialSelectedPath, defaultPreviewMode = 'rendered', previewModes, title = 'Asset Browser', height = '100%', className, style, appearance = 'default', theme = 'light', themeVars, editorTheme, showDecorativeBackground = true, renderTreeNodeMeta, renderPreviewToolbar, renderDocument, }) {
    const [selectedPath, setSelectedPath] = useState('');
    const [expandedPaths, setExpandedPaths] = useState(new Set(['/']));
    const [treeQuery, setTreeQuery] = useState('');
    const [previewMode, setPreviewMode] = useState(defaultPreviewMode);
    const [documentCache, setDocumentCache] = useState(() => normalizePreviewDocuments(documents));
    const [loadingDocument, setLoadingDocument] = useState(false);
    const [status, setStatus] = useState(null);
    const mountedRef = useRef(true);
    const appearanceIsConsole = appearance === 'console';
    const themeStyle = useMemo(() => resolveThemeVars(theme, themeVars, showDecorativeBackground), [showDecorativeBackground, theme, themeVars]);
    const resolvedEditorTheme = useMemo(() => resolveEditorTheme(theme, editorTheme), [editorTheme, theme]);
    const normalizedTree = useMemo(() => normalizePreviewTree(tree), [tree]);
    const previewIndex = useMemo(() => buildPreviewNodeIndex(normalizedTree), [normalizedTree]);
    const filteredTreeNodes = useMemo(() => filterTreeNodes(previewIndex.treeNodes, treeQuery), [previewIndex.treeNodes, treeQuery]);
    const visibleExpandedPaths = useMemo(() => treeQuery.trim() ? collectInitialExpanded(filteredTreeNodes) : expandedPaths, [expandedPaths, filteredTreeNodes, treeQuery]);
    const selectedNode = previewIndex.pathMap.get(selectedPath) ?? null;
    const selectedDocument = selectedPath ? documentCache[selectedPath] ?? null : null;
    const availablePreviewModes = useMemo(() => resolveAvailablePreviewModes(selectedDocument, previewModes, renderDocument), [previewModes, renderDocument, selectedDocument]);
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
        const nextSelectedPath = resolveInitialSelectedPath(normalizePreviewPath(initialSelectedPath || ''), previewIndex.pathMap, previewIndex.firstFilePath);
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
    const previewContext = useMemo(() => ({
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
        return (React.createElement(AssetBrowserConsoleShell, { className: className, style: style, height: height, heading: title, themeStyle: themeStyle, themeMode: theme, kicker: "\u53EA\u8BFB\u6D4F\u89C8", badges: (React.createElement(React.Fragment, null,
                pill('Mode', 'Browse preview'),
                pill('Entries', String(visibleTreeCount)))), controls: (React.createElement("label", { className: "stew-asset-workspace__console-search-group" },
                React.createElement("span", { className: "stew-asset-workspace__console-control-label" }, "\u641C\u7D22\u8D44\u6E90"),
                React.createElement("input", { value: treeQuery, onChange: (event) => setTreeQuery(event.target.value), placeholder: "\u6309\u6587\u4EF6\u540D\u6216\u8DEF\u5F84\u8FC7\u6EE4\u76EE\u5F55\u6811", style: {
                        ...selectStyle,
                        minHeight: 38,
                        borderRadius: 12,
                        background: 'rgba(255,255,255,0.94)',
                    } }))), actions: null, status: status, sidebarTitle: "\u8D44\u6E90\u76EE\u5F55", sidebarSubtitle: treeQuery.trim() ? `筛选后 ${visibleTreeCount} 项` : `共 ${visibleTreeCount} 项`, sidebarContent: (React.createElement(AssetTree, { title: treeQuery.trim() ? '搜索结果' : '资源目录', nodes: filteredTreeNodes, expandedPaths: visibleExpandedPaths, selectedPath: selectedPath, compact: true, emptyTitle: treeQuery.trim() ? '未找到匹配资源' : '暂无资源', emptyMessage: treeQuery.trim() ? '请调整关键字后重试。' : '当前没有可浏览的文件。', onSelect: (path) => setSelectedPath(path), onToggle: (path) => toggleExpandedPath(path, setExpandedPaths), renderNodeMeta: (node) => renderTreeNodeMeta
                    ? renderTreeNodeMeta(previewIndex.pathMap.get(node.path) ?? toPreviewTreeNode(node))
                    : renderDefaultTreeNodeMeta(previewIndex.pathMap.get(node.path) ?? toPreviewTreeNode(node)) })), mainTitle: selectedPath || '请选择资源', mainSubtitle: selectedMeta, viewSwitcher: renderPreviewModeToolbar(previewContext, renderPreviewToolbar), mainContent: renderPreviewPanel({
                context: previewContext,
                selectedNode,
                selectedDocument,
                loadingDocument,
                renderDocument,
                resolvedEditorTheme,
                setSelectedPath,
                previewIndex,
            }) }));
    }
    return (React.createElement("section", { className: className, "data-stew-theme": theme, style: {
            ...shellStyle,
            ...themeStyle,
            height,
            ...style,
        } },
        React.createElement("div", { style: cardHeaderStyle },
            React.createElement("div", { style: { display: 'grid', gap: 6 } },
                React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: 'var(--stew-ab-muted-fg, #64748b)', textTransform: 'uppercase', letterSpacing: '0.08em' } }, "Browse Preview"),
                React.createElement("div", { style: { fontSize: 22, fontWeight: 700 } }, title),
                React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                    pill('Mode', 'Browse preview'),
                    pill('Entries', String(visibleTreeCount)))),
            status ? (React.createElement("div", { style: { ...toneStyle(status.tone), borderRadius: 14, padding: '10px 12px', fontSize: 13, maxWidth: 320 } }, status.text)) : null),
        React.createElement("div", { style: toolbarStyle },
            React.createElement("label", { style: { display: 'grid', gap: 6, minWidth: 260 } },
                React.createElement("span", { style: { fontSize: 12, color: 'var(--stew-ab-muted-fg, #64748b)', fontWeight: 600 } }, "Search files"),
                React.createElement("input", { value: treeQuery, onChange: (event) => setTreeQuery(event.target.value), placeholder: "Filter by file name or path", style: selectStyle })),
            React.createElement("div", { style: { display: 'flex', alignItems: 'flex-end', marginLeft: 'auto' } }, renderPreviewModeToolbar(previewContext, renderPreviewToolbar))),
        React.createElement("div", { style: { flex: 1, minHeight: 0 } },
            React.createElement(Group, { orientation: "horizontal" },
                React.createElement(Panel, { defaultSize: 24, minSize: 18 },
                    React.createElement("div", { style: { ...sectionStyle, background: 'var(--stew-ab-sidebar-bg, rgba(255,255,255,0.72))' } },
                        React.createElement(AssetTree, { title: treeQuery.trim() ? 'Search results' : 'Files', nodes: filteredTreeNodes, expandedPaths: visibleExpandedPaths, selectedPath: selectedPath, emptyTitle: treeQuery.trim() ? 'No matches' : 'No entries', emptyMessage: treeQuery.trim() ? 'Adjust the search to view more files.' : 'This preview tree is empty.', onSelect: (path) => setSelectedPath(path), onToggle: (path) => toggleExpandedPath(path, setExpandedPaths), renderNodeMeta: (node) => renderTreeNodeMeta
                                ? renderTreeNodeMeta(previewIndex.pathMap.get(node.path) ?? toPreviewTreeNode(node))
                                : renderDefaultTreeNodeMeta(previewIndex.pathMap.get(node.path) ?? toPreviewTreeNode(node)) }))),
                React.createElement(Separator, { style: panelHandleStyle }),
                React.createElement(Panel, { defaultSize: 76, minSize: 32 },
                    React.createElement("div", { style: sectionStyle }, renderPreviewPanel({
                        context: previewContext,
                        selectedNode,
                        selectedDocument,
                        loadingDocument,
                        renderDocument,
                        resolvedEditorTheme,
                        setSelectedPath,
                        previewIndex,
                    })))))));
}
function renderPreviewModeToolbar(context, renderPreviewToolbar) {
    const canRenderToolbar = context.document && context.availablePreviewModes.length > 0;
    return (React.createElement("div", { style: { display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' } },
        canRenderToolbar ? (React.createElement("div", { style: { display: 'inline-flex', gap: 2, background: 'rgba(148,163,184,0.10)', borderRadius: 10, padding: 2 } }, context.availablePreviewModes.map((mode) => (React.createElement("button", { key: mode, type: "button", style: modeButtonStyle(mode === context.previewMode), onClick: () => context.setPreviewMode(mode) }, previewModeLabel(mode)))))) : null,
        renderPreviewToolbar ? renderPreviewToolbar(context) : null));
}
function renderPreviewPanel({ context, selectedNode, selectedDocument, loadingDocument, renderDocument, resolvedEditorTheme, setSelectedPath, previewIndex, }) {
    if (!selectedNode) {
        return React.createElement(EmptyMessage, { title: "\u5C1A\u672A\u9009\u62E9\u6587\u4EF6", message: "\u8BF7\u5148\u4ECE\u5DE6\u4FA7\u76EE\u5F55\u6811\u9009\u62E9\u4E00\u4E2A\u6587\u4EF6\u3002" });
    }
    if (selectedNode.isDirectory) {
        return React.createElement(EmptyMessage, { title: "\u5F53\u524D\u4E3A\u76EE\u5F55", message: "\u8BF7\u9009\u62E9\u6587\u4EF6\u8282\u70B9\u540E\u67E5\u770B\u5185\u5BB9\u3002" });
    }
    if (loadingDocument) {
        return React.createElement(EmptyMessage, { title: "\u6B63\u5728\u52A0\u8F7D\u6587\u4EF6", message: "\u8BF7\u7A0D\u5019\uFF0C\u6B63\u5728\u83B7\u53D6\u9884\u89C8\u5185\u5BB9\u3002" });
    }
    if (!selectedDocument) {
        return React.createElement(EmptyMessage, { title: "\u6682\u65E0\u53EF\u7528\u9884\u89C8", message: "\u5F53\u524D\u6587\u4EF6\u6CA1\u6709\u53EF\u7528\u7684\u53EA\u8BFB\u5185\u5BB9\u3002" });
    }
    if (renderDocument) {
        return React.createElement(React.Fragment, null, renderDocument(selectedDocument, context.previewMode, context));
    }
    const selectedEntry = createPreviewAssetEntry(selectedNode, selectedDocument);
    const editorMode = toEditorMode(context.previewMode, selectedDocument.fileKind);
    return (React.createElement(AssetEditor, { selectedPath: selectedDocument.path, selectedEntry: selectedEntry, modelPath: `file:///stew-preview${selectedDocument.path}`, language: languageForPreviewDocument(selectedDocument.fileKind, selectedDocument.path), editorTheme: resolvedEditorTheme, value: selectedDocument.content, canEdit: false, dirty: false, saving: false, entryRevision: 0, mode: editorMode, compact: false, showModeSwitch: false, showBuiltinActions: false, onOpenMarkdownPath: (path) => {
            const normalizedPath = normalizePreviewPath(path);
            if (previewIndex.pathMap.has(normalizedPath)) {
                setSelectedPath(normalizedPath);
            }
        }, onChange: () => undefined }));
}
function resolveAvailablePreviewModes(document, previewModes, renderDocument) {
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
function normalizePreviewTree(nodes) {
    return nodes.map((node) => ({
        ...node,
        path: normalizePreviewPath(node.path || node.name),
        children: normalizePreviewTree(node.children ?? []),
    }));
}
function buildPreviewNodeIndex(nodes) {
    const pathMap = new Map();
    let firstFilePath = '';
    function visit(node) {
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
function normalizePreviewDocuments(documents) {
    if (!documents) {
        return {};
    }
    return Object.fromEntries(Object.entries(documents).map(([path, document]) => {
        const normalizedDocument = normalizePreviewDocument({
            ...document,
            path: document.path || path,
        });
        return [normalizedDocument.path, normalizedDocument];
    }));
}
function normalizePreviewDocument(document) {
    return {
        ...document,
        path: normalizePreviewPath(document.path),
    };
}
function normalizePreviewPath(path) {
    if (!path) {
        return '';
    }
    return path.startsWith('/') ? path : `/${path}`;
}
function resolveInitialSelectedPath(initialSelectedPath, pathMap, firstFilePath) {
    if (initialSelectedPath && pathMap.has(initialSelectedPath)) {
        return initialSelectedPath;
    }
    if (firstFilePath) {
        return firstFilePath;
    }
    return pathMap.values().next().value?.path ?? '';
}
function toggleExpandedPath(path, setExpandedPaths) {
    setExpandedPaths((current) => {
        const next = new Set(current);
        if (next.has(path)) {
            next.delete(path);
        }
        else {
            next.add(path);
        }
        return next;
    });
}
function renderDefaultTreeNodeMeta(node) {
    if (node.isDirectory) {
        return null;
    }
    const metaParts = [
        node.fileKind ? String(node.fileKind).toUpperCase() : '',
        typeof node.sizeBytes === 'number' ? formatBytes(node.sizeBytes) : '',
    ].filter(Boolean);
    return metaParts.length > 0 ? metaParts.join(' · ') : null;
}
function createPreviewAssetEntry(node, document) {
    return {
        path: node.path,
        parentPath: parentPathFor(node.path),
        entryKind: 'file',
        contentType: previewContentType(document.fileKind),
        languageHint: languageForPreviewDocument(document.fileKind, document.path),
        sizeBytes: document.sizeBytes ?? node.sizeBytes ?? new TextEncoder().encode(document.content).length,
        isTextPreviewable: true,
    };
}
function buildSelectedMeta(node, document) {
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
function previewContentType(fileKind) {
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
function languageForPreviewDocument(fileKind, path) {
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
function toEditorMode(mode, fileKind) {
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
function previewModeLabel(mode) {
    switch (mode) {
        case 'rendered':
            return '渲染';
        case 'split':
            return '分栏';
        default:
            return '源码';
    }
}
function modeButtonStyle(active) {
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
function parentPathFor(path) {
    const segments = path.split('/').filter(Boolean);
    if (segments.length <= 1) {
        return '/';
    }
    return `/${segments.slice(0, -1).join('/')}`;
}
function filterTreeNodes(nodes, query) {
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
        };
    })
        .filter((node) => node !== null);
}
function countTreeNodes(nodes) {
    return nodes.reduce((total, node) => total + 1 + countTreeNodes(node.children), 0);
}
function toPreviewTreeNode(node) {
    return {
        path: node.path,
        name: node.name,
        isDirectory: node.isDirectory,
        children: node.children.map(toPreviewTreeNode),
    };
}
function isPreviewMode(mode) {
    return mode === 'rendered' || mode === 'source' || mode === 'split';
}
