/// <reference path="../src/react-jsx-compat.d.ts" />

import React, { useDeferredValue, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import type {
    AssetChangeType,
    AssetDiffEntry,
    AssetDiffSummary,
    AssetTreeEntry,
    AssetVersionStatus,
    AssetVersionSummary,
} from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import {
    buildTree,
    buttonBaseStyle,
    formatBytes,
    languageFor,
    pill,
    primaryButtonStyle,
    selectStyle,
    type TreeNode,
} from '../src/asset-browser-shared';
import { AssetBrowserConsoleShell } from '../src/asset-browser-console-shell';
import { AssetDiffViewer } from '../src/asset-diff-viewer';
import { AssetEditor, type AssetEditorTab } from '../src/asset-editor';
import { AssetTree } from '../src/asset-tree';
import './preview.css';

declare global {
    namespace JSX {
        interface IntrinsicElements {
            [elementName: string]: any;
        }
    }
}

interface PreviewSnapshot {
    versionId: string;
    files: Record<string, string>;
    revisions: Record<string, number>;
    entries: AssetTreeEntry[];
    updatedAt: string;
}

interface PreviewSession {
    versionId: string;
    path: string;
    text: string;
    originalText: string;
    dirty: boolean;
    entryRevision: number;
}

type PreviewTone = 'neutral' | 'success' | 'warning';

interface PreviewStatus {
    tone: PreviewTone;
    text: string;
}

type WorkspaceView = 'edit' | 'preview' | 'diff';

const ASSET_SPACE = 'configs';
const ASSET_ID = 'gateway-routing';
const AUTHOR = 'preview.bot';

const FILE_METADATA: Record<string, { languageHint: string; contentType: string }> = {
    '/SKILL.md': { languageHint: 'markdown', contentType: 'text/markdown' },
    '/assets/atom_02_template.md': { languageHint: 'markdown', contentType: 'text/markdown' },
    '/assets/templates/onboarding.yaml': { languageHint: 'yaml', contentType: 'application/yaml' },
    '/assets/templates/launch-checklist.md': { languageHint: 'markdown', contentType: 'text/markdown' },
    '/references/review-checklist.md': { languageHint: 'markdown', contentType: 'text/markdown' },
    '/tests/trigger-test-cases.yaml': { languageHint: 'yaml', contentType: 'application/yaml' },
};

const ARCHIVED_FILES: Record<string, string> = {
    '/SKILL.md': [
        '# 资产配置中心',
        '',
        '## 页面概览',
        '',
        '早期版本只覆盖目录树浏览与基础文件查看。',
        '',
        '## 待补能力',
        '',
        '- [ ] add markdown preview',
        '- [ ] add diff panel',
        '- [ ] add publish flow',
    ].join('\n'),
    '/assets/atom_02_template.md': [
        '# Atom Template',
        '',
        'owner: platform-core',
        'status: draft',
        '',
        '```yaml',
        'slots:',
        '  - hero',
        '  - footer',
        '```',
    ].join('\n'),
    '/assets/templates/onboarding.yaml': [
        'flow: onboarding',
        'steps:',
        '  - capture-profile',
        '  - verify-email',
    ].join('\n'),
    '/references/review-checklist.md': [
        '# Review Checklist',
        '',
        '- route contract',
        '- enum normalization',
    ].join('\n'),
    '/tests/trigger-test-cases.yaml': [
        'cases:',
        '  - name: smoke',
        '    expect: accepted',
    ].join('\n'),
};

const BASELINE_FILES: Record<string, string> = {
    '/SKILL.md': [
        '# 资产工作台预览',
        '',
        '## 页面目标',
        '',
        '这个 mock 页面用来演示：',
        '',
        '- 目录树样式和交互',
        '- 版本切换与对比',
        '- Markdown 编辑与预览',
        '- Diff 面板联动',
        '',
        '## 发布检查项',
        '',
        '| Item | Owner | Status |',
        '| --- | --- | --- |',
        '| Tree contract | gateway | done |',
        '| Enum normalization | sdk | done |',
        '| Workspace preview | ui | in progress |',
        '',
        '## 说明',
        '',
        '> 当前为业务评审使用的已发布基线版本。',
        '',
        '```ts',
        'export function loadPreviewWorkspace() {',
        '  return "baseline";',
        '}',
        '```',
    ].join('\n'),
    '/assets/atom_02_template.md': [
        '# Atom Template',
        '',
        'owner: design-system',
        'status: ready',
        '',
        '## Slots',
        '',
        '- hero',
        '- sidebar',
        '- footer',
    ].join('\n'),
    '/assets/templates/onboarding.yaml': [
        'flow: onboarding',
        'steps:',
        '  - capture-profile',
        '  - verify-email',
        '  - enable-default-rules',
    ].join('\n'),
    '/references/review-checklist.md': [
        '# Review Checklist',
        '',
        '1. Confirm root tree contract.',
        '2. Validate directory nodes are typed correctly.',
        '3. Verify export action only appears when usable.',
    ].join('\n'),
    '/tests/trigger-test-cases.yaml': [
        'cases:',
        '  - name: empty-payload',
        '    expect: rejected',
        '  - name: valid-service',
        '    expect: accepted',
    ].join('\n'),
};

const DRAFT_FILES: Record<string, string> = {
    ...BASELINE_FILES,
    '/SKILL.md': [
        '# 资产工作台预览',
        '',
        '## 页面目标',
        '',
        '这个 mock 页面现在覆盖完整资产浏览工作台：',
        '',
        '- 目录树图标、悬停、选中态',
        '- 顶部工具栏与版本切换',
        '- Markdown 编辑 / 预览联动',
        '- Diff 面板与草稿对比',
        '',
        '## 发布检查项',
        '',
        '- [x] tree renderer migration',
        '- [x] numeric enum normalization',
        '- [x] mock workspace preview',
        '- [ ] host app runtime polish',
        '',
        '## 操作提示',
        '',
        '> 可使用 Ctrl 或 Cmd + S 触发保存，Markdown 文件支持编辑态与预览态切换。',
        '',
        '```ts',
        'export function loadPreviewWorkspace() {',
        '  return { mode: "draft", panels: ["tree", "editor", "diff"] };',
        '}',
        '```',
    ].join('\n'),
    '/assets/atom_02_template.md': [
        '# 页面模板配置',
        '',
        'owner: design-system',
        'status: draft',
        '',
        '## 区块布局',
        '',
        '- hero',
        '- sidebar',
        '- inspector-rail',
        '- footer',
        '',
        '## 页面说明',
        '',
        '目录树右侧按钮排版已经更像文件管理器。',
    ].join('\n'),
    '/assets/templates/onboarding.yaml': [
        'flow: onboarding',
        'steps:',
        '  - capture-profile',
        '  - verify-email',
        '  - enable-default-rules',
        '  - open-asset-workspace',
        'flags:',
        '  previewWorkspace: true',
    ].join('\n'),
    '/assets/templates/launch-checklist.md': [
        '# 上线检查清单',
        '',
        '## 发布前确认',
        '',
        '- [x] Verify tree response includes directories',
        '- [x] Confirm draft editor can save mock text',
        '- [ ] Validate host app CSS bundling',
    ].join('\n'),
    '/references/review-checklist.md': [
        '# Review Checklist',
        '',
        '1. Confirm root tree contract.',
        '2. Validate directory nodes are typed correctly.',
        '3. Verify export action only appears when usable.',
        '4. Confirm diff viewer selects changed files.',
    ].join('\n'),
};

const INITIAL_SNAPSHOTS: Record<string, PreviewSnapshot> = {
    'v20260314': createSnapshot('v20260314', ARCHIVED_FILES, '2026-03-14T09:00:00Z'),
    'v20260401': createSnapshot('v20260401', BASELINE_FILES, '2026-04-01T10:00:00Z'),
    'draft-20260407': createSnapshot('draft-20260407', DRAFT_FILES, '2026-04-07T09:30:00Z'),
};

const INITIAL_VERSIONS: AssetVersionSummary[] = [
    createVersionSummary({
        versionId: 'draft-20260407',
        status: 'draft',
        description: '资产工作台演示版，包含目录树、编辑区和差异联动',
        createdAt: '2026-04-07T09:30:00Z',
        createdBy: AUTHOR,
        isActive: false,
        isDraft: true,
        baseVersionId: 'v20260401',
    }, INITIAL_SNAPSHOTS['draft-20260407']),
    createVersionSummary({
        versionId: 'v20260401',
        status: 'ready',
        description: '业务评审基线版本，可作为对比参考',
        createdAt: '2026-04-01T10:00:00Z',
        createdBy: 'gateway.bot',
        isActive: true,
        isDraft: false,
        baseVersionId: 'v20260314',
    }, INITIAL_SNAPSHOTS['v20260401']),
    createVersionSummary({
        versionId: 'v20260314',
        status: 'archived',
        description: '历史归档版本，用于回溯早期方案',
        createdAt: '2026-03-14T09:00:00Z',
        createdBy: 'gateway.bot',
        isActive: false,
        isDraft: false,
        baseVersionId: '',
    }, INITIAL_SNAPSHOTS['v20260314']),
];

function PreviewApp() {
    const [versions, setVersions] = useState(INITIAL_VERSIONS);
    const [snapshots, setSnapshots] = useState(INITIAL_SNAPSHOTS);
    const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['/assets', '/assets/templates', '/references', '/tests']));
    const [selectedVersionId, setSelectedVersionId] = useState('draft-20260407');
    const [compareVersionId, setCompareVersionId] = useState('v20260401');
    const [selectedPath, setSelectedPath] = useState('/SKILL.md');
    const [searchText, setSearchText] = useState('');
    const [openPaths, setOpenPaths] = useState<string[]>(['/SKILL.md']);
    const [editorSessions, setEditorSessions] = useState<Record<string, PreviewSession>>({});
    const [editorText, setEditorText] = useState('');
    const [originalText, setOriginalText] = useState('');
    const [entryRevision, setEntryRevision] = useState(0);
    const [workspaceView, setWorkspaceView] = useState<WorkspaceView>('edit');
    const [status, setStatus] = useState<PreviewStatus>({
        tone: 'neutral',
        text: '当前为产品演示模式，所有编辑、发布、导出和刷新操作都只在本地示例数据中生效。',
    });
    const deferredSearchText = useDeferredValue(searchText);

    const selectedVersion = useMemo(
        () => versions.find((item) => item.versionId === selectedVersionId) ?? null,
        [selectedVersionId, versions],
    );
    const compareVersion = useMemo(
        () => versions.find((item) => item.versionId === compareVersionId) ?? null,
        [compareVersionId, versions],
    );
    const selectedSnapshot = snapshots[selectedVersionId] ?? null;
    const compareSnapshot = compareVersionId ? snapshots[compareVersionId] ?? null : null;
    const selectedFiles = useMemo(
        () => applySessionsToFiles(selectedSnapshot?.files ?? {}, editorSessions, selectedVersionId),
        [editorSessions, selectedSnapshot?.files, selectedVersionId],
    );
    const treeNodes = useMemo(
        () => buildTree(selectedSnapshot?.entries ?? []),
        [selectedSnapshot?.entries],
    );
    const filteredTreeNodes = useMemo(
        () => filterTree(treeNodes, deferredSearchText),
        [deferredSearchText, treeNodes],
    );
    const selectedEntry = useMemo(
        () => selectedSnapshot?.entries.find((item) => item.path === selectedPath) ?? null,
        [selectedPath, selectedSnapshot?.entries],
    );
    const selectedNode = useMemo(
        () => findNode(treeNodes, selectedPath),
        [selectedPath, treeNodes],
    );
    const currentLanguage = languageFor(selectedEntry, selectedEntry?.languageHint || '');
    const diffState = useMemo(
        () => buildDiffState(selectedFiles, compareSnapshot?.files ?? {}),
        [compareSnapshot?.files, selectedFiles],
    );
    const diffMap = useMemo(
        () => new Map(diffState.entries.map((entry) => [entry.path, entry])),
        [diffState.entries],
    );
    const currentSessionKey = makeSessionKey(selectedVersionId, selectedPath);
    const currentSession = currentSessionKey ? editorSessions[currentSessionKey] : undefined;
    const dirty = Boolean(currentSession?.dirty);
    const canEdit = Boolean(selectedVersion?.isDraft && selectedEntry?.entryKind === 'file' && selectedEntry.isTextPreviewable);
    const canPreviewDocument = Boolean(selectedEntry?.entryKind === 'file' && selectedEntry.isTextPreviewable && currentLanguage === 'markdown');
    const openTabs: AssetEditorTab[] = useMemo(
        () => openPaths
            .map((path) => {
                const entry = selectedSnapshot?.entries.find((item) => item.path === path);
                if (!entry || entry.entryKind !== 'file') {
                    return null;
                }
                const session = editorSessions[makeSessionKey(selectedVersionId, path)];
                return {
                    path,
                    label: entry.name,
                    active: path === selectedPath,
                    dirty: Boolean(session?.dirty),
                } satisfies AssetEditorTab;
            })
            .filter((item): item is AssetEditorTab => Boolean(item)),
        [editorSessions, openPaths, selectedPath, selectedSnapshot?.entries, selectedVersionId],
    );

    useEffect(() => {
        const entries = selectedSnapshot?.entries ?? [];
        if (entries.length === 0) {
            setSelectedPath('');
            return;
        }

        const hasSelectedPath = entries.some((item) => item.path === selectedPath);
        if (!hasSelectedPath) {
            setSelectedPath(findFirstSelectablePath(treeNodes));
        }
    }, [selectedPath, selectedSnapshot?.entries, treeNodes]);

    useEffect(() => {
        const validFilePaths = new Set((selectedSnapshot?.entries ?? []).filter((item) => item.entryKind === 'file').map((item) => item.path));
        setOpenPaths((current) => current.filter((path) => validFilePaths.has(path)));
    }, [selectedSnapshot?.entries]);

    useEffect(() => {
        if (!selectedEntry || selectedEntry.entryKind !== 'file' || !selectedEntry.isTextPreviewable) {
            setEditorText('');
            setOriginalText('');
            setEntryRevision(selectedEntry?.entryRevision ?? 0);
            return;
        }

        const session = editorSessions[currentSessionKey];
        const nextText = session?.text ?? selectedFiles[selectedPath] ?? '';
        const nextOriginalText = session?.originalText ?? selectedSnapshot?.files[selectedPath] ?? '';
        setEditorText(nextText);
        setOriginalText(nextOriginalText);
        setEntryRevision(session?.entryRevision ?? selectedEntry.entryRevision);
        setOpenPaths((current) => current.includes(selectedPath) ? current : [...current, selectedPath]);
    }, [currentSessionKey, editorSessions, selectedEntry, selectedFiles, selectedPath, selectedSnapshot?.files]);

    useEffect(() => {
        if (workspaceView === 'preview' && !canPreviewDocument) {
            setWorkspaceView('edit');
        }
    }, [canPreviewDocument, workspaceView]);

    return (
        <div className="preview-page">
            <AssetBrowserConsoleShell
                className="preview-shell"
                height="min(860px, calc(100vh - 52px))"
                heading={`${ASSET_SPACE} / ${ASSET_ID}`}
                kicker="资产工作台演示"
                badges={(
                    <>
                        {pill('状态', formatVersionStatus(selectedVersion?.status))}
                        {pill('文件', String(Object.keys(selectedFiles).length))}
                        {pill('变更', String(diffState.summary.totalChanges))}
                    </>
                )}
                controls={(
                    <>
                        <label className="stew-asset-workspace__console-control-group" htmlFor="selected-version">
                            <span className="stew-asset-workspace__console-control-label">版本</span>
                            <select
                                id="selected-version"
                                style={selectStyle}
                                value={selectedVersionId}
                                onChange={(event) => {
                                    setSelectedVersionId(event.target.value);
                                    setStatus({ tone: 'neutral', text: `已切换到版本 ${event.target.value}，右侧内容已同步刷新。` });
                                }}
                            >
                                {versions.map((version) => (
                                    <option key={version.versionId} value={version.versionId}>
                                        {version.versionId} · {formatVersionStatus(version.status)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="stew-asset-workspace__console-control-group" htmlFor="compare-version">
                            <span className="stew-asset-workspace__console-control-label">对比</span>
                            <select
                                id="compare-version"
                                style={selectStyle}
                                value={compareVersionId}
                                onChange={(event) => setCompareVersionId(event.target.value)}
                            >
                                <option value="">暂不对比</option>
                                {versions.filter((version) => version.versionId !== selectedVersionId).map((version) => (
                                    <option key={version.versionId} value={version.versionId}>
                                        {version.versionId} · {formatVersionStatus(version.status)}
                                    </option>
                                ))}
                            </select>
                        </label>

                        <label className="stew-asset-workspace__console-search-group">
                            <span className="stew-asset-workspace__console-control-label">筛选</span>
                            <input
                                value={searchText}
                                onChange={(event) => setSearchText(event.target.value)}
                                placeholder="搜索路径、文件名或目录名"
                                className="preview-search-input"
                            />
                        </label>
                    </>
                )}
                actions={selectedVersion?.isDraft ? (
                    <button
                        type="button"
                        style={primaryButtonStyle}
                        onClick={() => {
                            const draftVersion = selectedVersion;
                            const draftSnapshot = snapshots[draftVersion.versionId];
                            if (!draftSnapshot) {
                                return;
                            }

                            const publishedIndex = versions.filter((item) => !item.isDraft).length + 1;
                            const nextReadyId = `v20260407-r${publishedIndex}`;
                            const nextDraftId = `draft-20260407-r${publishedIndex}`;
                            const timestamp = `2026-04-07T1${publishedIndex}:00:00Z`;
                            const publishedSnapshot = createSnapshot(nextReadyId, draftSnapshot.files, timestamp, draftSnapshot.revisions);
                            const nextDraftSnapshot = createSnapshot(nextDraftId, draftSnapshot.files, timestamp, draftSnapshot.revisions);
                            const previousActiveVersionId = versions.find((item) => item.isActive && !item.isDraft)?.versionId ?? '';
                            const nextVersions = [
                                createVersionSummary({
                                    versionId: nextDraftId,
                                    status: 'draft',
                                    description: '发布后自动生成的新草稿，可继续下一轮演示',
                                    createdAt: timestamp,
                                    createdBy: AUTHOR,
                                    isActive: false,
                                    isDraft: true,
                                    baseVersionId: nextReadyId,
                                }, nextDraftSnapshot),
                                createVersionSummary({
                                    versionId: nextReadyId,
                                    status: 'ready',
                                    description: '从演示草稿发布得到的正式版本',
                                    createdAt: timestamp,
                                    createdBy: AUTHOR,
                                    isActive: true,
                                    isDraft: false,
                                    baseVersionId: previousActiveVersionId,
                                }, publishedSnapshot),
                                ...versions.map((version) => ({
                                    ...version,
                                    isActive: false,
                                    isDraft: false,
                                    status: version.status === 'draft' ? 'archived' : version.status,
                                })),
                            ];

                            setVersions(nextVersions);
                            setSnapshots((current) => ({
                                ...current,
                                [nextReadyId]: publishedSnapshot,
                                [nextDraftId]: nextDraftSnapshot,
                            }));
                            setSelectedVersionId(nextDraftId);
                            setCompareVersionId(nextReadyId);
                            setEditorSessions({});
                            setWorkspaceView('edit');
                            setStatus({ tone: 'success', text: `演示发布完成，已生成正式版本 ${nextReadyId}，并自动续开新的草稿 ${nextDraftId}。` });
                        }}
                    >
                        模拟发布
                    </button>
                ) : null}
                status={status}
                sidebarTitle="资源目录"
                sidebarSubtitle={`${countTreeNodes(filteredTreeNodes)} 项`}
                sidebarActions={(
                    <>
                        <span className="stew-asset-workspace__console-sidebar-pill">Mock Data</span>
                        <button
                            type="button"
                            className="preview-sidebar-export"
                            style={{ ...buttonBaseStyle, padding: '4px 10px', fontSize: 11 }}
                            onClick={() => {
                                const exportTarget = selectedPath || selectedVersion?.versionId || '当前版本';
                                setStatus({ tone: 'success', text: `已为 ${exportTarget} 生成演示导出结果，当前仅做本地界面反馈，不触发真实下载。` });
                            }}
                        >
                            导出
                        </button>
                    </>
                )}
                sidebarCardTitle={`${selectedVersion?.versionId || '暂无版本'} · ${formatVersionStatus(selectedVersion?.status)}`}
                sidebarCardBody={selectedVersion?.description || '暂无版本说明'}
                sidebarContent={(
                    <AssetTree
                        title="目录"
                        nodes={filteredTreeNodes}
                        expandedPaths={expandedPaths}
                        selectedPath={selectedPath}
                        compact
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
                        renderNodeMeta={(node) => renderNodeMeta(node, diffMap, selectedFiles)}
                    />
                )}
                mainTitle={selectedNode?.name || '请选择资源'}
                mainSubtitle={[
                    `${selectedPath || '/'} · ${selectedVersion?.versionId || '-'}`,
                    compareVersion?.versionId ? `对比 ${compareVersion.versionId}` : '',
                    dirty ? '有未保存修改' : '已保存',
                ].filter(Boolean).join(' · ')}
                viewSwitcher={(
                    <div className="stew-asset-workspace__console-view-switcher" role="tablist" aria-label="Workspace view">
                        <button
                            type="button"
                            className={`stew-asset-workspace__console-view-button${workspaceView === 'edit' ? ' is-active' : ''}`}
                            onClick={() => setWorkspaceView('edit')}
                        >
                            编辑
                        </button>
                        <button
                            type="button"
                            className={`stew-asset-workspace__console-view-button${workspaceView === 'preview' ? ' is-active' : ''}`}
                            disabled={!canPreviewDocument}
                            onClick={() => setWorkspaceView('preview')}
                        >
                            预览
                        </button>
                        <button
                            type="button"
                            className={`stew-asset-workspace__console-view-button${workspaceView === 'diff' ? ' is-active' : ''}`}
                            onClick={() => setWorkspaceView('diff')}
                        >
                            差异
                        </button>
                    </div>
                )}
                mainContent={workspaceView === 'diff' ? (
                    <div className="preview-diff-shell">
                        <AssetDiffViewer
                            label={compareVersionId ? `${selectedVersionId} vs ${compareVersionId}` : `${selectedVersionId} without compare target`}
                            language={currentLanguage}
                            summary={diffState.summary}
                            entries={diffState.entries}
                            selectedPath={selectedPath}
                            originalText={compareSnapshot?.files[selectedPath] ?? ''}
                            modifiedText={selectedEntry?.entryKind === 'file' ? (selectedFiles[selectedPath] ?? '') : ''}
                            compact
                            onSelectEntry={(path) => {
                                setSelectedPath(path);
                                setStatus({ tone: 'neutral', text: `已定位到变更资源 ${path}，方便继续审阅具体差异。` });
                            }}
                        />
                    </div>
                ) : (
                    <div className="preview-editor-shell">
                        <AssetEditor
                            selectedPath={selectedPath}
                            selectedEntry={selectedEntry}
                            modelPath={selectedPath ? `file:///preview/${selectedVersionId}${selectedPath}` : undefined}
                            language={currentLanguage}
                            value={editorText}
                            canEdit={canEdit}
                            dirty={dirty}
                            saving={false}
                            entryRevision={entryRevision}
                            openTabs={openTabs}
                            compact
                            mode={workspaceView === 'preview' ? 'preview' : 'edit'}
                            showModeSwitch={false}
                            onChange={(value) => {
                                if (!selectedEntry || selectedEntry.entryKind !== 'file') {
                                    return;
                                }
                                const nextDirty = value !== originalText;
                                setEditorText(value);
                                setEditorSessions((current) => ({
                                    ...current,
                                    [currentSessionKey]: {
                                        versionId: selectedVersionId,
                                        path: selectedPath,
                                        text: value,
                                        originalText,
                                        dirty: nextDirty,
                                        entryRevision,
                                    },
                                }));
                            }}
                            onSave={canEdit ? () => {
                                if (!selectedEntry || selectedEntry.entryKind !== 'file' || !selectedSnapshot) {
                                    return;
                                }

                                const nextSnapshot = updateSnapshotFile(selectedSnapshot, selectedPath, editorText);
                                setSnapshots((current) => ({
                                    ...current,
                                    [selectedVersionId]: nextSnapshot,
                                }));
                                setVersions((current) => current.map((version) => (
                                    version.versionId === selectedVersionId
                                        ? createVersionSummary({
                                            versionId: version.versionId,
                                            status: version.status,
                                            description: version.description,
                                            createdAt: version.createdAt,
                                            createdBy: version.createdBy,
                                            isActive: version.isActive,
                                            isDraft: version.isDraft,
                                            baseVersionId: version.baseVersionId,
                                        }, nextSnapshot)
                                        : version
                                )));
                                setOriginalText(editorText);
                                setEntryRevision((current) => current + 1);
                                setEditorSessions((current) => ({
                                    ...current,
                                    [currentSessionKey]: {
                                        versionId: selectedVersionId,
                                        path: selectedPath,
                                        text: editorText,
                                        originalText: editorText,
                                        dirty: false,
                                        entryRevision: (current[currentSessionKey]?.entryRevision ?? selectedEntry.entryRevision) + 1,
                                    },
                                }));
                                setStatus({ tone: 'success', text: `${selectedPath} 的演示修改已保存到 ${selectedVersionId}。` });
                            } : undefined}
                            onSelectTab={(path) => setSelectedPath(path)}
                            onCloseTab={(path) => {
                                setOpenPaths((current) => current.filter((item) => item !== path));
                                if (selectedPath === path) {
                                    const nextOpenPath = openPaths.find((item) => item !== path) || findFirstSelectablePath(treeNodes);
                                    setSelectedPath(nextOpenPath);
                                }
                            }}
                            actions={(
                                <div className="preview-inline-actions">
                                    <button
                                        type="button"
                                        className="preview-toolbar-button"
                                        disabled={!dirty}
                                        onClick={() => {
                                            if (!selectedEntry || selectedEntry.entryKind !== 'file') {
                                                return;
                                            }
                                            const persistedText = selectedSnapshot?.files[selectedPath] ?? '';
                                            setEditorText(persistedText);
                                            setOriginalText(persistedText);
                                            setEditorSessions((current) => ({
                                                ...current,
                                                [currentSessionKey]: {
                                                    versionId: selectedVersionId,
                                                    path: selectedPath,
                                                    text: persistedText,
                                                    originalText: persistedText,
                                                    dirty: false,
                                                    entryRevision: selectedEntry.entryRevision,
                                                },
                                            }));
                                            setStatus({ tone: 'warning', text: `${selectedPath} 已恢复到当前版本内容，未保存的演示修改已撤销。` });
                                        }}
                                    >
                                        撤销修改
                                    </button>
                                </div>
                            )}
                        />
                    </div>
                )}
                compareNote={compareVersion?.versionId ? `当前对比基线：${compareVersion.versionId}` : undefined}
            />
        </div>
    );
}

function createSnapshot(
    versionId: string,
    files: Record<string, string>,
    updatedAt: string,
    revisions?: Record<string, number>,
): PreviewSnapshot {
    const nextRevisions = revisions ? { ...revisions } : Object.fromEntries(Object.keys(files).map((path) => [path, 1]));
    const directoryPaths = collectDirectoryPaths(Object.keys(files));
    const directoryEntries = directoryPaths.map((path) => directoryEntry(path, updatedAt));
    const fileEntries = Object.entries(files).map(([path, text]) => fileEntry(path, text, nextRevisions[path] ?? 1, updatedAt));
    const entries = [...directoryEntries, ...fileEntries].sort((left, right) => {
        if (left.entryKind !== right.entryKind) {
            return left.entryKind === 'directory' ? -1 : 1;
        }
        return left.path.localeCompare(right.path);
    });

    return {
        versionId,
        files: { ...files },
        revisions: nextRevisions,
        entries,
        updatedAt,
    };
}

function findNode(nodes: TreeNode[], path: string): TreeNode | null {
    for (const node of nodes) {
        if (node.path === path) {
            return node;
        }
        const child = findNode(node.children, path);
        if (child) {
            return child;
        }
    }
    return null;
}

function findFirstSelectablePath(nodes: TreeNode[]): string {
    for (const node of nodes) {
        if (!node.isDirectory) {
            return node.path;
        }
        const child = findFirstSelectablePath(node.children);
        if (child) {
            return child;
        }
    }
    return nodes[0]?.path || '';
}

function filterTree(nodes: TreeNode[], query: string): TreeNode[] {
    const normalized = query.trim().toLowerCase();
    if (!normalized) {
        return nodes;
    }

    return nodes.flatMap((node) => {
        const filteredChildren = filterTree(node.children, normalized);
        const matches = node.name.toLowerCase().includes(normalized) || node.path.toLowerCase().includes(normalized);
        if (!matches && filteredChildren.length === 0) {
            return [];
        }
        return [{ ...node, children: filteredChildren }];
    });
}

function countTreeNodes(nodes: TreeNode[]): number {
    return nodes.reduce((total, node) => total + 1 + countTreeNodes(node.children), 0);
}

function renderNodeMeta(
    node: TreeNode,
    diffMap: Map<string, AssetDiffEntry>,
    files: Record<string, string>,
): React.ReactNode {
    const diffEntry = diffMap.get(node.path);
    if (diffEntry) {
        return <span className={`preview-tree-badge is-${diffEntry.changeType}`}>{changeLabel(diffEntry.changeType)}</span>;
    }
    if (node.isDirectory) {
        return `${node.children.length} items`;
    }
    return formatBytes(byteLength(files[node.path] ?? ''));
}

function buildDiffState(currentFiles: Record<string, string>, compareFiles: Record<string, string>): {
    entries: AssetDiffEntry[];
    summary: AssetDiffSummary;
} {
    const allPaths = Array.from(new Set([...Object.keys(currentFiles), ...Object.keys(compareFiles)])).sort((left, right) => left.localeCompare(right));
    const entries: AssetDiffEntry[] = [];
    const summary: AssetDiffSummary = {
        totalChanges: 0,
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 0,
        renamedCount: 0,
        typeChangedCount: 0,
        textDiffCount: 0,
        binaryChangeCount: 0,
    };

    for (const path of allPaths) {
        const current = currentFiles[path];
        const compare = compareFiles[path];
        if (current === compare) {
            continue;
        }

        const changeType: AssetChangeType = current === undefined
            ? 'removed'
            : compare === undefined
                ? 'added'
                : 'modified';
        entries.push({
            path,
            oldPath: path,
            changeType,
            oldEntryKind: compare === undefined ? '' : 'file',
            newEntryKind: current === undefined ? '' : 'file',
            oldFileId: compare === undefined ? '' : `mock:${path}`,
            newFileId: current === undefined ? '' : `mock:${path}`,
            oldChecksum: compare ? checksumFor(compare) : '',
            newChecksum: current ? checksumFor(current) : '',
            oldSizeBytes: byteLength(compare ?? ''),
            newSizeBytes: byteLength(current ?? ''),
            isText: true,
            languageHint: FILE_METADATA[path]?.languageHint ?? 'plaintext',
            textDiffStatus: 'ready',
            unifiedDiff: '',
            diffTruncated: false,
            oldPreview: compare ?? '',
            newPreview: current ?? '',
            diffDetailAvailable: true,
        });
        summary.totalChanges += 1;
        summary.textDiffCount += 1;
        if (changeType === 'added') summary.addedCount += 1;
        if (changeType === 'removed') summary.removedCount += 1;
        if (changeType === 'modified') summary.modifiedCount += 1;
    }

    return { entries, summary };
}

function applySessionsToFiles(
    baseFiles: Record<string, string>,
    sessions: Record<string, PreviewSession>,
    versionId: string,
): Record<string, string> {
    const nextFiles = { ...baseFiles };
    for (const session of Object.values(sessions)) {
        if (session.versionId === versionId) {
            nextFiles[session.path] = session.text;
        }
    }
    return nextFiles;
}

function updateSnapshotFile(snapshot: PreviewSnapshot, path: string, text: string): PreviewSnapshot {
    const nextFiles = {
        ...snapshot.files,
        [path]: text,
    };
    const nextRevisions = {
        ...snapshot.revisions,
        [path]: (snapshot.revisions[path] ?? 0) + 1,
    };
    return createSnapshot(snapshot.versionId, nextFiles, '2026-04-07T11:30:00Z', nextRevisions);
}

function createVersionSummary(
    version: {
        versionId: string;
        status: AssetVersionStatus;
        description: string;
        createdAt: string;
        createdBy: string;
        isActive: boolean;
        isDraft: boolean;
        baseVersionId: string;
    },
    snapshot: PreviewSnapshot,
): AssetVersionSummary {
    const totalBytes = Object.values(snapshot.files).reduce((sum, text) => sum + byteLength(text), 0);

    return {
        assetSpace: ASSET_SPACE,
        assetId: ASSET_ID,
        versionId: version.versionId,
        status: version.status,
        description: version.description,
        createdBy: version.createdBy,
        createdAt: version.createdAt,
        isActive: version.isActive,
        isDraft: version.isDraft,
        baseVersionId: version.baseVersionId,
        versionHash: checksumFor(`${version.versionId}:${totalBytes}`),
        entryCount: Object.keys(snapshot.files).length,
        totalBytes,
        manifestPath: `/manifests/${version.versionId}.json`,
    };
}

function collectDirectoryPaths(filePaths: string[]): string[] {
    const paths = new Set<string>();
    for (const path of filePaths) {
        let currentPath = parentPathFor(path);
        while (currentPath && currentPath !== '/') {
            paths.add(currentPath);
            currentPath = parentPathFor(currentPath);
        }
    }
    return Array.from(paths).sort((left, right) => left.localeCompare(right));
}

function directoryEntry(path: string, timestamp: string): AssetTreeEntry {
    return {
        entryKind: 'directory',
        path,
        parentPath: parentPathFor(path),
        name: nameFor(path),
        fileId: '',
        contentType: 'inode/directory',
        sizeBytes: 0,
        checksum: '',
        hasChildren: true,
        isTextPreviewable: false,
        languageHint: '',
        entryRevision: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

function fileEntry(path: string, text: string, revision: number, timestamp: string): AssetTreeEntry {
    const metadata = FILE_METADATA[path] ?? { languageHint: 'plaintext', contentType: 'text/plain' };
    return {
        entryKind: 'file',
        path,
        parentPath: parentPathFor(path),
        name: nameFor(path),
        fileId: `mock:${path}`,
        contentType: metadata.contentType,
        sizeBytes: byteLength(text),
        checksum: checksumFor(text),
        hasChildren: false,
        isTextPreviewable: true,
        languageHint: metadata.languageHint,
        entryRevision: revision,
        createdAt: timestamp,
        updatedAt: timestamp,
    };
}

function checksumFor(text: string): string {
    let hash = 0;
    for (let index = 0; index < text.length; index += 1) {
        hash = ((hash << 5) - hash + text.charCodeAt(index)) | 0;
    }
    return `mock-${Math.abs(hash).toString(16)}`;
}

function byteLength(text: string): number {
    return new TextEncoder().encode(text).length;
}

function makeSessionKey(versionId: string, path: string): string {
    return versionId && path ? `${versionId}::${path}` : '';
}

function changeLabel(changeType: AssetChangeType): string {
    if (changeType === 'added') return '新增';
    if (changeType === 'removed') return '删除';
    if (changeType === 'modified') return '变更';
    if (changeType === 'renamed') return '重命名';
    return '类型';
}

function formatVersionStatus(status?: AssetVersionStatus): string {
    if (status === 'draft') return '草稿';
    if (status === 'ready') return '已发布';
    if (status === 'archived') return '已归档';
    if (status === 'failed') return '异常';
    return '未知';
}

function parentPathFor(path: string): string {
    const index = path.lastIndexOf('/');
    if (index <= 0) {
        return '/';
    }
    return path.slice(0, index);
}

function nameFor(path: string): string {
    return path.split('/').filter(Boolean).pop() || '/';
}

createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PreviewApp />
    </React.StrictMode>,
);