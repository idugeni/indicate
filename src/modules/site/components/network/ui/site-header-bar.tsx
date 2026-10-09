'use client';

import { useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { Menu, Search } from 'lucide-react';

import { TemplateSearchPanel } from '@/modules/site/components/network/chrome/search-panel';
import { SiteMobileSidebar, type SiteDrawerPlacement } from '@/modules/site/components/network/ui/site-mobile-sidebar';
import { TemplateTooltip } from '@/modules/site/components/network/ui/template-tooltip';

const subscribeMounted = (): (() => void) => () => {};
const getMountedSnapshot = (): boolean => true;
const getMountedServerSnapshot = (): boolean => false;

/** Susunan bar header: sebaris, logo tengah, atau masthead dua baris. */
export type SiteHeaderBarLayout = 'row' | 'centered' | 'masthead';

export interface SiteSearchPanelSkin {
  readonly panelBorder: string;
  readonly panelBackground: string;
  readonly inputId: string;
}

function SearchButton({
  searchOpen,
  onToggle,
  buttonRef,
  className,
}: {
  readonly searchOpen: boolean;
  readonly onToggle: () => void;
  readonly buttonRef: React.RefObject<HTMLButtonElement | null>;
  readonly className: string;
}) {
  return (
    <TemplateTooltip label={searchOpen ? 'Tutup pencarian' : 'Cari berita'}>
      <button
        ref={buttonRef}
        type="button"
        onClick={onToggle}
        aria-expanded={searchOpen}
        aria-label={searchOpen ? 'Tutup pencarian' : 'Cari berita'}
        className={className}
      >
        <Search className="h-4 w-4" aria-hidden="true" />
      </button>
    </TemplateTooltip>
  );
}

function MenuButton({
  sidebarOpen,
  onOpen,
  buttonRef,
}: {
  readonly sidebarOpen: boolean;
  readonly onOpen: () => void;
  readonly buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <TemplateTooltip label="Buka menu">
      <button
        ref={buttonRef}
        type="button"
        onClick={onOpen}
        aria-expanded={sidebarOpen}
        aria-label="Buka menu"
        className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--tpl-primary,#1a5fd0)] text-[var(--tpl-on-primary,#ffffff)] shadow-sm transition-colors hover:bg-[var(--tpl-primary-dark,#155cb8)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tpl-primary,#1a5fd0)] lg:hidden"
      >
        <Menu className="h-4 w-4" aria-hidden="true" />
      </button>
    </TemplateTooltip>
  );
}

const SEARCH_BUTTON_CLASS =
  'h-10 w-10 flex-none items-center justify-center rounded-full bg-[var(--tpl-primary,#1a5fd0)] font-sans text-sm font-bold text-[var(--tpl-on-primary,#ffffff)] shadow-sm transition-colors hover:bg-[var(--tpl-primary-dark,#155cb8)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--tpl-primary,#1a5fd0)]';

/**
 * Orkestrasi bar header klien: brand, nav desktop, pemicu pencarian, dan drawer.
 *
 * @param brand - Elemen brand situs dari server.
 * @param nav - Navigasi desktop dari server.
 * @param sidebar - Navigasi seluler untuk drawer.
 * @param inputId - Id unik input pencarian drawer per template.
 * @param searchSkin - Skin panel pencarian dari tema template.
 * @param layout - Susunan baris header.
 * @param navStripStyle - Latar strip nav masthead dari tema template.
 * @param quickNav - Baris kanal geser seluler untuk varian masthead.
 * @param drawer - Posisi drawer seluler per template.
 * @returns Bar header interaktif tanpa warna template-spesifik.
 */
export function SiteHeaderBar({
  brand,
  nav,
  sidebar,
  inputId,
  searchSkin,
  sidebarThemeStyle,
  layout = 'row',
  navStripStyle,
  quickNav,
  drawer = 'right',
}: {
  readonly brand: ReactNode;
  readonly nav: ReactNode;
  readonly sidebar: ReactNode;
  readonly inputId: string;
  readonly searchSkin: SiteSearchPanelSkin;
  readonly sidebarThemeStyle?: React.CSSProperties | undefined;
  readonly layout?: SiteHeaderBarLayout;
  readonly navStripStyle?: React.CSSProperties;
  readonly quickNav?: ReactNode;
  readonly drawer?: SiteDrawerPlacement;
}) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [query, setQuery] = useState('');
  const mounted = useSyncExternalStore(subscribeMounted, getMountedSnapshot, getMountedServerSnapshot);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchButtonRef = useRef<HTMLButtonElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarCloseRef = useRef<HTMLButtonElement>(null);
  const toggleSearch = () => setSearchOpen((value) => !value);
  const openSidebar = () => setSidebarOpen(true);
  const closeSidebar = () => setSidebarOpen(false);

  return (
    <>
      {layout === 'centered' ? (
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
            <div className="col-start-1 row-start-1 w-full min-w-0 justify-self-start lg:col-start-2 lg:w-auto lg:justify-self-center">{brand}</div>
            <div className="col-start-2 row-start-1 flex flex-none items-center gap-2 justify-self-end lg:col-start-1 lg:justify-self-start">
              <SearchButton searchOpen={searchOpen} onToggle={toggleSearch} buttonRef={searchButtonRef} className={`${SEARCH_BUTTON_CLASS} flex`} />
              <MenuButton sidebarOpen={sidebarOpen} onOpen={openSidebar} buttonRef={menuButtonRef} />
            </div>
            <div className="hidden w-10 flex-none justify-self-end lg:col-start-3 lg:block" aria-hidden="true" />
          </div>
          {nav}
        </div>
      ) : layout === 'masthead' ? (
        <div>
          <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-5 sm:px-6 lg:grid-cols-[auto_minmax(0,1fr)_auto]">
            <div className="col-start-1 row-start-1 w-full min-w-0 justify-self-start lg:col-start-2 lg:w-auto lg:justify-self-center">{brand}</div>
            <div className="hidden w-10 flex-none lg:col-start-1 lg:block" aria-hidden="true" />
            <div className="col-start-2 row-start-1 flex flex-none items-center gap-2 justify-self-end lg:col-start-3">
              <SearchButton searchOpen={searchOpen} onToggle={toggleSearch} buttonRef={searchButtonRef} className={`${SEARCH_BUTTON_CLASS} flex`} />
              <MenuButton sidebarOpen={sidebarOpen} onOpen={openSidebar} buttonRef={menuButtonRef} />
            </div>
          </div>
          <div style={navStripStyle}>
            <div className="mx-auto max-w-7xl px-4 py-2 sm:px-6">
              {nav}
              {quickNav}
            </div>
          </div>
        </div>
      ) : (
        <div className="mx-auto grid min-h-16 max-w-7xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 px-4 py-3 sm:gap-x-4 sm:px-6 lg:gap-x-6">
          <div className="min-w-0 justify-self-start">{brand}</div>
          {nav}
          <div className="flex flex-none items-center gap-2 justify-self-end">
            <SearchButton searchOpen={searchOpen} onToggle={toggleSearch} buttonRef={searchButtonRef} className={`${SEARCH_BUTTON_CLASS} hidden lg:flex`} />
            <MenuButton sidebarOpen={sidebarOpen} onOpen={openSidebar} buttonRef={menuButtonRef} />
          </div>
        </div>
      )}

      {searchOpen ? (
        <TemplateSearchPanel
          skin={searchSkin}
          query={query}
          onQueryChange={setQuery}
          onClose={() => setSearchOpen(false)}
          inputRef={inputRef}
          onFocusReturn={() => searchButtonRef.current?.focus()}
        />
      ) : null}

      {mounted ? (
        <SiteMobileSidebar
          open={sidebarOpen}
          onClose={closeSidebar}
          onFocusReturn={() => menuButtonRef.current?.focus()}
          closeRef={sidebarCloseRef}
          inputId={inputId}
          themeStyle={sidebarThemeStyle}
          placement={drawer}
        >
          {sidebar}
        </SiteMobileSidebar>
      ) : null}
    </>
  );
}
