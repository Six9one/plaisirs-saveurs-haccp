import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in component:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-white flex flex-col items-center justify-center p-6 text-center">
          <div className="w-16 h-16 rounded-3xl bg-amber-500 text-slate-950 flex items-center justify-center text-2xl font-black mb-4 shadow-lg">
            🥐
          </div>
          <h1 className="text-xl font-bold text-white mb-2">Saveur Plaisir HACCP</h1>
          <p className="text-xs text-slate-400 max-w-sm mb-6">
            L'application a redémarré suite à une mise à jour. Touchez le bouton ci-dessous pour réinitialiser l'affichage.
          </p>
          <button
            onClick={async () => {
              // On vide seulement le cache de l'app (jamais les relevés enregistrés sur l'appareil)
              try {
                if ('caches' in window) {
                  const keys = await caches.keys();
                  await Promise.all(keys.map((k) => caches.delete(k)));
                }
              } catch {
                /* ignore */
              }
              window.location.reload();
            }}
            className="px-6 py-3 rounded-2xl bg-amber-500 text-slate-950 font-bold text-xs shadow-lg active:scale-95 cursor-pointer"
          >
            Actualiser & Charger l'application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
