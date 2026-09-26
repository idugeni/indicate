import { sql, type SQL } from 'drizzle-orm';

/**
 * Build a Postgres array literal whose elements stay bound parameters.
 *
 * @param values - Non-empty string values to send as one array value.
 * @returns SQL fragment rendering `ARRAY[$1,$2,…]`.
 * @remarks Interpolating a JavaScript array straight into a fragment
 * (`sql`${values}::uuid[]``) makes the driver send it as a single record
 * parameter, which Postgres rejects with `cannot cast type record to uuid[]` and,
 * for two or more values, silently becomes `ROW($1,$2)`. Wrapping the bound
 * elements in `ARRAY[]` keeps every value parameterized — no string is ever
 * concatenated — and keeps the caller's `::uuid[]` or `::text[]` cast valid.
 */
export function sqlStringArray(values: readonly string[]): SQL {
  return sql`ARRAY[${sql.join(values.map((value) => sql`${value}`), sql`, `)}]`;
}
