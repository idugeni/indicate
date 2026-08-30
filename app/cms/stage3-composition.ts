import { TenantBusinessService } from '@/application/stage3/tenant-business-service';
import { createStage3RepositoryFixture, getStage3E2eRepositoryFixture } from '@/infrastructure/testing/stage3-fixture';
import { UuidGenerator } from '@/infrastructure/system/uuid-generator';

export function createStage3Fixture() {
  const { repository } = createStage3RepositoryFixture();
  return { repository, service: new TenantBusinessService(repository, new UuidGenerator()) };
}

export function getStage3E2eFixture() {
  const { repository } = getStage3E2eRepositoryFixture();
  return { repository, service: new TenantBusinessService(repository, new UuidGenerator()) };
}
