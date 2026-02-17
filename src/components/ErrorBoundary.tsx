import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './ui/Button';

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
        error: null
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo);
    }

    private handleReload = () => {
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            return (
                <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
                    <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6 text-center">
                        <h2 className="text-xl font-bold text-slate-900 mb-2">Algo salió mal</h2>
                        <p className="text-slate-600 mb-6">
                            {this.state.error?.message.includes('Loading chunk')
                                ? 'Se ha detectado una nueva versión de la aplicación.'
                                : 'Ha ocurrido un error inesperado al cargar la aplicación.'}
                        </p>
                        <Button onClick={this.handleReload} className="w-full">
                            Recargar Página
                        </Button>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}
