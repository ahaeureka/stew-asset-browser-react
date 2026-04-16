"use client";
import React from 'react';
import { shellStyle } from './asset-browser-shared';
import './asset-browser-console.css';
export function AssetBrowserConsoleShell({ className, style, height = '100%', heading, themeStyle, themeMode, kicker, badges, controls, actions, status, loadingOverlay, sidebarTitle, sidebarSubtitle, sidebarActions, sidebarCardTitle, sidebarCardBody, sidebarContent, mainTitle, mainSubtitle, viewSwitcher, mainContent, compareNote, footer, }) {
    return (React.createElement("section", { className: joinClassNames('stew-asset-workspace', 'stew-asset-workspace--console', className), "data-stew-theme": themeMode, style: {
            ...shellStyle,
            ...themeStyle,
            position: 'relative',
            height,
            ...style,
        } },
        React.createElement("div", { className: "stew-asset-workspace__console-topbar" },
            React.createElement("div", { className: "stew-asset-workspace__console-titleblock" },
                kicker ? React.createElement("div", { className: "stew-asset-workspace__console-kicker" }, kicker) : null,
                React.createElement("div", { className: "stew-asset-workspace__console-heading" }, heading),
                badges ? React.createElement("div", { className: "stew-asset-workspace__console-badges" }, badges) : null),
            controls ? React.createElement("div", { className: "stew-asset-workspace__console-controls" }, controls) : React.createElement("div", null),
            actions ? React.createElement("div", { className: "stew-asset-workspace__console-actions" }, actions) : React.createElement("div", null)),
        status ? (React.createElement("div", { className: `stew-asset-workspace__console-status stew-asset-workspace__console-status--${status.tone}` }, status.text)) : null,
        React.createElement("div", { className: "stew-asset-workspace__console-body" },
            React.createElement("aside", { className: "stew-asset-workspace__console-sidebar" },
                React.createElement("div", { className: "stew-asset-workspace__console-sidebar-header" },
                    React.createElement("div", { className: "stew-asset-workspace__console-sidebar-topline" },
                        React.createElement("div", null,
                            React.createElement("div", { className: "stew-asset-workspace__console-sidebar-title" }, sidebarTitle),
                            sidebarSubtitle ? React.createElement("div", { className: "stew-asset-workspace__console-sidebar-copy" }, sidebarSubtitle) : null),
                        sidebarActions ? React.createElement("div", { className: "stew-asset-workspace__console-sidebar-actions" }, sidebarActions) : null),
                    sidebarCardTitle || sidebarCardBody ? (React.createElement("div", { className: "stew-asset-workspace__console-version-card" },
                        sidebarCardTitle ? React.createElement("div", { className: "stew-asset-workspace__console-version-card-title" }, sidebarCardTitle) : null,
                        sidebarCardBody ? React.createElement("div", { className: "stew-asset-workspace__console-version-card-copy" }, sidebarCardBody) : null)) : null),
                React.createElement("div", { className: "stew-asset-workspace__console-tree-region" }, sidebarContent)),
            React.createElement("div", { className: "stew-asset-workspace__console-main" },
                React.createElement("div", { className: "stew-asset-workspace__console-main-topbar" },
                    React.createElement("div", { className: "stew-asset-workspace__console-entry-meta" },
                        React.createElement("div", { className: "stew-asset-workspace__console-entry-title" }, mainTitle),
                        mainSubtitle ? React.createElement("div", { className: "stew-asset-workspace__console-entry-copy" }, mainSubtitle) : null),
                    viewSwitcher ? viewSwitcher : null),
                React.createElement("div", { className: "stew-asset-workspace__console-main-panel" }, mainContent),
                compareNote ? (React.createElement("div", { className: "stew-asset-workspace__console-compare-note" }, compareNote)) : null,
                footer ? (React.createElement("div", { className: "stew-asset-workspace__console-footer" }, footer)) : null)),
        loadingOverlay));
}
function joinClassNames(...values) {
    return values.filter(Boolean).join(' ');
}
