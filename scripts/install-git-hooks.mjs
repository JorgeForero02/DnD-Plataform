// Points git at .githooks so the pre-commit gate applies after a plain `pnpm install`.
// Must never fail: Docker images build from a copy of the repo with no .git directory.
import { execSync } from "node:child_process";

try {
  execSync("git config core.hooksPath .githooks", { stdio: "ignore" });
} catch {
  console.log("git hooks not wired (no git repository here) — skipping");
}
