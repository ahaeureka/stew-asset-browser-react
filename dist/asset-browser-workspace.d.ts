import React, { type CSSProperties, type ReactNode, type Ref } from 'react';
import { AssetBrowserClient } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import { type AssetBrowserActionContext, type AssetBrowserEditorTheme, type AssetBrowserWorkspaceAppearance, type AssetBrowserThemeMode, type AssetBrowserThemeVars, type AssetBrowserWorkspaceCallbacks, type AssetBrowserWorkspaceHandle, type AssetBrowserWorkspaceState, type TreeNode } from './asset-browser-shared';
import { type AssetBrowserReadonlyProps } from './asset-browser-readonly';
export interface AssetBrowserManagedWorkspaceProps {
    mode?: 'workspace';
    ref?: Ref<AssetBrowserWorkspaceHandle>;
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
    /** When true, hides draft action buttons and forces the editor into read-only mode. */
    readOnly?: boolean;
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
export type AssetBrowserWorkspaceProps = AssetBrowserManagedWorkspaceProps | AssetBrowserReadonlyProps;
export declare function AssetBrowserWorkspace(props: AssetBrowserWorkspaceProps): React.JSX.Element;
