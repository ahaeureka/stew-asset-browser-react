"use client";
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Editor } from '@monaco-editor/react';
import Markdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import { buttonBaseStyle, EmptyMessage, formatBytes, monoFont, needsLiteralUnescape, subHeaderStyle, unescapeLiteralNewlines, } from './asset-browser-shared';
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
const secondaryActionStyle = (active = false) => ({
    appearance: 'none',
    borderRadius: 999,
    border: '1px solid rgba(148,163,184,0.22)',
    background: active ? 'rgba(14,165,233,0.10)' : '#ffffff',
    color: active ? '#0284c7' : '#334155',
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
});
const tabChipStyle = (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    maxWidth: 260,
    padding: '7px 10px 7px 12px',
    borderRadius: 12,
    border: active ? '1px solid rgba(14,165,233,0.28)' : '1px solid rgba(148,163,184,0.16)',
    background: active ? 'rgba(14,165,233,0.10)' : 'rgba(255,255,255,0.78)',
    color: active ? '#0369a1' : '#334155',
});
const previewContainerStyle = {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    padding: '28px 32px 40px',
    fontSize: 14,
    lineHeight: 1.8,
    color: '#1e293b',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
};
const previewDocumentStyle = {
    maxWidth: 860,
    margin: '0 auto',
    padding: '32px 36px 44px',
    borderRadius: 24,
    border: '1px solid rgba(148,163,184,0.16)',
    background: 'rgba(255,255,255,0.96)',
    boxShadow: '0 24px 70px rgba(15,23,42,0.08)',
};
const previewLeadStyle = {
    margin: '0 0 24px 0',
    color: '#64748b',
    fontSize: 13,
};
const previewNavStyle = {
    maxWidth: 860,
    margin: '0 auto 18px',
    padding: '18px 20px',
    borderRadius: 20,
    border: '1px solid rgba(148,163,184,0.14)',
    background: 'rgba(248,250,252,0.92)',
    boxShadow: '0 18px 50px rgba(15,23,42,0.05)',
};
const previewNavItemStyle = (depth) => ({
    appearance: 'none',
    border: 0,
    background: 'transparent',
    color: '#475569',
    cursor: 'pointer',
    fontSize: 13,
    lineHeight: 1.5,
    textAlign: 'left',
    padding: '4px 0',
    paddingLeft: Math.max(0, depth - 1) * 14,
});
const copyButtonStyle = {
    appearance: 'none',
    position: 'absolute',
    top: 12,
    right: 12,
    border: '1px solid rgba(148,163,184,0.18)',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.92)',
    color: '#334155',
    padding: '6px 10px',
    fontSize: 12,
    fontWeight: 600,
    cursor: 'pointer',
    zIndex: 1,
};
const headingAnchorStyle = {
    marginLeft: 10,
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.8em',
    fontWeight: 600,
};
function mergeStyle(base, extra) {
    return extra ? { ...base, ...extra } : base;
}
function extractPlainText(node) {
    if (typeof node === 'string' || typeof node === 'number') {
        return String(node);
    }
    if (!node || typeof node === 'boolean') {
        return '';
    }
    if (Array.isArray(node)) {
        return node.map(extractPlainText).join('');
    }
    if (React.isValidElement(node)) {
        const element = node;
        return extractPlainText(element.props.children ?? null);
    }
    return '';
}
function normalizeMarkdownText(text) {
    return text
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*_~]/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\\([\\`*_{}\[\]()#+\-.!])/g, '$1')
        .trim();
}
function slugifyHeading(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}
function createHeadingIdFactory(prefix) {
    const counts = new Map();
    return (text) => {
        const normalized = slugifyHeading(normalizeMarkdownText(text)) || 'section';
        const nextCount = (counts.get(normalized) ?? 0) + 1;
        counts.set(normalized, nextCount);
        const suffix = nextCount > 1 ? `-${nextCount}` : '';
        return `${prefix}-${normalized}${suffix}`;
    };
}
async function copyText(text) {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return;
    }
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    document.execCommand('copy');
    textarea.remove();
}
function MarkdownCodeBlockFrame({ children, copySource }) {
    const [copied, setCopied] = useState(false);
    async function handleCopy() {
        await copyText(copySource);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
    }
    return (React.createElement("div", { style: { position: 'relative', margin: '0 0 20px 0' } },
        copySource ? (React.createElement("button", { type: "button", style: copyButtonStyle, onClick: () => void handleCopy() }, copied ? '已复制' : '复制')) : null,
        children));
}
function parseFrontmatter(text) {
    const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
    if (!match) {
        return null;
    }
    const rawYaml = match[1] || '';
    const body = text.slice(match[0].length);
    const fields = [];
    for (const line of rawYaml.split(/\r?\n/)) {
        const kv = /^([\w][\w.\-]*):\s*(.*)$/.exec(line.trim());
        if (kv) {
            fields.push({ key: kv[1], value: kv[2].replace(/^["']|["']$/g, '') });
        }
    }
    return { fields, body };
}
function FrontmatterBlock({ fields }) {
    if (fields.length === 0) {
        return null;
    }
    return (React.createElement("div", { style: {
            margin: '0 0 20px 0',
            padding: '14px 18px',
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.18)',
            background: 'rgba(248,250,252,0.8)',
            fontSize: 13,
            lineHeight: 1.6,
        } },
        React.createElement("div", { style: { fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 } }, "Frontmatter"),
        React.createElement("div", { style: { display: 'grid', gap: 4 } }, fields.map(({ key, value }) => (React.createElement("div", { key: key, style: { display: 'flex', gap: 8, flexWrap: 'wrap' } },
            React.createElement("span", { style: { fontWeight: 600, color: '#334155', fontFamily: monoFont, fontSize: 12 } },
                key,
                ":"),
            React.createElement("span", { style: { color: '#475569', wordBreak: 'break-word' } }, value)))))));
}
function stripFrontmatter(markdown) {
    return markdown.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '');
}
function buildMarkdownOutline(markdown, prefix) {
    const createId = createHeadingIdFactory(prefix);
    const items = [];
    const content = stripFrontmatter(markdown);
    for (const line of content.split(/\r?\n/)) {
        const match = /^(#{1,6})\s+(.+?)\s*$/.exec(line.trim());
        if (!match) {
            continue;
        }
        const text = normalizeMarkdownText(match[2] || '');
        if (!text) {
            continue;
        }
        items.push({
            depth: match[1]?.length ?? 1,
            text,
            id: createId(text),
        });
    }
    return items;
}
function createHeadingRenderer(tag, baseStyle, createId, onNavigate) {
    return ({ children, node, style, ...props }) => {
        const text = normalizeMarkdownText(extractPlainText(children));
        const id = createId(text || tag);
        return React.createElement(tag, {
            ...props,
            id,
            style: mergeStyle(baseStyle, style),
        }, React.createElement(React.Fragment, null,
            children,
            text ? (React.createElement("a", { href: `#${id}`, onClick: (event) => {
                    event.preventDefault();
                    onNavigate(id);
                }, style: headingAnchorStyle, "aria-label": `Jump to ${text}` }, "#")) : null));
    };
}
function hasClassName(node, className) {
    const raw = node?.properties?.className;
    if (Array.isArray(raw)) {
        return raw.includes(className);
    }
    return typeof raw === 'string' ? raw.split(' ').includes(className) : false;
}
function inferCodeLanguage(className) {
    const match = /language-([\w-]+)/.exec(className || '');
    return match?.[1];
}
function createMarkdownComponents(prefix, onNavigate) {
    const createId = createHeadingIdFactory(prefix);
    return {
        h1: createHeadingRenderer('h1', { fontSize: 28, fontWeight: 700, margin: '0 0 16px 0', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }, createId, onNavigate),
        h2: createHeadingRenderer('h2', { fontSize: 22, fontWeight: 700, margin: '24px 0 12px 0', paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }, createId, onNavigate),
        h3: createHeadingRenderer('h3', { fontSize: 18, fontWeight: 600, margin: '20px 0 8px 0' }, createId, onNavigate),
        h4: createHeadingRenderer('h4', { fontSize: 16, fontWeight: 600, margin: '16px 0 8px 0' }, createId, onNavigate),
        p: ({ children, node, style, ...props }) => (React.createElement("p", { ...props, style: mergeStyle({ margin: '0 0 12px 0' }, style) }, children)),
        ul: ({ children, node, style, ...props }) => (React.createElement("ul", { ...props, style: mergeStyle({
                margin: '0 0 16px 0',
                paddingLeft: hasClassName(node, 'contains-task-list') ? 0 : 24,
                listStyle: hasClassName(node, 'contains-task-list') ? 'none' : undefined,
            }, style) }, children)),
        ol: ({ children, node, style, ...props }) => (React.createElement("ol", { ...props, style: mergeStyle({ margin: '0 0 12px 0', paddingLeft: 24 }, style) }, children)),
        li: ({ children, node, style, ...props }) => (React.createElement("li", { ...props, style: mergeStyle({
                marginBottom: 8,
                display: hasClassName(node, 'task-list-item') ? 'flex' : undefined,
                alignItems: hasClassName(node, 'task-list-item') ? 'flex-start' : undefined,
                gap: hasClassName(node, 'task-list-item') ? 10 : undefined,
            }, style) }, children)),
        blockquote: ({ children, node, style, ...props }) => (React.createElement("blockquote", { ...props, style: mergeStyle({ margin: '0 0 12px 0', padding: '8px 16px', borderLeft: '4px solid #cbd5e1', background: '#f8fafc', color: '#475569' }, style) }, children)),
        code: ({ children, node, className, style, ...props }) => {
            const codeLanguage = inferCodeLanguage(className);
            const text = String(children ?? '').replace(/\n$/, '');
            if (codeLanguage) {
                return (React.createElement(SyntaxHighlighter, { language: codeLanguage, style: oneLight, PreTag: "div", customStyle: {
                        margin: 0,
                        borderRadius: 18,
                        border: '1px solid rgba(148,163,184,0.14)',
                        background: '#f8fafc',
                        padding: '18px 20px',
                        fontSize: 13,
                        lineHeight: 1.65,
                    }, codeTagProps: {
                        style: {
                            fontFamily: monoFont,
                        },
                    } }, text));
            }
            return (React.createElement("code", { ...props, className: className, style: mergeStyle({ padding: '2px 6px', borderRadius: 6, background: '#e2e8f0', fontFamily: monoFont, fontSize: 13 }, style) }, children));
        },
        pre: ({ children, node, style, ...props }) => (React.createElement(MarkdownCodeBlockFrame, { copySource: extractPlainText(children).replace(/\n$/, '') },
            React.createElement("pre", { ...props, style: mergeStyle({ margin: 0, overflow: 'auto', background: 'transparent', padding: 0 }, style) }, children))),
        a: ({ children, node, href, style, ...props }) => (React.createElement("a", { ...props, href: href, target: "_blank", rel: "noopener noreferrer", style: mergeStyle({ color: '#0284c7', textDecoration: 'none' }, style) }, children)),
        table: ({ children, node, style, ...props }) => (React.createElement("div", { style: { margin: '0 0 18px 0', overflow: 'auto', borderRadius: 18, border: '1px solid rgba(148,163,184,0.16)' } },
            React.createElement("table", { ...props, style: mergeStyle({ borderCollapse: 'separate', borderSpacing: 0, width: '100%', background: '#ffffff' }, style) }, children))),
        thead: ({ children, node, style, ...props }) => (React.createElement("thead", { ...props, style: mergeStyle({ background: '#f8fafc' }, style) }, children)),
        tbody: ({ children, node, style, ...props }) => (React.createElement("tbody", { ...props, style: style }, children)),
        tr: ({ children, node, style, ...props }) => (React.createElement("tr", { ...props, style: mergeStyle({ background: '#ffffff' }, style) }, children)),
        th: ({ children, node, style, ...props }) => (React.createElement("th", { ...props, style: mergeStyle({ border: '1px solid #e2e8f0', padding: '8px 12px', background: '#f8fafc', fontWeight: 600, textAlign: 'left' }, style) }, children)),
        td: ({ children, node, style, ...props }) => (React.createElement("td", { ...props, style: mergeStyle({ border: '1px solid #e2e8f0', padding: '8px 12px' }, style) }, children)),
        hr: ({ node, style, ...props }) => (React.createElement("hr", { ...props, style: mergeStyle({ border: 'none', borderTop: '1px solid #e2e8f0', margin: '16px 0' }, style) })),
        input: ({ node, style, type, checked, ...props }) => {
            if (type === 'checkbox') {
                return (React.createElement("input", { ...props, type: "checkbox", checked: checked, disabled: true, readOnly: true, style: mergeStyle({ marginTop: 5, accentColor: '#0ea5e9', width: 16, height: 16, flexShrink: 0 }, style) }));
            }
            return React.createElement("input", { ...props, type: type, checked: checked, style: style });
        },
        img: ({ node, style, alt, ...props }) => (React.createElement("img", { ...props, alt: alt, style: mergeStyle({ maxWidth: '100%', borderRadius: 18, border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 18px 40px rgba(15,23,42,0.08)' }, style) })),
        strong: ({ children, node, style, ...props }) => (React.createElement("strong", { ...props, style: mergeStyle({ fontWeight: 600 }, style) }, children)),
    };
}
export function AssetEditor({ selectedPath, selectedEntry, modelPath, language, editorTheme = 'vs', value, canEdit, dirty, saving = false, entryRevision, openTabs = [], onChange, onSave, onSelectTab, onCloseTab, actions, compact = false, mode, showModeSwitch = true, }) {
    const [internalMode, setInternalMode] = useState('edit');
    const [copied, setCopied] = useState(false);
    const editorRef = useRef(null);
    const latestSaveRef = useRef(onSave);
    const latestCanEditRef = useRef(canEdit);
    const latestSavingRef = useRef(saving);
    const latestMarkdownRef = useRef(false);
    const previewRootRef = useRef(null);
    const isMarkdown = language === 'markdown';
    const activeMode = mode ?? internalMode;
    const displayValue = useMemo(() => needsLiteralUnescape(value) ? unescapeLiteralNewlines(value) : value, [value]);
    const previewAnchorPrefix = useMemo(() => `preview-${slugifyHeading(selectedPath || 'markdown-preview') || 'markdown-preview'}`, [selectedPath]);
    function scrollToAnchor(id) {
        const target = previewRootRef.current?.querySelector(`#${id}`);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    async function handleCopyAll() {
        await copyText(displayValue);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
    }
    const frontmatter = useMemo(() => {
        if (!isMarkdown) {
            return null;
        }
        return parseFrontmatter(displayValue);
    }, [isMarkdown, displayValue]);
    const markdownBody = useMemo(() => frontmatter ? frontmatter.body : displayValue, [frontmatter, displayValue]);
    const markdownOutline = useMemo(() => buildMarkdownOutline(displayValue, previewAnchorPrefix), [previewAnchorPrefix, displayValue]);
    const markdownComponents = useMemo(() => createMarkdownComponents(previewAnchorPrefix, scrollToAnchor), [previewAnchorPrefix]);
    useEffect(() => {
        latestSaveRef.current = onSave;
        latestCanEditRef.current = canEdit;
        latestSavingRef.current = saving;
        latestMarkdownRef.current = isMarkdown;
    }, [canEdit, isMarkdown, onSave, saving]);
    useEffect(() => {
        if (mode === undefined) {
            setInternalMode('edit');
        }
    }, [selectedPath]);
    async function runEditorAction(actionId) {
        const editor = editorRef.current;
        if (!editor) {
            return;
        }
        await editor.getAction(actionId)?.run();
    }
    async function handleFormatRequest() {
        const editor = editorRef.current;
        if (!editor) {
            return;
        }
        const model = editor.getModel();
        if (model) {
            const current = model.getValue();
            if (needsLiteralUnescape(current)) {
                model.setValue(unescapeLiteralNewlines(current));
            }
        }
        await editor.getAction('editor.action.formatDocument')?.run();
    }
    async function handleSaveRequest() {
        if (!latestSaveRef.current || !latestCanEditRef.current || latestSavingRef.current) {
            return;
        }
        await runEditorAction('editor.action.formatDocument');
        await latestSaveRef.current();
    }
    const handleEditorMount = (editor, monaco) => {
        editorRef.current = editor;
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
            void handleSaveRequest();
        });
        editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyM, () => {
            if (latestMarkdownRef.current) {
                if (mode === undefined) {
                    setInternalMode((current) => current === 'edit' ? 'preview' : 'edit');
                }
            }
        });
    };
    const headerStyle = compact
        ? { ...subHeaderStyle, padding: '10px 12px', gap: 10 }
        : subHeaderStyle;
    const tabsStyle = compact
        ? { display: 'flex', gap: 6, overflowX: 'auto', padding: '6px 12px', borderBottom: '1px solid rgba(148,163,184,0.12)', background: 'rgba(248,250,252,0.94)' }
        : { display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 16px', borderBottom: '1px solid rgba(148,163,184,0.12)', background: 'rgba(248,250,252,0.94)' };
    const compactActionStyle = compact
        ? { ...secondaryActionStyle(), padding: '5px 9px', fontSize: 11 }
        : secondaryActionStyle();
    const saveActionStyle = compact
        ? { ...buttonBaseStyle, padding: '6px 11px', fontSize: 12 }
        : buttonBaseStyle;
    const markdownPreviewContainerStyle = compact
        ? { ...previewContainerStyle, padding: '16px 18px 20px' }
        : previewContainerStyle;
    const markdownPreviewNavStyle = compact
        ? { ...previewNavStyle, margin: '0 auto 12px', padding: '12px 14px', borderRadius: 16 }
        : previewNavStyle;
    const markdownPreviewDocumentStyle = compact
        ? { ...previewDocumentStyle, padding: '20px 22px 28px', borderRadius: 18 }
        : previewDocumentStyle;
    const markdownLeadStyle = compact
        ? { ...previewLeadStyle, margin: '0 0 16px 0', fontSize: 12 }
        : previewLeadStyle;
    return (React.createElement("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 } },
        openTabs.length > 0 ? (React.createElement("div", { style: tabsStyle }, openTabs.map((tab) => (React.createElement("div", { key: tab.path, style: tabChipStyle(tab.active) },
            React.createElement("button", { type: "button", onClick: () => onSelectTab?.(tab.path), style: { appearance: 'none', border: 0, background: 'transparent', color: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                tab.label,
                tab.dirty ? ' *' : ''),
            onCloseTab ? (React.createElement("button", { type: "button", onClick: () => onCloseTab(tab.path), "aria-label": `Close ${tab.label}`, style: { appearance: 'none', border: 0, background: 'transparent', color: 'inherit', fontSize: 14, lineHeight: 1, cursor: 'pointer', padding: 0, flexShrink: 0 } }, "\u00D7")) : null))))) : null,
        React.createElement("div", { style: headerStyle },
            React.createElement("div", { style: { display: 'grid', gap: 3 } },
                React.createElement("span", { style: { fontWeight: 700 } }, selectedPath || 'Select a file'),
                selectedEntry ? (React.createElement("span", { style: { fontSize: 12, color: '#64748b' } },
                    selectedEntry.contentType || 'text/plain',
                    " \u00B7 ",
                    formatBytes(selectedEntry.sizeBytes),
                    " \u00B7 rev ",
                    entryRevision)) : null),
            React.createElement("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' } },
                activeMode === 'edit' && selectedEntry?.entryKind === 'file' && selectedEntry.isTextPreviewable ? (React.createElement(React.Fragment, null,
                    React.createElement("button", { type: "button", style: compactActionStyle, onClick: () => void runEditorAction('actions.find') }, "\u67E5\u627E"),
                    React.createElement("button", { type: "button", style: compactActionStyle, onClick: () => void runEditorAction('editor.action.startFindReplaceAction') }, "\u66FF\u6362"),
                    React.createElement("button", { type: "button", style: compactActionStyle, disabled: !canEdit, onClick: () => void handleFormatRequest() }, "\u683C\u5F0F\u5316"))) : null,
                selectedEntry?.entryKind === 'file' && selectedEntry.isTextPreviewable && displayValue ? (React.createElement("button", { type: "button", style: compactActionStyle, onClick: () => void handleCopyAll() }, copied ? '已复制' : '复制')) : null,
                isMarkdown && showModeSwitch ? (React.createElement("div", { style: { display: 'inline-flex', gap: 2, background: 'rgba(148,163,184,0.10)', borderRadius: 10, padding: 2 } },
                    React.createElement("button", { type: "button", style: tabStyle(activeMode === 'edit'), onClick: () => setInternalMode('edit') }, "\u7F16\u8F91"),
                    React.createElement("button", { type: "button", style: tabStyle(activeMode === 'preview'), onClick: () => setInternalMode('preview') }, "\u9884\u89C8"))) : null,
                actions,
                onSave ? (React.createElement("button", { type: "button", style: saveActionStyle, disabled: !canEdit || saving || !dirty, onClick: () => void handleSaveRequest() }, saving ? '保存中...' : '保存')) : null)),
        activeMode === 'preview' && isMarkdown ? (React.createElement("div", { style: markdownPreviewContainerStyle },
            markdownOutline.length > 0 ? (React.createElement("nav", { style: markdownPreviewNavStyle, "aria-label": "Table of contents" },
                React.createElement("div", { style: { fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 } }, "\u6587\u6863\u76EE\u5F55"),
                React.createElement("div", { style: { display: 'grid', gap: 2 } }, markdownOutline.map((item) => (React.createElement("button", { key: item.id, type: "button", style: previewNavItemStyle(item.depth), onClick: () => scrollToAnchor(item.id) }, item.text)))))) : null,
            React.createElement("article", { style: markdownPreviewDocumentStyle },
                React.createElement("div", { style: markdownLeadStyle }, "\u9605\u8BFB\u89C6\u56FE \u00B7 GitHub Flavored Markdown \u00B7 \u4F7F\u7528 react-markdown \u6E32\u67D3"),
                React.createElement("div", { ref: previewRootRef },
                    frontmatter && frontmatter.fields.length > 0 ? (React.createElement(FrontmatterBlock, { fields: frontmatter.fields })) : null,
                    React.createElement(Markdown, { remarkPlugins: [remarkGfm, remarkFrontmatter], components: markdownComponents }, markdownBody))))) : (React.createElement("div", { style: { flex: 1, minHeight: 0 } }, !selectedEntry ? (React.createElement(EmptyMessage, { title: "\u5C1A\u672A\u9009\u62E9\u6587\u4EF6", message: "\u8BF7\u5148\u4ECE\u5DE6\u4FA7\u76EE\u5F55\u6811\u9009\u62E9\u4E00\u4E2A\u6587\u4EF6\uFF0C\u518D\u8FDB\u884C\u67E5\u770B\u6216\u7F16\u8F91\u3002" })) : selectedEntry.entryKind !== 'file' ? (React.createElement(EmptyMessage, { title: "\u5F53\u524D\u4E3A\u76EE\u5F55", message: "\u8BF7\u9009\u62E9\u6587\u4EF6\u8282\u70B9\u540E\u518D\u6253\u5F00\u7F16\u8F91\u533A\u3002" })) : !selectedEntry.isTextPreviewable ? (React.createElement(EmptyMessage, { title: "\u4E8C\u8FDB\u5236\u6587\u4EF6", message: "\u5F53\u524D\u8D44\u6E90\u4E0D\u652F\u6301\u6587\u672C\u9884\u89C8\u3002" })) : (React.createElement(Editor, { height: "100%", defaultLanguage: "plaintext", path: modelPath, language: language, theme: editorTheme, value: displayValue, onMount: handleEditorMount, onChange: (next) => onChange(next ?? ''), saveViewState: true, keepCurrentModel: true, options: {
                readOnly: !canEdit,
                minimap: { enabled: false },
                smoothScrolling: true,
                fontSize: compact ? 12 : 13,
                fontFamily: monoFont,
                wordWrap: 'on',
                automaticLayout: true,
                formatOnPaste: canEdit,
                formatOnType: canEdit,
                scrollBeyondLastLine: false,
                contextmenu: true,
                padding: compact ? { top: 10, bottom: 14 } : { top: 16, bottom: 24 },
                guides: { indentation: true },
                find: {
                    addExtraSpaceOnTop: false,
                    autoFindInSelection: 'multiline',
                    seedSearchStringFromSelection: 'selection',
                },
            } }))))));
}
