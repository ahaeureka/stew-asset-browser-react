"use client";

import React, { type ReactNode } from 'react';
import Tree from 'rc-tree';
import type { BasicDataNode } from 'rc-tree';
import 'rc-tree/assets/index.css';
import type { AssetTreeEntry } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import { EmptyMessage, formatBytes, subHeaderStyle, type TreeNode } from './asset-browser-shared';
import './asset-tree.css';

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
    compact?: boolean;
}

interface AssetTreeDataNode extends BasicDataNode {
    key: string;
    title: string;
    path: string;
    isDirectory: boolean;
    entry?: AssetTreeEntry;
    rawNode: TreeNode;
    children?: AssetTreeDataNode[];
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
    compact = false,
}: AssetTreeProps) {
    const treeData = nodes.map(toTreeDataNode);
    const expandedKeys = Array.from(expandedPaths);
    const selectedKeys = selectedPath ? [selectedPath] : [];
    const containerStyle: React.CSSProperties = compact
        ? { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'rgba(255,255,255,0.72)' }
        : { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'rgba(255,255,255,0.72)' };
    const headerStyle: React.CSSProperties = compact
        ? { ...subHeaderStyle, padding: '6px 8px', minHeight: 0, fontSize: 11 }
        : subHeaderStyle;
    const bodyStyle: React.CSSProperties = compact
        ? { padding: '4px 6px 6px', overflow: 'auto', minHeight: 0, flex: 1 }
        : { padding: '10px 10px 14px', overflow: 'auto', minHeight: 0, flex: 1 };

    return (
        <div style={containerStyle}>
            <div style={headerStyle}>{title}</div>
            <div style={bodyStyle}>
                {loading ? (
                    <EmptyMessage title="Loading assets" message="Fetching collection, versions, and tree." />
                ) : nodes.length === 0 ? (
                    <EmptyMessage title={emptyTitle} message={emptyMessage} />
                ) : (
                    <Tree<AssetTreeDataNode>
                        className="stew-asset-tree"
                        treeData={treeData}
                        expandedKeys={expandedKeys}
                        selectedKeys={selectedKeys}
                        selectable
                        showIcon={false}
                        switcherIcon={(nodeProps) => (
                            <span
                                className={`stew-asset-tree__switcher${nodeProps.isLeaf ? ' is-leaf' : ''}`}
                                aria-hidden="true"
                            >
                                {nodeProps.isLeaf ? <span className="stew-asset-tree__switcher-spacer" /> : <ChevronIcon expanded={Boolean(nodeProps.expanded)} />}
                            </span>
                        )}
                        titleRender={(dataNode) => (
                            <TreeRowTitle
                                node={dataNode.rawNode}
                                selected={selectedPath === dataNode.path}
                                renderNodeMeta={renderNodeMeta}
                                renderNodeActions={renderNodeActions}
                            />
                        )}
                        onExpand={(nextExpandedKeys, info) => {
                            const nextSet = new Set(nextExpandedKeys.map((key) => String(key)));
                            const currentSet = new Set(expandedKeys);

                            for (const key of nextSet) {
                                if (!currentSet.has(key)) {
                                    onToggle(key);
                                }
                            }

                            for (const key of currentSet) {
                                if (!nextSet.has(key)) {
                                    onToggle(key);
                                }
                            }
                        }}
                        onSelect={(keys, info) => {
                            const selectedNode = info.node as AssetTreeDataNode;
                            const path = String((keys[0] ?? selectedNode.key) || '');
                            onSelect(path, selectedNode.entry);
                        }}
                    />
                )}
            </div>
        </div>
    );
}

