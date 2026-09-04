import { Container } from '@/modules/site/components/layout/content';
import { getShowcaseNames } from '@/modules/content/site-content';

export async function LogoCloudSection() {
  const names = await getShowcaseNames();
  if (names.length === 0) return null;
  return (
    <section className="border-b border-hairline">
      <Container className="py-8">
        <p className="m-0 text-center font-mono text-[11px] uppercase tracking-wider text-paper-faint">
          Dipercaya grup media multi-portal
        </p>
        <ul className="m-0 mt-5 flex list-none flex-wrap items-center justify-center gap-x-8 gap-y-3 p-0">
          {names.map((name) => (
            <li
              key={name}
              className="font-sans text-sm font-medium tracking-tight text-paper-dim"
            >
              {name}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
