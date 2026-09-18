import { MessageCircle } from 'lucide-react';

export function WhatsAppCard({
  message = 'Halo Indicate, saya ingin bertanya.',
}: {
  readonly message?: string;
}) {
  return (
    <div
      role="note"
      className="grid w-full gap-5 rounded-[3px] border border-[#1a2430] bg-[#1a2430] p-6 text-[#f4f2ec] sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:p-7"
    >
      <div className="flex items-start gap-4">
        <span className="flex h-10 w-10 flex-none items-center justify-center rounded-[3px] border border-[#e8c87a]/40 bg-[#e8c87a]/10 text-[#e8c87a]">
          <MessageCircle className="h-5 w-5" aria-hidden="true" />
        </span>
        <div>
          <p className="m-0 font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-[#e8c87a]">
            Jalur tercepat
          </p>
          <p className="m-0 mt-2 font-sans text-base font-bold tracking-tight">
            WhatsApp kami
          </p>
          <p className="m-0 mt-1 max-w-xl font-sans text-sm leading-relaxed text-[#f4f2ec]/75">
            Untuk pembelian, pindahan sistem, atau pertanyaan layanan — langsung terhubung, tanpa antre tiket.
          </p>
        </div>
      </div>
      <a
        href={`https://wa.me/6285641159405?text=${encodeURIComponent(message)}`}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center rounded-[3px] bg-[#b88d3a] px-6 py-3 font-sans text-sm font-bold text-[#1a2430] no-underline transition-colors duration-180 outline-offset-2 hover:bg-[#e8c87a] focus-visible:outline-2 focus-visible:outline-[#e8c87a]"
      >
        Chat WhatsApp
      </a>
    </div>
  );
}
