/**
 * Core pricing and CSV utility functions for the Autoparts ERP Inventory module.
 * Separated to ensure testability and clean domain modeling.
 */

/**
 * Calculates the retail sell price based on price cost and desired profit margin percentage.
 */
export function calculateSellPrice(cost: number, marginPercent: number): number {
  if (cost < 0 || marginPercent < 0) return 0;
  return parseFloat((cost * (1 + marginPercent / 100)).toFixed(2));
}

/**
 * Calculates the profit margin percentage based on price cost and retail sell price.
 */
export function calculateMargin(cost: number, sellPrice: number): number {
  if (cost <= 0 || sellPrice <= cost) return 0;
  return Math.round(((sellPrice - cost) / cost) * 100);
}

/**
 * Auto-detects whether comma or semicolon occurs more frequently in a given header line.
 */
export function detectCSVDelimiter(firstLine: string): "," | ";" {
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semiCount = (firstLine.match(/;/g) || []).length;
  return semiCount > commaCount ? ";" : ",";
}

/**
 * Parses a single CSV line into an array of string values, taking into account quoted text fields.
 */
export function parseCSVLine(line: string, delimiter: "," | ";"): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Evaluates the integrity constraints and returns warning details if the deletion should be blocked.
 * Returns null if the deletion is safe to proceed.
 */
export function checkDeleteIntegrity(
  type: "family" | "brand" | "auto_brand" | "auto_model" | "auto_version",
  name: string,
  dependencyCount: number
): { title: string; description: string; details: string } | null {
  if (dependencyCount <= 0) return null;

  switch (type) {
    case "family":
      return {
        title: "Acción Bloqueada: Integridad de Datos",
        description: `No se puede eliminar la familia "${name}" porque existen artículos asociados en el catálogo.`,
        details: `Hay exactamente ${dependencyCount} artículo(s) usando esta clasificación. Reasigne esos artículos a otra familia antes de eliminar esta.`
      };
    case "brand":
      return {
        title: "Acción Bloqueada: Integridad de Datos",
        description: `No se puede eliminar la marca "${name}" porque existen artículos en catálogo asociados a ella.`,
        details: `Hay exactamente ${dependencyCount} artículo(s) vinculados. Edite la marca de dichos repuestos para poder eliminar esta marca.`
      };
    case "auto_brand":
      return {
        title: "Acción Bloqueada: Dependencias del Catálogo",
        description: `No se puede eliminar la marca de auto "${name}" porque contiene modelos registrados.`,
        details: `Contiene ${dependencyCount} modelo(s) (ej. Onix, Corsa, etc.). Debe eliminar o reasignar los modelos individuales primero.`
      };
    case "auto_model":
      return {
        title: "Acción Bloqueada",
        description: `No se puede eliminar el modelo "${name}" porque tiene versiones y motorizaciones cargadas.`,
        details: `Hay ${dependencyCount} versión(es) asociada(s) (ej. 1.4 Active, 1.6 Feel). Debe eliminar las versiones primero.`
      };
    case "auto_version":
      return {
        title: "Acción Bloqueada: Compatibilidad Activa",
        description: `No se puede eliminar la motorización "${name}" porque está asignada como compatible en repuestos.`,
        details: `Hay exactamente ${dependencyCount} repuesto(s) en tu inventario que son compatibles con esta motorización. Desasocie las compatibilidades de los repuestos antes de eliminar esta versión.`
      };
    default:
      return null;
  }
}

/**
 * Normalizes a taxonomy name (brand or family) to ensure reliable matches.
 * Converts to lowercase, strips common accents, trims whitespace, and removes common corporate suffixes.
 */
export function normalizeTaxonomyName(name: string): string {
  if (!name) return "";
  
  // 1. Lowercase and trim
  let clean = name.toLowerCase().trim();
  
  // 2. Remove common accents / diacritics
  clean = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  
  // 3. Remove punctuation/special characters first so "s.a." becomes "sa"
  clean = clean.replace(/[^a-z0-9\s]/g, "");
  
  // 4. Remove clean corporate suffixes (sa, srl, ltd, ltda, limitada)
  clean = clean.replace(/\b(sa|srl|ltd|ltda|limitada)\b/g, "");
  
  // 5. Remove extra internal spaces and trim
  clean = clean.replace(/\s+/g, " ").trim();
  
  return clean;
}

/**
 * Calculates string similarity using the Levenshtein distance algorithm.
 * Returns a float between 0.0 (completely different) and 1.0 (identical strings).
 */
export function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1 || "";
  const s2 = str2 || "";
  
  if (s1 === s2) return 1.0;
  if (s1.length === 0) return 0.0;
  if (s2.length === 0) return 0.0;
  
  const track = Array(s2.length + 1).fill(null).map(() => Array(s1.length + 1).fill(null));
  
  for (let i = 0; i <= s1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= s2.length; j += 1) track[j][0] = j;
  
  for (let j = 1; j <= s2.length; j += 1) {
    for (let i = 1; i <= s1.length; i += 1) {
      const indicator = s1[i - 1] === s2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator // substitution
      );
    }
  }
  
  const distance = track[s2.length][s1.length];
  const maxLength = Math.max(s1.length, s2.length);
  
  return parseFloat((1 - distance / maxLength).toFixed(2));
}

/**
 * Resolves a raw taxonomy string against a list of existing database items using fuzzy matching.
 * Implements strict constraints: short acronyms (<= 3 chars) enforce 100% exact match to prevent false positives.
 */
export function matchTaxonomyItem(
  name: string,
  items: { id: string; nombre: string }[]
): { bestMatch: { id: string; nombre: string } | null; confidence: number } {
  if (!name || !items || items.length === 0) {
    return { bestMatch: null, confidence: 0 };
  }
  
  const targetNorm = normalizeTaxonomyName(name);
  if (!targetNorm) {
    return { bestMatch: null, confidence: 0 };
  }
  
  let bestMatch: { id: string; nombre: string } | null = null;
  let maxConfidence = 0;
  
  // Strict check: if short acronym (<= 3 chars), enforce 100% exact match on normalized strings
  const isShort = targetNorm.length <= 3;
  
  for (const item of items) {
    const itemNorm = normalizeTaxonomyName(item.nombre);
    if (!itemNorm) continue;
    
    if (isShort) {
      if (targetNorm === itemNorm) {
        return { bestMatch: item, confidence: 1.0 };
      }
    } else {
      const similarity = calculateSimilarity(targetNorm, itemNorm);
      if (similarity > maxConfidence) {
        maxConfidence = similarity;
        bestMatch = item;
      }
    }
  }
  
  // If we have a fuzzy match, check if it exceeds the standard confidence threshold (0.80)
  if (!isShort && maxConfidence >= 0.80) {
    return { bestMatch, confidence: maxConfidence };
  }
  
  return { bestMatch: null, confidence: 0 };
}


