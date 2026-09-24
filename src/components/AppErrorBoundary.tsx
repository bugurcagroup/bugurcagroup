import React from 'react';

interface AppErrorBoundaryProps {
  children?: React.ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export default class AppErrorBoundary extends React.Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };
  private readonly children: React.ReactNode;

  constructor(props: AppErrorBoundaryProps) {
    super(props);
    this.children = props.children;
  }

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('Uygulama hatası yakalandı:', error, info.componentStack);
  }

  render() {
    if (!this.state.hasError) return this.children;

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-16 text-center text-slate-900">
        <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
          <h1 className="text-xl font-bold">Sayfa yüklenemedi</h1>
          <p className="mt-3 text-sm text-slate-500">Bağlantınızı kontrol edip sayfayı yenileyin.</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
          >
            Sayfayı Yenile
          </button>
        </div>
      </main>
    );
  }
}
