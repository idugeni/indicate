import type { MasterTemplatePreset } from '@/ui/themes';
import { Eyebrow, SectionShell } from '@/modules/site/components/landing/material';
import { TemplateSwitcher } from '@/modules/site/components/landing/template-switcher';

export function TemplateSection({ templates }: { readonly templates: readonly MasterTemplatePreset[] }) {
  if (templates.length === 0) return null;
  return (
    <SectionShell labelledBy="tampilan-heading" className="py-16 md:py-24">
      <div>
        <Eyebrow index="04">Tampilan situs</Eyebrow>
        <h2
          id="tampilan-heading"
          className="m-0 mt-4 max-w-[20ch] font-serif text-3xl leading-[1.05] font-medium tracking-tight text-balance sm:text-[2.75rem]"
        >
          Wajah sendiri-sendiri, <em className="text-[#8a5f1c]">mesin</em> yang sama.
        </h2>
      </div>
      <TemplateSwitcher templates={templates} />
    </SectionShell>
  );
}
