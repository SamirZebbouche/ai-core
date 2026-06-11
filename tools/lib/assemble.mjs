// tools/lib/assemble.mjs — assemblage du corps (conventions + commandes). PUR : prend des contenus, rend une string.

import { stripFrontmatter, firstH1, slugify } from './text.mjs';

// Conventions inline + lisibilité : sommaire navigable + provenance. parts = [{ name, content }].
export function assembleConventions(parts) {
  const p = parts.map(({ name, content }) => { const c = stripFrontmatter(content).trim(); return { name, title: firstH1(c) || name, c }; });
  const toc = p.map((x) => `- [${x.title}](#${slugify(x.title)})`).join('\n');
  const sections = p.map((x) => `<!-- ───── ${x.name} ───── -->\n${x.c}`).join('\n\n');
  return `## Sommaire (généré — ne pas éditer)\n${toc}\n\n${sections}`;
}

// Commande multi-techno : squelette command.md + fragments des stacks sélectionnées (additif),
// injectés à {{stacks}} (sinon ajoutés à la fin). commandRaw + fragments = contenus bruts.
export function assembleCommandBody(commandRaw, fragments) {
  const skeleton = stripFrontmatter(commandRaw).trim();
  const fragText = fragments.map((f) => stripFrontmatter(f).trim()).join('\n\n');
  return skeleton.includes('{{stacks}}') ? skeleton.replace('{{stacks}}', fragText) : (fragText ? `${skeleton}\n\n${fragText}` : skeleton);
}
