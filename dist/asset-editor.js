"use client";
import React, { useState, useEffect } from 'react';
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
function mergeStyle(base, extra) {
    return extra ? { ...base, ...extra } : base;
}
const markdownComponents = {
    h1: ({ children, node, style, ...props }) => (React.createElement("h1", { ...props, style: mergeStyle({ fontSize: 28, fontWeight: 700, margin: '0 0 16px 0', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }, style) }, children)),
    h2: ({ children, node, style, ...props }) => (React.createElement("h2", { ...props, style: mergeStyle({ fontSize: 22, fontWeight: 700, margin: '24px 0 12px 0', paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }, style) }, children)),
    h3: ({ children, node, style, ...props }) => (React.createElement("h3", { ...props, style: mergeStyle({ fontSize: 18, fontWeight: 600, margin: '20px 0 8px 0' }, style) }, children)),
    h4: ({ children, node, style, ...props }) => (React.createElement("h4", { ...props, style: mergeStyle({ fontSize: 16, fontWeight: 600, margin: '16px 0 8px 0' }, style) }, children)),
    p: ({ children, node, style, ...props }) => (React.createElement("p", { ...props, style: mergeStyle({ margin: '0 0 12px 0' }, style) }, children)),
    ul: ({ children, node, style, ...props }) => (React.createElement("ul", { ...props, style: mergeStyle({ margin: '0 0 12px 0', paddingLeft: 24 }, style) }, children)),
    ol: ({ children, node, style, ...props }) => (React.createElement("ol", { ...props, style: mergeStyle({ margin: '0 0 12px 0', paddingLeft: 24 }, style) }, children)),
    li: ({ children, node, style, ...props }) => (React.createElement("li", { ...props, style: mergeStyle({ marginBottom: 4 }, style) }, children)),
    blockquote: ({ children, node, style, ...props }) => (React.createElement("blockquote", { ...props, style: mergeStyle({ margin: '0 0 12px 0', padding: '8px 16px', borderLeft: '4px solid #cbd5e1', background: '#f8fafc', color: '#475569' }, style) }, children)),
    code: ({ children, node, className, style, ...props }) => {
        const isBlock = Boolean(className);
        return isBlock ? (React.createElement("code", { ...props, className: className, style: mergeStyle({ display: 'block', padding: 16, borderRadius: 8, background: '#f1f5f9', fontFamily: monoFont, fontSize: 13, overflow: 'auto' }, style) }, children)) : (React.createElement("code", { ...props, className: className, style: mergeStyle({ padding: '2px 6px', borderRadius: 4, background: '#f1f5f9', fontFamily: monoFont, fontSize: 13 }, style) }, children));
    },
    pre: ({ children, node, style, ...props }) => (React.createElement("pre", { ...props, style: mergeStyle({ margin: '0 0 12px 0', padding: 0, background: 'transparent', overflow: 'auto' }, style) }, children)),
    a: ({ children, node, href, style, ...props }) => (React.createElement("a", { ...props, href: href, target: "_blank", rel: "noopener noreferrer", style: mergeStyle({ color: '#0284c7', textDecoration: 'none' }, style) }, children)),
    table: ({ children, node, style, ...props }) => (React.createElement("div", { style: { margin: '0 0 12px 0', overflow: 'auto' } },
        React.createElement("table", { ...props, style: mergeStyle({ borderCollapse: 'collapse', width: '100%' }, style) }, children))),
    th: ({ children, node, style, ...props }) => (React.createElement("th", { ...props, style: mergeStyle({ border: '1px solid #e2e8f0', padding: '8px 12px', background: '#f8fafc', fontWeight: 600, textAlign: 'left' }, style) }, children)),
    td: ({ children, node, style, ...props }) => (React.createElement("td", { ...props, style: mergeStyle({ border: '1px solid #e2e8f0', padding: '8px 12px' }, style) }, children)),
    hr: ({ node, style, ...props }) => (React.createElement("hr", { ...props, style: mergeStyle({ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }, style) })),
    strong: ({ children, node, style, ...props }) => (React.createElement("strong", { ...props, style: mergeStyle({ fontWeight: 600 }, style) }, children)),
};
export function AssetEditor({ selectedPath, selectedEntry, language, value, canEdit, dirty, saving = false, entryRevision, onChange, onSave, actions, }) {
    const [mode, setMode] = useState('edit');
    const isMarkdown = language === 'markdown';
    useEffect(() => {
        setMode('edit');
    }, [selectedPath]);
    return (React.createElement("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } },
        React.createElement("div", { style: subHeaderStyle },
            React.createElement("div", { style: { display: 'grid', gap: 3 } },
                React.createElement("span", { style: { fontWeight: 700 } }, selectedPath || 'Select a file'),
                selectedEntry ? (React.createElement("span", { style: { fontSize: 12, color: '#64748b' } },
                    selectedEntry.contentType || 'text/plain',
                    " \u00B7 ",
                    formatBytes(selectedEntry.sizeBytes),
                    " \u00B7 rev ",
                    entryRevision)) : null),
            React.createElement("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                isMarkdown ? (React.createElement("div", { style: { display: 'inline-flex', gap: 2, background: 'rgba(148,163,184,0.10)', borderRadius: 10, padding: 2 } },
                    React.createElement("button", { type: "button", style: tabStyle(mode === 'edit'), onClick: () => setMode('edit') }, "Edit"),
                    React.createElement("button", { type: "button", style: tabStyle(mode === 'preview'), onClick: () => setMode('preview') }, "Preview"))) : null,
                actions,
                onSave ? (React.createElement("button", { type: "button", style: buttonBaseStyle, disabled: !canEdit || saving || !dirty, onClick: onSave }, saving ? 'Saving...' : 'Save')) : null)),
        mode === 'preview' && isMarkdown ? (React.createElement("div", { style: previewContainerStyle },
            React.createElement(Markdown, { remarkPlugins: [remarkGfm], components: markdownComponents }, value))) : (React.createElement("div", { style: { flex: 1, minHeight: 0 } }, !selectedEntry ? (React.createElement(EmptyMessage, { title: "No file selected", message: "Choose a file from the tree to preview or edit." })) : selectedEntry.entryKind !== 'file' ? (React.createElement(EmptyMessage, { title: "Directory selected", message: "Select a file node to open the editor." })) : !selectedEntry.isTextPreviewable ? (React.createElement(EmptyMessage, { title: "Binary file", message: "This entry cannot be previewed as text." })) : (React.createElement(Editor, { height: "100%", defaultLanguage: "plaintext", language: language, theme: "vs-light", value: value, onChange: (next) => onChange(next ?? ''), options: {
                readOnly: !canEdit,
                minimap: { enabled: false },
                smoothScrolling: true,
                fontSize: 13,
                fontFamily: monoFont,
                wordWrap: 'on',
                automaticLayout: true,
            } }))))));
}
