import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { App } from "./App";
import { initTheme } from "./ui/theme";
import "./index.css";

// Stamp the resolved theme onto <html> before the first paint that matters (React still
// needs to mount, but this keeps the app's own logic — not just tokens.css's media-query
// fallback — as the source of truth once JS has run).
initTheme();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </React.StrictMode>,
);
