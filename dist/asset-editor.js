"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from 'react';
import { Editor } from '@monaco-editor/react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { buttonBaseStyle, EmptyMessage, formatBytes, monoFont, subHeaderStyle, } from './asset-browser-shared';
const tabStyle = (active) => ({
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
const previewContainerStyle = {
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
const markdownComponents = {
    h1: ({ children }) => (_jsx("h1", { style: { fontSize: 28, fontWeight: 700, margin: '0 0 16px 0', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }, children: children })),
    h2: ({ children }) => (_jsx("h2", { style: { fontSize: 22, fontWeight: 700, margin: '24px 0 12px 0', paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }, children: children })),
    h3: ({ children }) => (_jsx("h3", { style: { fontSize: 18, fontWeight: 600, margin: '20px 0 8px 0' }, children: children })),
    h4: ({ children }) => (_jsx("h4", { style: { fontSize: 16, fontWeight: 600, margin: '16px 0 8px 0' }, children: children })),
    p: ({ children }) => (_jsx("p", { style: { margin: '0 0 12px 0' }, children: children })),
    ul: ({ children }) => (_jsx("ul", { style: { margin: '0 0 12px 0', paddingLeft: 24 }, children: children })),
    ol: ({ children }) => (_jsx("ol", { style: { margin: '0 0 12px 0', paddingLeft: 24 }, children: children })),
    li: ({ children }) => (_jsx("li", { style: { marginBottom: 4 }, children: children })),
    blockquote: ({ children }) => (_jsx("blockquote", { style: { margin: '0 0 12px 0', padding: '8px 16px', borderLeft: '4px solid #cbd5e1', background: '#f8fafc', color: '#475569' }, children: children })),
    code: ({ children, className }) => {
        const isBlock = Boolean(className);
        return isBlock ? (_jsx("code", { style: { display: 'block', padding: 16, borderRadius: 8, background: '#f1f5f9', fontFamily: monoFont, fontSize: 13, overflow: 'auto' }, children: children })) : (_jsx("code", { style: { padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', fontFamily: monoFont, fontSize: 13 }, children: children }));
    },
    pre: ({ children }) => (_jsx("pre", { style: { margin: '0 0 12px 0', padding: 0, background: 'transparent', overflow: 'auto' }, children: children })),
    a: ({ children, href }) => (_jsx("a", { href: href, target: "_blank", rel: "noopener noreferrer", style: { color: '#0284c7', textDecoration: 'none' }, children: children })),
    table: ({ children }) => (_jsx("div", { style: { margin: '0 0 12px 0', overflow: 'auto' }, children: _jsx("table", { style: { borderCollapse: 'collapse', width: '100%' }, children: children }) })),
    th: ({ children }) => (_jsx("th", { style: { border: '1px solid #e2e8f0', padding: '8px 12px', background: '#f8fafc', fontWeight: 600, textAlign: 'left' }, children: children })),
    td: ({ children }) => (_jsx("td", { style: { border: '1px solid #e2e8f0', padding: '8px 12px' }, children: children })),
    hr: () => (_jsx("hr", { style: { border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' } })),
    strong: ({ children }) => (_jsx("strong", { style: { fontWeight: 600 }, children: children })),
};
export function AssetEditor({ selectedPath, selectedEntry, language, value, canEdit, dirty, saving = false, entryRevision, onChange, onSave, actions, }) {
    const [mode, setMode] = useState('edit');
    const isMarkdown = language === 'markdown';
    useEffect(() => {
        setMode('edit');
    }, [selectedPath]);
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }, children: [_jsxs("div", { style: subHeaderStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("span", { style: { fontWeight: 700 }, children: selectedPath || 'Select a file' }), selectedEntry ? (_jsxs("span", { style: { fontSize: 12, color: '#64748b' }, children: [selectedEntry.contentType || 'text/plain', " \u00B7 ", formatBytes(selectedEntry.sizeBytes), " \u00B7 rev ", entryRevision] })) : null] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [isMarkdown ? (_jsxs("div", { style: { display: 'inline-flex', gap: 2, background: 'rgba(148,163,184,0.10)', borderRadius: 10, padding: 2 }, children: [_jsx("button", { type: "button", style: tabStyle(mode === 'edit'), onClick: () => setMode('edit'), children: "Edit" }), _jsx("button", { type: "button", style: tabStyle(mode === 'preview'), onClick: () => setMode('preview'), children: "Preview" })] })) : null, actions, onSave ? (_jsx("button", { type: "button", style: buttonBaseStyle, disabled: !canEdit || saving || !dirty, onClick: onSave, children: saving ? 'Saving...' : 'Save' })) : null] })] }), mode === 'preview' && isMarkdown ? (_jsx("div", { style: previewContainerStyle, children: _jsx(Markdown, { remarkPlugins: [remarkGfm], components: markdownComponents, children: value }) })) : (_jsx("div", { style: { flex: 1, minHeight: 0 }, children: !selectedEntry ? (_jsx(EmptyMessage, { title: "No file selected", message: "Choose a file from the tree to preview or edit." })) : selectedEntry.entryKind !== 'file' ? (_jsx(EmptyMessage, { title: "Directory selected", message: "Select a file node to open the editor." })) : !selectedEntry.isTextPreviewable ? (_jsx(EmptyMessage, { title: "Binary file", message: "This entry cannot be previewed as text." })) : (_jsx(Editor, { height: "100%", defaultLanguage: "plaintext", language: language, theme: "vs-light", value: value, onChange: (next) => onChange(next ?? ''), options: {
                        readOnly: !canEdit,
                        minimap: { enabled: false },
                        smoothScrolling: true,
                        fontSize: 13,
                        fontFamily: monoFont,
                        wordWrap: 'on',
                        automaticLayout: true,
                    } })) }))] }));
}
