const PRESERVED_ACRONYMS: ReadonlySet<string> = new Set(['LPKA']);

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (word === '') return word;
      if (PRESERVED_ACRONYMS.has(word.toUpperCase())) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function stripClassDesignation(upper: string): string {
  return upper
    .replace(/\sKELAS\s+[IVX]+(\s+[A-Z](?=\s))?/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Menyusun saran label atribusi dari nama resmi ("RUTAN KELAS II B WONOSOBO"
 * menjadi "Humas Rutan Wonosobo"); institusi non-kedinasan memakai Title Case
 * apa adanya. Cerminan SQL-nya di
 * `indicate_private.short_attribution_label`; ubah keduanya bila aturan berubah.
 *
 * @param name - Nama resmi publisher apa adanya (kapital/bebas).
 * @param type - Klasifikasi entitas dari form (`government_institution` vs lainnya).
 * @returns Saran label; string kosong bila nama kosong.
 */
export function suggestAttributionLabel(name: string, type: string): string {
  const short = toTitleCase(stripClassDesignation(name.trim().toUpperCase()));
  if (short === '') return '';
  return type === 'government_institution' ? `Humas ${short}` : short;
}
