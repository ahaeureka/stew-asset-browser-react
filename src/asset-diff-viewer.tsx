"use client";

import React, { type ReactNode, useRef, useState } from 'react';
import { DiffEditor, type DiffOnMount } from '@monaco-editor/react';
import type { AssetDiffEntry, AssetDiffSummary } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import {
    buttonBaseStyle,
    EmptyMessage,
    monoFont,
    pill,
    subHeaderStyle,
} from './asset-browser-shared';

export interface AssetDiffViewerProps {
    label: string;
    language: string;
    summary: AssetDiffSummary | null;
    entries: AssetDiffEntry[];
    selectedPath: string;
    originalText: string;
    modifiedText: string;
    onSelectEntry?: (path: string) => void;
    actions?: ReactNode;
    compact?: boolean;
    editorTheme?: string;
}

export function AssetDiffViewer({
    label,
    language,
    summary,
    entries,
    selectedPath,
    originalText,
    modifiedText,
    onSelectEntry,
    actions,
    compact = false,
    editorTheme = 'vs',
}: AssetDiffViewerProps) {
    const [renderSideBySide, setRenderSideBySide] = useState(true);
    const [ignoreTrimWhitespace, setIgnoreTrimWhitespace] = useState(true);
    const [hideUnchangedRegions, setHideUnchangedRegions] = useState(true);
    const [diffWordWrap, setDiffWordWrap] = useState<'on' | 'off'>('on');
    const diffEditorRef = useRef<Parameters<NonNullable<DiffOnMount>>[0] | null>(null);

    const diffActionStyle: React.CSSProperties = {
        ...buttonBaseStyle,
        padding: compact ? '5px 9px' : '6px 10px',
        fontSize: compact ? 11 : 12,
        lineHeight: 1.2,
    };
    const headerStyle: React.CSSProperties = compact
        ? { ...subHeaderStyle, padding: '10px 12px', gap: 10 }
        : subHeaderStyle;
    const changesStripStyle: React.CSSProperties = compact
        ? { display: 'flex', gap: 6, overflowX: 'auto', padding: '8px 12px', borderBottom: '1px solid var(--stew-ab-border, rgba(148,163,184,0.14))' }
        : { display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 14px', borderBottom: '1px solid var(--stew-ab-border, rgba(148,163,184,0.14))' };

    const handleDiffMount: DiffOnMount = (editor) => {
        diffEditorRef.current = editor;
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'var(--stew-ab-surface-muted, #f8fafc)' }}>
            <div style={headerStyle}>
                <div style={{ display: 'grid', gap: 3 }}>
                    <span style={{ fontWeight: 700 }}>差异</span>
                    <span style={{ fontSize: 12, color: 'var(--stew-ab-muted-fg, #64748b)' }}>{label}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {actions}
                    <button type="button" style={diffActionStyle} onClick={() => diffEditorRef.current?.getModifiedEditor().getAction('actions.find')?.run()}>查找</button>
                    <button type="button" style={diffActionStyle} onClick={() => setRenderSideBySide((value) => !value)}>{renderSideBySide ? '内联' : '并排'}</button>
                    <button type="button" style={diffActionStyle} onClick={() => setIgnoreTrimWhitespace((value) => !value)}>{ignoreTrimWhitespace ? '保留空白' : '忽略空白'}</button>
                    <button type="button" style={diffActionStyle} onClick={() => setHideUnchangedRegions((value) => !value)}>{hideUnchangedRegions ? '展开全部' : '折叠未变更'}</button>
                    <button type="button" style={diffActionStyle} onClick={() => setDiffWordWrap((value) => value === 'on' ? 'off' : 'on')}>{diffWordWrap === 'on' ? '取消换行' : '自动换行'}</button>
                    {summary ? (
                        <>
                            {pill('总计', String(summary.totalChanges))}
                            {pill('新增', String(summary.addedCount))}
                            {pill('变更', String(summary.modifiedCount))}
                            {pill('文本', String(summary.textDiffCount))}
                            {pill('二进制', String(summary.binaryChangeCount))}
                        </>
                    ) : null}
                </div>
            </div>
            {entries.length > 0 ? (
                <div style={changesStripStyle}>
                    {entries.map((entry) => (
                        <button
                            key={`${entry.changeType}:${entry.path}`}
                            type="button"
                            onClick={() => onSelectEntry?.(entry.path)}
                            style={{
                                border: 0,
                                borderRadius: 999,
                                padding: compact ? '5px 9px' : '6px 10px',
                                whiteSpace: 'nowrap',
                                cursor: onSelectEntry ? 'pointer' : 'default',
                                background: entry.path === selectedPath ? 'var(--stew-ab-accent-soft, rgba(14,165,233,0.12))' : 'var(--stew-ab-border, rgba(148,163,184,0.12))',
                                color: entry.path === selectedPath ? 'var(--stew-ab-link, #0369a1)' : 'var(--stew-ab-fg, #475569)',
                                fontSize: compact ? 11 : 12,
                                fontWeight: 600,
                            }}
                        >
                            {formatDiffChangeType(entry.changeType)} · {entry.path}
                        </button>
                    ))}
                </div>
            ) : null}
            <div style={{ flex: 1, minHeight: 0 }}>
                {originalText || modifiedText ? (
                    <DiffEditor
                        height="100%"
                        language={language}
                        originalModelPath={`file:///stew/diff/original${selectedPath || '/untitled'}`}
                        modifiedModelPath={`file:///stew/diff/modified${selectedPath || '/untitled'}`}
                        keepCurrentOriginalModel
                        keepCurrentModifiedModel
                        theme={editorTheme}
                        original={originalText}
                        modified={modifiedText}
                        onMount={handleDiffMount}
                        options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            automaticLayout: true,
                            fontSize: compact ? 12 : 13,
                            fontFamily: monoFont,
                            wordWrap: 'on',
                            diffWordWrap,
                            renderSideBySide,
                            useInlineViewWhenSpaceIsLimited: true,
                            ignoreTrimWhitespace,
                            hideUnchangedRegions: { enabled: hideUnchangedRegions },
                            scrollBeyondLastLine: false,
                            renderIndicators: true,
                        }}
                    />
                ) : (
                    <EmptyMessage
                        title="暂无文本差异"
                        message={entries.length > 0
                            ? '当前资源没有可展示的文本差异，或该资源不提供文本级对比。'
                            : '请先选择一个对比版本，或切换到存在变更的草稿文件。'}
                    />
                )}
            </div>
        </div>
    );
}

function formatDiffChangeType(changeType: AssetDiffEntry['changeType']): string {
    if (changeType === 'added') return '新增';
    if (changeType === 'removed') return '删除';
    if (changeType === 'modified') return '变更';
    if (changeType === 'renamed') return '重命名';
    return '类型变更';
}