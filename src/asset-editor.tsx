"use client";

import { type ReactNode, useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { AssetTreeEntry } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import {
    buttonBaseStyle,
    EmptyMessage,
    formatBytes,
    monoFont,
    subHeaderStyle,
} from './asset-browser-shared';

type EditorMode = 'edit' | 'preview';

const tabStyle = (active: boolean): React.CSSProperties => ({
    appearance: 'none',
    border: 'none',
    borderRadius: 8,
    padding: '4px 12px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    background: active ? 'rgba(14,165,233,0.12)' : 'transparent',
    color: active ? '#0284c7' : '#64748b',
});

const previewContainerStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    padding: '24px 32px',
    fontSize: 14,
    lineHeight: 1.7,
    color: '#1e293b',
    background: '#ffffff',
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const markdownComponents: Record<string, any> = {
    h1: ({ children }: { children: ReactNode }) => (
        <h1 style={{ fontSize: 28, fontWeight: 700, margin: '0 0 16px 0', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }}>{children}</h1>
    ),
    h2: ({ children }: { children: ReactNode }) => (
        <h2 style={{ fontSize: 22, fontWeight: 700, margin: '24px 0 12px 0', paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>{children}</h2>
    ),
    h3: ({ children }: { children: ReactNode }) => (
        <h3 style={{ fontSize: 18, fontWeight: 600, margin: '20px 0 8px 0' }}>{children}</h3>
    ),
    h4: ({ children }: { children: ReactNode }) => (
        <h4 style={{ fontSize: 16, fontWeight: 600, margin: '16px 0 8px 0' }}>{children}</h4>
    ),
    p: ({ children }: { children: ReactNode }) => (
        <p style={{ margin: '0 0 12px 0' }}>{children}</p>
    ),
    ul: ({ children }: { children: ReactNode }) => (
        <ul style={{ margin: '0 0 12px 0', paddingLeft: 24 }}>{children}</ul>
    ),
    ol: ({ children }: { children: ReactNode }) => (
        <ol style={{ margin: '0 0 12px 0', paddingLeft: 24 }}>{children}</ol>
    ),
    li: ({ children }: { children: ReactNode }) => (
        <li style={{ marginBottom: 4 }}>{children}</li>
    ),
    blockquote: ({ children }: { children: ReactNode }) => (
        <blockquote style={{ margin: '0 0 12px 0', padding: '8px 16px', borderLeft: '4px solid #cbd5e1', background: '#f8fafc', color: '#475569' }}>{children}</blockquote>
    ),
    code: ({ children, className }: { children: ReactNode; className?: string }) => {
        const isBlock = Boolean(className);
        return isBlock ? (
            <code style={{ display: 'block', padding: 16, borderRadius: 8, background: '#f1f5f9', fontFamily: monoFont, fontSize: 13, overflow: 'auto' }}>{children}</code>
        ) : (
            <code style={{ padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', fontFamily: monoFont, fontSize: 13 }}>{children}</code>
        );
    },
    pre: ({ children }: { children: ReactNode }) => (
        <pre style={{ margin: '0 0 12px 0', padding: 0, background: 'transparent', overflow: 'auto' }}>{children}</pre>
    ),
    a: ({ children, href }: { children: ReactNode; href?: string }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#0284c7', textDecoration: 'none' }}>{children}</a>
    ),
    table: ({ children }: { children: ReactNode }) => (
        <div style={{ margin: '0 0 12px 0', overflow: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>{children}</table>
        </div>
    ),
    th: ({ children }: { children: ReactNode }) => (
        <th style={{ border: '1px solid #e2e8f0', padding: '8px 12px', background: '#f8fafc', fontWeight: 600, textAlign: 'left' }}>{children}</th>
    ),
    td: ({ children }: { children: ReactNode }) => (
        <td style={{ border: '1px solid #e2e8f0', padding: '8px 12px' }}>{children}</td>
    ),
    hr: () => (
        <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }} />
    ),
    strong: ({ children }: { children: ReactNode }) => (
        <strong style={{ fontWeight: 600 }}>{children}</strong>
    ),
};

export interface AssetEditorProps {
    selectedPath: string;
    selectedEntry: AssetTreeEntry | null;
    language: string;
    value: string;
    canEdit: boolean;
    dirty: boolean;
    saving?: boolean;
    entryRevision: number;
    onChange: (value: string) => void;
    onSave?: () => void;
    actions?: ReactNode;
}

export function AssetEditor({
    selectedPath,
    selectedEntry,
    language,
    value,
    canEdit,
    dirty,
    saving = false,
    entryRevision,
    onChange,
    onSave,
    actions,
}: AssetEditorProps) {
    const [mode, setMode] = useState<EditorMode>('edit');
    const isMarkdown = language === 'markdown';

    useEffect(() => {
        setMode('edit');
    }, [selectedPath]);

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={subHeaderStyle}>
                <div style={{ display: 'grid', gap: 3 }}>
                    <span style={{ fontWeight: 700 }}>{selectedPath || 'Select a file'}</span>
                    {selectedEntry ? (
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                            {selectedEntry.contentType || 'text/plain'} · {formatBytes(selectedEntry.sizeBytes)} · rev {entryRevision}
                        </span>
                    ) : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {isMarkdown ? (
                        <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(148,163,184,0.10)', borderRadius: 10, padding: 2 }}>
                            <button type="button" style={tabStyle(mode === 'edit')} onClick={() => setMode('edit')}>Edit</button>
                            <button type="button" style={tabStyle(mode === 'preview')} onClick={() => setMode('preview')}>Preview</button>
                        </div>
                    ) : null}
                    {actions}
                    {onSave ? (
                        <button type="button" style={buttonBaseStyle} disabled={!canEdit || saving || !dirty} onClick={onSave}>
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    ) : null}
                </div>
            </div>
            {mode === 'preview' && isMarkdown ? (
                <div style={previewContainerStyle}>
                    <Markdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                        {value}
                    </Markdown>
                </div>
            ) : (
                <div style={{ flex: 1, minHeight: 0 }}>
                    {!selectedEntry ? (
                        <EmptyMessage title="No file selected" message="Choose a file from the tree to preview or edit." />
                    ) : selectedEntry.entryKind !== 'file' ? (
                        <EmptyMessage title="Directory selected" message="Select a file node to open the editor." />
                    ) : !selectedEntry.isTextPreviewable ? (
                        <EmptyMessage title="Binary file" message="This entry cannot be previewed as text." />
                    ) : (
                        <Editor
                            height="100%"
                            defaultLanguage="plaintext"
                            language={language}
                            theme="vs-light"
                            value={value}
                            onChange={(next) => onChange(next ?? '')}
                            options={{
                                readOnly: !canEdit,
                                minimap: { enabled: false },
                                smoothScrolling: true,
                                fontSize: 13,
                                fontFamily: monoFont,
                                wordWrap: 'on',
                                automaticLayout: true,
                            }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
