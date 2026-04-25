function parseNumericValue(raw: string): number | null {
  const cleaned = raw.trim().replace(',', '.').replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : null;
}

function formatFeetAndInches(totalInches: number): string | null {
  if (!Number.isFinite(totalInches) || totalInches <= 0) return null;

  const roundedInches = Math.round(totalInches);
  const feet = Math.floor(roundedInches / 12);
  const inches = roundedInches % 12;

  if (feet < 4 || feet > 8) return null;
  return `${feet}'${inches}"`;
}

/**
 * Normalize height values from mixed API formats (feet-inches, cm, meters, inches).
 */
export function formatHeightForDisplay(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;

  const value = String(raw).trim();
  if (!value) return null;

  const feetInchesMatch = value.match(/^([4-8])\s*(?:'|ft|feet|-|\s)\s*([0-9]|1[0-1])\s*(?:\"|in)?$/i);
  if (feetInchesMatch) {
    const feet = Number(feetInchesMatch[1]);
    const inches = Number(feetInchesMatch[2]);
    return `${feet}'${inches}"`;
  }

  const numeric = parseNumericValue(value);
  if (numeric === null) return null;

  // 120-260 => centimeters.
  if (numeric >= 120 && numeric <= 260) {
    return formatFeetAndInches(numeric / 2.54);
  }
  // 48-100 => inches.
  if (numeric >= 48 && numeric <= 100) {
    return formatFeetAndInches(numeric);
  }
  // 1.4-2.5 => meters.
  if (numeric >= 1.4 && numeric <= 2.5) {
    return formatFeetAndInches(numeric * 39.3701);
  }

  return null;
}

/**
 * Normalize weight values from mixed API formats (kg/lbs).
 */
export function formatWeightForDisplay(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;

  const value = String(raw).trim();
  if (!value) return null;

  const numeric = parseNumericValue(value);
  if (numeric === null || numeric <= 0) return null;

  const lowered = value.toLowerCase();
  let pounds: number | null = null;

  if (lowered.includes('kg')) {
    pounds = Math.round(numeric * 2.205);
  } else if (lowered.includes('lb')) {
    pounds = Math.round(numeric);
  } else if (numeric >= 35 && numeric <= 200) {
    // Typical kilogram range for athletes.
    pounds = Math.round(numeric * 2.205);
  } else if (numeric > 200 && numeric <= 450) {
    // Typical pounds range for athletes.
    pounds = Math.round(numeric);
  }

  if (!pounds || pounds < 70 || pounds > 450) return null;
  return `${pounds} lbs`;
}

/**
 * Compute current age from a date_of_birth string. Returns null if the
 * value is missing or unparseable.
 */
export function formatAgeFromDob(raw: unknown): string | null {
  if (raw === null || raw === undefined) return null;

  const value = String(raw).trim();
  if (!value) return null;

  const birthDate = new Date(value);
  if (Number.isNaN(birthDate.getTime())) return null;

  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const monthDiff = now.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 10 || age > 60) return null;
  return String(age);
}
