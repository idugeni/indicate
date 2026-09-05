const TARGET_CHANNELS = [
  'portal-alpha.web.id',
  'portal-beta.web.id',
  'portal-gamma.web.id',
  'portal-delta.web.id',
] as const;

export function SignalNetwork() {
  return (
    <div aria-label="Arsitektur routing sinyal">
      <p className="m-0 py-3 font-sans text-sm font-semibold text-paper">
        Redaksi sentral → bus idempoten → kanal edge
      </p>

      <ol className="m-0 grid list-none gap-0 border-t border-hairline p-0 font-mono text-xs">
        <li className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5">
          <span className="text-paper">Redaksi Sentral Terpadu</span>
          <span className="text-right text-paper-faint">sig_core_01 · Strict RLS</span>
        </li>
        <li className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5">
          <span className="text-paper">Bus idempoten</span>
          <span className="text-right text-paper-faint">retry · unpublish · bulk</span>
        </li>
        {TARGET_CHANNELS.map((channel) => (
          <li
            key={channel}
            className="flex items-baseline justify-between gap-4 border-b border-hairline py-2.5 last:border-b-0"
          >
            <span className="truncate text-paper-dim">{channel}</span>
            <span className="flex-none text-signal">sinkron</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
