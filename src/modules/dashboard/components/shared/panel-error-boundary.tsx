'use client';

import { Component, type ReactNode } from 'react';

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
          <button
            type="button"
            onClick={this.reset}
            className="mt-3 inline-flex h-8 items-center rounded border border-hairline-strong px-3 text-xs text-paper transition-colors duration-150 hover:border-paper-faint"
          >
            Coba lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
