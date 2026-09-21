'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Alert, AlertAction, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
        <Alert variant="destructive">
          <AlertTitle>{this.props.name} gagal dimuat.</AlertTitle>
          <AlertDescription>{this.state.message}</AlertDescription>
          <AlertAction>
            <Button type="button" variant="outline" size="sm" onClick={this.reset}>
              Coba lagi
            </Button>
          </AlertAction>
        </Alert>
      );
    }
    return this.props.children;
  }
}
