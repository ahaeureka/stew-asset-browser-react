"use client";
import React, { startTransition, useEffect, useMemo, useRef, useState, } from 'react';
import { Group as GroupPrimitive, Panel as PanelPrimitive, Separator as SeparatorPrimitive, } from 'react-resizable-panels';
import { AssetDiffViewer } from './asset-diff-viewer';
import { AssetEditor } from './asset-editor';
import { buildTree, buttonBaseStyle, cardHeaderStyle, collectInitialExpanded, languageFor, needsLiteralUnescape, panelHandleStyle, pill, primaryButtonStyle, resolveEditorTheme, resolveThemeVars, sectionStyle, selectStyle, shellStyle, toneStyle, toolbarStyle, unescapeLiteralNewlines, } from './asset-browser-shared';
import { AssetBrowserConsoleShell } from './asset-browser-console-shell';
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
export function AssetBrowserWorkspace({ client, assetSpace, assetId, initialVersionId, initialFolder = '/', height = '100%', title, className, style, appearance = 'default', enableEditing = true, defaultDraftDescription = 'Edit assets', theme = 'light', themeVars, editorTheme, showDecorativeBackground = true, callbacks, onError, onStateChange, renderHeaderExtras, renderToolbarStart, renderToolbarEnd, renderEditorActions, renderDiffActions, renderFooter, renderTreeNodeMeta, renderTreeNodeActions, }) {
    const [loading, setLoading] = useState(true);
    const [collection, setCollection] = useState(null);
    const [versions, setVersions] = useState([]);
    const [selectedVersionId, setSelectedVersionId] = useState('');
    const [compareVersionId, setCompareVersionId] = useState('');
    const [treeEntries, setTreeEntries] = useState([]);
    const [treeNodes, setTreeNodes] = useState([]);
    const [expandedPaths, setExpandedPaths] = useState(new Set(['/']));
    const [selectedPath, setSelectedPath] = useState('');
    const [selectedEntry, setSelectedEntry] = useState(null);
    const [editorText, setEditorText] = useState('');
    const [originalText, setOriginalText] = useState('');
    const [entryRevision, setEntryRevision] = useState(0);
    const [editorLanguage, setEditorLanguage] = useState('plaintext');
    const [editorSessions, setEditorSessions] = useState({});
    const [openEditorPaths, setOpenEditorPaths] = useState([]);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState(null);
    const [showDiff, setShowDiff] = useState(false);
    const [treeQuery, setTreeQuery] = useState('');
    const [consoleView, setConsoleView] = useState('edit');
    const [diffSummary, setDiffSummary] = useState(null);
    const [diffEntries, setDiffEntries] = useState([]);
    const [diffLeftText, setDiffLeftText] = useState('');
    const [diffRightText, setDiffRightText] = useState('');
    const [diffLabel, setDiffLabel] = useState('No diff loaded');
    const [actionBusy, setActionBusy] = useState(false);
    const [exporting, setExporting] = useState(false);
    const mountedRef = useRef(true);
    const editorSessionsRef = useRef({});
    const isConsole = appearance === 'console';
    const themeStyle = useMemo(() => resolveThemeVars(theme, themeVars, showDecorativeBackground), [theme, themeVars, showDecorativeBackground]);
    const resolvedEditorTheme = useMemo(() => resolveEditorTheme(theme, editorTheme), [theme, editorTheme]);
    useEffect(() => {
        editorSessionsRef.current = editorSessions;
    }, [editorSessions]);
    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);
    function createActionContext(overrides = {}) {
        const nextCollection = overrides.collection ?? collection;
        const nextVersions = overrides.versions ?? versions;
        const nextSelectedVersionId = overrides.selectedVersionId ?? selectedVersionId;
        const nextCompareVersionId = overrides.compareVersionId ?? compareVersionId;
        const nextSelectedPath = overrides.selectedPath ?? selectedPath;
        const nextSelectedEntry = overrides.selectedEntry
            ?? treeEntries.find((item) => item.path === nextSelectedPath)
            ?? selectedEntry
            ?? null;
        return {
            assetSpace,
            assetId,
            collection: nextCollection,
            versions: nextVersions,
            selectedVersion: nextVersions.find((item) => item.versionId === nextSelectedVersionId) ?? null,
            compareVersion: nextVersions.find((item) => item.versionId === nextCompareVersionId) ?? null,
            selectedEntry: nextSelectedEntry,
            selectedPath: nextSelectedPath,
            draftVersionId: nextCollection?.draftVersionId || nextVersions.find((item) => item.isDraft)?.versionId || '',
            dirty: overrides.dirty ?? dirty,
            loading: overrides.loading ?? loading,
            showDiff: overrides.showDiff ?? showDiff,
            status: overrides.status ?? status,
        };
    }
    useEffect(() => {
        onStateChange?.({
            collection,
            versions,
            selectedVersionId,
            compareVersionId,
            selectedPath,
            hasDraft: Boolean(collection?.hasDraft),
            dirty,
            loading,
        });
    }, [collection, compareVersionId, dirty, loading, onStateChange, selectedPath, selectedVersionId, versions]);
    useEffect(() => {
        void loadWorkspace();
    }, [assetId, assetSpace, initialVersionId]);
    useEffect(() => {
        if (!selectedVersionId) {
            return;
        }
        setEditorSessions({});
        setOpenEditorPaths([]);
        void loadTree(selectedVersionId, true);
    }, [selectedVersionId]);
    useEffect(() => {
        const entry = treeEntries.find((item) => item.path === selectedPath) ?? null;
        setSelectedEntry(entry);
        if (!selectedPath || !selectedVersionId || !entry || entry.entryKind !== 'file' || !entry.isTextPreviewable) {
            setEditorText('');
            setOriginalText('');
            setEntryRevision(0);
            setEditorLanguage('plaintext');
            setDirty(false);
            return;
        }
        setOpenEditorPaths((current) => current.includes(entry.path) ? current : [...current, entry.path]);
        const cachedSession = editorSessionsRef.current[entry.path];
        if (cachedSession && cachedSession.versionId === selectedVersionId) {
            setOriginalText(cachedSession.originalText);
            setEditorText(cachedSession.text);
            setEntryRevision(cachedSession.entryRevision);
            setEditorLanguage(cachedSession.language);
            setDirty(cachedSession.dirty);
            return;
        }
        void loadFile(entry, selectedVersionId);
    }, [selectedPath, selectedVersionId, treeEntries]);
    useEffect(() => {
        if (!showDiff || !selectedPath || !selectedVersionId) {
            return;
        }
        void loadDiffForSelection();
    }, [showDiff, selectedPath, selectedVersionId, compareVersionId]);
    useEffect(() => {
        if (!isConsole || consoleView !== 'preview' || editorLanguage === 'markdown') {
            return;
        }
        setConsoleView('edit');
    }, [consoleView, editorLanguage, isConsole]);
    useEffect(() => {
        void callbacks?.onSelectionChange?.(createActionContext());
    }, [callbacks, selectedEntry, selectedPath]);
    useEffect(() => {
        if (!selectedVersionId) {
            return;
        }
        void callbacks?.onVersionChange?.(createActionContext());
    }, [callbacks, selectedVersionId, versions]);
    useEffect(() => {
        void callbacks?.onCompareVersionChange?.(createActionContext());
    }, [callbacks, compareVersionId, versions]);
    useEffect(() => {
        void callbacks?.onDirtyChange?.(createActionContext());
    }, [callbacks, dirty]);
    useEffect(() => {
        void callbacks?.onDiffVisibilityChange?.(showDiff, createActionContext());
    }, [callbacks, showDiff]);
    useEffect(() => {
        void callbacks?.onStatusChange?.(status, createActionContext());
    }, [callbacks, status]);
    function reportError(error) {
        const text = error instanceof Error ? error.message : 'Unknown error';
        setStatus({ tone: 'error', text });
        onError?.(error);
    }
    function setDiffVisible(nextVisible) {
        setShowDiff(nextVisible);
        if (!isConsole) {
            return;
        }
        setConsoleView((current) => {
            if (nextVisible) {
                return 'diff';
            }
            return current === 'diff' ? 'edit' : current;
        });
    }
    function setConsoleWorkspaceView(nextView) {
        setConsoleView(nextView);
        setShowDiff(nextView === 'diff');
    }
    async function runAction(action) {
        try {
            setActionBusy(true);
            await action();
        }
        catch (error) {
            reportError(error);
        }
        finally {
            if (mountedRef.current) {
                setActionBusy(false);
            }
        }
    }
    async function allowAction(handler, context) {
        const result = await handler?.(context);
        return result !== false;
    }
    async function loadWorkspace() {
        setLoading(true);
        try {
            const [nextCollection, versionResult] = await Promise.all([
                client.getCollection(assetSpace, assetId),
                client.listVersions(assetSpace, assetId, { includeArchived: true }),
            ]);
            if (!mountedRef.current) {
                return;
            }
            const nextSelectedVersionId = initialVersionId
                || nextCollection.draftVersionId
                || nextCollection.activeVersionId
                || versionResult.versions[0]?.versionId
                || '';
            const nextCompareVersionId = nextCollection.activeVersionId && nextCollection.activeVersionId !== nextSelectedVersionId
                ? nextCollection.activeVersionId
                : '';
            startTransition(() => {
                setCollection(nextCollection);
                setVersions(versionResult.versions);
                setSelectedVersionId(nextSelectedVersionId);
                setCompareVersionId(nextCompareVersionId);
                setStatus(null);
            });
            await callbacks?.onWorkspaceLoaded?.(createActionContext({
                collection: nextCollection,
                versions: versionResult.versions,
                selectedVersionId: nextSelectedVersionId,
                compareVersionId: nextCompareVersionId,
                loading: false,
                status: null,
            }));
        }
        catch (error) {
            reportError(error);
        }
        finally {
            if (mountedRef.current) {
                setLoading(false);
            }
        }
    }
    async function loadTree(versionId, resetSelection) {
        try {
            const result = await client.listTree(assetSpace, assetId, {
                versionId,
                folder: initialFolder,
                pageSize: 1000,
                includeDirectories: true,
                includeFiles: true,
            });
            if (!mountedRef.current) {
                return;
            }
            const nodes = buildTree(result.entries);
            const preferredPath = resetSelection
                ? (result.entries.find((entry) => entry.path === selectedPath)?.path
                    || result.entries.find((entry) => entry.entryKind === 'file')?.path
                    || result.entries[0]?.path
                    || '')
                : selectedPath;
            startTransition(() => {
                setCollection(result.collection);
                setTreeEntries(result.entries);
                setTreeNodes(nodes);
                setExpandedPaths(collectInitialExpanded(nodes));
                if (resetSelection) {
                    setSelectedPath(preferredPath);
                }
            });
        }
        catch (error) {
            reportError(error);
        }
    }
    async function loadFile(entry, versionId) {
        try {
            const result = await client.getEntryText(assetSpace, assetId, versionId, entry.path);
            if (!mountedRef.current) {
                return;
            }
            const language = languageFor(entry, result.languageHint);
            const session = {
                path: entry.path,
                versionId,
                entry,
                text: result.text,
                originalText: result.text,
                entryRevision: result.entryRevision,
                language,
                dirty: false,
            };
            setEditorSessions((current) => ({
                ...current,
                [entry.path]: session,
            }));
            startTransition(() => {
                setOriginalText(result.text);
                setEditorText(result.text);
                setEntryRevision(result.entryRevision);
                setEditorLanguage(language);
                setDirty(false);
                setStatus(result.truncated
                    ? { tone: 'warning', text: 'Preview truncated for large file' }
                    : { tone: 'neutral', text: 'File loaded' });
            });
        }
        catch (error) {
            reportError(error);
        }
    }
    async function loadDiffForSelection() {
        try {
            const currentVersion = versions.find((item) => item.versionId === selectedVersionId);
            const draftVersionId = collection?.draftVersionId || versions.find((item) => item.isDraft)?.versionId || '';
            const diffPathPrefix = selectedEntry?.entryKind === 'directory'
                ? selectedEntry.path
                : selectedEntry?.parentPath && selectedEntry.parentPath !== '/'
                    ? selectedEntry.parentPath
                    : selectedPath || undefined;
            if (currentVersion?.isDraft && draftVersionId) {
                const diff = await client.diffDraft(assetSpace, assetId, draftVersionId, {
                    diffMode: 'with_text',
                    pathPrefix: diffPathPrefix,
                    pageSize: 1000,
                });
                if (!mountedRef.current) {
                    return;
                }
                setDiffSummary(diff.summary);
                setDiffEntries(diff.entries);
                const targetEntry = diff.entries.find((item) => item.path === selectedPath);
                if (!targetEntry || !diff.baseVersion || !diff.draftVersion) {
                    setDiffLeftText(originalText);
                    setDiffRightText(editorText);
                    setDiffLabel('Selected file has no text diff detail');
                    return;
                }
                if (targetEntry.isText && (targetEntry.oldPreview || targetEntry.newPreview || targetEntry.unifiedDiff)) {
                    setDiffLeftText(targetEntry.oldPreview);
                    setDiffRightText(targetEntry.newPreview);
                    setDiffLabel(`${diff.baseVersion.versionId} -> ${diff.draftVersion.versionId}`);
                    return;
                }
                if (!targetEntry.diffDetailAvailable) {
                    setDiffLeftText('');
                    setDiffRightText('');
                    setDiffLabel('Selected file has no text diff detail');
                    return;
                }
                const detail = await client.getDiffEntryDetail(assetSpace, assetId, diff.baseVersion.versionId, diff.draftVersion.versionId, selectedPath, { diffMode: 'with_text' });
                if (!mountedRef.current) {
                    return;
                }
                setDiffLeftText(detail.leftText);
                setDiffRightText(detail.rightText);
                setDiffLabel(`${diff.baseVersion.versionId} -> ${diff.draftVersion.versionId}`);
                return;
            }
            if (!compareVersionId || compareVersionId === selectedVersionId) {
                setDiffSummary(null);
                setDiffEntries([]);
                setDiffLeftText('');
                setDiffRightText('');
                setDiffLabel('Select another version to compare');
                return;
            }
            const diff = await client.diffVersions(assetSpace, assetId, compareVersionId, selectedVersionId, {
                diffMode: 'with_text',
                pathPrefix: diffPathPrefix,
                pageSize: 1000,
            });
            if (!mountedRef.current) {
                return;
            }
            setDiffSummary(diff.summary);
            setDiffEntries(diff.entries);
            const targetEntry = diff.entries.find((item) => item.path === selectedPath);
            if (!targetEntry || !diff.leftVersion || !diff.rightVersion) {
                setDiffLeftText('');
                setDiffRightText('');
                setDiffLabel('Selected file has no text diff detail');
                return;
            }
            if (targetEntry.isText && (targetEntry.oldPreview || targetEntry.newPreview || targetEntry.unifiedDiff)) {
                setDiffLeftText(targetEntry.oldPreview);
                setDiffRightText(targetEntry.newPreview);
                setDiffLabel(`${diff.leftVersion.versionId} -> ${diff.rightVersion.versionId}`);
                return;
            }
            if (!targetEntry.diffDetailAvailable) {
                setDiffLeftText('');
                setDiffRightText('');
                setDiffLabel('Selected file has no text diff detail');
                return;
            }
            const detail = await client.getDiffEntryDetail(assetSpace, assetId, diff.leftVersion.versionId, diff.rightVersion.versionId, selectedPath, { diffMode: 'with_text' });
            if (!mountedRef.current) {
                return;
            }
            setDiffLeftText(detail.leftText);
            setDiffRightText(detail.rightText);
            setDiffLabel(`${diff.leftVersion.versionId} -> ${diff.rightVersion.versionId}`);
        }
        catch (error) {
            reportError(error);
        }
    }
    async function handleCreateDraft() {
        await runAction(async () => {
            const currentContext = createActionContext();
            if (!(await allowAction(callbacks?.onBeforeCreateDraft, currentContext))) {
                return;
            }
            const result = await client.createDraft(assetSpace, assetId, {
                baseVersionId: collection?.activeVersionId,
                description: defaultDraftDescription,
            });
            if (!mountedRef.current) {
                return;
            }
            setStatus({ tone: 'success', text: `Draft created: ${result.draftVersion.versionId}` });
            await loadWorkspace();
            setSelectedVersionId(result.draftVersion.versionId);
            await callbacks?.onAfterCreateDraft?.(result, createActionContext({
                collection: result.collection,
                selectedVersionId: result.draftVersion.versionId,
            }));
        });
    }
    async function handleDiscardDraft() {
        const draftVersionId = collection?.draftVersionId;
        if (!draftVersionId) {
            return;
        }
        await runAction(async () => {
            const currentContext = createActionContext();
            if (!(await allowAction(callbacks?.onBeforeDiscardDraft, currentContext))) {
                return;
            }
            const fallbackVersionId = collection?.activeVersionId || '';
            await client.discardDraft(assetSpace, assetId, draftVersionId);
            if (!mountedRef.current) {
                return;
            }
            setStatus({ tone: 'success', text: `Draft discarded: ${draftVersionId}` });
            await loadWorkspace();
            setSelectedVersionId(fallbackVersionId);
            setDiffVisible(false);
            await callbacks?.onAfterDiscardDraft?.(createActionContext({
                selectedVersionId: fallbackVersionId,
                showDiff: false,
            }));
        });
    }
    async function handlePublishDraft() {
        const draftVersionId = collection?.draftVersionId;
        if (!draftVersionId) {
            return;
        }
        await runAction(async () => {
            const currentContext = createActionContext();
            if (!(await allowAction(callbacks?.onBeforePublishDraft, currentContext))) {
                return;
            }
            const result = await client.publishDraft(assetSpace, assetId, draftVersionId, {
                description: `Publish ${assetId}`,
            });
            if (!mountedRef.current) {
                return;
            }
            setStatus({ tone: 'success', text: `Published version: ${result.publishedVersion.versionId}` });
            await loadWorkspace();
            setSelectedVersionId(result.publishedVersion.versionId);
            setDiffVisible(false);
            await callbacks?.onAfterPublishDraft?.(result, createActionContext({
                collection: result.collection,
                selectedVersionId: result.publishedVersion.versionId,
                showDiff: false,
            }));
        });
    }
    async function handleSave() {
        const draftVersionId = collection?.draftVersionId;
        if (!draftVersionId || !selectedEntry || selectedEntry.entryKind !== 'file') {
            return;
        }
        const currentContext = createActionContext();
        const beforeSaveAllowed = await callbacks?.onBeforeSave?.(editorText, currentContext);
        if (beforeSaveAllowed === false) {
            return;
        }
        try {
            setSaving(true);
            const result = await client.saveDraftText(assetSpace, assetId, {
                draftVersionId,
                path: selectedEntry.path,
                text: editorText,
                contentType: selectedEntry.contentType,
                expectedEntryRevision: entryRevision,
            });
            if (!mountedRef.current) {
                return;
            }
            setOriginalText(editorText);
            setEntryRevision(result.entryRevision);
            setDirty(false);
            setEditorSessions((current) => {
                const existing = selectedEntry ? current[selectedEntry.path] : undefined;
                if (!selectedEntry) {
                    return current;
                }
                return {
                    ...current,
                    [selectedEntry.path]: {
                        path: selectedEntry.path,
                        versionId: draftVersionId,
                        entry: selectedEntry,
                        text: editorText,
                        originalText: editorText,
                        entryRevision: result.entryRevision,
                        language: existing?.language || editorLanguage,
                        dirty: false,
                    },
                };
            });
            setStatus({ tone: 'success', text: `Saved revision ${result.entryRevision}` });
            await loadTree(draftVersionId, false);
            if (showDiff) {
                await loadDiffForSelection();
            }
            await callbacks?.onAfterSave?.(result, createActionContext({ dirty: false }));
        }
        catch (error) {
            reportError(error);
        }
        finally {
            if (mountedRef.current) {
                setSaving(false);
            }
        }
    }
    function triggerBrowserDownload(result) {
        const url = URL.createObjectURL(result.blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = result.filename;
        anchor.rel = 'noopener';
        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
    }
    async function unescapeDownloadBlob(result) {
        const ct = result.contentType;
        const isText = ct.startsWith('text/') || ct.includes('json') || ct.includes('yaml') || ct.includes('xml');
        if (!isText) {
            return result;
        }
        const raw = await result.blob.text();
        if (!needsLiteralUnescape(raw)) {
            return result;
        }
        const cleaned = unescapeLiteralNewlines(raw);
        return {
            ...result,
            blob: new Blob([cleaned], { type: result.contentType }),
        };
    }
    async function handleExport(targetPath) {
        if (!selectedVersionId) {
            return;
        }
        const exportPath = (targetPath ?? selectedPath) || '/';
        const currentContext = createActionContext({ selectedPath: exportPath });
        const allowed = await callbacks?.onBeforeExport?.({ versionId: selectedVersionId, path: exportPath }, currentContext);
        if (allowed === false) {
            return;
        }
        try {
            setExporting(true);
            const result = await client.downloadEntry(assetSpace, assetId, {
                versionId: selectedVersionId,
                path: exportPath,
            });
            const cleaned = await unescapeDownloadBlob(result);
            triggerBrowserDownload(cleaned);
            if (!mountedRef.current) {
                return;
            }
            setStatus({ tone: 'success', text: `Exported ${result.filename}` });
            await callbacks?.onAfterExport?.(result, currentContext);
        }
        catch (error) {
            reportError(error);
        }
        finally {
            if (mountedRef.current) {
                setExporting(false);
            }
        }
    }
    function labelForPath(path) {
        const segments = path.split('/').filter(Boolean);
        return segments[segments.length - 1] || path || 'Untitled';
    }
    function closeEditorTab(path) {
        setOpenEditorPaths((current) => {
            const next = current.filter((item) => item !== path);
            if (selectedPath === path) {
                setSelectedPath(next[next.length - 1] || '');
            }
            return next;
        });
    }
    const openTabs = openEditorPaths
        .map((path) => {
        const session = editorSessions[path];
        const entry = session?.entry ?? treeEntries.find((item) => item.path === path) ?? null;
        if (!entry || entry.entryKind !== 'file' || !entry.isTextPreviewable) {
            return null;
        }
        return {
            path,
            label: labelForPath(path),
            active: path === selectedPath,
            dirty: session?.dirty ?? (path === selectedPath && dirty),
        };
    })
        .filter((item) => item !== null);
    const currentModelPath = selectedPath && selectedVersionId
        ? `file:///stew/${encodeURIComponent(assetSpace)}/${encodeURIComponent(assetId)}/${encodeURIComponent(selectedVersionId)}${selectedPath}`
        : undefined;
    const selectedVersion = versions.find((item) => item.versionId === selectedVersionId) ?? null;
    const selectedCompareVersion = versions.find((item) => item.versionId === compareVersionId) ?? null;
    const isDraftSelected = Boolean(selectedVersion?.isDraft);
    const canPreviewMarkdown = editorLanguage === 'markdown' && selectedEntry?.entryKind === 'file';
    const canEdit = enableEditing
        && isDraftSelected
        && selectedEntry?.entryKind === 'file'
        && Boolean(selectedEntry?.isTextPreviewable);
    const heading = title || collection?.displayName || `${assetSpace}/${assetId}`;
    const actionContext = createActionContext();
    const filteredTreeNodes = useMemo(() => isConsole ? filterTreeNodes(treeNodes, treeQuery) : treeNodes, [isConsole, treeNodes, treeQuery]);
    const visibleTreeCount = useMemo(() => countTreeNodes(filteredTreeNodes), [filteredTreeNodes]);
    const visibleExpandedPaths = useMemo(() => treeQuery.trim() ? collectInitialExpanded(filteredTreeNodes) : expandedPaths, [expandedPaths, filteredTreeNodes, treeQuery]);
    const topbarButtonStyle = isConsole
        ? {
            ...buttonBaseStyle,
            minHeight: 38,
            padding: '0 14px',
            borderRadius: 12,
            borderColor: 'rgba(15,118,110,0.18)',
            background: 'rgba(255,255,255,0.94)',
        }
        : buttonBaseStyle;
    const topbarPrimaryButtonStyle = isConsole
        ? {
            ...primaryButtonStyle,
            minHeight: 38,
            padding: '0 14px',
            borderRadius: 12,
            borderColor: 'rgba(15,118,110,0.24)',
            background: 'linear-gradient(135deg, #0f766e, #0f766e 45%, #0f172a 100%)',
        }
        : primaryButtonStyle;
    const topbarSelectStyle = isConsole
        ? {
            ...selectStyle,
            minHeight: 38,
            borderRadius: 12,
            borderColor: 'rgba(148,163,184,0.22)',
            background: 'rgba(255,255,255,0.94)',
        }
        : selectStyle;
    const consoleSearchInputStyle = {
        minHeight: 38,
        padding: '0 12px',
        borderRadius: 12,
        border: '1px solid rgba(148,163,184,0.22)',
        background: 'rgba(255,255,255,0.94)',
        color: '#0f172a',
        fontSize: 12,
        outline: 'none',
    };
    const versionDescription = selectedVersion?.description || '当前版本暂无说明，可继续从目录树选择资源查看内容。';
    const versionMeta = selectedVersion
        ? `${selectedVersion.createdBy || 'system'} · ${formatWorkspaceTimestamp(selectedVersion.createdAt)}`
        : '加载版本信息中';
    const entryMeta = selectedEntry
        ? `${selectedEntry.contentType || 'text/plain'} · ${selectedEntry.entryKind === 'file' ? `${selectedEntry.sizeBytes} B` : '目录'}${selectedEntry.entryKind === 'file' ? ` · rev ${entryRevision}` : ''}`
        : '从左侧目录树选择资源后，可查看正文、预览或差异。';
    const selectedPathLabel = selectedPath || '请选择资源文件';
    const activeEditorMode = isConsole && consoleView === 'preview' ? 'preview' : 'edit';
    if (isConsole) {
        return (React.createElement(AssetBrowserConsoleShell, { className: className, style: style, height: height, heading: heading, themeStyle: themeStyle, themeMode: theme, kicker: "\u4E1A\u52A1\u8D44\u4EA7\u6D4F\u89C8", badges: (React.createElement(React.Fragment, null,
                pill('空间', assetSpace),
                pill('资产', assetId),
                pill('模式', isDraftSelected ? '草稿' : '只读'),
                collection?.activeVersionId ? pill('生效版本', collection.activeVersionId) : null)), controls: (React.createElement(React.Fragment, null,
                renderToolbarStart ? renderToolbarStart(actionContext) : null,
                React.createElement("label", { className: "stew-asset-workspace__console-control-group" },
                    React.createElement("span", { className: "stew-asset-workspace__console-control-label" }, "\u5F53\u524D\u7248\u672C"),
                    React.createElement("select", { value: selectedVersionId, onChange: (event) => setSelectedVersionId(event.target.value), style: topbarSelectStyle }, versions.map((version) => (React.createElement("option", { key: version.versionId, value: version.versionId },
                        version.versionId,
                        " \u00B7 ",
                        version.status,
                        version.isActive ? ' · active' : '',
                        version.isDraft ? ' · draft' : ''))))),
                React.createElement("label", { className: "stew-asset-workspace__console-control-group" },
                    React.createElement("span", { className: "stew-asset-workspace__console-control-label" }, "\u5BF9\u6BD4\u57FA\u7EBF"),
                    React.createElement("select", { value: compareVersionId, onChange: (event) => setCompareVersionId(event.target.value), style: topbarSelectStyle },
                        React.createElement("option", { value: "" }, "\u4E0D\u5BF9\u6BD4"),
                        versions
                            .filter((version) => version.versionId !== selectedVersionId)
                            .map((version) => (React.createElement("option", { key: version.versionId, value: version.versionId },
                            version.versionId,
                            " \u00B7 ",
                            version.status))))),
                React.createElement("label", { className: "stew-asset-workspace__console-search-group" },
                    React.createElement("span", { className: "stew-asset-workspace__console-control-label" }, "\u641C\u7D22\u8D44\u6E90"),
                    React.createElement("input", { value: treeQuery, onChange: (event) => setTreeQuery(event.target.value), placeholder: "\u6309\u6587\u4EF6\u540D\u6216\u8DEF\u5F84\u8FC7\u6EE4\u76EE\u5F55\u6811", style: consoleSearchInputStyle })))), actions: (React.createElement(React.Fragment, null,
                renderHeaderExtras ? renderHeaderExtras(actionContext) : null,
                !collection?.hasDraft ? (React.createElement("button", { type: "button", style: topbarPrimaryButtonStyle, disabled: actionBusy, onClick: () => void handleCreateDraft() }, "\u521B\u5EFA\u8349\u7A3F")) : null,
                collection?.hasDraft ? (React.createElement("button", { type: "button", style: topbarButtonStyle, disabled: actionBusy, onClick: () => void handleDiscardDraft() }, "\u5E9F\u5F03\u8349\u7A3F")) : null,
                collection?.hasDraft ? (React.createElement("button", { type: "button", style: topbarPrimaryButtonStyle, disabled: actionBusy, onClick: () => void handlePublishDraft() }, "\u53D1\u5E03\u7248\u672C")) : null,
                React.createElement("button", { type: "button", style: topbarButtonStyle, disabled: !selectedVersionId || exporting, onClick: () => void handleExport() }, exporting ? '导出中...' : selectedPath ? '导出当前资源' : '导出当前版本'),
                React.createElement("button", { type: "button", style: topbarButtonStyle, disabled: loading, onClick: () => void loadWorkspace() }, "\u5237\u65B0"),
                renderToolbarEnd ? renderToolbarEnd(actionContext) : null)), status: status, sidebarTitle: "\u8D44\u6E90\u76EE\u5F55", sidebarSubtitle: treeQuery.trim() ? `筛选后 ${visibleTreeCount} 项` : `共 ${treeEntries.length} 项`, sidebarActions: (React.createElement(React.Fragment, null,
                React.createElement("span", { className: "stew-asset-workspace__console-sidebar-pill" }, isDraftSelected ? '草稿视图' : '版本视图'),
                React.createElement("button", { type: "button", style: topbarButtonStyle, disabled: !selectedVersionId || exporting, onClick: () => void handleExport('/') }, "\u5BFC\u51FA"))), sidebarCardTitle: selectedVersion?.versionId || '正在加载版本', sidebarCardBody: (React.createElement(React.Fragment, null,
                React.createElement("div", null, versionDescription),
                React.createElement("div", null, versionMeta))), sidebarContent: (React.createElement(AssetTree, { title: treeQuery.trim() ? '搜索结果' : '资源目录', nodes: filteredTreeNodes, expandedPaths: visibleExpandedPaths, selectedPath: selectedPath, loading: loading, compact: true, emptyTitle: treeQuery.trim() ? '未找到匹配资源' : '暂无资源', emptyMessage: treeQuery.trim() ? '请调整关键字，或清空搜索后查看完整目录树。' : '当前版本没有可浏览的资源条目。', onSelect: (path) => setSelectedPath(path), onToggle: (path) => {
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
                }, renderNodeMeta: renderTreeNodeMeta, renderNodeActions: (node) => (React.createElement("div", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
                    !node.isDirectory || node.path ? (React.createElement("button", { type: "button", className: "stew-asset-tree__action-button", disabled: exporting || !selectedVersionId, onClick: () => void handleExport(node.path) },
                        React.createElement("span", { className: "stew-asset-tree__action-icon", "aria-hidden": "true" },
                            React.createElement(DownloadIcon, null)),
                        React.createElement("span", null, "\u5BFC\u51FA"))) : null,
                    renderTreeNodeActions ? renderTreeNodeActions(node) : null)) })), mainTitle: selectedPathLabel, mainSubtitle: entryMeta, viewSwitcher: (React.createElement("div", { className: "stew-asset-workspace__console-view-switcher" },
                React.createElement("button", { type: "button", className: `stew-asset-workspace__console-view-button${consoleView === 'edit' ? ' is-active' : ''}`, onClick: () => setConsoleWorkspaceView('edit') }, "\u7F16\u8F91"),
                React.createElement("button", { type: "button", className: `stew-asset-workspace__console-view-button${consoleView === 'preview' ? ' is-active' : ''}`, disabled: !canPreviewMarkdown, onClick: () => setConsoleWorkspaceView('preview') }, "\u9884\u89C8"),
                React.createElement("button", { type: "button", className: `stew-asset-workspace__console-view-button${consoleView === 'diff' ? ' is-active' : ''}`, disabled: !selectedPath, onClick: () => setConsoleWorkspaceView('diff') }, "\u5DEE\u5F02"))), mainContent: consoleView === 'diff' ? (React.createElement(AssetDiffViewer, { label: diffLabel, language: editorLanguage, summary: diffSummary, entries: diffEntries, selectedPath: selectedPath, originalText: diffLeftText, modifiedText: diffRightText, compact: true, editorTheme: resolvedEditorTheme, onSelectEntry: (path) => setSelectedPath(path), actions: renderDiffActions ? renderDiffActions(actionContext) : null })) : (React.createElement(AssetEditor, { selectedPath: selectedPath, selectedEntry: selectedEntry, modelPath: currentModelPath, language: editorLanguage, editorTheme: resolvedEditorTheme, value: editorText, canEdit: canEdit, dirty: dirty, saving: saving, entryRevision: entryRevision, openTabs: openTabs, compact: true, mode: activeEditorMode, showModeSwitch: false, onOpenMarkdownPath: (path) => setSelectedPath(path), onChange: (value) => {
                    const nextDirty = value !== originalText;
                    setEditorText(value);
                    setDirty(nextDirty);
                    if (selectedEntry?.entryKind === 'file') {
                        setEditorSessions((current) => ({
                            ...current,
                            [selectedEntry.path]: {
                                path: selectedEntry.path,
                                versionId: selectedVersionId,
                                entry: selectedEntry,
                                text: value,
                                originalText,
                                entryRevision,
                                language: editorLanguage,
                                dirty: nextDirty,
                            },
                        }));
                    }
                }, onSave: canEdit ? () => void handleSave() : undefined, onSelectTab: (path) => setSelectedPath(path), onCloseTab: closeEditorTab, actions: renderEditorActions ? renderEditorActions(actionContext) : null })), compareNote: selectedCompareVersion ? `当前对比基线：${selectedCompareVersion.versionId}` : undefined, footer: renderFooter ? renderFooter(actionContext) : undefined }));
    }
    return (React.createElement("section", { className: className, "data-stew-theme": theme, style: {
            ...shellStyle,
            ...themeStyle,
            height,
            ...style,
        } },
        React.createElement(React.Fragment, null,
            React.createElement("div", { style: cardHeaderStyle },
                React.createElement("div", { style: { display: 'grid', gap: 6 } },
                    React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: 'var(--stew-ab-muted-fg, #64748b)', textTransform: 'uppercase', letterSpacing: '0.08em' } }, "Stew Asset Workspace"),
                    React.createElement("div", { style: { fontSize: 22, fontWeight: 700 } }, heading),
                    React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8 } },
                        pill('Space', assetSpace),
                        pill('Asset', assetId),
                        pill('Mode', isDraftSelected ? 'Draft' : 'Read only'),
                        collection?.activeVersionId ? pill('Active', collection.activeVersionId) : null)),
                React.createElement("div", { style: { display: 'grid', gap: 12, justifyItems: 'end' } },
                    renderHeaderExtras ? renderHeaderExtras(actionContext) : null,
                    status ? (React.createElement("div", { style: { ...toneStyle(status.tone), borderRadius: 14, padding: '10px 12px', fontSize: 13, maxWidth: 320 } }, status.text)) : null)),
            React.createElement("div", { style: toolbarStyle },
                renderToolbarStart ? renderToolbarStart(actionContext) : null,
                React.createElement("label", { style: { display: 'grid', gap: 6, minWidth: 210 } },
                    React.createElement("span", { style: { fontSize: 12, color: 'var(--stew-ab-muted-fg, #64748b)', fontWeight: 600 } }, "Current version"),
                    React.createElement("select", { value: selectedVersionId, onChange: (event) => setSelectedVersionId(event.target.value), style: selectStyle }, versions.map((version) => (React.createElement("option", { key: version.versionId, value: version.versionId },
                        version.versionId,
                        " \u00B7 ",
                        version.status,
                        version.isActive ? ' · active' : '',
                        version.isDraft ? ' · draft' : ''))))),
                React.createElement("label", { style: { display: 'grid', gap: 6, minWidth: 210 } },
                    React.createElement("span", { style: { fontSize: 12, color: 'var(--stew-ab-muted-fg, #64748b)', fontWeight: 600 } }, "Compare with"),
                    React.createElement("select", { value: compareVersionId, onChange: (event) => setCompareVersionId(event.target.value), style: selectStyle },
                        React.createElement("option", { value: "" }, "No comparison"),
                        versions
                            .filter((version) => version.versionId !== selectedVersionId)
                            .map((version) => (React.createElement("option", { key: version.versionId, value: version.versionId },
                            version.versionId,
                            " \u00B7 ",
                            version.status))))),
                React.createElement("div", { style: { display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' } },
                    !collection?.hasDraft ? (React.createElement("button", { type: "button", style: primaryButtonStyle, disabled: actionBusy, onClick: () => void handleCreateDraft() }, "Create draft")) : null,
                    collection?.hasDraft ? (React.createElement("button", { type: "button", style: buttonBaseStyle, disabled: actionBusy, onClick: () => void handleDiscardDraft() }, "Discard draft")) : null,
                    collection?.hasDraft ? (React.createElement("button", { type: "button", style: primaryButtonStyle, disabled: actionBusy, onClick: () => void handlePublishDraft() }, "Publish draft")) : null,
                    React.createElement("button", { type: "button", style: buttonBaseStyle, disabled: !selectedPath, onClick: () => setDiffVisible(!showDiff) }, showDiff ? 'Hide diff' : 'Show diff'),
                    React.createElement("button", { type: "button", style: buttonBaseStyle, disabled: !selectedVersionId || exporting, onClick: () => void handleExport() }, exporting ? 'Exporting...' : selectedPath ? 'Export selection' : 'Export version'),
                    React.createElement("button", { type: "button", style: buttonBaseStyle, disabled: loading, onClick: () => void loadWorkspace() }, "Refresh")),
                renderToolbarEnd ? renderToolbarEnd(actionContext) : null),
            React.createElement("div", { style: { flex: 1, minHeight: 0 } },
                React.createElement(Group, { orientation: "horizontal" },
                    React.createElement(Panel, { defaultSize: 24, minSize: 18 },
                        React.createElement("div", { style: { ...sectionStyle, background: 'var(--stew-ab-sidebar-bg, rgba(255,255,255,0.72))' } },
                            React.createElement(AssetTree, { nodes: treeNodes, expandedPaths: expandedPaths, selectedPath: selectedPath, loading: loading, onSelect: (path) => setSelectedPath(path), onToggle: (path) => {
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
                                }, renderNodeMeta: renderTreeNodeMeta, renderNodeActions: (node) => (React.createElement("div", { style: { display: 'inline-flex', alignItems: 'center', gap: 6 } },
                                    !node.isDirectory || node.path ? (React.createElement("button", { type: "button", className: "stew-asset-tree__action-button", disabled: exporting || !selectedVersionId, onClick: () => void handleExport(node.path) },
                                        React.createElement("span", { className: "stew-asset-tree__action-icon", "aria-hidden": "true" },
                                            React.createElement(DownloadIcon, null)),
                                        React.createElement("span", null, "Export"))) : null,
                                    renderTreeNodeActions ? renderTreeNodeActions(node) : null)) }))),
                    React.createElement(Separator, { style: panelHandleStyle }),
                    React.createElement(Panel, { defaultSize: showDiff ? 44 : 76, minSize: 32 },
                        React.createElement("div", { style: sectionStyle },
                            React.createElement(AssetEditor, { selectedPath: selectedPath, selectedEntry: selectedEntry, modelPath: currentModelPath, language: editorLanguage, editorTheme: resolvedEditorTheme, value: editorText, canEdit: canEdit, dirty: dirty, saving: saving, entryRevision: entryRevision, openTabs: openTabs, onOpenMarkdownPath: (path) => setSelectedPath(path), onChange: (value) => {
                                    const nextDirty = value !== originalText;
                                    setEditorText(value);
                                    setDirty(nextDirty);
                                    if (selectedEntry?.entryKind === 'file') {
                                        setEditorSessions((current) => ({
                                            ...current,
                                            [selectedEntry.path]: {
                                                path: selectedEntry.path,
                                                versionId: selectedVersionId,
                                                entry: selectedEntry,
                                                text: value,
                                                originalText,
                                                entryRevision,
                                                language: editorLanguage,
                                                dirty: nextDirty,
                                            },
                                        }));
                                    }
                                }, onSave: canEdit ? () => void handleSave() : undefined, onSelectTab: (path) => setSelectedPath(path), onCloseTab: closeEditorTab, actions: renderEditorActions ? renderEditorActions(actionContext) : null }))),
                    showDiff ? (React.createElement(React.Fragment, null,
                        React.createElement(Separator, { style: panelHandleStyle }),
                        React.createElement(Panel, { defaultSize: 32, minSize: 20 },
                            React.createElement("div", { style: { ...sectionStyle, background: 'var(--stew-ab-surface-muted, #f8fafc)' } },
                                React.createElement(AssetDiffViewer, { label: diffLabel, language: editorLanguage, summary: diffSummary, entries: diffEntries, selectedPath: selectedPath, originalText: diffLeftText, modifiedText: diffRightText, editorTheme: resolvedEditorTheme, onSelectEntry: (path) => setSelectedPath(path), actions: renderDiffActions ? renderDiffActions(actionContext) : null }))))) : null)),
            selectedCompareVersion ? (React.createElement("div", { style: { padding: '10px 18px', borderTop: '1px solid var(--stew-ab-border, rgba(148,163,184,0.14))', fontSize: 12, color: 'var(--stew-ab-muted-fg, #64748b)' } },
                "Comparing against ",
                selectedCompareVersion.versionId,
                " when diff mode is enabled.")) : null,
            renderFooter ? (React.createElement("div", { style: { padding: '12px 18px', borderTop: '1px solid var(--stew-ab-border, rgba(148,163,184,0.10))', background: 'var(--stew-ab-footer-bg, rgba(248,250,252,0.92))' } }, renderFooter(actionContext))) : null)));
}
function filterTreeNodes(nodes, query) {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
        return nodes;
    }
    return nodes
        .map((node) => {
        const filteredChildren = filterTreeNodes(node.children, normalizedQuery);
        const matched = node.name.toLowerCase().includes(normalizedQuery) || node.path.toLowerCase().includes(normalizedQuery);
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
function formatWorkspaceTimestamp(value) {
    if (!value) {
        return '--';
    }
    const timestamp = new Date(value);
    if (Number.isNaN(timestamp.getTime())) {
        return value;
    }
    return new Intl.DateTimeFormat('zh-CN', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(timestamp);
}
function DownloadIcon() {
    return (React.createElement("svg", { viewBox: "0 0 12 12", fill: "none" },
        React.createElement("path", { d: "M6 1.75V7.25", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round" }),
        React.createElement("path", { d: "M3.75 5.5L6 7.75L8.25 5.5", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round", strokeLinejoin: "round" }),
        React.createElement("path", { d: "M2 9.25H10", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round" })));
}
