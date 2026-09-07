import { EyeOff, Globe, KeyRound, Lock, ScrollText, ShieldCheck } from 'lucide-react';
import { FeatureGrid, Section, withIcons } from '@/modules/site/components/layout/content';

/** Security band: every claim below is sourced from existing product copy (terms, capabilities, proof points). */
const SECURITY_ITEMS = withIcons(
  [
    {
      title: 'Host tepat, tanpa fallback',
      description:
        'Situs publik ditentukan dari nama host yang sama persis secara eksak, tanpa fallback tenant.',
    },
    {
      title: 'Isolasi berlapis per organisasi',
      description:
        'Setiap data terikat pada satu organisasi. Pemisahan ditegakkan berlapis, dari aturan aplikasi hingga kebijakan keamanan baris pada basis data.',
    },
    {
      title: 'Media privat bertanda tangan',
      description:
        'Gambar disimpan pada penyimpanan privat dan hanya dibuka lewat tautan bertanda tangan berumur pendek. Tidak ada folder publik yang bisa diintip orang.',
    },
    {
      title: 'Jejak audit hanya-tambah',
      description:
        'Setiap perubahan sensitif tercatat pada jejak audit yang tidak dapat dihapus oleh aplikasi.',
    },
    {
      title: 'Kontrol akses redaksi',
      description:
        'Akses anggota dapat dicabut sewaktu-waktu oleh pengurus organisasi; akun yang disalahgunakan dapat dibekukan setelah pemberitahuan.',
    },
    {
      title: 'Tanpa pelacak iklan',
      description:
        'Halaman publik tidak meminta data pribadi pembaca dan tidak memasang pelacak iklan.',
    },
  ],
  [Globe, ShieldCheck, Lock, ScrollText, KeyRound, EyeOff],
);

export function SecuritySection() {
  return (
    <Section
      title="Keamanan berlapis untuk banyak tenant"
      eyebrow="Keamanan"
      description="Lapisan perlindungan yang menjaga setiap domain, akun redaksi, dan data pelanggan di seluruh jaringan."
      tone="soft"
    >
      <FeatureGrid items={SECURITY_ITEMS} columns={3} />
    </Section>
  );
}
