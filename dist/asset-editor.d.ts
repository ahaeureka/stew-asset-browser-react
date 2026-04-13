import React, { type ReactNode } from 'react';
import type { AssetTreeEntry } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
type EditorMode = 'edit' | 'preview' | 'split';
export type AssetEditorMode = EditorMode;
export interface AssetEditorTab {
    path: string;
    label: string;
    active: boolean;
    dirty: boolean;
}
export interface AssetEditorProps {
    selectedPath: string;
    selectedEntry: AssetTreeEntry | null;
    modelPath?: string;
    language: string;
    editorTheme?: string;
    value: string;
    canEdit: boolean;
    dirty: boolean;
    saving?: boolean;
    entryRevision: number;
    openTabs?: AssetEditorTab[];
    onChange: (value: string) => void;
    onSave?: () => Promise<void> | void;
    onSelectTab?: (path: string) => void;
    onCloseTab?: (path: string) => void;
    onOpenMarkdownPath?: (path: string) => void;
    actions?: ReactNode;
    compact?: boolean;
    mode?: AssetEditorMode;
    showModeSwitch?: boolean;
    showBuiltinActions?: boolean;
}
export declare function AssetEditor({ selectedPath, selectedEntry, modelPath, language, editorTheme, value, canEdit, dirty, saving, entryRevision, openTabs, onChange, onSave, onSelectTab, onCloseTab, onOpenMarkdownPath, actions, compact, mode, showModeSwitch, showBuiltinActions, }: AssetEditorProps): React.JSX.Element;
export {};
