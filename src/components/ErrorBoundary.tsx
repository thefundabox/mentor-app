import { Component, type ErrorInfo, type ReactNode } from "react";

/**
 * Catches render-time throws so one broken screen does not take the whole app
 * down with it.
 *
 * Without a boundary React unmounts the entire tree on any error thrown during
 * render, which shows the user a completely white page and tells them nothing.
 * Hook-order violations (a `return null` guard sitting above a `useMemo`, where
 * the guard stops firing once async data arrives) fail exactly that way, and
 * they are invisible in production without this.
 */
interface Props {
  children: ReactNode;
  /** Called when the user asks to recover — clear persisted route state here. */
  onReset?: () => void;
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep this: it is the only trace of what happened on a user's machine.
    console.error("[ErrorBoundary]", error, info.componentStack);
  }

  private reset = () => {
    this.props.onReset?.();
    this.setState({ error: null });
  };

  render() {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">This screen hit an error</h1>
        <p className="text-sm text-slate-600 mb-6">
          Nothing you did is lost. Going back to the start usually clears it.
        </p>
        <button
          onClick={this.reset}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700"
        >
          Back to start
        </button>
        <pre className="mt-8 text-left text-[11px] leading-relaxed text-slate-500 bg-slate-100 rounded-lg p-3 overflow-x-auto">
          {error.message}
        </pre>
      </div>
    );
  }
}
