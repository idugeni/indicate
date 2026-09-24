export interface StackLogo {
  readonly name: string;
  readonly file: string;
  readonly role: string;
}

export const STACK_LOGOS: readonly StackLogo[] = Object.freeze([
  { name: 'Next.js', file: '/brand/stack/nextjs.svg', role: 'Framework' },
  { name: 'React', file: '/brand/stack/react.svg', role: 'UI' },
  { name: 'Tailwind CSS', file: '/brand/stack/tailwindcss.svg', role: 'Styling' },
  { name: 'shadcn/ui', file: '/brand/stack/shadcn-ui.svg', role: 'Komponen' },
  { name: 'Radix UI', file: '/brand/stack/radix-ui.svg', role: 'Primitif' },
  { name: 'Base UI', file: '/brand/stack/base-ui.svg', role: 'Primitif' },
  { name: 'TypeScript', file: '/brand/stack/typescript.svg', role: 'Bahasa' },
  { name: 'PostgreSQL', file: '/brand/stack/postgresql.svg', role: 'Database' },
  { name: 'Supabase', file: '/brand/stack/supabase.svg', role: 'Database & Auth' },
  { name: 'Drizzle ORM', file: '/brand/stack/drizzle.svg', role: 'ORM' },
  { name: 'Zod', file: '/brand/stack/zod.svg', role: 'Validasi' },
  { name: 'Cloudflare', file: '/brand/stack/cloudflare.svg', role: 'DNS & R2' },
  { name: 'Upstash', file: '/brand/stack/upstash.svg', role: 'Cache & antrean' },
  { name: 'Redis', file: '/brand/stack/redis.svg', role: 'Cache' },
  { name: 'Node.js', file: '/brand/stack/nodejs.svg', role: 'Runtime' },
  { name: 'Vercel', file: '/brand/stack/vercel.svg', role: 'Hosting' },
  { name: 'Resend', file: '/brand/stack/resend.svg', role: 'Email' },
]);
