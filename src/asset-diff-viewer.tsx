"use client";

import type { ReactNode } from 'react';
import { DiffEditor } from '@monaco-editor/react';
import type { AssetDiffEntry, AssetDiffSummary } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import {
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
}: AssetDiffViewerProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#f8fafc' }}>
            <div style={subHeaderStyle}>
                <div style={{ display: 'grid', gap: 3 }}>
                    <span style={{ fontWeight: 700 }}>Diff</span>
                    <span style={{ fontSize: 12, color: '#64748b' }}>{label}</span>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {actions}
                    {summary ? (
                        <>
                            {pill('Total', String(summary.totalChanges))}
                            {pill('Added', String(summary.addedCount))}
                            {pill('Modified', String(summary.modifiedCount))}
                        </>
                    ) : null}
                </div>
            </div>
            {entries.length > 0 ? (
                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 14px', borderBottom: '1px solid rgba(148,163,184,0.14)' }}>
                    {entries.map((entry) => (
                        <button
                            key={`${entry.changeType}:${entry.path}`}
                            type="button"
                            onClick={() => onSelectEntry?.(entry.path)}
                            style={{
                                border: 0,
                                borderRadius: 999,
                                padding: '6px 10px',
                                whiteSpace: 'nowrap',
                                cursor: onSelectEntry ? 'pointer' : 'default',
                                background: entry.path === selectedPath ? 'rgba(14,165,233,0.12)' : 'rgba(148,163,184,0.12)',
                                color: entry.path === selectedPath ? '#0369a1' : '#475569',
                                fontSize: 12,
                                fontWeight: 600,
                            }}
                        >
                            {entry.changeType} · {entry.path}
                        </button>
                    ))}
                </div>
            ) : null}
            <div style={{ flex: 1, minHeight: 0 }}>
                {originalText || modifiedText ? (
                    <DiffEditor
                        height="100%"
                        language={language}
                        theme="vs-light"
                        original={originalText}
                        modified={modifiedText}
                        options={{
                            readOnly: true,
                            minimap: { enabled: false },
                            automaticLayout: true,
                            fontSize: 13,
                            fontFamily: monoFont,
                            wordWrap: 'on',
                        }}
                    />
                ) : (
                    <EmptyMessage
                        title="No text diff"
                        message={entries.length > 0
                            ? 'Current file is unchanged or does not expose text diff details.'
                            : 'Choose a comparison target or a changed draft file.'}
                    />
                )}
            </div>
        </div>
    );
}