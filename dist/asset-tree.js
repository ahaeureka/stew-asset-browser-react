"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { EmptyMessage, formatBytes, subHeaderStyle } from './asset-browser-shared';
export function AssetTree({ title = 'Files', nodes, expandedPaths, selectedPath, loading = false, emptyTitle = 'No entries', emptyMessage = 'This version does not contain browsable files.', onSelect, onToggle, renderNodeMeta, renderNodeActions, }) {
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'rgba(255,255,255,0.72)' }, children: [_jsx("div", { style: subHeaderStyle, children: title }), _jsx("div", { style: { padding: '10px 10px 14px', overflow: 'auto', minHeight: 0, flex: 1 }, children: loading ? (_jsx(EmptyMessage, { title: "Loading assets", message: "Fetching collection, versions, and tree." })) : nodes.length === 0 ? (_jsx(EmptyMessage, { title: emptyTitle, message: emptyMessage })) : (_jsx("div", { style: { display: 'grid', gap: 2 }, children: nodes.map((node) => (_jsx(TreeNodeRow, { node: node, level: 0, expandedPaths: expandedPaths, selectedPath: selectedPath, onSelect: onSelect, onToggle: onToggle, renderNodeMeta: renderNodeMeta, renderNodeActions: renderNodeActions }, node.id))) })) })] }));
}
function TreeNodeRow({ node, level, expandedPaths, selectedPath, onSelect, onToggle, renderNodeMeta, renderNodeActions, }) {
    const expanded = expandedPaths.has(node.path);
    const selected = selectedPath === node.path;
    return (_jsxs("div", { children: [_jsxs("button", { type: "button", onClick: () => {
                    if (node.isDirectory) {
                        onToggle(node.path);
                    }
                    onSelect(node.path, node.entry);
                }, style: {
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textAlign: 'left',
                    border: 0,
                    padding: '8px 10px',
                    paddingLeft: 10 + level * 18,
                    background: selected ? 'rgba(14,165,233,0.10)' : 'transparent',
                    color: selected ? '#0369a1' : '#0f172a',
                    borderRadius: 12,
                    cursor: 'pointer',
                }, children: [_jsx("span", { style: { width: 16, color: '#64748b' }, children: node.isDirectory ? (expanded ? '-' : '+') : '·' }), _jsx("span", { style: { fontSize: 13, fontWeight: node.isDirectory ? 700 : 500 }, children: node.name }), _jsx("span", { style: nodeMetaStyle, children: renderNodeMeta
                            ? renderNodeMeta(node)
                            : node.entry?.entryKind === 'file'
                                ? formatBytes(node.entry.sizeBytes)
                                : null }), renderNodeActions ? _jsx("span", { onClick: (event) => event.stopPropagation(), children: renderNodeActions(node) }) : null] }), node.isDirectory && expanded && node.children.length > 0 ? (_jsx("div", { children: node.children.map((child) => (_jsx(TreeNodeRow, { node: child, level: level + 1, expandedPaths: expandedPaths, selectedPath: selectedPath, onSelect: onSelect, onToggle: onToggle, renderNodeMeta: renderNodeMeta, renderNodeActions: renderNodeActions }, child.id))) })) : null] }));
}
const nodeMetaStyle = {
    marginLeft: 'auto',
    fontSize: 11,
    color: '#64748b',
};
