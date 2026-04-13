"use client";

import React from 'react';
import {
    AssetBrowserWorkspace,
    type AssetBrowserManagedWorkspaceProps,
} from './asset-browser-workspace';
import type { AssetBrowserReadonlyProps } from './asset-browser-readonly';

export type AssetBrowserConsoleWorkspaceProps =
    | Omit<AssetBrowserManagedWorkspaceProps, 'appearance'>
    | Omit<AssetBrowserReadonlyProps, 'appearance'>;

export function AssetBrowserConsoleWorkspace(props: AssetBrowserConsoleWorkspaceProps) {
    return <AssetBrowserWorkspace {...props} appearance="console" />;
}
