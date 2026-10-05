'use strict';

// ── Theme definitions ─────────────────────────────────────────────────
// Themes: only promptBg and blockquote border change.
// Code blocks and tables stay neutral. Text is always #1a1a1a.
const EXPORT_THEMES = {
    'default':  { label: 'Default',  swatch: '#f4f4f4', promptBg: '#f4f4f4', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#d0d0d0', accent: '#aaaaaa', darkPromptBg: '#2a2a2a' },
    'none':     { label: 'None',     swatch: '#ffffff', promptBg: 'transparent', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#d0d0d0', accent: '#aaaaaa', darkPromptBg: 'transparent' },
    'rose':     { label: 'Rose',     swatch: '#fce4ec', promptBg: '#fce4ec', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#f48fb1', accent: '#e91e63', darkPromptBg: '#2e1f24' },
    'lavender': { label: 'Lavender', swatch: '#f3e5f5', promptBg: '#f3e5f5', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#ce93d8', accent: '#9c27b0', darkPromptBg: '#261e30' },
    'sky':      { label: 'Sky',      swatch: '#e3f2fd', promptBg: '#e3f2fd', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#90caf9', accent: '#1976d2', darkPromptBg: '#1c2535' },
    'mint':     { label: 'Mint',     swatch: '#e0f2f1', promptBg: '#e0f2f1', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#80cbc4', accent: '#00897b', darkPromptBg: '#1c2c2b' },
    'sage':     { label: 'Sage',     swatch: '#e8f5e9', promptBg: '#e8f5e9', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#a5d6a7', accent: '#388e3c', darkPromptBg: '#1e2b20' },
    'lemon':    { label: 'Lemon',    swatch: '#fffde7', promptBg: '#fffde7', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#fff176', accent: '#f9a825', darkPromptBg: '#2a2818' },
    'peach':    { label: 'Peach',    swatch: '#fff3e0', promptBg: '#fff3e0', promptText: '#1a1a1a', codeBg: '#f4f4f4', codeHeader: '#ebebeb', tableHeader: '#f4f4f4', blockquote: '#ffcc80', accent: '#ef6c00', darkPromptBg: '#2a2218' }
};
