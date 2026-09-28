import { rerenderApps } from "./rerender.ts";

// Dev-only listeners for the custom events sent by `foundryHMRPlugin` in `vite.config.ts`.
// Vite tree-shakes this out of production builds because `import.meta.hot` is undefined there.
export function registerHMR(): void {
  if (!import.meta.hot) return;

  import.meta.hot.on("template-update", ({ path }: { path: string }) => {
    // `getTemplate` caches compiled templates as partials keyed by path, so evict before re-rendering.
    Handlebars.unregisterPartial(path);
    rerenderApps();
  });

  import.meta.hot.on("lang-update", ({ path }: { path: string }) => {
    void reloadTranslations(path);
  });
}

async function reloadTranslations(path: string): Promise<void> {
  const response = await fetch(`/${path}`);
  const translations = (await response.json()) as object;
  foundry.utils.mergeObject(
    game.i18n?.translations ?? {},
    foundry.utils.expandObject(translations),
  );
  rerenderApps();
}
