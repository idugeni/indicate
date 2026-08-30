import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { buildPublicPublisherClaim } from '@/domain/stage3/policies';
import { assertProperty } from '../helpers/property';
import { base } from '../helpers/stage3';

// Feature: indicate-mvp, Property 10: Public claims never exceed verified affiliation
// **Validates: Requirements 8.8, 8.9, 8.10, 8.11, 8.12, 8.13, 8.14, 15.8**
describe('Property 10: verified claims', () => {
  it('emits institutional claims exactly for verified matching active affiliations', () => {
    assertProperty('Property 10: Public claims never exceed verified affiliation', fc.property(
      fc.constantFrom('unverified' as const, 'pending' as const, 'verified' as const, 'rejected' as const), fc.boolean(), fc.boolean(), fc.boolean(),
      (verificationStatus, active, affiliationVerified, matchingSite) => {
        const publisher = { ...base('publisher'), name: 'Publisher', type: 'independent_publisher' as const, attributionLabel: 'Independent Publisher', contacts: {}, evidenceReference: 'evidence', verificationStatus, submittedBy: null, submittedAt: null, verifiedBy: null, verifiedAt: null, rejectionReason: null, status: 'active' as const };
        const affiliation = { ...base('affiliation'), publisherId: publisher.id, siteId: matchingSite ? 'site' : 'foreign-site', institutionName: 'Institution', claimScopes: ['site_name'], evidenceReference: 'proof', active, verifiedAt: affiliationVerified ? '2026-08-30T00:00:00.000Z' : null };
        const claim = buildPublicPublisherClaim(publisher, [affiliation], 'site');
        expect(claim.independent).toBe(true);
        expect(claim.attribution).toBe('Independent Publisher');
        expect(claim.institutionName !== null).toBe(verificationStatus === 'verified' && active && affiliationVerified && matchingSite);
      },
    ));
  });
});
