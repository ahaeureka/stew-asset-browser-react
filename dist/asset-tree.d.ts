import React, { type ReactNode } from 'react';
import 'rc-tree/assets/index.css';
import type { AssetTreeEntry } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import { type TreeNode } from './asset-browser-shared';
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
export declare function AssetTree({ title, nodes, expandedPaths, selectedPath, loading, emptyTitle, emptyMessage, onSelect, onToggle, renderNodeMeta, renderNodeActions, compact, }: AssetTreeProps): React.JSX.Element;
