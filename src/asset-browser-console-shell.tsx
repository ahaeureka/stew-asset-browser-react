"use client";

import React, { type CSSProperties, type ReactNode } from 'react';
import { shellStyle, type AssetBrowserThemeMode, type WorkspaceTone } from './asset-browser-shared';
import './asset-browser-console.css';

interface AssetBrowserConsoleShellStatus {
    tone: WorkspaceTone;
    text: string;
}

export interface AssetBrowserConsoleShellProps {
    className?: string;
    style?: CSSProperties;
    height?: number | string;
    heading: ReactNode;
    themeStyle?: Record<string, string>;
    themeMode?: AssetBrowserThemeMode;
    kicker?: ReactNode;
    badges?: ReactNode;
    controls?: ReactNode;
    actions?: ReactNode;
    status?: AssetBrowserConsoleShellStatus | null;
    loadingOverlay?: ReactNode;
    sidebarTitle: ReactNode;
    sidebarSubtitle?: ReactNode;
    sidebarActions?: ReactNode;
    sidebarCardTitle?: ReactNode;
    sidebarCardBody?: ReactNode;
    sidebarContent: ReactNode;
    mainTitle: ReactNode;
    mainSubtitle?: ReactNode;
    viewSwitcher?: ReactNode;
    mainContent: ReactNode;
    compareNote?: ReactNode;
    footer?: ReactNode;
}

export function AssetBrowserConsoleShell({
    className,
    style,
    height = '100%',
    heading,
    themeStyle,
    themeMode,
    kicker,
    badges,
    controls,
    actions,
    status,
    loadingOverlay,
    sidebarTitle,
    sidebarSubtitle,
    sidebarActions,
    sidebarCardTitle,
    sidebarCardBody,
    sidebarContent,
    mainTitle,
    mainSubtitle,
    viewSwitcher,
    mainContent,
    compareNote,
    footer,
}: AssetBrowserConsoleShellProps) {
    return (
        <section
            className={joinClassNames('stew-asset-workspace', 'stew-asset-workspace--console', className)}
            data-stew-theme={themeMode}
            style={{
                ...shellStyle,
                ...themeStyle,
                position: 'relative',
                height,
                ...style,
            } as CSSProperties}
        >
            <div className="stew-asset-workspace__console-topbar">
                <div className="stew-asset-workspace__console-titleblock">
                    {kicker ? <div className="stew-asset-workspace__console-kicker">{kicker}</div> : null}
                    <div className="stew-asset-workspace__console-heading">{heading}</div>
                    {badges ? <div className="stew-asset-workspace__console-badges">{badges}</div> : null}
                </div>

                {controls ? <div className="stew-asset-workspace__console-controls">{controls}</div> : <div />}
                {actions ? <div className="stew-asset-workspace__console-actions">{actions}</div> : <div />}
            </div>

            {status ? (
                <div className={`stew-asset-workspace__console-status stew-asset-workspace__console-status--${status.tone}`}>
                    {status.text}
                </div>
            ) : null}

            <div className="stew-asset-workspace__console-body">
                <aside className="stew-asset-workspace__console-sidebar">
                    <div className="stew-asset-workspace__console-sidebar-header">
                        <div className="stew-asset-workspace__console-sidebar-topline">
                            <div>
                                <div className="stew-asset-workspace__console-sidebar-title">{sidebarTitle}</div>
                                {sidebarSubtitle ? <div className="stew-asset-workspace__console-sidebar-copy">{sidebarSubtitle}</div> : null}
                            </div>
                            {sidebarActions ? <div className="stew-asset-workspace__console-sidebar-actions">{sidebarActions}</div> : null}
                        </div>

                        {sidebarCardTitle || sidebarCardBody ? (
                            <div className="stew-asset-workspace__console-version-card">
                                {sidebarCardTitle ? <div className="stew-asset-workspace__console-version-card-title">{sidebarCardTitle}</div> : null}
                                {sidebarCardBody ? <div className="stew-asset-workspace__console-version-card-copy">{sidebarCardBody}</div> : null}
                            </div>
                        ) : null}
                    </div>

                    <div className="stew-asset-workspace__console-tree-region">
                        {sidebarContent}
                    </div>
                </aside>

                <div className="stew-asset-workspace__console-main">
                    <div className="stew-asset-workspace__console-main-topbar">
                        <div className="stew-asset-workspace__console-entry-meta">
                            <div className="stew-asset-workspace__console-entry-title">{mainTitle}</div>
                            {mainSubtitle ? <div className="stew-asset-workspace__console-entry-copy">{mainSubtitle}</div> : null}
                        </div>

                        {viewSwitcher ? viewSwitcher : null}
                    </div>

                    <div className="stew-asset-workspace__console-main-panel">
                        {mainContent}
                    </div>

                    {compareNote ? (
                        <div className="stew-asset-workspace__console-compare-note">
                            {compareNote}
                        </div>
                    ) : null}

                    {footer ? (
                        <div className="stew-asset-workspace__console-footer">
                            {footer}
                        </div>
                    ) : null}
                </div>
            </div>

            {loadingOverlay}
        </section>
    );
}

function joinClassNames(...values: Array<string | undefined>) {
    return values.filter(Boolean).join(' ');
}
