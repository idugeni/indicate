/**
 * Opsi perintah dasbor; semua opsional agar pemanggil lama tetap kompilasi.
 */
export interface DashboardCommandOptions {
  /**
   * Muat ulang tampilan aktif setelah perintah selesai.
   *
   * @remarks Standar `false`. Satu tindakan pengguna bisa mengirim beberapa
   * perintah, jadi pemanggil wajib mengaktifkan refresh pada perintah terakhir
   * agar satu tindakan hanya memicu satu pemuatan ulang, bukan satu per perintah.
   */
  readonly refresh?: boolean | undefined;
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
