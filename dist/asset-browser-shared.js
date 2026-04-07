"use client";
import React from 'react';
export const shellStyle = {
    border: '1px solid rgba(15, 23, 42, 0.12)',
    borderRadius: 20,
    overflow: 'hidden',
    background: 'linear-gradient(180deg, #fcfcfd 0%, #f8fafc 100%)',
    boxShadow: '0 18px 50px rgba(15, 23, 42, 0.08)',
    color: '#0f172a',
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
    borderBottom: '1px solid rgba(148, 163, 184, 0.18)',
    background: 'rgba(255,255,255,0.84)',
    backdropFilter: 'blur(10px)',
};
export const toolbarStyle = {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 10,
    padding: '14px 18px',
    borderBottom: '1px solid rgba(148, 163, 184, 0.14)',
    background: 'rgba(248,250,252,0.96)',
};
export const buttonBaseStyle = {
    appearance: 'none',
    borderRadius: 999,
    padding: '8px 14px',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid rgba(148,163,184,0.24)',
    background: '#ffffff',
    color: '#0f172a',
};
export const primaryButtonStyle = {
    ...buttonBaseStyle,
    borderColor: 'rgba(14,165,233,0.28)',
    background: 'linear-gradient(135deg, #0ea5e9, #2563eb)',
    color: '#ffffff',
};
export const subHeaderStyle = {
    padding: '14px 16px',
    borderBottom: '1px solid rgba(148,163,184,0.14)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    background: 'rgba(255,255,255,0.72)',
};
export const selectStyle = {
    borderRadius: 12,
    border: '1px solid rgba(148,163,184,0.24)',
    background: '#ffffff',
    color: '#0f172a',
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
    return { color: '#334155', background: 'rgba(148,163,184,0.10)' };
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
            color: '#334155',
            fontSize: 12,
            fontWeight: 600,
        } },
        React.createElement("span", { style: { color: '#64748b' } }, label),
        React.createElement("span", null, value)));
}
export function EmptyMessage({ title, message }) {
    return (React.createElement("div", { style: { height: '100%', display: 'grid', placeItems: 'center', padding: 24 } },
        React.createElement("div", { style: { maxWidth: 320, textAlign: 'center', display: 'grid', gap: 8 } },
            React.createElement("div", { style: { fontSize: 16, fontWeight: 700, color: '#0f172a' } }, title),
            React.createElement("div", { style: { fontSize: 13, lineHeight: 1.6, color: '#64748b' } }, message))));
}
