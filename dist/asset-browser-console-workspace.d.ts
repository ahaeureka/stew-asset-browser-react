import React from 'react';
import { type AssetBrowserManagedWorkspaceProps } from './asset-browser-workspace';
import type { AssetBrowserReadonlyProps } from './asset-browser-readonly';
export type AssetBrowserConsoleWorkspaceProps = Omit<AssetBrowserManagedWorkspaceProps, 'appearance'> | Omit<AssetBrowserReadonlyProps, 'appearance'>;
export declare function AssetBrowserConsoleWorkspace(props: AssetBrowserConsoleWorkspaceProps): React.JSX.Element;
