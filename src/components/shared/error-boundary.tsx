'use client';

import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[error-boundary] UI crashed', error, info);
  }

  handleReset = () => {
    this.setState({ hasError: false, message: '' });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto flex max-w-xl flex-col items-center gap-4 rounded-3xl border border-white/10 bg-bg-secondary/80 px-6 py-10 text-center shadow-xl">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-uyan-light">Что-то пошло не так</p>
            <h1 className="mt-2 text-2xl font-semibold text-text-primary">Мы поймали ошибку</h1>
            <p className="mt-3 text-sm text-text-secondary">
              Интерфейс упал, но сервис продолжает работать. Попробуй перезагрузить страницу или открыть другой раздел.
            </p>
            {this.state.message ? (
              <p className="mt-2 rounded-2xl border border-white/10 bg-black/30 px-4 py-2 text-xs text-text-tertiary">
                {this.state.message}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={this.handleReset}
            className="inline-flex items-center gap-2 rounded-full bg-uyan-action px-5 py-2 text-sm font-semibold text-slate-900 shadow-[0_0_1.5rem_rgba(251,191,36,0.45)] transition hover:scale-[1.01] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-uyan-light"
          >
            Перезагрузить
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
