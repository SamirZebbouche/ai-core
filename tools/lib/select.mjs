// tools/lib/select.mjs — sélection (models/stacks/commands). PUR : pas d'argv, pas d'IO.

export const MODELS = ['anthropic', 'gemini', 'copilot'];
export const ALIAS = { claude: 'anthropic', anthropic: 'anthropic', gemini: 'gemini', copilot: 'copilot', github: 'copilot' };
export const normModel = (x) => ALIAS[String(x).toLowerCase()] || String(x).toLowerCase();

// Sélection générique additive : flagValue ("a,b" | null) > cfgValue (array | null) > toutes.
// Renvoie { selected, missing } ; l'appelant journalise `missing`.
export function pick(flagValue, cfgValue, available, norm = (x) => x) {
  let names = null;
  if (flagValue) names = flagValue.split(',').map((s) => s.trim()).filter(Boolean);
  else if (Array.isArray(cfgValue)) names = cfgValue;
  if (!names) return { selected: available.slice(), missing: [] };
  const want = new Set(names.map(norm));
  const missing = names.map(norm).filter((n) => !available.includes(n));
  return { selected: available.filter((a) => want.has(a)), missing };
}
