"use client";

import type { ReactNode } from 'react';
import { Editor } from '@monaco-editor/react';
import type { AssetTreeEntry } from 'protobuf-typescript-client-gen/dist/asset_browser_client';
import {
    buttonBaseStyle,
    EmptyMessage,
    formatBytes,
    monoFont,
    subHeaderStyle,
} from './asset-browser-shared';

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

export function AssetEditor({
    selectedPath,
    selectedEntry,
    language,
    value,
    canEdit,
    dirty,
    saving = false,
    entryRevision,
    onChange,
    onSave,
    actions,
}: AssetEditorProps) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
            <div style={subHeaderStyle}>
                <div style={{ display: 'grid', gap: 3 }}>
                    <span style={{ fontWeight: 700 }}>{selectedPath || 'Select a file'}</span>
                    {selectedEntry ? (
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                            {selectedEntry.contentType || 'text/plain'} · {formatBytes(selectedEntry.sizeBytes)} · rev {entryRevision}
                        </span>
                    ) : null}
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {actions}
                    {onSave ? (
                        <button type="button" style={buttonBaseStyle} disabled={!canEdit || saving || !dirty} onClick={onSave}>
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    ) : null}
                </div>
            </div>
            <div style={{ flex: 1, minHeight: 0 }}>
                {!selectedEntry ? (
                    <EmptyMessage title="No file selected" message="Choose a file from the tree to preview or edit." />
                ) : selectedEntry.entryKind !== 'file' ? (
                    <EmptyMessage title="Directory selected" message="Select a file node to open the editor." />
                ) : !selectedEntry.isTextPreviewable ? (
                    <EmptyMessage title="Binary file" message="This entry cannot be previewed as text." />
                ) : (
                    <Editor
                        height="100%"
                        defaultLanguage="plaintext"
                        language={language}
                        theme="vs-light"
                        value={value}
                        onChange={(next) => onChange(next ?? '')}
                        options={{
                            readOnly: !canEdit,
                            minimap: { enabled: false },
                            smoothScrolling: true,
                            fontSize: 13,
                            fontFamily: monoFont,
                            wordWrap: 'on',
                            automaticLayout: true,
                        }}
                    />
                )}
            </div>
        </div>
    );
}