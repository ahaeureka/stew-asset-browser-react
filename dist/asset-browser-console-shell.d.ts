import React, { type CSSProperties, type ReactNode } from 'react';
import { type WorkspaceTone } from './asset-browser-shared';
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
    kicker?: ReactNode;
    badges?: ReactNode;
    controls?: ReactNode;
    actions?: ReactNode;
    status?: AssetBrowserConsoleShellStatus | null;
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
export declare function AssetBrowserConsoleShell({ className, style, height, heading, kicker, badges, controls, actions, status, sidebarTitle, sidebarSubtitle, sidebarActions, sidebarCardTitle, sidebarCardBody, sidebarContent, mainTitle, mainSubtitle, viewSwitcher, mainContent, compareNote, footer, }: AssetBrowserConsoleShellProps): React.JSX.Element;
export {};
