"use client";
import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { DiffEditor } from '@monaco-editor/react';
import { EmptyMessage, monoFont, pill, subHeaderStyle, } from './asset-browser-shared';
export function AssetDiffViewer({ label, language, summary, entries, selectedPath, originalText, modifiedText, onSelectEntry, actions, }) {
    return (_jsxs("div", { style: { display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, background: '#f8fafc' }, children: [_jsxs("div", { style: subHeaderStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("span", { style: { fontWeight: 700 }, children: "Diff" }), _jsx("span", { style: { fontSize: 12, color: '#64748b' }, children: label })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [actions, summary ? (_jsxs(_Fragment, { children: [pill('Total', String(summary.totalChanges)), pill('Added', String(summary.addedCount)), pill('Modified', String(summary.modifiedCount))] })) : null] })] }), entries.length > 0 ? (_jsx("div", { style: { display: 'flex', gap: 8, overflowX: 'auto', padding: '10px 14px', borderBottom: '1px solid rgba(148,163,184,0.14)' }, children: entries.map((entry) => (_jsxs("button", { type: "button", onClick: () => onSelectEntry?.(entry.path), style: {
                        border: 0,
                        borderRadius: 999,
                        padding: '6px 10px',
                        whiteSpace: 'nowrap',
                        cursor: onSelectEntry ? 'pointer' : 'default',
                        background: entry.path === selectedPath ? 'rgba(14,165,233,0.12)' : 'rgba(148,163,184,0.12)',
                        color: entry.path === selectedPath ? '#0369a1' : '#475569',
                        fontSize: 12,
                        fontWeight: 600,
                    }, children: [entry.changeType, " \u00B7 ", entry.path] }, `${entry.changeType}:${entry.path}`))) })) : null, _jsx("div", { style: { flex: 1, minHeight: 0 }, children: originalText || modifiedText ? (_jsx(DiffEditor, { height: "100%", language: language, theme: "vs-light", original: originalText, modified: modifiedText, options: {
                        readOnly: true,
                        minimap: { enabled: false },
                        automaticLayout: true,
                        fontSize: 13,
                        fontFamily: monoFont,
                        wordWrap: 'on',
                    } })) : (_jsx(EmptyMessage, { title: "No text diff", message: entries.length > 0
                        ? 'Current file is unchanged or does not expose text diff details.'
                        : 'Choose a comparison target or a changed draft file.' })) })] }));
}
