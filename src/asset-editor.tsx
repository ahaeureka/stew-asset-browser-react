"use client";

import React, { type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { Editor, type Monaco, type OnMount } from '@monaco-editor/react';
import Markdown, { type Components, type ExtraProps } from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import remarkFrontmatter from 'remark-frontmatter';
import remarkGfm from 'remark-gfm';
import type { AssetTreeEntry } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import {
    buttonBaseStyle,
    EmptyMessage,
    formatBytes,
    monoFont,
    needsLiteralUnescape,
    subHeaderStyle,
    unescapeLiteralNewlines,
} from './asset-browser-shared';

type EditorMode = 'edit' | 'preview' | 'split';

export type AssetEditorMode = EditorMode;

export interface AssetEditorTab {
    path: string;
    label: string;
    active: boolean;
    dirty: boolean;
}

interface MarkdownOutlineItem {
    depth: number;
    text: string;
    id: string;
    lineNumber: number;
    order: number;
}

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

const secondaryActionStyle = (active = false): React.CSSProperties => ({
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

const tabChipStyle = (active: boolean): React.CSSProperties => ({
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

const previewContainerStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
    overflow: 'auto',
    padding: '28px 32px 40px',
    fontSize: 14,
    lineHeight: 1.8,
    color: '#1e293b',
    background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
};

const previewDocumentStyle: React.CSSProperties = {
    maxWidth: 860,
    margin: '0 auto',
    padding: '32px 36px 44px',
    borderRadius: 24,
    border: '1px solid rgba(148,163,184,0.16)',
    background: 'rgba(255,255,255,0.96)',
    boxShadow: '0 24px 70px rgba(15,23,42,0.08)',
};

const previewLeadStyle: React.CSSProperties = {
    margin: '0 0 24px 0',
    color: '#64748b',
    fontSize: 13,
};

const previewNavStyle: React.CSSProperties = {
    maxWidth: 860,
    margin: '0 auto 18px',
    padding: '18px 20px',
    borderRadius: 20,
    border: '1px solid rgba(148,163,184,0.14)',
    background: 'rgba(248,250,252,0.92)',
    boxShadow: '0 18px 50px rgba(15,23,42,0.05)',
};

const previewNavItemStyle = (depth: number, active = false): React.CSSProperties => ({
    appearance: 'none',
    border: 0,
    borderRadius: 10,
    background: active ? 'rgba(14,165,233,0.10)' : 'transparent',
    color: active ? '#0369a1' : '#475569',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    lineHeight: 1.5,
    textAlign: 'left',
    padding: '4px 10px',
    paddingLeft: 10 + Math.max(0, depth - 1) * 14,
});

const copyButtonStyle: React.CSSProperties = {
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

const headingAnchorStyle: React.CSSProperties = {
    marginLeft: 10,
    color: '#94a3b8',
    textDecoration: 'none',
    fontSize: '0.8em',
    fontWeight: 600,
};

type MarkdownTagProps<Tag extends keyof JSX.IntrinsicElements> = JSX.IntrinsicElements[Tag] & ExtraProps;

function mergeStyle(base: React.CSSProperties, extra?: React.CSSProperties): React.CSSProperties {
    return extra ? { ...base, ...extra } : base;
}

function extractPlainText(node: ReactNode): string {
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
        const element = node as React.ReactElement<{ children?: ReactNode }>;
        return extractPlainText(element.props.children ?? null);
    }
    return '';
}

function normalizeMarkdownText(text: string): string {
    return text
        .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
        .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
        .replace(/`([^`]+)`/g, '$1')
        .replace(/[*_~]/g, '')
        .replace(/<[^>]+>/g, '')
        .replace(/\\([\\`*_{}\[\]()#+\-.!])/g, '$1')
        .trim();
}

function slugifyHeading(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
}

function createHeadingIdFactory(prefix: string) {
    const counts = new Map<string, number>();

    return (text: string) => {
        const normalized = slugifyHeading(normalizeMarkdownText(text)) || 'section';
        const nextCount = (counts.get(normalized) ?? 0) + 1;
        counts.set(normalized, nextCount);
        const suffix = nextCount > 1 ? `-${nextCount}` : '';
        return `${prefix}-${normalized}${suffix}`;
    };
}

async function copyText(text: string) {
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

function MarkdownCodeBlockFrame({ children, copySource }: { children: ReactNode; copySource: string }) {
    const [copied, setCopied] = useState(false);

    async function handleCopy() {
        await copyText(copySource);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
    }

    return (
        <div style={{ position: 'relative', margin: '0 0 20px 0' }}>
            {copySource ? (
                <button type="button" style={copyButtonStyle} onClick={() => void handleCopy()}>
                    {copied ? '已复制' : '复制'}
                </button>
            ) : null}
            {children}
        </div>
    );
}

interface ParsedFrontmatter {
    fields: Array<{ key: string; value: string }>;
    body: string;
}

function parseFrontmatter(text: string): ParsedFrontmatter | null {
    const match = /^---[ \t]*\r?\n([\s\S]*?)\r?\n---[ \t]*(?:\r?\n|$)/.exec(text);
    if (!match) {
        return null;
    }

    const rawYaml = match[1] || '';
    const body = text.slice(match[0].length);
    const fields: Array<{ key: string; value: string }> = [];

    for (const line of rawYaml.split(/\r?\n/)) {
        const kv = /^([\w][\w.\-]*):\s*(.*)$/.exec(line.trim());
        if (kv) {
            fields.push({ key: kv[1], value: kv[2].replace(/^["']|["']$/g, '') });
        }
    }

    return { fields, body };
}


function FrontmatterBlock({ fields }: { fields: Array<{ key: string; value: string }> }) {
    if (fields.length === 0) {
        return null;
    }

    return (
        <div style={{
            margin: '0 0 20px 0',
            padding: '14px 18px',
            borderRadius: 12,
            border: '1px solid rgba(148,163,184,0.18)',
            background: 'rgba(248,250,252,0.8)',
            fontSize: 13,
            lineHeight: 1.6,
        }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
                Frontmatter
            </div>
            <div style={{ display: 'grid', gap: 4 }}>
                {fields.map(({ key, value }) => (
                    <div key={key} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 600, color: '#334155', fontFamily: monoFont, fontSize: 12 }}>{key}:</span>
                        <span style={{ color: '#475569', wordBreak: 'break-word' }}>{value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

function stripFrontmatter(markdown: string): string {
    return markdown.replace(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/, '');
}

function buildMarkdownOutline(markdown: string, prefix: string): MarkdownOutlineItem[] {
    const createId = createHeadingIdFactory(prefix);
    const items: MarkdownOutlineItem[] = [];
    let order = 0;
    const lines = markdown.split(/\r?\n/);
    let startIndex = 0;

    if (/^---[ \t]*$/.test(lines[0] ?? '')) {
        const endIndex = lines.findIndex((line, index) => index > 0 && /^---[ \t]*$/.test(line.trim()));
        if (endIndex > 0) {
            startIndex = endIndex + 1;
        }
    }

    for (let index = startIndex; index < lines.length; index += 1) {
        const line = lines[index] ?? '';
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
            lineNumber: index + 1,
            order: order++,
        });
    }

    return items;
}

function createHeadingRenderer<Tag extends 'h1' | 'h2' | 'h3' | 'h4'>(
    tag: Tag,
    baseStyle: React.CSSProperties,
    createId: (text: string) => string,
    onNavigate: (id: string) => void,
    nextOrder: () => number,
    onRegisterHeading?: (id: string, order: number, element: HTMLElement | null) => void,
) {
    return ({ children, node, style, ...props }: MarkdownTagProps<Tag>) => {
        const text = normalizeMarkdownText(extractPlainText(children));
        const id = createId(text || tag);
        const order = nextOrder();

        return React.createElement(
            tag,
            {
                ...props,
                id,
                'data-outline-order': order,
                ref: (element: HTMLElement | null) => onRegisterHeading?.(id, order, element),
                style: mergeStyle({ ...baseStyle, scrollMarginTop: 24 }, style),
            },
            <>
                {children}
                {text ? (
                    <a
                        href={`#${id}`}
                        onClick={(event) => {
                            event.preventDefault();
                            onNavigate(id);
                        }}
                        style={headingAnchorStyle}
                        aria-label={`Jump to ${text}`}
                    >
                        #
                    </a>
                ) : null}
            </>,
        );
    };
}

function hasClassName(node: ExtraProps['node'], className: string): boolean {
    const raw = node?.properties?.className;
    if (Array.isArray(raw)) {
        return raw.includes(className);
    }
    return typeof raw === 'string' ? raw.split(' ').includes(className) : false;
}

function inferCodeLanguage(className?: string): string | undefined {
    const match = /language-([\w-]+)/.exec(className || '');
    return match?.[1];
}

function normalizeAssetPath(path: string): string {
    if (!path) {
        return '';
    }
    return path.startsWith('/') ? path : `/${path}`;
}

function stripAssetBasePrefix(path: string): string {
    return path
        .replace(/^\{baseDir\}\//, '')
        .replace(/^\$\{baseDir\}\//, '')
        .replace(/^baseDir\//, '');
}

function startsFromWorkspaceRoot(path: string): boolean {
    return /^(assets|references|scripts|tests|prompts|examples|docs|config|src|proto)\//.test(path);
}

function resolveRelativeAssetPath(currentPath: string, href: string): string {
    if (!href || href.startsWith('#')) {
        return '';
    }

    const withoutHash = stripAssetBasePrefix(href.split('#')[0] || '');
    if (!withoutHash) {
        return '';
    }
    if (/^[a-z][a-z\d+.-]*:/i.test(withoutHash) || withoutHash.startsWith('//')) {
        return '';
    }
    if (withoutHash.startsWith('/')) {
        return withoutHash;
    }
    if (startsFromWorkspaceRoot(withoutHash)) {
        return `/${withoutHash}`;
    }

    const baseSegments = currentPath.split('/').filter(Boolean);
    if (!currentPath.endsWith('/')) {
        baseSegments.pop();
    }

    for (const segment of withoutHash.split('/')) {
        if (!segment || segment === '.') {
            continue;
        }
        if (segment === '..') {
            baseSegments.pop();
            continue;
        }
        baseSegments.push(segment);
    }

    return `/${baseSegments.join('/')}`;
}

function isInlineAssetReference(text: string): boolean {
    const normalized = stripAssetBasePrefix(text.trim());
    return /^(?:\.?\.?\/)?[\w.-]+(?:\/[\w.-]+)+$/.test(normalized);
}

function createMarkdownComponents(
    prefix: string,
    onNavigate: (id: string) => void,
    currentPath: string,
    onOpenMarkdownPath?: (path: string) => void,
    onRegisterHeading?: (id: string, order: number, element: HTMLElement | null) => void,
): Components {
    const createId = createHeadingIdFactory(prefix);
    let headingOrder = 0;
    const nextOrder = () => headingOrder++;

    return {
        h1: createHeadingRenderer('h1', { fontSize: 28, fontWeight: 700, margin: '0 0 16px 0', paddingBottom: 8, borderBottom: '1px solid #e2e8f0' }, createId, onNavigate, nextOrder, onRegisterHeading),
        h2: createHeadingRenderer('h2', { fontSize: 22, fontWeight: 700, margin: '24px 0 12px 0', paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }, createId, onNavigate, nextOrder, onRegisterHeading),
        h3: createHeadingRenderer('h3', { fontSize: 18, fontWeight: 600, margin: '20px 0 8px 0' }, createId, onNavigate, nextOrder, onRegisterHeading),
        h4: createHeadingRenderer('h4', { fontSize: 16, fontWeight: 600, margin: '16px 0 8px 0' }, createId, onNavigate, nextOrder, onRegisterHeading),
        p: ({ children, node, style, ...props }: MarkdownTagProps<'p'>) => (
            <p {...props} style={mergeStyle({ margin: '0 0 12px 0' }, style)}>{children}</p>
        ),
        ul: ({ children, node, style, ...props }: MarkdownTagProps<'ul'>) => (
            <ul
                {...props}
                style={mergeStyle(
                    {
                        margin: '0 0 16px 0',
                        paddingLeft: hasClassName(node, 'contains-task-list') ? 0 : 24,
                        listStyle: hasClassName(node, 'contains-task-list') ? 'none' : undefined,
                    },
                    style,
                )}
            >
                {children}
            </ul>
        ),
        ol: ({ children, node, style, ...props }: MarkdownTagProps<'ol'>) => (
            <ol {...props} style={mergeStyle({ margin: '0 0 12px 0', paddingLeft: 24 }, style)}>{children}</ol>
        ),
        li: ({ children, node, style, ...props }: MarkdownTagProps<'li'>) => (
            <li
                {...props}
                style={mergeStyle(
                    {
                        marginBottom: 8,
                        display: hasClassName(node, 'task-list-item') ? 'flex' : undefined,
                        alignItems: hasClassName(node, 'task-list-item') ? 'flex-start' : undefined,
                        gap: hasClassName(node, 'task-list-item') ? 10 : undefined,
                    },
                    style,
                )}
            >
                {children}
            </li>
        ),
        blockquote: ({ children, node, style, ...props }: MarkdownTagProps<'blockquote'>) => (
            <blockquote {...props} style={mergeStyle({ margin: '0 0 12px 0', padding: '8px 16px', borderLeft: '4px solid #cbd5e1', background: '#f8fafc', color: '#475569' }, style)}>{children}</blockquote>
        ),
        code: ({ children, node, className, style, ...props }: MarkdownTagProps<'code'>) => {
            const codeLanguage = inferCodeLanguage(className);
            const text = String(children ?? '').replace(/\n$/, '');
            if (codeLanguage) {
                return (
                    <SyntaxHighlighter
                        language={codeLanguage}
                        style={oneLight}
                        PreTag="div"
                        customStyle={{
                            margin: 0,
                            borderRadius: 18,
                            border: '1px solid rgba(148,163,184,0.14)',
                            background: '#f8fafc',
                            padding: '18px 20px',
                            fontSize: 13,
                            lineHeight: 1.65,
                        }}
                        codeTagProps={{
                            style: {
                                fontFamily: monoFont,
                            },
                        }}
                    >
                        {text}
                    </SyntaxHighlighter>
                );
            }

            const assetPath = onOpenMarkdownPath && isInlineAssetReference(text)
                ? resolveRelativeAssetPath(currentPath, text)
                : '';
            if (assetPath) {
                return (
                    <button
                        type="button"
                        onClick={() => onOpenMarkdownPath?.(assetPath)}
                        style={mergeStyle({ padding: '2px 6px', borderRadius: 6, background: '#e2e8f0', fontFamily: monoFont, fontSize: 13, border: 0, color: '#0369a1', cursor: 'pointer' }, style)}
                    >
                        {text}
                    </button>
                );
            }

            return (
                <code
                    {...props}
                    className={className}
                    style={mergeStyle({ padding: '2px 6px', borderRadius: 6, background: '#e2e8f0', fontFamily: monoFont, fontSize: 13 }, style)}
                >
                    {children}
                </code>
            );
        },
        pre: ({ children, node, style, ...props }: MarkdownTagProps<'pre'>) => (
            <MarkdownCodeBlockFrame copySource={extractPlainText(children).replace(/\n$/, '')}>
                <pre {...props} style={mergeStyle({ margin: 0, overflow: 'auto', background: 'transparent', padding: 0 }, style)}>{children}</pre>
            </MarkdownCodeBlockFrame>
        ),
        a: ({ children, node, href, style, ...props }: MarkdownTagProps<'a'>) => {
            const nextHref = href || '';
            const anchorId = nextHref.startsWith('#') ? nextHref.slice(1) : '';
            const assetPath = onOpenMarkdownPath ? resolveRelativeAssetPath(currentPath, nextHref) : '';

            if (anchorId) {
                return (
                    <a
                        {...props}
                        href={nextHref}
                        onClick={(event) => {
                            event.preventDefault();
                            onNavigate(anchorId);
                        }}
                        style={mergeStyle({ color: '#0284c7', textDecoration: 'none' }, style)}
                    >
                        {children}
                    </a>
                );
            }

            if (assetPath) {
                return (
                    <a
                        {...props}
                        href={assetPath}
                        onClick={(event) => {
                            event.preventDefault();
                            onOpenMarkdownPath?.(assetPath);
                        }}
                        style={mergeStyle({ color: '#0284c7', textDecoration: 'none' }, style)}
                    >
                        {children}
                    </a>
                );
            }

            return <a {...props} href={href} target="_blank" rel="noopener noreferrer" style={mergeStyle({ color: '#0284c7', textDecoration: 'none' }, style)}>{children}</a>;
        },
        table: ({ children, node, style, ...props }: MarkdownTagProps<'table'>) => (
            <div style={{ margin: '0 0 18px 0', overflow: 'auto', borderRadius: 18, border: '1px solid rgba(148,163,184,0.16)' }}>
                <table {...props} style={mergeStyle({ borderCollapse: 'separate', borderSpacing: 0, width: '100%', background: '#ffffff' }, style)}>{children}</table>
            </div>
        ),
        thead: ({ children, node, style, ...props }: MarkdownTagProps<'thead'>) => (
            <thead {...props} style={mergeStyle({ background: '#f8fafc' }, style)}>{children}</thead>
        ),
        tbody: ({ children, node, style, ...props }: MarkdownTagProps<'tbody'>) => (
            <tbody {...props} style={style}>{children}</tbody>
        ),
        tr: ({ children, node, style, ...props }: MarkdownTagProps<'tr'>) => (
            <tr {...props} style={mergeStyle({ background: '#ffffff' }, style)}>{children}</tr>
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
        input: ({ node, style, type, checked, ...props }: MarkdownTagProps<'input'>) => {
            if (type === 'checkbox') {
                return (
                    <input
                        {...props}
                        type="checkbox"
                        checked={checked}
                        disabled
                        readOnly
                        style={mergeStyle({ marginTop: 5, accentColor: '#0ea5e9', width: 16, height: 16, flexShrink: 0 }, style)}
                    />
                );
            }
            return <input {...props} type={type} checked={checked} style={style} />;
        },
        img: ({ node, style, alt, ...props }: MarkdownTagProps<'img'>) => (
            <img {...props} alt={alt} style={mergeStyle({ maxWidth: '100%', borderRadius: 18, border: '1px solid rgba(148,163,184,0.16)', boxShadow: '0 18px 40px rgba(15,23,42,0.08)' }, style)} />
        ),
        strong: ({ children, node, style, ...props }: MarkdownTagProps<'strong'>) => (
            <strong {...props} style={mergeStyle({ fontWeight: 600 }, style)}>{children}</strong>
        ),
    };
}

export interface AssetEditorProps {
    selectedPath: string;
    selectedEntry: AssetTreeEntry | null;
    modelPath?: string;
    language: string;
    editorTheme?: string;
    value: string;
    canEdit: boolean;
    dirty: boolean;
    saving?: boolean;
    entryRevision: number;
    openTabs?: AssetEditorTab[];
    onChange: (value: string) => void;
    onSave?: () => Promise<void> | void;
    onSelectTab?: (path: string) => void;
    onCloseTab?: (path: string) => void;
    onOpenMarkdownPath?: (path: string) => void;
    actions?: ReactNode;
    compact?: boolean;
    mode?: AssetEditorMode;
    showModeSwitch?: boolean;
    showBuiltinActions?: boolean;
}

export function AssetEditor({
    selectedPath,
    selectedEntry,
    modelPath,
    language,
    editorTheme = 'vs',
    value,
    canEdit,
    dirty,
    saving = false,
    entryRevision,
    openTabs = [],
    onChange,
    onSave,
    onSelectTab,
    onCloseTab,
    onOpenMarkdownPath,
    actions,
    compact = false,
    mode,
    showModeSwitch = true,
    showBuiltinActions = true,
}: AssetEditorProps) {
    const [internalMode, setInternalMode] = useState<EditorMode>('edit');
    const [copied, setCopied] = useState(false);
    const [outlineCollapsed, setOutlineCollapsed] = useState(false);
    const [activeOutlineId, setActiveOutlineId] = useState<string>('');
    const [previewNavigationRequest, setPreviewNavigationRequest] = useState<{ id: string; nonce: number } | null>(null);
    const editorRef = useRef<Parameters<NonNullable<OnMount>>[0] | null>(null);
    const monacoRef = useRef<Monaco | null>(null);
    const headingElementsRef = useRef<Map<string, HTMLElement>>(new Map());
    const headingElementsByOrderRef = useRef<Map<number, HTMLElement>>(new Map());
    const latestSaveRef = useRef(onSave);
    const latestCanEditRef = useRef(canEdit);
    const latestSavingRef = useRef(saving);
    const latestMarkdownRef = useRef(false);
    const previewScrollRef = useRef<HTMLDivElement | null>(null);
    const previewRootRef = useRef<HTMLDivElement | null>(null);
    const isMarkdown = language === 'markdown';
    const activeMode = mode ?? internalMode;

    const displayValue = useMemo(
        () => needsLiteralUnescape(value) ? unescapeLiteralNewlines(value) : value,
        [value],
    );

    const previewAnchorPrefix = useMemo(
        () => `preview-${slugifyHeading(selectedPath || 'markdown-preview') || 'markdown-preview'}`,
        [selectedPath],
    );

    function findActiveOutlineItemByLine(lineNumber: number): MarkdownOutlineItem | null {
        let activeItem: MarkdownOutlineItem | null = null;
        for (const item of markdownOutline) {
            if (item.lineNumber <= lineNumber) {
                activeItem = item;
                continue;
            }
            break;
        }
        return activeItem ?? markdownOutline[0] ?? null;
    }

    function getPreviewHeadingScrollTop(target: HTMLElement, container: HTMLElement): number {
        let top = target.offsetTop;
        let current = target.offsetParent;
        while (current && current instanceof HTMLElement && current !== container) {
            top += current.offsetTop;
            current = current.offsetParent;
        }
        return top;
    }

    function syncActiveOutlineFromPreview() {
        const container = previewScrollRef.current;
        if (!container || markdownOutline.length === 0) {
            setActiveOutlineId('');
            return;
        }

        const threshold = container.scrollTop + 56;
        let activeItem = markdownOutline[0] ?? null;
        for (const item of markdownOutline) {
            const target = findHeadingElement(item.id, item.order);
            if (!target) {
                continue;
            }
            const top = getPreviewHeadingScrollTop(target, container);
            if (top <= threshold) {
                activeItem = item;
                continue;
            }
            break;
        }

        setActiveOutlineId(activeItem?.id ?? '');
    }

    function syncActiveOutlineFromEditorLine(lineNumber: number) {
        const activeItem = findActiveOutlineItemByLine(lineNumber);
        setActiveOutlineId(activeItem?.id ?? '');
    }

    function registerHeadingElement(id: string, order: number, element: HTMLElement | null) {
        if (element) {
            headingElementsRef.current.set(id, element);
            headingElementsByOrderRef.current.set(order, element);
            return;
        }
        headingElementsRef.current.delete(id);
        headingElementsByOrderRef.current.delete(order);
    }

    function findHeadingElement(id: string, order?: number): HTMLElement | null {
        const root = previewRootRef.current;
        const renderedHeadings = Array.from(root?.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6') ?? []);
        const byRenderedOrder = order !== undefined ? renderedHeadings[order] ?? null : null;
        if (byRenderedOrder) {
            return byRenderedOrder;
        }

        const byDomOrder = order !== undefined
            ? root?.querySelector<HTMLElement>(`[data-outline-order="${order}"]`) ?? null
            : null;
        if (byDomOrder) {
            return byDomOrder;
        }

        const byOrder = order !== undefined ? headingElementsByOrderRef.current.get(order) ?? null : null;
        if (byOrder) {
            return byOrder;
        }

        const registered = headingElementsRef.current.get(id) ?? null;
        if (registered) {
            return registered;
        }

        return Array.from(root?.querySelectorAll<HTMLElement>('[id]') ?? []).find((element) => element.id === id) ?? null;
    }

    function scrollPreviewToHeading(item: Pick<MarkdownOutlineItem, 'id' | 'order' | 'text'>) {
        const container = previewScrollRef.current;
        const target = findHeadingElement(item.id, item.order);
        if (!container || !target) {
            return;
        }

        const containerRect = container.getBoundingClientRect();
        const targetRect = target.getBoundingClientRect();
        const nextScrollTop = Math.max(0, container.scrollTop + (targetRect.top - containerRect.top) - 24);

        target.style.transition = 'box-shadow 180ms ease, background-color 180ms ease';
        target.style.backgroundColor = 'rgba(14,165,233,0.10)';
        target.style.boxShadow = '0 0 0 3px rgba(14,165,233,0.16)';
        setActiveOutlineId(item.id);

        target.scrollIntoView({ behavior: 'smooth', block: 'start', inline: 'nearest' });
        container.scrollTo({ top: nextScrollTop, behavior: 'smooth' });

        window.setTimeout(() => {
            target.style.backgroundColor = '';
            target.style.boxShadow = '';
        }, 900);
    }

    function scrollToAnchor(id: string) {
        if (activeMode === 'preview') {
            setPreviewNavigationRequest({ id, nonce: Date.now() });
            return;
        }

        const target = findHeadingElement(id);
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function scrollEditorToLine(lineNumber: number) {
        const editor = editorRef.current;
        const monaco = monacoRef.current;
        const model = editor?.getModel();
        if (!editor || !monaco || !model) {
            return;
        }

        const safeLineNumber = Math.min(Math.max(lineNumber, 1), model.getLineCount());
        const maxColumn = model.getLineMaxColumn(safeLineNumber);
        const range = new monaco.Range(safeLineNumber, 1, safeLineNumber, maxColumn);

        editor.focus();
        editor.setSelection(range);
        editor.revealRangeInCenter(range);
    }

    function navigateToOutlineItem(item: MarkdownOutlineItem) {
        if (activeMode === 'preview') {
            setPreviewNavigationRequest({ id: item.id, nonce: Date.now() });
            return;
        }

        setActiveOutlineId(item.id);
        scrollEditorToLine(item.lineNumber);
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

    const markdownBody = useMemo(
        () => frontmatter ? frontmatter.body : displayValue,
        [frontmatter, displayValue],
    );

    const markdownOutline = useMemo(
        () => buildMarkdownOutline(displayValue, previewAnchorPrefix),
        [previewAnchorPrefix, displayValue],
    );
    const markdownComponents = useMemo(
        () => createMarkdownComponents(previewAnchorPrefix, scrollToAnchor, normalizeAssetPath(selectedPath), onOpenMarkdownPath, registerHeadingElement),
        [onOpenMarkdownPath, previewAnchorPrefix, selectedPath],
    );

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
        setOutlineCollapsed(false);
        setActiveOutlineId(markdownOutline[0]?.id ?? '');
    }, [markdownOutline, selectedPath]);

    useEffect(() => {
        if (activeMode !== 'preview' || !isMarkdown || markdownOutline.length === 0) {
            return;
        }

        const container = previewScrollRef.current;
        if (!container) {
            return;
        }

        const handleScroll = () => {
            syncActiveOutlineFromPreview();
        };

        handleScroll();
        container.addEventListener('scroll', handleScroll, { passive: true });
        return () => container.removeEventListener('scroll', handleScroll);
    }, [activeMode, isMarkdown, markdownOutline]);

    useEffect(() => {
        if (activeMode !== 'preview' || !previewNavigationRequest) {
            return;
        }

        if (typeof document !== 'undefined') {
            const active = document.activeElement;
            if (active instanceof HTMLElement) {
                active.blur();
            }
        }

        if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
            const handle = window.requestAnimationFrame(() => {
                const item = markdownOutline.find((entry) => entry.id === previewNavigationRequest.id);
                if (item) {
                    scrollPreviewToHeading(item);
                }
            });
            return () => window.cancelAnimationFrame(handle);
        }

        const item = markdownOutline.find((entry) => entry.id === previewNavigationRequest.id);
        if (item) {
            scrollPreviewToHeading(item);
        }
        return undefined;
    }, [activeMode, markdownOutline, previewNavigationRequest]);

    async function runEditorAction(actionId: string) {
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

    const handleEditorMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;
        syncActiveOutlineFromEditorLine(editor.getPosition()?.lineNumber ?? 1);
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
        editor.onDidChangeCursorPosition((event) => {
            syncActiveOutlineFromEditorLine(event.position.lineNumber);
        });
        editor.onDidScrollChange(() => {
            const visibleLineNumber = editor.getVisibleRanges()?.[0]?.startLineNumber ?? editor.getPosition()?.lineNumber ?? 1;
            syncActiveOutlineFromEditorLine(visibleLineNumber);
        });
    };

    const headerStyle: React.CSSProperties = compact
        ? { ...subHeaderStyle, padding: '10px 12px', gap: 10 }
        : subHeaderStyle;
    const tabsStyle: React.CSSProperties = compact
        ? { display: 'flex', gap: 6, overflowX: 'auto', padding: '6px 12px', borderBottom: '1px solid rgba(148,163,184,0.12)', background: 'rgba(248,250,252,0.94)' }
        : { display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 16px', borderBottom: '1px solid rgba(148,163,184,0.12)', background: 'rgba(248,250,252,0.94)' };
    const compactActionStyle = compact
        ? { ...secondaryActionStyle(), padding: '5px 9px', fontSize: 11 }
        : secondaryActionStyle();
    const saveActionStyle: React.CSSProperties = compact
        ? { ...buttonBaseStyle, padding: '6px 11px', fontSize: 12 }
        : buttonBaseStyle;
    const markdownPreviewContainerStyle: React.CSSProperties = compact
        ? { ...previewContainerStyle, padding: '16px 18px 20px' }
        : previewContainerStyle;
    const markdownPreviewNavStyle: React.CSSProperties = compact
        ? { ...previewNavStyle, margin: '0 auto 12px', padding: '12px 14px', borderRadius: 16 }
        : previewNavStyle;
    const markdownPreviewDocumentStyle: React.CSSProperties = compact
        ? { ...previewDocumentStyle, padding: '20px 22px 28px', borderRadius: 18 }
        : previewDocumentStyle;
    const markdownLeadStyle: React.CSSProperties = compact
        ? { ...previewLeadStyle, margin: '0 0 16px 0', fontSize: 12 }
        : previewLeadStyle;

    function renderOutlineNav(options?: { compactMode?: boolean; maxWidth?: string | number; margin?: string }) {
        return (
            <nav
                style={{
                    ...markdownPreviewNavStyle,
                    maxWidth: options?.maxWidth ?? markdownPreviewNavStyle.maxWidth,
                    margin: options?.margin ?? markdownPreviewNavStyle.margin,
                    padding: options?.compactMode ? '12px 14px' : markdownPreviewNavStyle.padding,
                    borderRadius: options?.compactMode ? 16 : markdownPreviewNavStyle.borderRadius,
                }}
                aria-label="Table of contents"
            >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: outlineCollapsed ? 0 : 10 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        文档目录
                    </div>
                    <button type="button" style={secondaryActionStyle(false)} onClick={() => setOutlineCollapsed((current) => !current)}>
                        {outlineCollapsed ? '展开' : '折叠'}
                    </button>
                </div>
                {!outlineCollapsed ? (
                    <div style={{ display: 'grid', gap: 2, maxHeight: options?.compactMode ? 132 : undefined, overflow: options?.compactMode ? 'auto' : undefined }}>
                        {markdownOutline.map((item) => (
                            <button
                                key={item.id}
                                type="button"
                                style={previewNavItemStyle(item.depth, item.id === activeOutlineId)}
                                onClick={() => navigateToOutlineItem(item)}
                            >
                                {item.text}
                            </button>
                        ))}
                    </div>
                ) : null}
            </nav>
        );
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            {openTabs.length > 0 ? (
                <div style={tabsStyle}>
                    {openTabs.map((tab) => (
                        <div key={tab.path} style={tabChipStyle(tab.active)}>
                            <button
                                type="button"
                                onClick={() => onSelectTab?.(tab.path)}
                                style={{ appearance: 'none', border: 0, background: 'transparent', color: 'inherit', fontSize: 12, fontWeight: 600, cursor: 'pointer', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                            >
                                {tab.label}{tab.dirty ? ' *' : ''}
                            </button>
                            {onCloseTab ? (
                                <button
                                    type="button"
                                    onClick={() => onCloseTab(tab.path)}
                                    aria-label={`Close ${tab.label}`}
                                    style={{ appearance: 'none', border: 0, background: 'transparent', color: 'inherit', fontSize: 14, lineHeight: 1, cursor: 'pointer', padding: 0, flexShrink: 0 }}
                                >
                                    ×
                                </button>
                            ) : null}
                        </div>
                    ))}
                </div>
            ) : null}
            <div style={headerStyle}>
                <div style={{ display: 'grid', gap: 3 }}>
                    <span style={{ fontWeight: 700 }}>{selectedPath || 'Select a file'}</span>
                    {selectedEntry ? (
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                            {selectedEntry.contentType || 'text/plain'} · {formatBytes(selectedEntry.sizeBytes)} · rev {entryRevision}
                        </span>
                    ) : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    {showBuiltinActions && activeMode !== 'preview' && selectedEntry?.entryKind === 'file' && selectedEntry.isTextPreviewable ? (
                        <>
                            <button type="button" style={compactActionStyle} onClick={() => void runEditorAction('actions.find')}>查找</button>
                            <button type="button" style={compactActionStyle} onClick={() => void runEditorAction('editor.action.startFindReplaceAction')}>替换</button>
                            <button type="button" style={compactActionStyle} disabled={!canEdit} onClick={() => void handleFormatRequest()}>格式化</button>
                        </>
                    ) : null}
                    {showBuiltinActions && selectedEntry?.entryKind === 'file' && selectedEntry.isTextPreviewable && displayValue ? (
                        <button type="button" style={compactActionStyle} onClick={() => void handleCopyAll()}>
                            {copied ? '已复制' : '复制'}
                        </button>
                    ) : null}
                    {isMarkdown && showModeSwitch ? (
                        <div style={{ display: 'inline-flex', gap: 2, background: 'rgba(148,163,184,0.10)', borderRadius: 10, padding: 2 }}>
                            <button type="button" style={tabStyle(activeMode === 'edit')} onClick={() => setInternalMode('edit')}>编辑</button>
                            <button type="button" style={tabStyle(activeMode === 'preview')} onClick={() => setInternalMode('preview')}>预览</button>
                            <button type="button" style={tabStyle(activeMode === 'split')} onClick={() => setInternalMode('split')}>分栏</button>
                        </div>
                    ) : null}
                    {actions}
                    {onSave ? (
                        <button type="button" style={saveActionStyle} disabled={!canEdit || saving || !dirty} onClick={() => void handleSaveRequest()}>
                            {saving ? '保存中...' : '保存'}
                        </button>
                    ) : null}
                </div>
            </div>
            {activeMode === 'preview' && isMarkdown ? (
                <div ref={previewScrollRef} style={markdownPreviewContainerStyle}>
                    {markdownOutline.length > 0 ? renderOutlineNav() : null}
                    <article style={markdownPreviewDocumentStyle}>
                        <div ref={previewRootRef}>
                            {frontmatter && frontmatter.fields.length > 0 ? (
                                <FrontmatterBlock fields={frontmatter.fields} />
                            ) : null}
                            <Markdown remarkPlugins={[remarkGfm, remarkFrontmatter]} components={markdownComponents}>
                                {markdownBody}
                            </Markdown>
                        </div>
                    </article>
                </div>
            ) : activeMode === 'split' && isMarkdown ? (
                <div style={{ display: 'grid', gridTemplateColumns: compact ? '1fr' : 'minmax(0, 1fr) minmax(0, 1fr)', flex: 1, minHeight: 0 }}>
                    <div style={{ minWidth: 0, minHeight: 0, borderRight: compact ? 'none' : '1px solid rgba(148,163,184,0.12)' }}>
                        <Editor
                            height="100%"
                            defaultLanguage="plaintext"
                            path={modelPath}
                            language={language}
                            theme={editorTheme}
                            value={displayValue}
                            onMount={handleEditorMount}
                            onChange={(next) => onChange(next ?? '')}
                            saveViewState
                            keepCurrentModel
                            options={{
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
                            }}
                        />
                    </div>
                    <div ref={previewScrollRef} style={{ ...markdownPreviewContainerStyle, borderTop: compact ? '1px solid rgba(148,163,184,0.12)' : 'none' }}>
                        {markdownOutline.length > 0 ? renderOutlineNav() : null}
                        <article style={markdownPreviewDocumentStyle}>
                            <div ref={previewRootRef}>
                                {frontmatter && frontmatter.fields.length > 0 ? (
                                    <FrontmatterBlock fields={frontmatter.fields} />
                                ) : null}
                                <Markdown remarkPlugins={[remarkGfm, remarkFrontmatter]} components={markdownComponents}>
                                    {markdownBody}
                                </Markdown>
                            </div>
                        </article>
                    </div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
                    {isMarkdown && markdownOutline.length > 0 ? (
                        renderOutlineNav({ compactMode: true, maxWidth: 'none', margin: '12px 12px 0' })
                    ) : null}
                    <div style={{ flex: 1, minHeight: 0 }}>
                        {!selectedEntry ? (
                            <EmptyMessage title="尚未选择文件" message="请先从左侧目录树选择一个文件，再进行查看或编辑。" />
                        ) : selectedEntry.entryKind !== 'file' ? (
                            <EmptyMessage title="当前为目录" message="请选择文件节点后再打开编辑区。" />
                        ) : !selectedEntry.isTextPreviewable ? (
                            <EmptyMessage title="二进制文件" message="当前资源不支持文本预览。" />
                        ) : (
                            <Editor
                                height="100%"
                                defaultLanguage="plaintext"
                                path={modelPath}
                                language={language}
                                theme={editorTheme}
                                value={displayValue}
                                onMount={handleEditorMount}
                                onChange={(next) => onChange(next ?? '')}
                                saveViewState
                                keepCurrentModel
                                options={{
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
                                }}
                            />
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
