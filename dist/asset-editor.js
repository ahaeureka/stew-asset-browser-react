"use client";
import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Editor } from '@monaco-editor/react';
import { buttonBaseStyle, EmptyMessage, formatBytes, monoFont, subHeaderStyle, } from './asset-browser-shared';
export function AssetEditor({ selectedPath, selectedEntry, language, value, canEdit, dirty, saving = false, entryRevision, onChange, onSave, actions, }) {
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }, children: [_jsxs("div", { style: subHeaderStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("span", { style: { fontWeight: 700 }, children: selectedPath || 'Select a file' }), selectedEntry ? (_jsxs("span", { style: { fontSize: 12, color: '#64748b' }, children: [selectedEntry.contentType || 'text/plain', " \u00B7 ", formatBytes(selectedEntry.sizeBytes), " \u00B7 rev ", entryRevision] })) : null] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [actions, onSave ? (_jsx("button", { type: "button", style: buttonBaseStyle, disabled: !canEdit || saving || !dirty, onClick: onSave, children: saving ? 'Saving...' : 'Save' })) : null] })] }), _jsx("div", { style: { flex: 1, minHeight: 0 }, children: !selectedEntry ? (_jsx(EmptyMessage, { title: "No file selected", message: "Choose a file from the tree to preview or edit." })) : selectedEntry.entryKind !== 'file' ? (_jsx(EmptyMessage, { title: "Directory selected", message: "Select a file node to open the editor." })) : !selectedEntry.isTextPreviewable ? (_jsx(EmptyMessage, { title: "Binary file", message: "This entry cannot be previewed as text." })) : (_jsx(Editor, { height: "100%", defaultLanguage: "plaintext", language: language, theme: "vs-light", value: value, onChange: (next) => onChange(next ?? ''), options: {
                        readOnly: !canEdit,
                        minimap: { enabled: false },
                        smoothScrolling: true,
                        fontSize: 13,
                        fontFamily: monoFont,
                        wordWrap: 'on',
                        automaticLayout: true,
                    } })) })] }));
}
