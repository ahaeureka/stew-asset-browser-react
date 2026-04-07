"use client";
import React from 'react';
import { AssetBrowserWorkspace, } from './asset-browser-workspace';
export function AssetBrowserConsoleWorkspace(props) {
    return React.createElement(AssetBrowserWorkspace, { ...props, appearance: "console" });
}
