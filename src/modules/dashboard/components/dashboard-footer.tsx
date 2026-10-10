/**
 * Render the dashboard footer at the end of the workspace flex column.
 *
 * @returns Footer at the viewport bottom on short pages and after content on long pages.
 */
export function DashboardFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-auto flex-none border-t border-hairline bg-bg/95 backdrop-blur">
      <div className="flex w-full flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="m-0 font-mono text-[11px] text-paper-faint">
          © {year} Indicate · PT Sanca Phena Cakra
        </p>
        <p className="m-0 truncate font-mono text-[11px] tabular-nums text-paper-faint">
          Next.js 16 · Supabase · Drizzle · Cloudflare · Upstash
        </p>
      </div>
    </footer>
  );
}
