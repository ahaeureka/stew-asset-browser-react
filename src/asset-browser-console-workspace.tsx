"use client";

import React from 'react';
import {
    AssetBrowserWorkspace,
    type AssetBrowserWorkspaceProps,
} from './asset-browser-workspace';

export type AssetBrowserConsoleWorkspaceProps = Omit<AssetBrowserWorkspaceProps, 'appearance'>;

export function AssetBrowserConsoleWorkspace(props: AssetBrowserConsoleWorkspaceProps) {
    return <AssetBrowserWorkspace {...props} appearance="console" />;
}
