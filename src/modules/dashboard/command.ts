/**
 * Opsi perintah dasbor; semua opsional agar pemanggil lama tetap kompilasi.
 */
export interface DashboardCommandOptions {
  /** Lewati toast dan muat ulang (untuk langkah perantara batch yang sudah punya ringkasan). */
  readonly quiet?: boolean | undefined;
}

/**
 * Dispatcher perintah dasbor ke API.
 *
 * @param action - Nama perintah (`domain.verb`).
 * @param payload - Muatan perintah.
 * @param options - Opsi eksekusi opsional.
 * @returns Hasil perintah, atau null bila organisasi berganti di tengah jalan.
 */
export type DashboardCommand = (
  action: string,
  payload: unknown,
  options?: DashboardCommandOptions | undefined,
) => Promise<unknown>;