function TreeRowTitle({
    node,
    selected,
    renderNodeMeta,
    renderNodeActions,
}: {
    node: TreeNode;
    selected: boolean;
    renderNodeMeta?: (node: TreeNode) => ReactNode;
    renderNodeActions?: (node: TreeNode) => ReactNode;
}) {
    const nodeMeta = renderNodeMeta
        ? renderNodeMeta(node)
        : node.entry?.entryKind === 'file'
            ? formatBytes(node.entry.sizeBytes)
            : null;
    const nodeActions = renderNodeActions ? renderNodeActions(node) : null;

    return (
        <div
            className="stew-asset-tree__row"
            data-selected={selected ? 'true' : 'false'}
            data-directory={node.isDirectory ? 'true' : 'false'}
        >
            <span className="stew-asset-tree__leading">
                <span className="stew-asset-tree__glyph" aria-hidden="true">
                    {node.isDirectory ? <FolderIcon /> : <FileIcon />}
                </span>
                <span className="stew-asset-tree__label">{node.name}</span>
            </span>
            {nodeMeta ? <span className="stew-asset-tree__meta">{nodeMeta}</span> : null}
            {nodeActions ? (
                <span
                    onClick={(event) => event.stopPropagation()}
                    className="stew-asset-tree__actions"
                >
                    {nodeActions}
                </span>
            ) : null}
        </div>
    );
}

function toTreeDataNode(node: TreeNode): AssetTreeDataNode {
    return {
        key: node.path,
        title: node.name,
        path: node.path,
        isDirectory: node.isDirectory,
        entry: node.entry,
        rawNode: node,
        isLeaf: !node.isDirectory,
        children: node.children.map(toTreeDataNode),
    };
}

function ChevronIcon({ expanded }: { expanded: boolean }) {
    return (
        <svg className={`stew-asset-tree__chevron${expanded ? ' is-expanded' : ''}`} viewBox="0 0 12 12" fill="none">
            <path d="M4 2.75L7.5 6L4 9.25" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function FolderIcon() {
    return (
        <svg className="stew-asset-tree__svg" viewBox="0 0 20 20" fill="none">
            <path d="M2.5 5.75C2.5 4.64543 3.39543 3.75 4.5 3.75H7.22508C7.78506 3.75 8.31713 3.9849 8.69583 4.39755L9.67917 5.46912C10.0579 5.88177 10.5899 6.11667 11.1499 6.11667H15.5C16.6046 6.11667 17.5 7.0121 17.5 8.11667V13.75C17.5 14.8546 16.6046 15.75 15.5 15.75H4.5C3.39543 15.75 2.5 14.8546 2.5 13.75V5.75Z" fill="currentColor" opacity="0.18" />
            <path d="M2.5 6.25C2.5 5.14543 3.39543 4.25 4.5 4.25H7.22508C7.78506 4.25 8.31713 4.4849 8.69583 4.89755L9.67917 5.96912C10.0579 6.38177 10.5899 6.61667 11.1499 6.61667H15.5C16.6046 6.61667 17.5 7.5121 17.5 8.61667V13.75C17.5 14.8546 16.6046 15.75 15.5 15.75H4.5C3.39543 15.75 2.5 14.8546 2.5 13.75V6.25Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        </svg>
    );
}

function FileIcon() {
    return (
        <svg className="stew-asset-tree__svg" viewBox="0 0 20 20" fill="none">
            <path d="M5 3.75H10.4645C10.8623 3.75 11.2439 3.90804 11.5251 4.18934L14.8107 7.47487C15.092 7.75618 15.25 8.13768 15.25 8.53553V14.25C15.25 15.3546 14.3546 16.25 13.25 16.25H5C3.89543 16.25 3 15.3546 3 14.25V5.75C3 4.64543 3.89543 3.75 5 3.75Z" fill="currentColor" opacity="0.12" />
            <path d="M10.25 3.75V7.25C10.25 7.80228 10.6977 8.25 11.25 8.25H14.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M5 3.75H10.4645C10.8623 3.75 11.2439 3.90804 11.5251 4.18934L14.8107 7.47487C15.092 7.75618 15.25 8.13768 15.25 8.53553V14.25C15.25 15.3546 14.3546 16.25 13.25 16.25H5C3.89543 16.25 3 15.3546 3 14.25V5.75C3 4.64543 3.89543 3.75 5 3.75Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
            <path d="M6.5 11H11.75" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            <path d="M6.5 13.25H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
    );
}