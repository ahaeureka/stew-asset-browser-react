declare module 'react-syntax-highlighter' {
    import type { ComponentType, CSSProperties, ReactNode } from 'react';

    export interface SyntaxHighlighterProps {
        language?: string;
        style?: Record<string, CSSProperties>;
        children?: ReactNode;
        PreTag?: string | ComponentType<{ children?: ReactNode }>;
        customStyle?: CSSProperties;
        codeTagProps?: Record<string, unknown>;
        wrapLongLines?: boolean;
        showLineNumbers?: boolean;
    }

    export const Prism: ComponentType<SyntaxHighlighterProps>;
}

declare module 'react-syntax-highlighter/dist/esm/styles/prism' {
    import type { CSSProperties } from 'react';

    export const oneLight: Record<string, CSSProperties>;
}