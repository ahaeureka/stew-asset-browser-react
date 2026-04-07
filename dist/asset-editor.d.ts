import React, { type ReactNode } from 'react';
import type { AssetTreeEntry } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
export interface AssetEditorProps {
    selectedPath: string;
    selectedEntry: AssetTreeEntry | null;
    language: string;
    value: string;
    canEdit: boolean;
    dirty: boolean;
    saving?: boolean;
    entryRevision: number;
    onChange: (value: string) => void;
    onSave?: () => void;
    actions?: ReactNode;
}
export declare function AssetEditor({ selectedPath, selectedEntry, language, value, canEdit, dirty, saving, entryRevision, onChange, onSave, actions, }: AssetEditorProps): React.JSX.Element;
