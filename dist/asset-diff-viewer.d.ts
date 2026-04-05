import type { ReactNode } from 'react';
import type { AssetDiffEntry, AssetDiffSummary } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
export interface AssetDiffViewerProps {
    label: string;
    language: string;
    summary: AssetDiffSummary | null;
    entries: AssetDiffEntry[];
    selectedPath: string;
    originalText: string;
    modifiedText: string;
    onSelectEntry?: (path: string) => void;
    actions?: ReactNode;
}
export declare function AssetDiffViewer({ label, language, summary, entries, selectedPath, originalText, modifiedText, onSelectEntry, actions, }: AssetDiffViewerProps): import("react/jsx-runtime").JSX.Element;
