"use client";
import React from 'react';
import Tree from 'rc-tree';
import 'rc-tree/assets/index.css';
import { EmptyMessage, formatBytes, subHeaderStyle } from './asset-browser-shared';
import './asset-tree.css';
export function AssetTree({ title = 'Files', nodes, expandedPaths, selectedPath, loading = false, emptyTitle = 'No entries', emptyMessage = 'This version does not contain browsable files.', onSelect, onToggle, renderNodeMeta, renderNodeActions, compact = false, }) {
    const treeData = nodes.map(toTreeDataNode);
    const expandedKeys = Array.from(expandedPaths);
    const selectedKeys = selectedPath ? [selectedPath] : [];
    const containerStyle = compact
        ? { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'rgba(255,255,255,0.72)' }
        : { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: 'rgba(255,255,255,0.72)' };
    const headerStyle = compact
        ? { ...subHeaderStyle, padding: '6px 8px', minHeight: 0, fontSize: 11 }
        : subHeaderStyle;
    const bodyStyle = compact
        ? { padding: '4px 6px 6px', overflow: 'auto', minHeight: 0, flex: 1 }
        : { padding: '10px 10px 14px', overflow: 'auto', minHeight: 0, flex: 1 };
    return (React.createElement("div", { style: containerStyle },
        React.createElement("div", { style: headerStyle }, title),
        React.createElement("div", { style: bodyStyle }, loading ? (React.createElement(EmptyMessage, { title: "Loading assets", message: "Fetching collection, versions, and tree." })) : nodes.length === 0 ? (React.createElement(EmptyMessage, { title: emptyTitle, message: emptyMessage })) : (React.createElement(Tree, { className: "stew-asset-tree", treeData: treeData, expandedKeys: expandedKeys, selectedKeys: selectedKeys, selectable: true, showIcon: false, switcherIcon: (nodeProps) => (React.createElement("span", { className: `stew-asset-tree__switcher${nodeProps.isLeaf ? ' is-leaf' : ''}`, "aria-hidden": "true" }, nodeProps.isLeaf ? React.createElement("span", { className: "stew-asset-tree__switcher-spacer" }) : React.createElement(ChevronIcon, { expanded: Boolean(nodeProps.expanded) }))), titleRender: (dataNode) => (React.createElement(TreeRowTitle, { node: dataNode.rawNode, selected: selectedPath === dataNode.path, renderNodeMeta: renderNodeMeta, renderNodeActions: renderNodeActions })), onExpand: (nextExpandedKeys, info) => {
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
            }, onSelect: (keys, info) => {
                const selectedNode = info.node;
                const path = String((keys[0] ?? selectedNode.key) || '');
                onSelect(path, selectedNode.entry);
            } })))));
}
function TreeRowTitle({ node, selected, renderNodeMeta, renderNodeActions, }) {
    const nodeMeta = renderNodeMeta
        ? renderNodeMeta(node)
        : node.entry?.entryKind === 'file'
            ? formatBytes(node.entry.sizeBytes)
            : null;
    const nodeActions = renderNodeActions ? renderNodeActions(node) : null;
    return (React.createElement("div", { className: "stew-asset-tree__row", "data-selected": selected ? 'true' : 'false', "data-directory": node.isDirectory ? 'true' : 'false' },
        React.createElement("span", { className: "stew-asset-tree__leading" },
            React.createElement("span", { className: "stew-asset-tree__glyph", "aria-hidden": "true" }, node.isDirectory ? React.createElement(FolderIcon, null) : React.createElement(FileIcon, null)),
            React.createElement("span", { className: "stew-asset-tree__label" }, node.name)),
        nodeMeta ? React.createElement("span", { className: "stew-asset-tree__meta" }, nodeMeta) : null,
        nodeActions ? (React.createElement("span", { onClick: (event) => event.stopPropagation(), className: "stew-asset-tree__actions" }, nodeActions)) : null));
}
function toTreeDataNode(node) {
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
function ChevronIcon({ expanded }) {
    return (React.createElement("svg", { className: `stew-asset-tree__chevron${expanded ? ' is-expanded' : ''}`, viewBox: "0 0 12 12", fill: "none" },
        React.createElement("path", { d: "M4 2.75L7.5 6L4 9.25", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" })));
}
function FolderIcon() {
    return (React.createElement("svg", { className: "stew-asset-tree__svg", viewBox: "0 0 20 20", fill: "none" },
        React.createElement("path", { d: "M2.5 5.75C2.5 4.64543 3.39543 3.75 4.5 3.75H7.22508C7.78506 3.75 8.31713 3.9849 8.69583 4.39755L9.67917 5.46912C10.0579 5.88177 10.5899 6.11667 11.1499 6.11667H15.5C16.6046 6.11667 17.5 7.0121 17.5 8.11667V13.75C17.5 14.8546 16.6046 15.75 15.5 15.75H4.5C3.39543 15.75 2.5 14.8546 2.5 13.75V5.75Z", fill: "currentColor", opacity: "0.18" }),
        React.createElement("path", { d: "M2.5 6.25C2.5 5.14543 3.39543 4.25 4.5 4.25H7.22508C7.78506 4.25 8.31713 4.4849 8.69583 4.89755L9.67917 5.96912C10.0579 6.38177 10.5899 6.61667 11.1499 6.61667H15.5C16.6046 6.61667 17.5 7.5121 17.5 8.61667V13.75C17.5 14.8546 16.6046 15.75 15.5 15.75H4.5C3.39543 15.75 2.5 14.8546 2.5 13.75V6.25Z", stroke: "currentColor", strokeWidth: "1.3", strokeLinejoin: "round" })));
}
function FileIcon() {
    return (React.createElement("svg", { className: "stew-asset-tree__svg", viewBox: "0 0 20 20", fill: "none" },
        React.createElement("path", { d: "M5 3.75H10.4645C10.8623 3.75 11.2439 3.90804 11.5251 4.18934L14.8107 7.47487C15.092 7.75618 15.25 8.13768 15.25 8.53553V14.25C15.25 15.3546 14.3546 16.25 13.25 16.25H5C3.89543 16.25 3 15.3546 3 14.25V5.75C3 4.64543 3.89543 3.75 5 3.75Z", fill: "currentColor", opacity: "0.12" }),
        React.createElement("path", { d: "M10.25 3.75V7.25C10.25 7.80228 10.6977 8.25 11.25 8.25H14.75", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round", strokeLinejoin: "round" }),
        React.createElement("path", { d: "M5 3.75H10.4645C10.8623 3.75 11.2439 3.90804 11.5251 4.18934L14.8107 7.47487C15.092 7.75618 15.25 8.13768 15.25 8.53553V14.25C15.25 15.3546 14.3546 16.25 13.25 16.25H5C3.89543 16.25 3 15.3546 3 14.25V5.75C3 4.64543 3.89543 3.75 5 3.75Z", stroke: "currentColor", strokeWidth: "1.3", strokeLinejoin: "round" }),
        React.createElement("path", { d: "M6.5 11H11.75", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round" }),
        React.createElement("path", { d: "M6.5 13.25H10", stroke: "currentColor", strokeWidth: "1.3", strokeLinecap: "round" })));
}
