"use client";

import React, { type ReactNode, useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import Markdown, { type Components, type ExtraProps } from 'react-markdown';
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

type MarkdownTagProps<Tag extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[Tag] & ExtraProps;

function mergeStyle(base: React.CSSProperties, extra?: React.CSSProperties): React.CSSProperties {
    return extra ? { ...base, ...extra } : base;
}

const markdownComponents: Components = {
    h1: ({ children, node, style, ...props }: MarkdownTagProps<'h1'>) => (
        <h1 {...props} style={mergeStyle({ fontSize: 28, fontWeight: 700, margin: '0 0 16px 0', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }, style)}>{children}</h1>
    ),
    h2: ({ children, node, style, ...props }: MarkdownTagProps<'h2'>) => (
        <h2 {...props} style={mergeStyle({ fontSize: 22, fontWeight: 700, margin: '24px 0 12px 0', paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }, style)}>{children}</h2>
    ),
    h3: ({ children, node, style, ...props }: MarkdownTagProps<'h3'>) => (
        <h3 {...props} style={mergeStyle({ fontSize: 18, fontWeight: 600, margin: '20px 0 8px 0' }, style)}>{children}</h3>
    ),
    h4: ({ children, node, style, ...props }: MarkdownTagProps<'h4'>) => (
        <h4 {...props} style={mergeStyle({ fontSize: 16, fontWeight: 600, margin: '16px 0 8px 0' }, style)}>{children}</h4>
    ),
    p: ({ children, node, style, ...props }: MarkdownTagProps<'p'>) => (
        <p {...props} style={mergeStyle({ margin: '0 0 12px 0' }, style)}>{children}</p>
    ),
    ul: ({ children, node, style, ...props }: MarkdownTagProps<'ul'>) => (
        <ul {...props} style={mergeStyle({ margin: '0 0 12px 0', paddingLeft: 24 }, style)}>{children}</ul>
    ),
    ol: ({ children, node, style, ...props }: MarkdownTagProps<'ol'>) => (
        <ol {...props} style={mergeStyle({ margin: '0 0 12px 0', paddingLeft: 24 }, style)}>{children}</ol>
    ),
    li: ({ children, node, style, ...props }: MarkdownTagProps<'li'>) => (
        <li {...props} style={mergeStyle({ marginBottom: 4 }, style)}>{children}</li>
    ),
    blockquote: ({ children, node, style, ...props }: MarkdownTagProps<'blockquote'>) => (
        <blockquote {...props} style={mergeStyle({ margin: '0 0 12px 0', padding: '8px 16px', borderLeft: '4px solid #cbd5e1', background: '#f8fafc', color: '#475569' }, style)}>{children}</blockquote>
    ),
    code: ({ children, node, className, style, ...props }: MarkdownTagProps<'code'>) => {
        const isBlock = Boolean(className);
        return isBlock ? (
            <code {...props} className={className} style={mergeStyle({ display: 'block', padding: 16, borderRadius: 8, background: '#f1f5f9', fontFamily: monoFont, fontSize: 13, overflow: 'auto' }, style)}>{children}</code>
        ) : (
            <code {...props} className={className} style={mergeStyle({ padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', fontFamily: monoFont, fontSize: 13 }, style)}>{children}</code>
        );
    },
    pre: ({ children, node, style, ...props }: MarkdownTagProps<'pre'>) => (
        <pre {...props} style={mergeStyle({ margin: '0 0 12px 0', padding: 0, background: 'transparent', overflow: 'auto' }, style)}>{children}</pre>
    ),
    a: ({ children, node, href, style, ...props }: MarkdownTagProps<'a'>) => (
        <a {...props} href={href} target="_blank" rel="noopener noreferrer" style={mergeStyle({ color: '#0284c7', textDecoration: 'none' }, style)}>{children}</a>
    ),
    table: ({ children, node, style, ...props }: MarkdownTagProps<'table'>) => (
        <div style={{ margin: '0 0 12px 0', overflow: 'auto' }}>
            <table {...props} style={mergeStyle({ borderCollapse: 'collapse', width: '100%' }, style)}>{children}</table>
        </div>
    ),
    th: ({ children, node, style, ...props }: MarkdownTagProps<'th'>) => (
        <th {...props} style={mergeStyle({ border: '1px solid #e2e8f0', padding: '8px 12px', background: '#f8fafc', fontWeight: 600, textAlign: 'left' }, style)}>{children}</th>
    ),
    td: ({ children, node, style, ...props }: MarkdownTagProps<'td'>) => (
        <td {...props} style={mergeStyle({ border: '1px solid #e2e8f0', padding: '8px 12px' }, style)}>{children}</td>
    ),
    hr: ({ node, style, ...props }: MarkdownTagProps<'hr'>) => (
        <hr {...props} style={mergeStyle({ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }, style)} />
    ),
    strong: ({ children, node, style, ...props }: MarkdownTagProps<'strong'>) => (
        <strong {...props} style={mergeStyle({ fontWeight: 600 }, style)}>{children}</strong>
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
