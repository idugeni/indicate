'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';

interface PanelErrorBoundaryState {
  readonly message: string | null;
}

/**
 * Isolate panel crashes so one failing module never blanks the workspace shell.
 */
export class PanelErrorBoundary extends Component<
  { readonly name: string; readonly children: ReactNode },
  PanelErrorBoundaryState
> {
  state: PanelErrorBoundaryState = { message: null };

  static getDerivedStateFromError(error: unknown): PanelErrorBoundaryState {
    return { message: error instanceof Error ? error.message : 'Modul gagal dimuat.' };
  }

  private readonly reset = () => {
    this.setState({ message: null });
  };

  render(): ReactNode {
    if (this.state.message !== null) {
      return (
        <div
          role="alert"
          className="rounded-lg border border-error/40 bg-error/[0.06] p-5 font-sans text-sm text-paper"
        >
          <p className="m-0 font-semibold">{this.props.name} gagal dimuat.</p>
          <p className="m-0 mt-1 text-xs text-paper-dim">{this.state.message}</p>
          <Button
            type="button"
            variant="outline"
            onClick={this.reset}
          >
            Coba lagi
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
