"use client";
import React from 'react';
import { EmptyMessage, formatBytes, subHeaderStyle } from './asset-browser-shared';
export function AssetTree({ title = 'Files', nodes, expandedPaths, selectedPath, loading = false, emptyTitle = 'No entries', emptyMessage = 'This version does not contain browsable files.', onSelect, onToggle, renderNodeMeta, renderNodeActions, }) {
    return (React.createElement("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'rgba(255,255,255,0.72)' } },
        React.createElement("div", { style: subHeaderStyle }, title),
        React.createElement("div", { style: { padding: '10px 10px 14px', overflow: 'auto', minHeight: 0, flex: 1 } }, loading ? (React.createElement(EmptyMessage, { title: "Loading assets", message: "Fetching collection, versions, and tree." })) : nodes.length === 0 ? (React.createElement(EmptyMessage, { title: emptyTitle, message: emptyMessage })) : (React.createElement("div", { style: { display: 'grid', gap: 2 } }, nodes.map((node) => (React.createElement(TreeNodeRow, { key: node.id, node: node, level: 0, expandedPaths: expandedPaths, selectedPath: selectedPath, onSelect: onSelect, onToggle: onToggle, renderNodeMeta: renderNodeMeta, renderNodeActions: renderNodeActions }))))))));
}
function TreeNodeRow({ node, level, expandedPaths, selectedPath, onSelect, onToggle, renderNodeMeta, renderNodeActions, }) {
    const expanded = expandedPaths.has(node.path);
    const selected = selectedPath === node.path;
    const nodeActions = renderNodeActions ? renderNodeActions(node) : null;
    return (React.createElement("div", null,
        React.createElement("div", { style: {
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: selected ? 'rgba(14,165,233,0.10)' : 'transparent',
                borderRadius: 12,
            } },
            React.createElement("button", { type: "button", onClick: () => {
                    if (node.isDirectory) {
                        onToggle(node.path);
                    }
                    onSelect(node.path, node.entry);
                }, style: {
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    textAlign: 'left',
                    border: 0,
                    padding: '8px 10px',
                    paddingLeft: 10 + level * 18,
                    background: 'transparent',
                    color: selected ? '#0369a1' : '#0f172a',
                    cursor: 'pointer',
                } },
                React.createElement("span", { style: { width: 16, color: '#64748b', flexShrink: 0 } }, node.isDirectory ? (expanded ? '-' : '+') : '·'),
                React.createElement("span", { style: { fontSize: 13, fontWeight: node.isDirectory ? 700 : 500, minWidth: 0 } }, node.name),
                React.createElement("span", { style: nodeMetaStyle }, renderNodeMeta
                    ? renderNodeMeta(node)
                    : node.entry?.entryKind === 'file'
                        ? formatBytes(node.entry.sizeBytes)
                        : null)),
            nodeActions ? (React.createElement("span", { onClick: (event) => event.stopPropagation(), style: { display: 'inline-flex', alignItems: 'center', gap: 6, paddingRight: 10, flexShrink: 0 } }, nodeActions)) : null),
        node.isDirectory && expanded && node.children.length > 0 ? (React.createElement("div", null, node.children.map((child) => (React.createElement(TreeNodeRow, { key: child.id, node: child, level: level + 1, expandedPaths: expandedPaths, selectedPath: selectedPath, onSelect: onSelect, onToggle: onToggle, renderNodeMeta: renderNodeMeta, renderNodeActions: renderNodeActions }))))) : null));
}
const nodeMetaStyle = {
    marginLeft: 'auto',
    minWidth: 0,
    fontSize: 11,
    color: '#64748b',
};
