import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { App } from "./App";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { initTheme } from "./ui/theme";
import "./index.css";

// Stamp the resolved theme onto <html> before the first paint that matters (React still
// needs to mount, but this keeps the app's own logic — not just tokens.css's media-query
// fallback — as the source of truth once JS has run).
initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {/* Task 1.18b, hallazgo 6 — outside QueryClientProvider/App on purpose: a render error
        anywhere below (including one that happens before or during the router mounting) must
        not leave a white screen. See ErrorBoundary.tsx for why its fallback navigates with a
        real window.location.href assignment (through the Button primitive, fix round 1
        Important 11) instead of a react-router Link. */}
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
