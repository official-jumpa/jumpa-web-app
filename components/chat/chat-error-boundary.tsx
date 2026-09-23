"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  errorMessage?: string;
}

export class ChatErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.warn("[ChatErrorBoundary caught component error]", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex w-full flex-col gap-1 rounded-surface border border-jumpa-neutral-100 bg-jumpa-neutral-95 p-3.5 text-xs text-jumpa-black/70">
          <p className="font-semibold text-jumpa-black">
            {this.props.fallbackTitle || "Message card preview unavailable"}
          </p>
          <p className="text-[11px] leading-4 text-jumpa-black/50">
            This card could not be rendered. Your chat and funds remains safe
          </p>
        </div>
      );
    }
    return this.props.children;
  }
}
