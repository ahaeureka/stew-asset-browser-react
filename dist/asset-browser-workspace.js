"use client";
import React, { startTransition, useEffect, useRef, useState, } from 'react';
import { Group as GroupPrimitive, Panel as PanelPrimitive, Separator as SeparatorPrimitive, } from 'react-resizable-panels';
import { AssetDiffViewer } from './asset-diff-viewer';
import { AssetEditor } from './asset-editor';
import { buildTree, buttonBaseStyle, cardHeaderStyle, collectInitialExpanded, languageFor, panelHandleStyle, pill, primaryButtonStyle, sectionStyle, selectStyle, shellStyle, toneStyle, toolbarStyle, } from './asset-browser-shared';
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
export function AssetBrowserWorkspace({ client, assetSpace, assetId, initialVersionId, initialFolder = '/', height = '100%', title, className, style, enableEditing = true, defaultDraftDescription = 'Edit assets', callbacks, onError, onStateChange, renderHeaderExtras, renderToolbarStart, renderToolbarEnd, renderEditorActions, renderDiffActions, renderFooter, renderTreeNodeMeta, renderTreeNodeActions, }) {
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
    const [diffSummary, setDiffSummary] = useState(null);
    const [diffEntries, setDiffEntries] = useState([]);
    const [diffLeftText, setDiffLeftText] = useState('');
    const [diffRightText, setDiffRightText] = useState('');
    const [diffLabel, setDiffLabel] = useState('No diff loaded');
    const [actionBusy, setActionBusy] = useState(false);
    const [exporting, setExporting] = useState(false);
    const mountedRef = useRef(true);
    const editorSessionsRef = useRef({});
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
            setShowDiff(false);
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
            setShowDiff(false);
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
            triggerBrowserDownload(result);
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
    const canEdit = enableEditing
        && isDraftSelected
        && selectedEntry?.entryKind === 'file'
        && Boolean(selectedEntry?.isTextPreviewable);
    const heading = title || collection?.displayName || `${assetSpace}/${assetId}`;
    const actionContext = createActionContext();
    return (React.createElement("section", { className: className, style: {
            ...shellStyle,
            height,
            ...style,
        } },
        React.createElement("div", { style: cardHeaderStyle },
            React.createElement("div", { style: { display: 'grid', gap: 6 } },
                React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' } }, "Stew Asset Workspace"),
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
                React.createElement("span", { style: { fontSize: 12, color: '#64748b', fontWeight: 600 } }, "Current version"),
                React.createElement("select", { value: selectedVersionId, onChange: (event) => setSelectedVersionId(event.target.value), style: selectStyle }, versions.map((version) => (React.createElement("option", { key: version.versionId, value: version.versionId },
                    version.versionId,
                    " \u00B7 ",
                    version.status,
                    version.isActive ? ' · active' : '',
                    version.isDraft ? ' · draft' : ''))))),
            React.createElement("label", { style: { display: 'grid', gap: 6, minWidth: 210 } },
                React.createElement("span", { style: { fontSize: 12, color: '#64748b', fontWeight: 600 } }, "Compare with"),
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
                React.createElement("button", { type: "button", style: buttonBaseStyle, disabled: !selectedPath, onClick: () => setShowDiff((value) => !value) }, showDiff ? 'Hide diff' : 'Show diff'),
                React.createElement("button", { type: "button", style: buttonBaseStyle, disabled: !selectedVersionId || exporting, onClick: () => void handleExport() }, exporting ? 'Exporting...' : selectedPath ? 'Export selection' : 'Export version'),
                React.createElement("button", { type: "button", style: buttonBaseStyle, disabled: loading, onClick: () => void loadWorkspace() }, "Refresh")),
            renderToolbarEnd ? renderToolbarEnd(actionContext) : null),
        React.createElement("div", { style: { flex: 1, minHeight: 0 } },
            React.createElement(Group, { orientation: "horizontal" },
                React.createElement(Panel, { defaultSize: 24, minSize: 18 },
                    React.createElement("div", { style: { ...sectionStyle, background: 'rgba(255,255,255,0.72)' } },
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
                        React.createElement(AssetEditor, { selectedPath: selectedPath, selectedEntry: selectedEntry, modelPath: currentModelPath, language: editorLanguage, value: editorText, canEdit: canEdit, dirty: dirty, saving: saving, entryRevision: entryRevision, openTabs: openTabs, onChange: (value) => {
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
                        React.createElement("div", { style: { ...sectionStyle, background: '#f8fafc' } },
                            React.createElement(AssetDiffViewer, { label: diffLabel, language: editorLanguage, summary: diffSummary, entries: diffEntries, selectedPath: selectedPath, originalText: diffLeftText, modifiedText: diffRightText, onSelectEntry: (path) => setSelectedPath(path), actions: renderDiffActions ? renderDiffActions(actionContext) : null }))))) : null)),
        selectedCompareVersion ? (React.createElement("div", { style: { padding: '10px 18px', borderTop: '1px solid rgba(148,163,184,0.14)', fontSize: 12, color: '#64748b' } },
            "Comparing against ",
            selectedCompareVersion.versionId,
            " when diff mode is enabled.")) : null,
        renderFooter ? (React.createElement("div", { style: { padding: '12px 18px', borderTop: '1px solid rgba(148,163,184,0.10)', background: 'rgba(248,250,252,0.92)' } }, renderFooter(actionContext))) : null));
}
function DownloadIcon() {
    return (React.createElement("svg", { viewBox: "0 0 12 12", fill: "none" },
        React.createElement("path", { d: "M6 1.75V7.25", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round" }),
        React.createElement("path", { d: "M3.75 5.5L6 7.75L8.25 5.5", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round", strokeLinejoin: "round" }),
        React.createElement("path", { d: "M2 9.25H10", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round" })));
}
