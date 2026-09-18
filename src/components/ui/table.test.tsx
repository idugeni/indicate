// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

afterEach(() => {
  cleanup();
});

describe('Tabel', () => {
  it('merender kepala dan sel', () => {
    render(
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nama</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow>
            <TableCell>Budi</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(screen.getByText('Nama')).toBeDefined();
    expect(screen.getByText('Budi')).toBeDefined();
  });

  it('merender elemen tabel', () => {
    const { container } = render(
      <Table>
        <TableBody>
          <TableRow>
            <TableCell>Budi</TableCell>
          </TableRow>
        </TableBody>
      </Table>,
    );
    expect(container.querySelector('[data-slot="table"]')).not.toBe(null);
  });
});
