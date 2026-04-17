"use client";

import React, {
    type CSSProperties,
    type ReactNode,
    type Ref,
    startTransition,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import {
    Group as GroupPrimitive,
    Panel as PanelPrimitive,
    Separator as SeparatorPrimitive,
    type GroupProps,
    type PanelProps,
    type SeparatorProps,
} from 'react-resizable-panels';
import {
    type AssetCollection,
    type AssetDiffEntry,
    type AssetDiffSummary,
    type DownloadEntryResult,
    type AssetTreeEntry,
    type AssetVersionSummary,
    AssetBrowserClient,
} from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import { AssetDiffViewer } from './asset-diff-viewer';
import { AssetEditor, type AssetEditorTab } from './asset-editor';
import {
    buildTree,
    buttonBaseStyle,
    cardHeaderStyle,
    collectInitialExpanded,
    type AssetBrowserActionContext,
    type AssetBrowserEditorTheme,
    type AssetBrowserWorkspaceAppearance,
    type AssetBrowserThemeMode,
    type AssetBrowserThemeVars,
    type AssetBrowserWorkspaceActions,
    type AssetBrowserWorkspaceCallbacks,
    type AssetBrowserWorkspaceHandle,
    type AssetBrowserWorkspaceState,
    languageFor,
    needsLiteralUnescape,
    panelHandleStyle,
    pill,
    primaryButtonStyle,
    LoadingOverlay,
    resolveEditorTheme,
    resolveThemeVars,
    sectionStyle,
    selectStyle,
    shellStyle,
    type StatusMessage,
    toneStyle,
    toolbarStyle,
    type TreeNode,
    unescapeLiteralNewlines,
} from './asset-browser-shared';
import { AssetBrowserConsoleShell } from './asset-browser-console-shell';
import {
    AssetBrowserReadonly,
    type AssetBrowserReadonlyProps,
} from './asset-browser-readonly';
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

interface ActionContextOverrides {
    collection?: AssetCollection | null;
    versions?: AssetVersionSummary[];
    selectedVersionId?: string;
    compareVersionId?: string;
    selectedPath?: string;
    selectedEntry?: AssetTreeEntry | null;
    dirty?: boolean;
    loading?: boolean;
    showDiff?: boolean;
    status?: StatusMessage | null;
}

interface EditorSession {
    path: string;
    versionId: string;
    entry: AssetTreeEntry;
    text: string;
    originalText: string;
    entryRevision: number;
    language: string;
    dirty: boolean;
}

type AssetBrowserConsoleView = 'edit' | 'preview' | 'diff';

export interface AssetBrowserManagedWorkspaceProps {
    mode?: 'workspace';
    ref?: Ref<AssetBrowserWorkspaceHandle>;
    client: AssetBrowserClient;
    assetSpace: string;
    assetId: string;
    /** Business version ID to open first when the workspace is mounted. */
    initialVersionId?: string;
    initialFolder?: string;
    height?: number | string;
    title?: string;
    className?: string;
    style?: CSSProperties;
    appearance?: AssetBrowserWorkspaceAppearance;
    enableEditing?: boolean;
    /** When true, hides draft action buttons and forces the editor into read-only mode. */
    readOnly?: boolean;
    defaultDraftDescription?: string;
    theme?: AssetBrowserThemeMode;
    themeVars?: Partial<AssetBrowserThemeVars>;
    editorTheme?: AssetBrowserEditorTheme;
    showDecorativeBackground?: boolean;
    callbacks?: AssetBrowserWorkspaceCallbacks;
    onError?: (error: unknown) => void;
    onStateChange?: (state: AssetBrowserWorkspaceState) => void;
    renderHeaderExtras?: (context: AssetBrowserActionContext) => ReactNode;
    renderToolbarStart?: (context: AssetBrowserActionContext) => ReactNode;
    renderToolbarEnd?: (context: AssetBrowserActionContext) => ReactNode;
    renderEditorActions?: (context: AssetBrowserActionContext) => ReactNode;
    renderDiffActions?: (context: AssetBrowserActionContext) => ReactNode;
    renderFooter?: (context: AssetBrowserActionContext) => ReactNode;
    renderTreeNodeMeta?: (node: TreeNode) => ReactNode;
    renderTreeNodeActions?: (node: TreeNode) => ReactNode;
}

export type AssetBrowserWorkspaceProps =
    | AssetBrowserManagedWorkspaceProps
    | AssetBrowserReadonlyProps;

export function AssetBrowserWorkspace(props: AssetBrowserWorkspaceProps) {
    if (props.mode === 'browse-preview') {
        return <AssetBrowserReadonly {...props} />;
    }

    const {
        ref,
        client,
        assetSpace,
        assetId,
        initialVersionId,
        initialFolder = '/',
        height = '100%',
        title,
        className,
        style,
        appearance = 'default',
        enableEditing = true,
        readOnly = false,
        defaultDraftDescription = 'Edit assets',
        theme = 'light',
        themeVars,
        editorTheme,
        showDecorativeBackground = true,
        callbacks,
        onError,
        onStateChange,
        renderHeaderExtras,
        renderToolbarStart,
        renderToolbarEnd,
        renderEditorActions,
        renderDiffActions,
        renderFooter,
        renderTreeNodeMeta,
        renderTreeNodeActions,
    } = props;
    const [workspaceLoading, setWorkspaceLoading] = useState(true);
    const [treeLoading, setTreeLoading] = useState(false);
    const [collection, setCollection] = useState<AssetCollection | null>(null);
    const [versions, setVersions] = useState<AssetVersionSummary[]>([]);
    const [selectedVersionId, setSelectedVersionId] = useState('');
    const [compareVersionId, setCompareVersionId] = useState('');
    const [treeEntries, setTreeEntries] = useState<AssetTreeEntry[]>([]);
    const [treeNodes, setTreeNodes] = useState<TreeNode[]>([]);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['/']));
    const [selectedPath, setSelectedPath] = useState('');
    const [selectedEntry, setSelectedEntry] = useState<AssetTreeEntry | null>(null);
    const [editorText, setEditorText] = useState('');
    const [originalText, setOriginalText] = useState('');
    const [entryRevision, setEntryRevision] = useState(0);
    const [editorLanguage, setEditorLanguage] = useState('plaintext');
    const [editorSessions, setEditorSessions] = useState<Record<string, EditorSession>>({});
    const [openEditorPaths, setOpenEditorPaths] = useState<string[]>([]);
    const [dirty, setDirty] = useState(false);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState<StatusMessage | null>(null);
    const [showDiff, setShowDiff] = useState(false);
    const [treeQuery, setTreeQuery] = useState('');
    const [consoleView, setConsoleView] = useState<AssetBrowserConsoleView>('edit');
    const [diffSummary, setDiffSummary] = useState<AssetDiffSummary | null>(null);
    const [diffEntries, setDiffEntries] = useState<AssetDiffEntry[]>([]);
    const [diffLeftText, setDiffLeftText] = useState('');
    const [diffRightText, setDiffRightText] = useState('');
    const [diffLabel, setDiffLabel] = useState('No diff loaded');
    const [actionBusy, setActionBusy] = useState(false);
    const [exporting, setExporting] = useState(false);
    const mountedRef = useRef(true);
    const editorSessionsRef = useRef<Record<string, EditorSession>>({});
    const isConsole = appearance === 'console';
    const loading = workspaceLoading || treeLoading;

    const themeStyle = useMemo(
        () => resolveThemeVars(theme, themeVars, showDecorativeBackground),
        [theme, themeVars, showDecorativeBackground],
    );
    const resolvedEditorTheme = useMemo(
        () => resolveEditorTheme(theme, editorTheme),
        [theme, editorTheme],
    );

    useEffect(() => {
        editorSessionsRef.current = editorSessions;
    }, [editorSessions]);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    function createActionContext(overrides: ActionContextOverrides = {}, includeActions = false): AssetBrowserActionContext {
        const nextCollection = overrides.collection ?? collection;
        const nextVersions = overrides.versions ?? versions;
        const nextSelectedVersionId = overrides.selectedVersionId ?? selectedVersionId;
        const nextCompareVersionId = overrides.compareVersionId ?? compareVersionId;
        const nextSelectedPath = overrides.selectedPath ?? selectedPath;
        const nextSelectedEntry = overrides.selectedEntry
            ?? treeEntries.find((item) => item.path === nextSelectedPath)
            ?? selectedEntry
            ?? null;

        const ctx: AssetBrowserActionContext = {
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
        if (includeActions) {
            ctx.workspaceActions = createWorkspaceActions();
        }
        return ctx;
    }

    function createWorkspaceActions(): AssetBrowserWorkspaceActions {
        return {
            async refreshWorkspace() {
                await loadWorkspace();
            },
            selectVersion(versionId: string) {
                setSelectedVersionId(versionId);
            },
            clearDraftState() {
                setDiffVisible(false);
                setDirty(false);
                setEditorSessions({});
                setOpenEditorPaths([]);
            },
        };
    }

    useImperativeHandle(ref, () => createWorkspaceActions(), [collection, versions, selectedVersionId]);

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
            setTreeEntries([]);
            setTreeNodes([]);
            setExpandedPaths(new Set(['/']));
            setSelectedPath('');
            setTreeLoading(false);
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

    function reportError(error: unknown) {
        const text = error instanceof Error ? error.message : 'Unknown error';
        setStatus({ tone: 'error', text });
        onError?.(error);
    }

    function setDiffVisible(nextVisible: boolean) {
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

    function setConsoleWorkspaceView(nextView: AssetBrowserConsoleView) {
        setConsoleView(nextView);
        setShowDiff(nextView === 'diff');
    }

    async function runAction(action: () => Promise<void>) {
        try {
            setActionBusy(true);
            await action();
        } catch (error) {
            reportError(error);
        } finally {
            if (mountedRef.current) {
                setActionBusy(false);
            }
        }
    }

    async function allowAction(
        handler: ((context: AssetBrowserActionContext) => boolean | void | Promise<boolean | void>) | undefined,
        context: AssetBrowserActionContext,
    ) {
        const result = await handler?.(context);
        return result !== false;
    }

    async function loadWorkspace() {
        setWorkspaceLoading(true);
        let hasNextSelectedVersion = false;
        let reloadedCurrentTree = false;
        try {
            const [nextCollection, versionResult] = await Promise.all([
                client.getCollection(assetSpace, assetId),
                client.listVersions(assetSpace, assetId, { includeArchived: true }),
            ]);

            if (!mountedRef.current) {
                return;
            }

            const preservedSelectedVersionId = selectedVersionId
                && versionResult.versions.some((item) => item.versionId === selectedVersionId)
                ? selectedVersionId
                : '';
            const initialSelectedVersionId = initialVersionId
                && versionResult.versions.some((item) => item.versionId === initialVersionId)
                ? initialVersionId
                : '';
            const nextSelectedVersionId = preservedSelectedVersionId
                || initialSelectedVersionId
                || nextCollection.draftVersionId
                || nextCollection.activeVersionId
                || versionResult.versions[0]?.versionId
                || '';
            const preservedCompareVersionId = compareVersionId
                && compareVersionId !== nextSelectedVersionId
                && versionResult.versions.some((item) => item.versionId === compareVersionId)
                ? compareVersionId
                : '';
            const nextCompareVersionId = preservedCompareVersionId
                || (nextCollection.activeVersionId && nextCollection.activeVersionId !== nextSelectedVersionId
                    ? nextCollection.activeVersionId
                    : '');
            hasNextSelectedVersion = Boolean(nextSelectedVersionId);
            reloadedCurrentTree = hasNextSelectedVersion && nextSelectedVersionId === selectedVersionId;

            if (hasNextSelectedVersion) {
                setTreeLoading(true);
            }

            startTransition(() => {
                setCollection(nextCollection);
                setVersions(versionResult.versions);
                setSelectedVersionId(nextSelectedVersionId);
                setCompareVersionId(nextCompareVersionId);
                setStatus(null);
                if (!nextSelectedVersionId) {
                    setTreeEntries([]);
                    setTreeNodes([]);
                    setExpandedPaths(new Set(['/']));
                    setSelectedPath('');
                }
            });

            if (reloadedCurrentTree) {
                await loadTree(nextSelectedVersionId, true);
            }

            await callbacks?.onWorkspaceLoaded?.(createActionContext({
                collection: nextCollection,
                versions: versionResult.versions,
                selectedVersionId: nextSelectedVersionId,
                compareVersionId: nextCompareVersionId,
                loading: hasNextSelectedVersion && !reloadedCurrentTree,
                status: null,
            }));
        } catch (error) {
            reportError(error);
        } finally {
            if (mountedRef.current) {
                setWorkspaceLoading(false);
                if (!hasNextSelectedVersion) {
                    setTreeLoading(false);
                }
            }
        }
    }

    async function loadTree(versionId: string, resetSelection: boolean) {
        setTreeLoading(true);
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
                ? (
                    result.entries.find((entry) => entry.path === selectedPath)?.path
                    || result.entries.find((entry) => entry.entryKind === 'file')?.path
                    || result.entries[0]?.path
                    || ''
                )
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
        } catch (error) {
            reportError(error);
        } finally {
            if (mountedRef.current) {
                setTreeLoading(false);
            }
        }
    }

    async function loadFile(entry: AssetTreeEntry, versionId: string) {
        try {
            const result = await client.getEntryText(assetSpace, assetId, versionId, entry.path);
            if (!mountedRef.current) {
                return;
            }
            const language = languageFor(entry, result.languageHint);
            const session: EditorSession = {
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
        } catch (error) {
            reportError(error);
        }
    }

    function unescapeDiffText(text: string): string {
        return needsLiteralUnescape(text) ? unescapeLiteralNewlines(text) : text;
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
                    setDiffLeftText(unescapeDiffText(targetEntry.oldPreview));
                    setDiffRightText(unescapeDiffText(targetEntry.newPreview));
                    setDiffLabel(`${versionDisplayLabel(diff.baseVersion)} -> ${versionDisplayLabel(diff.draftVersion)}`);
                    return;
                }

                if (!targetEntry.diffDetailAvailable) {
                    setDiffLeftText('');
                    setDiffRightText('');
                    setDiffLabel('Selected file has no text diff detail');
                    return;
                }

                const detail = await client.getDiffEntryDetail(
                    assetSpace,
                    assetId,
                    diff.baseVersion.versionId,
                    diff.draftVersion.versionId,
                    selectedPath,
                    { diffMode: 'with_text' },
                );
                if (!mountedRef.current) {
                    return;
                }
                setDiffLeftText(unescapeDiffText(detail.leftText));
                setDiffRightText(unescapeDiffText(detail.rightText));
                setDiffLabel(`${versionDisplayLabel(diff.baseVersion)} -> ${versionDisplayLabel(diff.draftVersion)}`);
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
                setDiffLeftText(unescapeDiffText(targetEntry.oldPreview));
                setDiffRightText(unescapeDiffText(targetEntry.newPreview));
                setDiffLabel(`${versionDisplayLabel(diff.leftVersion)} -> ${versionDisplayLabel(diff.rightVersion)}`);
                return;
            }

            if (!targetEntry.diffDetailAvailable) {
                setDiffLeftText('');
                setDiffRightText('');
                setDiffLabel('Selected file has no text diff detail');
                return;
            }

            const detail = await client.getDiffEntryDetail(
                assetSpace,
                assetId,
                diff.leftVersion.versionId,
                diff.rightVersion.versionId,
                selectedPath,
                { diffMode: 'with_text' },
            );
            if (!mountedRef.current) {
                return;
            }
            setDiffLeftText(unescapeDiffText(detail.leftText));
            setDiffRightText(unescapeDiffText(detail.rightText));
            setDiffLabel(`${versionDisplayLabel(diff.leftVersion)} -> ${versionDisplayLabel(diff.rightVersion)}`);
        } catch (error) {
            reportError(error);
        }
    }

    async function handleCreateDraft() {
        await runAction(async () => {
            const currentContext = createActionContext({}, true);
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
            const currentContext = createActionContext({}, true);
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
            const currentContext = createActionContext({}, true);
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
        } catch (error) {
            reportError(error);
        } finally {
            if (mountedRef.current) {
                setSaving(false);
            }
        }
    }

    function triggerBrowserDownload(result: DownloadEntryResult) {
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

    async function unescapeDownloadBlob(result: DownloadEntryResult): Promise<DownloadEntryResult> {
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

    async function handleExport(targetPath?: string) {
        if (!selectedVersionId) {
            return;
        }

        const exportPath = (targetPath ?? selectedPath) || '/';
        const currentContext = createActionContext({ selectedPath: exportPath });
        const allowed = await callbacks?.onBeforeExport?.(
            { versionId: selectedVersionId, path: exportPath },
            currentContext,
        );

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
        } catch (error) {
            reportError(error);
        } finally {
            if (mountedRef.current) {
                setExporting(false);
            }
        }
    }

    function labelForPath(path: string): string {
        const segments = path.split('/').filter(Boolean);
        return segments[segments.length - 1] || path || 'Untitled';
    }

    function closeEditorTab(path: string) {
        setOpenEditorPaths((current) => {
            const next = current.filter((item) => item !== path);
            if (selectedPath === path) {
                setSelectedPath(next[next.length - 1] || '');
            }
            return next;
        });
    }

    const openTabs: AssetEditorTab[] = openEditorPaths
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
            } satisfies AssetEditorTab;
        })
        .filter((item): item is AssetEditorTab => item !== null);

    const currentModelPath = selectedPath && selectedVersionId
        ? `file:///stew/${encodeURIComponent(assetSpace)}/${encodeURIComponent(assetId)}/${encodeURIComponent(selectedVersionId)}${selectedPath}`
        : undefined;

    const selectedVersion = versions.find((item) => item.versionId === selectedVersionId) ?? null;
    const selectedCompareVersion = versions.find((item) => item.versionId === compareVersionId) ?? null;
    const isDraftSelected = Boolean(selectedVersion?.isDraft);
    const canPreviewMarkdown = editorLanguage === 'markdown' && selectedEntry?.entryKind === 'file';
    const canEdit = enableEditing
        && !readOnly
        && isDraftSelected
        && selectedEntry?.entryKind === 'file'
        && Boolean(selectedEntry?.isTextPreviewable);
    const heading = title || collection?.displayName || `${assetSpace}/${assetId}`;
    const actionContext = createActionContext();
    const filteredTreeNodes = useMemo(
        () => isConsole ? filterTreeNodes(treeNodes, treeQuery) : treeNodes,
        [isConsole, treeNodes, treeQuery],
    );
    const visibleTreeCount = useMemo(() => countTreeNodes(filteredTreeNodes), [filteredTreeNodes]);
    const visibleExpandedPaths = useMemo(
        () => treeQuery.trim() ? collectInitialExpanded(filteredTreeNodes) : expandedPaths,
        [expandedPaths, filteredTreeNodes, treeQuery],
    );
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
    const consoleSearchInputStyle: CSSProperties = {
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
    const loadingOverlay = loading ? (
        <LoadingOverlay
            title={isConsole ? '正在加载资源' : 'Loading assets'}
            message={isConsole ? '正在获取资源集合、版本列表与目录树，请稍候。' : 'Fetching the asset collection, versions, and directory tree. Please wait.'}
        />
    ) : null;

    if (isConsole) {
        return (
            <AssetBrowserConsoleShell
                className={className}
                style={style}
                height={height}
                heading={heading}
                themeStyle={themeStyle}
                themeMode={theme}
                loadingOverlay={loadingOverlay}
                kicker="业务资产浏览"
                badges={(
                    <>
                        {pill('空间', assetSpace)}
                        {pill('资产', assetId)}
                        {pill('模式', isDraftSelected ? '草稿' : '只读')}
                        {collection?.activeVersionId ? pill('生效版本', (() => { const v = versions.find(ver => ver.versionId === collection.activeVersionId); return v ? versionDisplayLabel(v) : collection.activeVersionId; })()) : null}
                    </>
                )}
                controls={(
                    <>
                        {renderToolbarStart ? renderToolbarStart(actionContext) : null}
                        <label className="stew-asset-workspace__console-control-group">
                            <span className="stew-asset-workspace__console-control-label">当前版本</span>
                            <select value={selectedVersionId} onChange={(event) => setSelectedVersionId(event.target.value)} style={topbarSelectStyle}>
                                {versions.map((version) => (
                                    <option key={version.versionId} value={version.versionId}>
                                        {versionDisplayLabel(version)} · {version.status}{version.isActive ? ' · active' : ''}{version.isDraft ? ' · draft' : ''}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="stew-asset-workspace__console-control-group">
                            <span className="stew-asset-workspace__console-control-label">对比基线</span>
                            <select value={compareVersionId} onChange={(event) => setCompareVersionId(event.target.value)} style={topbarSelectStyle}>
                                <option value="">不对比</option>
                                {versions
                                    .filter((version) => version.versionId !== selectedVersionId)
                                    .map((version) => (
                                        <option key={version.versionId} value={version.versionId}>
                                            {versionDisplayLabel(version)} · {version.status}
                                        </option>
                                    ))}
                            </select>
                        </label>
                        <label className="stew-asset-workspace__console-search-group">
                            <span className="stew-asset-workspace__console-control-label">搜索资源</span>
                            <input
                                value={treeQuery}
                                onChange={(event) => setTreeQuery(event.target.value)}
                                placeholder="按文件名或路径过滤目录树"
                                style={consoleSearchInputStyle}
                            />
                        </label>
                    </>
                )}
                actions={(
                    <>
                        {renderHeaderExtras ? renderHeaderExtras(actionContext) : null}
                        {!readOnly && !collection?.hasDraft ? (
                            <button type="button" style={topbarPrimaryButtonStyle} disabled={actionBusy} onClick={() => void handleCreateDraft()}>
                                创建草稿
                            </button>
                        ) : null}
                        {!readOnly && collection?.hasDraft ? (
                            <button type="button" style={topbarButtonStyle} disabled={actionBusy} onClick={() => void handleDiscardDraft()}>
                                废弃草稿
                            </button>
                        ) : null}
                        {!readOnly && collection?.hasDraft ? (
                            <button type="button" style={topbarPrimaryButtonStyle} disabled={actionBusy} onClick={() => void handlePublishDraft()}>
                                发布版本
                            </button>
                        ) : null}
                        <button
                            type="button"
                            style={topbarButtonStyle}
                            disabled={!selectedVersionId || exporting}
                            onClick={() => void handleExport()}
                        >
                            {exporting ? '导出中...' : selectedPath ? '导出当前资源' : '导出当前版本'}
                        </button>
                        <button type="button" style={topbarButtonStyle} disabled={loading} onClick={() => void loadWorkspace()}>
                            刷新
                        </button>
                        {renderToolbarEnd ? renderToolbarEnd(actionContext) : null}
                    </>
                )}
                status={status}
                sidebarTitle="资源目录"
                sidebarSubtitle={treeQuery.trim() ? `筛选后 ${visibleTreeCount} 项` : `共 ${treeEntries.length} 项`}
                sidebarActions={(
                    <>
                        <span className="stew-asset-workspace__console-sidebar-pill">{isDraftSelected ? '草稿视图' : '版本视图'}</span>
                        <button
                            type="button"
                            style={topbarButtonStyle}
                            disabled={!selectedVersionId || exporting}
                            onClick={() => void handleExport('/')}
                        >
                            导出
                        </button>
                    </>
                )}
                sidebarCardTitle={selectedVersion ? versionDisplayLabel(selectedVersion) : '正在加载版本'}
                sidebarCardBody={(
                    <>
                        <div>{versionDescription}</div>
                        <div>{versionMeta}</div>
                    </>
                )}
                sidebarContent={(
                    <AssetTree
                        title={treeQuery.trim() ? '搜索结果' : '资源目录'}
                        nodes={filteredTreeNodes}
                        expandedPaths={visibleExpandedPaths}
                        selectedPath={selectedPath}
                        loading={loading}
                        compact
                        emptyTitle={treeQuery.trim() ? '未找到匹配资源' : '暂无资源'}
                        emptyMessage={treeQuery.trim() ? '请调整关键字，或清空搜索后查看完整目录树。' : '当前版本没有可浏览的资源条目。'}
                        onSelect={(path) => setSelectedPath(path)}
                        onToggle={(path) => {
                            setExpandedPaths((current) => {
                                const next = new Set(current);
                                if (next.has(path)) {
                                    next.delete(path);
                                } else {
                                    next.add(path);
                                }
                                return next;
                            });
                        }}
                        renderNodeMeta={renderTreeNodeMeta}
                        renderNodeActions={(node) => (
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                {!node.isDirectory || node.path ? (
                                    <button
                                        type="button"
                                        className="stew-asset-tree__action-button"
                                        disabled={exporting || !selectedVersionId}
                                        onClick={() => void handleExport(node.path)}
                                    >
                                        <span className="stew-asset-tree__action-icon" aria-hidden="true">
                                            <DownloadIcon />
                                        </span>
                                        <span>导出</span>
                                    </button>
                                ) : null}
                                {renderTreeNodeActions ? renderTreeNodeActions(node) : null}
                            </div>
                        )}
                    />
                )}
                mainTitle={selectedPathLabel}
                mainSubtitle={entryMeta}
                viewSwitcher={(
                    <div className="stew-asset-workspace__console-view-switcher">
                        <button
                            type="button"
                            className={`stew-asset-workspace__console-view-button${consoleView === 'edit' ? ' is-active' : ''}`}
                            onClick={() => setConsoleWorkspaceView('edit')}
                        >
                            编辑
                        </button>
                        <button
                            type="button"
                            className={`stew-asset-workspace__console-view-button${consoleView === 'preview' ? ' is-active' : ''}`}
                            disabled={!canPreviewMarkdown}
                            onClick={() => setConsoleWorkspaceView('preview')}
                        >
                            预览
                        </button>
                        <button
                            type="button"
                            className={`stew-asset-workspace__console-view-button${consoleView === 'diff' ? ' is-active' : ''}`}
                            disabled={!selectedPath}
                            onClick={() => setConsoleWorkspaceView('diff')}
                        >
                            差异
                        </button>
                    </div>
                )}
                mainContent={consoleView === 'diff' ? (
                    <AssetDiffViewer
                        label={diffLabel}
                        language={editorLanguage}
                        summary={diffSummary}
                        entries={diffEntries}
                        selectedPath={selectedPath}
                        originalText={diffLeftText}
                        modifiedText={diffRightText}
                        compact
                        editorTheme={resolvedEditorTheme}
                        onSelectEntry={(path) => setSelectedPath(path)}
                        actions={renderDiffActions ? renderDiffActions(actionContext) : null}
                    />
                ) : (
                    <AssetEditor
                        selectedPath={selectedPath}
                        selectedEntry={selectedEntry}
                        modelPath={currentModelPath}
                        language={editorLanguage}
                        editorTheme={resolvedEditorTheme}
                        value={editorText}
                        canEdit={canEdit}
                        dirty={dirty}
                        saving={saving}
                        entryRevision={entryRevision}
                        openTabs={openTabs}
                        compact
                        mode={activeEditorMode}
                        showModeSwitch={false}
                        onOpenMarkdownPath={(path) => setSelectedPath(path)}
                        onChange={(value) => {
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
                        }}
                        onSave={canEdit ? () => void handleSave() : undefined}
                        onSelectTab={(path) => setSelectedPath(path)}
                        onCloseTab={closeEditorTab}
                        actions={renderEditorActions ? renderEditorActions(actionContext) : null}
                    />
                )}
                compareNote={selectedCompareVersion ? `当前对比基线：${versionDisplayLabel(selectedCompareVersion)}` : undefined}
                footer={renderFooter ? renderFooter(actionContext) : undefined}
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
                position: 'relative',
                height,
                ...style,
            } as CSSProperties}
        >
            <>
                <div style={cardHeaderStyle}>
                    <div style={{ display: 'grid', gap: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--stew-ab-muted-fg, #64748b)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                            Stew Asset Workspace
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700 }}>{heading}</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {pill('Space', assetSpace)}
                            {pill('Asset', assetId)}
                            {pill('Mode', isDraftSelected ? 'Draft' : 'Read only')}
                            {collection?.activeVersionId ? pill('Active', (() => { const v = versions.find(ver => ver.versionId === collection.activeVersionId); return v ? versionDisplayLabel(v) : collection.activeVersionId; })()) : null}
                        </div>
                    </div>
                    <div style={{ display: 'grid', gap: 12, justifyItems: 'end' }}>
                        {renderHeaderExtras ? renderHeaderExtras(actionContext) : null}
                        {status ? (
                            <div style={{ ...toneStyle(status.tone), borderRadius: 14, padding: '10px 12px', fontSize: 13, maxWidth: 320 }}>
                                {status.text}
                            </div>
                        ) : null}
                    </div>
                </div>

                <div style={toolbarStyle}>
                    {renderToolbarStart ? renderToolbarStart(actionContext) : null}

                    <label style={{ display: 'grid', gap: 6, minWidth: 210 }}>
                        <span style={{ fontSize: 12, color: 'var(--stew-ab-muted-fg, #64748b)', fontWeight: 600 }}>Current version</span>
                        <select value={selectedVersionId} onChange={(event) => setSelectedVersionId(event.target.value)} style={selectStyle}>
                            {versions.map((version) => (
                                <option key={version.versionId} value={version.versionId}>
                                    {versionDisplayLabel(version)} · {version.status}{version.isActive ? ' · active' : ''}{version.isDraft ? ' · draft' : ''}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label style={{ display: 'grid', gap: 6, minWidth: 210 }}>
                        <span style={{ fontSize: 12, color: 'var(--stew-ab-muted-fg, #64748b)', fontWeight: 600 }}>Compare with</span>
                        <select value={compareVersionId} onChange={(event) => setCompareVersionId(event.target.value)} style={selectStyle}>
                            <option value="">No comparison</option>
                            {versions
                                .filter((version) => version.versionId !== selectedVersionId)
                                .map((version) => (
                                    <option key={version.versionId} value={version.versionId}>
                                        {versionDisplayLabel(version)} · {version.status}
                                    </option>
                                ))}
                        </select>
                    </label>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'flex-end' }}>
                        {!readOnly && !collection?.hasDraft ? (
                            <button type="button" style={primaryButtonStyle} disabled={actionBusy} onClick={() => void handleCreateDraft()}>
                                Create draft
                            </button>
                        ) : null}
                        {!readOnly && collection?.hasDraft ? (
                            <button type="button" style={buttonBaseStyle} disabled={actionBusy} onClick={() => void handleDiscardDraft()}>
                                Discard draft
                            </button>
                        ) : null}
                        {!readOnly && collection?.hasDraft ? (
                            <button type="button" style={primaryButtonStyle} disabled={actionBusy} onClick={() => void handlePublishDraft()}>
                                Publish draft
                            </button>
                        ) : null}
                        <button type="button" style={buttonBaseStyle} disabled={!selectedPath} onClick={() => setDiffVisible(!showDiff)}>
                            {showDiff ? 'Hide diff' : 'Show diff'}
                        </button>
                        <button
                            type="button"
                            style={buttonBaseStyle}
                            disabled={!selectedVersionId || exporting}
                            onClick={() => void handleExport()}
                        >
                            {exporting ? 'Exporting...' : selectedPath ? 'Export selection' : 'Export version'}
                        </button>
                        <button type="button" style={buttonBaseStyle} disabled={loading} onClick={() => void loadWorkspace()}>
                            Refresh
                        </button>
                    </div>

                    {renderToolbarEnd ? renderToolbarEnd(actionContext) : null}
                </div>

                <div style={{ flex: 1, minHeight: 0 }}>
                    <Group orientation="horizontal">
                        <Panel defaultSize={24} minSize={18}>
                            <div style={{ ...sectionStyle, background: 'var(--stew-ab-sidebar-bg, rgba(255,255,255,0.72))' }}>
                                <AssetTree
                                    nodes={treeNodes}
                                    expandedPaths={expandedPaths}
                                    selectedPath={selectedPath}
                                    loading={loading}
                                    onSelect={(path) => setSelectedPath(path)}
                                    onToggle={(path) => {
                                        setExpandedPaths((current) => {
                                            const next = new Set(current);
                                            if (next.has(path)) {
                                                next.delete(path);
                                            } else {
                                                next.add(path);
                                            }
                                            return next;
                                        });
                                    }}
                                    renderNodeMeta={renderTreeNodeMeta}
                                    renderNodeActions={(node) => (
                                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                            {!node.isDirectory || node.path ? (
                                                <button
                                                    type="button"
                                                    className="stew-asset-tree__action-button"
                                                    disabled={exporting || !selectedVersionId}
                                                    onClick={() => void handleExport(node.path)}
                                                >
                                                    <span className="stew-asset-tree__action-icon" aria-hidden="true">
                                                        <DownloadIcon />
                                                    </span>
                                                    <span>Export</span>
                                                </button>
                                            ) : null}
                                            {renderTreeNodeActions ? renderTreeNodeActions(node) : null}
                                        </div>
                                    )}
                                />
                            </div>
                        </Panel>
                        <Separator style={panelHandleStyle} />
                        <Panel defaultSize={showDiff ? 44 : 76} minSize={32}>
                            <div style={sectionStyle}>
                                <AssetEditor
                                    selectedPath={selectedPath}
                                    selectedEntry={selectedEntry}
                                    modelPath={currentModelPath}
                                    language={editorLanguage}
                                    editorTheme={resolvedEditorTheme}
                                    value={editorText}
                                    canEdit={canEdit}
                                    dirty={dirty}
                                    saving={saving}
                                    entryRevision={entryRevision}
                                    openTabs={openTabs}
                                    onOpenMarkdownPath={(path) => setSelectedPath(path)}
                                    onChange={(value) => {
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
                                    }}
                                    onSave={canEdit ? () => void handleSave() : undefined}
                                    onSelectTab={(path) => setSelectedPath(path)}
                                    onCloseTab={closeEditorTab}
                                    actions={renderEditorActions ? renderEditorActions(actionContext) : null}
                                />
                            </div>
                        </Panel>
                        {showDiff ? (
                            <>
                                <Separator style={panelHandleStyle} />
                                <Panel defaultSize={32} minSize={20}>
                                    <div style={{ ...sectionStyle, background: 'var(--stew-ab-surface-muted, #f8fafc)' }}>
                                        <AssetDiffViewer
                                            label={diffLabel}
                                            language={editorLanguage}
                                            summary={diffSummary}
                                            entries={diffEntries}
                                            selectedPath={selectedPath}
                                            originalText={diffLeftText}
                                            modifiedText={diffRightText}
                                            editorTheme={resolvedEditorTheme}
                                            onSelectEntry={(path) => setSelectedPath(path)}
                                            actions={renderDiffActions ? renderDiffActions(actionContext) : null}
                                        />
                                    </div>
                                </Panel>
                            </>
                        ) : null}
                    </Group>
                </div>

                {selectedCompareVersion ? (
                    <div style={{ padding: '10px 18px', borderTop: '1px solid var(--stew-ab-border, rgba(148,163,184,0.14))', fontSize: 12, color: 'var(--stew-ab-muted-fg, #64748b)' }}>
                        Comparing against {versionDisplayLabel(selectedCompareVersion)} when diff mode is enabled.
                    </div>
                ) : null}

                {renderFooter ? (
                    <div style={{ padding: '12px 18px', borderTop: '1px solid var(--stew-ab-border, rgba(148,163,184,0.10))', background: 'var(--stew-ab-footer-bg, rgba(248,250,252,0.92))' }}>
                        {renderFooter(actionContext)}
                    </div>
                ) : null}

                {loadingOverlay}
            </>
        </section>
    );
}

function filterTreeNodes(nodes: TreeNode[], query: string): TreeNode[] {
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
            } satisfies TreeNode;
        })
        .filter((node): node is TreeNode => node !== null);
}

function countTreeNodes(nodes: TreeNode[]): number {
    return nodes.reduce((total, node) => total + 1 + countTreeNodes(node.children), 0);
}

function formatWorkspaceTimestamp(value: string): string {
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

function versionDisplayLabel(version: AssetVersionSummary): string {
    return version.displayVersion || version.versionId;
}

function DownloadIcon() {
    return (
        <svg viewBox="0 0 12 12" fill="none">
            <path d="M6 1.75V7.25" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M3.75 5.5L6 7.75L8.25 5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M2 9.25H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    );
}