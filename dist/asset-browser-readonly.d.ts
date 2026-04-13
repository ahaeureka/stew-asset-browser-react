import React, { type CSSProperties, type ReactNode } from 'react';
import { type AssetBrowserEditorTheme, type AssetBrowserThemeMode, type AssetBrowserThemeVars, type AssetBrowserWorkspaceAppearance, type PreviewContext, type PreviewDocument, type PreviewMode, type PreviewTreeNode } from './asset-browser-shared';
export interface AssetBrowserReadonlyProps {
    mode: 'browse-preview';
    tree: PreviewTreeNode[];
    documents?: Record<string, PreviewDocument>;
    onOpenDocument?: (path: string) => Promise<PreviewDocument>;
    initialSelectedPath?: string;
    defaultPreviewMode?: PreviewMode;
    previewModes?: PreviewMode[];
    title?: string;
    height?: number | string;
    className?: string;
    style?: CSSProperties;
    appearance?: AssetBrowserWorkspaceAppearance;
    theme?: AssetBrowserThemeMode;
    themeVars?: Partial<AssetBrowserThemeVars>;
    editorTheme?: AssetBrowserEditorTheme;
    showDecorativeBackground?: boolean;
    renderTreeNodeMeta?: (node: PreviewTreeNode) => ReactNode;
    renderPreviewToolbar?: (context: PreviewContext) => ReactNode;
    renderDocument?: (document: PreviewDocument, mode: PreviewMode, context: PreviewContext) => ReactNode;
}
export declare function AssetBrowserReadonly({ tree, documents, onOpenDocument, initialSelectedPath, defaultPreviewMode, previewModes, title, height, className, style, appearance, theme, themeVars, editorTheme, showDecorativeBackground, renderTreeNodeMeta, renderPreviewToolbar, renderDocument, }: AssetBrowserReadonlyProps): React.JSX.Element;
