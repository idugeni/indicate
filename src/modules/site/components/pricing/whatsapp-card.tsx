import { MessageCircle } from 'lucide-react';

export function WhatsAppCard({
  message = 'Halo Indicate, saya ingin bertanya.',
}: {
  readonly message?: string;
}) {
  return (
    <div
      role="note"
      className="grid w-full gap-4 rounded-lg border border-hairline bg-bg-raised p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-6"
    >
      <div className="flex items-start gap-3">
        <MessageCircle className="mt-0.5 h-5 w-5 flex-none text-signal" aria-hidden="true" />
        <div>
          <p className="m-0 font-sans text-sm font-semibold text-paper">
            Jalur tercepat: WhatsApp tim penjualan
          </p>
          <p className="m-0 mt-1 max-w-xl font-sans text-sm leading-relaxed text-paper-dim">
            Untuk paket Enterprise, pindahan sistem, atau pertanyaan harga — langsung terhubung, tanpa antre tiket.
          </p>
        </div>
      </div>
      <a
        href={`https://wa.me/6285641159405?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center bg-brass px-5 py-2.5 font-sans text-sm font-semibold text-bg no-underline transition-colors duration-180 hover:bg-brass-soft hover:text-bg"
      >
        Chat WhatsApp
      </a>
    </div>
  );
}
