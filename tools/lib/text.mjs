// tools/lib/text.mjs — parsing de texte/markdown. PUR (aucune IO). Testable directement.

export const stripFrontmatter = (s) => s.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
export const frontmatter = (s) => { const m = s.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/); return m ? m[1] : ''; };
export const fmField = (s, k) => { const m = frontmatter(s).match(new RegExp('^' + k + ':\\s*(.+)$', 'm')); return m ? m[1].trim().replace(/^["']|["']$/g, '') : ''; };
export const fmList = (s, k) => { const v = fmField(s, k); return v ? v.replace(/^\[|\]$/g, '').split(',').map((x) => x.trim().replace(/^["']|["']$/g, '')).filter(Boolean) : []; };
export const firstH1 = (s) => { const m = s.match(/^#\s+(.+)$/m); return m ? m[1].trim() : ''; };
// slug façon VSCode/GitHub : minuscules, espaces→-, ponctuation + balisage markdown retirés (accents gardés).
export const slugify = (h) => h.trim().toLowerCase().replace(/\s+/g, '-').replace(/[\[\]!\/'"#$%&()*+,.:;<=>?@\\^_{|}~`—·…]/g, '');
