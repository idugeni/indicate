const KATA: readonly string[] = [
  '',
  'Satu',
  'Dua',
  'Tiga',
  'Empat',
  'Lima',
  'Enam',
  'Tujuh',
  'Delapan',
  'Sembilan',
];

function belowThousand(value: number): string {
  if (value < 10) return KATA[value] ?? '';
  if (value === 10) return 'Sepuluh';
  if (value === 11) return 'Sebelas';
  if (value < 20) return `${KATA[value - 10]} Belas`;
  if (value < 100) {
    const rest = value % 10;
    return `${KATA[Math.floor(value / 10)]} Puluh${rest === 0 ? '' : ` ${KATA[rest]}`}`;
  }
  if (value === 100) return 'Seratus';
  if (value < 200) return `Seratus ${belowThousand(value - 100)}`;
  const rest = value % 100;
  return `${KATA[Math.floor(value / 100)]} Ratus${rest === 0 ? '' : ` ${belowThousand(rest)}`}`;
}

function scale(value: number, divisor: number, label: string, next: (rest: number) => string): string {
  const head = Math.floor(value / divisor);
  const rest = value % divisor;
  const headWords = divisor === 1000 && head === 1 ? 'Seribu' : `${belowThousand(head)} ${label}`;
  return rest === 0 ? headWords : `${headWords} ${next(rest)}`;
}

function words(value: number): string {
  if (value < 1000) return belowThousand(value);
  if (value < 1_000_000) return scale(value, 1000, 'Ribu', words);
  if (value < 1_000_000_000) return scale(value, 1_000_000, 'Juta', words);
  if (value < 1_000_000_000_000) return scale(value, 1_000_000_000, 'Miliar', words);
  return scale(value, 1_000_000_000_000, 'Triliun', words);
}

/**
 * Spell an IDR amount in Indonesian words for invoice rendering.
 *
 * @param value - Non-negative safe integer amount in rupiah.
 * @returns Capitalized words suffixed with Rupiah, e.g. `Lima Ratus Ribu Rupiah`.
 * @throws {RangeError} When the amount is negative, fractional, or unsafe.
 * @example
 * ```ts
 * terbilangIdr(550000); // 'Lima Ratus Lima Puluh Ribu Rupiah'
 * ```
 */
export function terbilangIdr(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new RangeError('terbilangIdr expects a non-negative safe integer');
  if (value === 0) return 'Nol Rupiah';
  return `${words(value)} Rupiah`;
}
