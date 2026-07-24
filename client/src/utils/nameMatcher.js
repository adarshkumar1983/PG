/**
 * Normalizes personal and business names for robust matching in KYC/fintech settings.
 * Removes common prefixes, salutations, non-alphanumeric symbols, and redundant whitespaces.
 */
export function normalizeName(name) {
  if (!name) return '';
  return name
    .toLowerCase()
    .replace(/\b(mr|mrs|ms|dr|smt|shri|shree|late|prop|partnership|co|ltd|pvt|m\/s)\.?\b/gi, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Calculates the Jaro-Winkler similarity score (0.0 to 1.0) between two strings.
 */
export function getJaroWinklerSimilarity(s1, s2) {
  const norm1 = normalizeName(s1);
  const norm2 = normalizeName(s2);

  if (norm1 === norm2) return 1.0;

  const len1 = norm1.length;
  const len2 = norm2.length;
  if (len1 === 0 || len2 === 0) return 0.0;

  // Search window size
  const matchWindow = Math.floor(Math.max(len1, len2) / 2) - 1;
  const matches1 = new Array(len1).fill(false);
  const matches2 = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  // Find matching characters
  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchWindow);
    const end = Math.min(len2 - 1, i + matchWindow);

    for (let j = start; j <= end; j++) {
      if (matches2[j]) continue;
      if (norm1[i] === norm2[j]) {
        matches1[i] = true;
        matches2[j] = true;
        matches++;
        break;
      }
    }
  }

  if (matches === 0) return 0.0;

  // Count transpositions
  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!matches1[i]) continue;
    while (!matches2[k]) k++;
    if (norm1[i] !== norm2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3.0;

  // Winkler enhancement (accounts for common prefix matches up to 4 chars)
  let prefix = 0;
  const maxPrefix = Math.min(4, Math.min(len1, len2));
  for (let i = 0; i < maxPrefix; i++) {
    if (norm1[i] === norm2[i]) {
      prefix++;
    } else {
      break;
    }
  }

  const scalingFactor = 0.1;
  return jaro + prefix * scalingFactor * (1 - jaro);
}

/**
 * Returns a human-friendly match assessment and rating badge color.
 */
export function evaluateNameMatch(s1, s2) {
  if (!s1 || !s2) return { score: 0, text: 'No details', color: 'gray', matched: false };
  
  const score = Math.round(getJaroWinklerSimilarity(s1, s2) * 100);
  
  if (score >= 85) {
    return { score, text: 'Verified Match', color: '#10b981', matched: true };
  } else if (score >= 60) {
    return { score, text: 'Partial Match (Review Required)', color: '#f59e0b', matched: false };
  } else {
    return { score, text: 'Name Mismatch', color: '#ef4444', matched: false };
  }
}
