import type { OperationContext } from '@/domain/context/operation-context';
import type { TenantTransaction, TenantTransactionManager } from '@/ports/tenant-transaction';

type VerifiedTenantContext = Extract<OperationContext, { kind: 'tenant' }>;

export async function executeInTenantTransaction<T>(
  manager: TenantTransactionManager,
  context: VerifiedTenantContext,
  operation: (transaction: TenantTransaction) => Promise<T>,
): Promise<T> {
  return manager.execute(context.actor, async (transaction) => {
    if (transaction.organizationId !== context.actor.organizationId) {
      throw new Error('Tenant transaction context mismatch');
    }
    return operation(transaction);
  });
}
