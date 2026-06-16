import './hex-viewer.css';
export interface HexViewerProps {
    hexString?: string;
    fontFamily?: string;
    showDebugPanel?: boolean;
    editable?: boolean;
    className?: string;
}
export declare const HexViewer: ({ hexString, fontFamily, showDebugPanel, editable, className, }: HexViewerProps) => import("react").JSX.Element;
