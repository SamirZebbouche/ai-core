// tools/lib/managed.mjs — zone managée (bloc balisé). PUR : calcule le nouveau contenu, pas d'IO.
// Le sync ne réécrit QUE ce bloc ; la zone libre de l'utilisateur est préservée.

export const MARK_START = '<!-- ai-core:start';
export const START_LINE = '<!-- ai-core:start — zone GÉNÉRÉE, ne pas éditer (édite conventions/ puis relance le sync) -->';
export const MARK_END = '<!-- ai-core:end -->';

// managedBlock(existing, body, title) → { content, warning }
//   existing : contenu actuel du fichier (string) ou null s'il n'existe pas.
//   content=null + warning  → marqueurs malformés : l'appelant doit IGNORER (ne rien écrire).
export function managedBlock(existing, body, title) {
  const block = `${START_LINE}\n${body}\n${MARK_END}`;
  if (existing == null) {
    return { content: `# ${title}\n\n<!-- Zone LIBRE : tes instructions PROJET ici. ai-core ne gère QUE le bloc ci-dessous. -->\n\n${block}\n` };
  }
  const nStart = (existing.match(/<!-- ai-core:start/g) || []).length;
  const nEnd = (existing.match(/<!-- ai-core:end -->/g) || []).length;
  if (nStart === 0 && nEnd === 0) {
    return { content: existing + (existing.endsWith('\n') ? '\n' : '\n\n') + block + '\n' }; // pas de bloc → on AJOUTE
  }
  if (nStart !== 1 || nEnd !== 1) {
    return { content: null, warning: `marqueurs malformés (${nStart} start / ${nEnd} end) — IGNORÉ` };
  }
  const s = existing.indexOf(MARK_START), e = existing.indexOf(MARK_END);
  if (e < s) return { content: null, warning: `'end' avant 'start' — IGNORÉ` };
  return { content: existing.slice(0, s) + block + existing.slice(e + MARK_END.length) };
}
