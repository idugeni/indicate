import { describe, expect, it } from 'vitest';
import { sql } from 'drizzle-orm';
import { PgDialect } from 'drizzle-orm/pg-core';

import { sqlStringArray } from '@/data/repos/shared/sql-array';

const dialect = new PgDialect();

function render(fragment: ReturnType<typeof sqlStringArray>) {
  return dialect.sqlToQuery(sql`SELECT ${fragment}::uuid[]`);
}

describe('sqlStringArray', () => {
  it('membungkus nilai dalam literal ARRAY dengan parameter terikat', () => {
    const query = render(sqlStringArray(['a-1', 'a-2']));
    expect(query.sql).toBe('SELECT ARRAY[$1, $2]::uuid[]');
    expect(query.params).toEqual(['a-1', 'a-2']);
  });

  it('menahan satu nilai agar tidak menjadi satu parameter record', () => {
    const query = render(sqlStringArray(['a-1']));
    expect(query.sql).toBe('SELECT ARRAY[$1]::uuid[]');
    expect(query.params).toEqual(['a-1']);
  });

  it('never concatenates a value into the SQL text', () => {
    const query = render(sqlStringArray(["x'); drop table media; --"]));
    expect(query.sql).toBe('SELECT ARRAY[$1]::uuid[]');
    expect(query.params).toEqual(["x'); drop table media; --"]);
  });
});
