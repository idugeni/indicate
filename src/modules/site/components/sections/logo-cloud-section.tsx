import { Container } from '@/modules/site/components/layout/content';
import { getShowcaseNames } from '@/modules/content/site-content';

export async function LogoCloudSection() {
  const names = await getShowcaseNames();
  if (names.length === 0) return null;
  return (
    <section className="overflow-hidden">
      <Container className="py-8">
        <p className="m-0 text-center font-mono text-[11px] uppercase tracking-wider text-paper-faint">
          Dipercaya grup media multi-portal
        </p>
        <div className="mt-5 overflow-hidden">
          <ul aria-label="Daftar grup media" className="m-0 flex list-none flex-wrap items-center justify-center gap-3 p-0">
            {names.map((name) => (
              <li
                key={name}
                className="flex flex-none items-center gap-2.5 rounded border border-hairline bg-bg-raised px-4 py-2 transition-colors duration-180 hover:border-hairline-strong"
              >
                <span
                  aria-hidden="true"
                  className="flex h-6 w-6 flex-none items-center justify-center bg-brass font-sans text-xs font-bold text-bg"
                >
                  {name.trim().slice(0, 1).toUpperCase()}
                </span>
                <span className="whitespace-nowrap font-sans text-sm font-medium text-paper-dim">
                  {name}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
