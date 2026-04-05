"use client";

import type { CSSProperties, ReactNode } from 'react';
import type { AssetTreeEntry } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import { EmptyMessage, formatBytes, subHeaderStyle, type TreeNode } from './asset-browser-shared';

export interface AssetTreeProps {
    title?: string;
    nodes: TreeNode[];
    expandedPaths: Set<string>;
    selectedPath: string;
    loading?: boolean;
    emptyTitle?: string;
    emptyMessage?: string;
    onSelect: (path: string, entry?: AssetTreeEntry) => void;
    onToggle: (path: string) => void;
    renderNodeMeta?: (node: TreeNode) => ReactNode;
    renderNodeActions?: (node: TreeNode) => ReactNode;
}

export function AssetTree({
    title = 'Files',
    nodes,
    expandedPaths,
    selectedPath,
    loading = false,
    emptyTitle = 'No entries',
    emptyMessage = 'This version does not contain browsable files.',
    onSelect,
    onToggle,
    renderNodeMeta,
    renderNodeActions,
}: AssetTreeProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'rgba(255,255,255,0.72)' }}>
            <div style={subHeaderStyle}>{title}</div>
            <div style={{ padding: '10px 10px 14px', overflow: 'auto', minHeight: 0, flex: 1 }}>
                {loading ? (
                    <EmptyMessage title="Loading assets" message="Fetching collection, versions, and tree." />
                ) : nodes.length === 0 ? (
                    <EmptyMessage title={emptyTitle} message={emptyMessage} />
                ) : (
                    <div style={{ display: 'grid', gap: 2 }}>
                        {nodes.map((node) => (
                            <TreeNodeRow
                                key={node.id}
                                node={node}
                                level={0}
                                expandedPaths={expandedPaths}
                                selectedPath={selectedPath}
                                onSelect={onSelect}
                                onToggle={onToggle}
                                renderNodeMeta={renderNodeMeta}
                                renderNodeActions={renderNodeActions}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function TreeNodeRow({
    node,
    level,
    expandedPaths,
    selectedPath,
    onSelect,
    onToggle,
    renderNodeMeta,
    renderNodeActions,
}: {
    node: TreeNode;
    level: number;
    expandedPaths: Set<string>;
    selectedPath: string;
    onSelect: (path: string, entry?: AssetTreeEntry) => void;
    onToggle: (path: string) => void;
    renderNodeMeta?: (node: TreeNode) => ReactNode;
    renderNodeActions?: (node: TreeNode) => ReactNode;
}) {
    const expanded = expandedPaths.has(node.path);
    const selected = selectedPath === node.path;
    return (
        <div>
            <button
                type="button"
                onClick={() => {
                    if (node.isDirectory) {
                        onToggle(node.path);
                    }
                    onSelect(node.path, node.entry);
                }}
                style={{
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
                }}
            >
                <span style={{ width: 16, color: '#64748b' }}>{node.isDirectory ? (expanded ? '-' : '+') : '·'}</span>
                <span style={{ fontSize: 13, fontWeight: node.isDirectory ? 700 : 500 }}>{node.name}</span>
                <span style={nodeMetaStyle}>
                    {renderNodeMeta
                        ? renderNodeMeta(node)
                        : node.entry?.entryKind === 'file'
                            ? formatBytes(node.entry.sizeBytes)
                            : null}
                </span>
                {renderNodeActions ? <span onClick={(event) => event.stopPropagation()}>{renderNodeActions(node)}</span> : null}
            </button>
            {node.isDirectory && expanded && node.children.length > 0 ? (
                <div>
                    {node.children.map((child) => (
                        <TreeNodeRow
                            key={child.id}
                            node={child}
                            level={level + 1}
                            expandedPaths={expandedPaths}
                            selectedPath={selectedPath}
                            onSelect={onSelect}
                            onToggle={onToggle}
                            renderNodeMeta={renderNodeMeta}
                            renderNodeActions={renderNodeActions}
                        />
                    ))}
                </div>
            ) : null}
        </div>
    );
}

const nodeMetaStyle: CSSProperties = {
    marginLeft: 'auto',
    fontSize: 11,
    color: '#64748b',
};