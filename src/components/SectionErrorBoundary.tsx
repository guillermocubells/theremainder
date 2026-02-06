import { Component, ReactNode } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
  minimal?: boolean;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class SectionErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error(`[SectionErrorBoundary] ${this.props.fallbackTitle || "Section"}:`, error, info.componentStack);
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    if (this.props.minimal) {
      return (
        <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
          <AlertTriangle className="h-4 w-4 text-destructive" />
          <span>Error al cargar esta sección.</span>
          <button onClick={this.handleRetry} className="underline hover:text-foreground transition-colors">
            Reintentar
          </button>
        </div>
      );
    }

    return (
      <Card className="border-destructive/30 bg-destructive/5">
        <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <p className="font-medium text-foreground">
              {this.props.fallbackTitle || "Algo salió mal"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              No se pudo cargar esta sección. Intenta de nuevo.
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={this.handleRetry} className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Reintentar
          </Button>
        </CardContent>
      </Card>
    );
  }
}

export default SectionErrorBoundary;
