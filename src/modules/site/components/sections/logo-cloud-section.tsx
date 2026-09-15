import { Container } from '@/modules/site/components/layout/content';
import { getShowcaseNames } from '@/modules/content/site-content';

export async function LogoCloudSection() {
  const names = await getShowcaseNames();
  if (names.length === 0) return null;
  return (
    <section aria-label="Grup media yang memakai Indicate" className="border-b border-hairline">
      <Container className="flex flex-col gap-4 py-8 md:flex-row md:items-baseline md:gap-8">
        <p className="m-0 flex-none font-sans text-sm text-paper-faint">
          Dipercaya grup media multi-portal
        </p>
        <ul className="m-0 flex list-none flex-wrap items-baseline gap-x-6 gap-y-2 p-0">
          {names.map((name) => (
            <li key={name} className="font-serif text-lg tracking-tight text-paper-dim">
              {name}
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}
