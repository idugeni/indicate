import { describe, expect, it } from 'vitest';
import { isAnalyticsProjection } from '@/modules/dashboard/components/data-view-format';

describe('isAnalyticsProjection', () => {
  it('rejects partial projections rather than allowing a generic-table fallback', () => {
    expect(isAnalyticsProjection({ articlesByRegion: [] })).toBe(false);
    expect(isAnalyticsProjection({ articlesByRegion: [], articlesBySite: [] })).toBe(false);
  });

  it('accepts the complete V2 projection contract', () => {
    expect(isAnalyticsProjection({
      articlesByRegion: [], articlesBySite: [], articlesByCategory: [], articlesByPublisher: [],
      articlesByStatus: [], jobsByState: [], jobsBySiteRegionAndState: [], outcomesBySiteAndState: [],
      outcomesBySiteRegionAndState: [], tugasHarian: [], aktivitasPerJam: [], aktivitasTerbaru: [],
      arusPenerbit: [], jendela: { awal: '2026-10-01', akhir: '2026-10-08' },
    })).toBe(true);
  });
});
