"use client";
import React from 'react';
export const LIGHT_THEME_VARS = {
    '--stew-ab-bg': '#fcfcfd',
    '--stew-ab-fg': '#0f172a',
    '--stew-ab-muted-fg': '#64748b',
    '--stew-ab-border': 'rgba(148, 163, 184, 0.16)',
    '--stew-ab-surface': '#ffffff',
    '--stew-ab-surface-muted': '#f8fafc',
    '--stew-ab-surface-elevated': '#ffffff',
    '--stew-ab-sidebar-bg': '#f8fafc',
    '--stew-ab-topbar-bg': '#ffffff',
    '--stew-ab-footer-bg': '#f8fafc',
    '--stew-ab-accent': '#0ea5e9',
    '--stew-ab-accent-soft': 'rgba(14, 165, 233, 0.12)',
    '--stew-ab-accent-contrast': '#ffffff',
    '--stew-ab-selected-bg': 'rgba(14, 165, 233, 0.12)',
    '--stew-ab-shadow': '0 18px 50px rgba(15, 23, 42, 0.08)',
    '--stew-ab-decoration-a': 'rgba(15, 118, 110, 0.08)',
    '--stew-ab-decoration-b': 'rgba(14, 165, 233, 0.08)',
};
export const DARK_THEME_VARS = {
    '--stew-ab-bg': '#0f172a',
    '--stew-ab-fg': '#e2e8f0',
    '--stew-ab-muted-fg': '#94a3b8',
    '--stew-ab-border': 'rgba(148, 163, 184, 0.12)',
    '--stew-ab-surface': '#1e293b',
    '--stew-ab-surface-muted': '#1e293b',
    '--stew-ab-surface-elevated': '#334155',
    '--stew-ab-sidebar-bg': '#1e293b',
    '--stew-ab-topbar-bg': '#1e293b',
    '--stew-ab-footer-bg': '#1e293b',
    '--stew-ab-accent': '#38bdf8',
    '--stew-ab-accent-soft': 'rgba(56, 189, 248, 0.14)',
    '--stew-ab-accent-contrast': '#0f172a',
    '--stew-ab-selected-bg': 'rgba(56, 189, 248, 0.14)',
    '--stew-ab-shadow': '0 18px 50px rgba(0, 0, 0, 0.32)',
    '--stew-ab-decoration-a': 'rgba(45, 212, 191, 0.10)',
    '--stew-ab-decoration-b': 'rgba(56, 189, 248, 0.10)',
};
export function resolveThemeVars(theme = 'light', themeVars, showDecorativeBackground = true) {
    const base = theme === 'dark' ? { ...DARK_THEME_VARS } :
        theme === 'inherit' ? { ...LIGHT_THEME_VARS } :
            { ...LIGHT_THEME_VARS };
    const merged = { ...base, ...themeVars };
    if (!showDecorativeBackground) {
        merged['--stew-ab-decoration-a'] = 'transparent';
        merged['--stew-ab-decoration-b'] = 'transparent';
    }
    return merged;
}
export function resolveEditorTheme(theme = 'light', editorTheme) {
    if (editorTheme) {
        return editorTheme;
    }
    return theme === 'dark' ? 'vs-dark' : 'vs';
}
export const shellStyle = {
    border: '1px solid var(--stew-ab-border, rgba(15, 23, 42, 0.12))',
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: 'var(--stew-ab-bg, #fcfcfd)',
    boxShadow: 'var(--stew-ab-shadow, 0 18px 50px rgba(15, 23, 42, 0.08))',
    color: 'var(--stew-ab-fg, #0f172a)',
};
export const panelHandleStyle = {
    width: 8,
    background: 'linear-gradient(180deg, rgba(148,163,184,0.15), rgba(148,163,184,0.35))',
};
export const sectionStyle = {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    minHeight: 0,
};
export const cardHeaderStyle = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '16px 18px',
    borderBottom: '1px solid var(--stew-ab-border, rgba(148, 163, 184, 0.18))',
    background: 'var(--stew-ab-topbar-bg, rgba(255,255,255,0.84))',
    backdropFilter: 'blur(10px)',
};
export const toolbarStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    padding: '14px 18px',
    borderBottom: '1px solid var(--stew-ab-border, rgba(148, 163, 184, 0.14))',
    background: 'var(--stew-ab-surface-muted, rgba(248,250,252,0.96))',
};
export const buttonBaseStyle = {
    appearance: 'none',
    borderRadius: 999,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid var(--stew-ab-border, rgba(148,163,184,0.24))',
    background: 'var(--stew-ab-surface, #ffffff)',
    color: 'var(--stew-ab-fg, #0f172a)',
};
export const primaryButtonStyle = {
    ...buttonBaseStyle,
    borderColor: 'var(--stew-ab-accent-soft, rgba(14,165,233,0.28))',
    background: 'linear-gradient(135deg, var(--stew-ab-accent, #0ea5e9), #2563eb)',
    color: 'var(--stew-ab-accent-contrast, #ffffff)',
};
export const subHeaderStyle = {
    padding: '14px 16px',
    borderBottom: '1px solid var(--stew-ab-border, rgba(148,163,184,0.14))',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: 'var(--stew-ab-surface, rgba(255,255,255,0.72))',
};
export const selectStyle = {
    borderRadius: 12,
    border: '1px solid var(--stew-ab-border, rgba(148,163,184,0.24))',
    background: 'var(--stew-ab-surface, #ffffff)',
    color: 'var(--stew-ab-fg, #0f172a)',
    padding: '10px 12px',
    fontSize: 13,
    minWidth: 0,
};
export const monoFont = 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, Liberation Mono, monospace';
export function toneStyle(tone) {
    if (tone === 'success') {
        return { color: '#166534', background: 'rgba(22,101,52,0.08)' };
    }
    if (tone === 'warning') {
        return { color: '#9a6700', background: 'rgba(202,138,4,0.12)' };
    }
    if (tone === 'error') {
        return { color: '#b42318', background: 'rgba(180,35,24,0.08)' };
    }
    return { color: 'var(--stew-ab-muted-fg, #334155)', background: 'rgba(148,163,184,0.10)' };
}
export function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) {
        return '0 B';
    }
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = bytes;
    let index = 0;
    while (value >= 1024 && index < units.length - 1) {
        value /= 1024;
        index += 1;
    }
    return `${value.toFixed(value >= 10 || index === 0 ? 0 : 1)} ${units[index]}`;
}
export function needsLiteralUnescape(text) {
    const escapedNewlines = (text.match(/\\n/g) ?? []).length;
    const octalSequences = (text.match(/\\[0-3][0-7]{2}/g) ?? []).length;
    const escapedQuotes = (text.match(/\\["']/g) ?? []).length;
    if (escapedNewlines === 0 && octalSequences === 0 && escapedQuotes === 0) {
        return false;
    }
    const realNewlines = (text.match(/\n/g) ?? []).length;
    return (escapedNewlines > 2 && realNewlines < escapedNewlines)
        || octalSequences > 2
        || escapedQuotes > 2;
}
function decodeOctalEscapes(text) {
    return text.replace(/(?:\\[0-3][0-7]{2})+/g, (seq) => {
        const bytes = [];
        for (const m of seq.matchAll(/\\([0-3][0-7]{2})/g)) {
            bytes.push(parseInt(m[1], 8));
        }
        try {
            return new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(bytes));
        }
        catch {
            return seq;
        }
    });
}
export function unescapeLiteralNewlines(text) {
    return decodeOctalEscapes(text)
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\"/g, '"')
        .replace(/\\'/g, "'")
        .replace(/\\\\/g, '\\');
}
export function languageFor(entry, hint) {
    const value = (hint || entry?.languageHint || entry?.contentType || '').toLowerCase();
    const pathValue = (entry?.path || '').toLowerCase();
    if (value.includes('typescript'))
        return 'typescript';
    if (value.includes('javascript'))
        return 'javascript';
    if (value.includes('json'))
        return 'json';
    if (value.includes('yaml') || value.includes('yml'))
        return 'yaml';
    if (value.includes('toml'))
        return 'toml';
    if (/\.(md|markdown|mdown|mkd|mkdn|mdx)$/.test(pathValue))
        return 'markdown';
    if (value.includes('markdown'))
        return 'markdown';
    if (value.includes('html'))
        return 'html';
    if (value.includes('css'))
        return 'css';
    if (value.includes('rust'))
        return 'rust';
    if (value.includes('python'))
        return 'python';
    if (value.includes('shell'))
        return 'shell';
    if (value.includes('xml'))
        return 'xml';
    if (value.includes('sql'))
        return 'sql';
    return 'plaintext';
}
export function buildTree(entries) {
    const root = {
        id: '/',
        name: '/',
        path: '/',
        children: [],
        isDirectory: true,
    };
    const nodeMap = new Map([['/', root]]);
    const sorted = [...entries].sort((left, right) => {
        if (left.entryKind !== right.entryKind) {
            return left.entryKind === 'directory' ? -1 : 1;
        }
        return left.path.localeCompare(right.path);
    });
    for (const entry of sorted) {
        const segments = entry.path.split('/').filter(Boolean);
        let currentPath = '';
        let parent = root;
        for (let index = 0; index < segments.length; index += 1) {
            const segment = segments[index] ?? '';
            currentPath += `/${segment}`;
            const isLeaf = index === segments.length - 1;
            const existing = nodeMap.get(currentPath);
            if (existing) {
                parent = existing;
                if (isLeaf) {
                    existing.entry = entry;
                    existing.isDirectory = entry.entryKind === 'directory';
                }
                continue;
            }
            const node = {
                id: currentPath,
                name: segment,
                path: currentPath,
                entry: isLeaf ? entry : undefined,
                children: [],
                isDirectory: isLeaf ? entry.entryKind === 'directory' : true,
            };
            parent.children.push(node);
            nodeMap.set(currentPath, node);
            parent = node;
        }
    }
    return root.children;
}
export function collectInitialExpanded(nodes) {
    const expanded = new Set(['/']);
    for (const node of nodes) {
        if (node.isDirectory) {
            expanded.add(node.path);
        }
        if (node.children.length > 0) {
            for (const child of collectInitialExpanded(node.children)) {
                expanded.add(child);
            }
        }
    }
    return expanded;
}
export function pill(label, value) {
    return (React.createElement("span", { key: `${label}:${value}`, style: {
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            borderRadius: 999,
            padding: '6px 10px',
            background: 'rgba(148,163,184,0.10)',
            color: 'var(--stew-ab-fg, #334155)',
            fontSize: 12,
            fontWeight: 600,
        } },
        React.createElement("span", { style: { color: 'var(--stew-ab-muted-fg, #64748b)' } }, label),
        React.createElement("span", null, value)));
}
export function EmptyMessage({ title, message }) {
    return (React.createElement("div", { style: { height: '100%', display: 'grid', placeItems: 'center', padding: 24 } },
        React.createElement("div", { style: { maxWidth: 320, textAlign: 'center', display: 'grid', gap: 8 } },
            React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: 'var(--stew-ab-fg, #0f172a)' } }, title),
            React.createElement("div", { style: { fontSize: 13, lineHeight: 1.6, color: 'var(--stew-ab-muted-fg, #64748b)' } }, message))));
}
