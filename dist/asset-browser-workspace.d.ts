import React, { type CSSProperties, type ReactNode } from 'react';
import { AssetBrowserClient } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import { type AssetBrowserActionContext, type AssetBrowserEditorTheme, type AssetBrowserThemeMode, type AssetBrowserThemeVars, type AssetBrowserWorkspaceCallbacks, type AssetBrowserWorkspaceState, type TreeNode } from './asset-browser-shared';
export type AssetBrowserWorkspaceAppearance = 'default' | 'console';
export interface AssetBrowserWorkspaceProps {
    client: AssetBrowserClient;
    assetSpace: string;
    assetId: string;
    /** Business version ID to open first when the workspace is mounted. */
    initialVersionId?: string;
    initialFolder?: string;
    height?: number | string;
    title?: string;
    className?: string;
    style?: CSSProperties;
    appearance?: AssetBrowserWorkspaceAppearance;
    enableEditing?: boolean;
    defaultDraftDescription?: string;
    theme?: AssetBrowserThemeMode;
    themeVars?: Partial<AssetBrowserThemeVars>;
    editorTheme?: AssetBrowserEditorTheme;
    showDecorativeBackground?: boolean;
    callbacks?: AssetBrowserWorkspaceCallbacks;
    onError?: (error: unknown) => void;
    onStateChange?: (state: AssetBrowserWorkspaceState) => void;
    renderHeaderExtras?: (context: AssetBrowserActionContext) => ReactNode;
    renderToolbarStart?: (context: AssetBrowserActionContext) => ReactNode;
    renderToolbarEnd?: (context: AssetBrowserActionContext) => ReactNode;
    renderEditorActions?: (context: AssetBrowserActionContext) => ReactNode;
    renderDiffActions?: (context: AssetBrowserActionContext) => ReactNode;
    renderFooter?: (context: AssetBrowserActionContext) => ReactNode;
    renderTreeNodeMeta?: (node: TreeNode) => ReactNode;
    renderTreeNodeActions?: (node: TreeNode) => ReactNode;
}
export declare function AssetBrowserWorkspace({ client, assetSpace, assetId, initialVersionId, initialFolder, height, title, className, style, appearance, enableEditing, defaultDraftDescription, theme, themeVars, editorTheme, showDecorativeBackground, callbacks, onError, onStateChange, renderHeaderExtras, renderToolbarStart, renderToolbarEnd, renderEditorActions, renderDiffActions, renderFooter, renderTreeNodeMeta, renderTreeNodeActions, }: AssetBrowserWorkspaceProps): React.JSX.Element;
