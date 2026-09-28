# Todos

Per-player todo lists for Foundry VTT, with colored tags and GM sharing.

- Open it from the **Open Todos** button in the Token scene controls.
- Every user has their own list. Add, check off, and delete todos, or clear all completed ones at once.
- Give each todo a tag. Tags are shared across the world and each has its own color. A **Personal** tag exists by default and can be renamed or recolored but not deleted.
- The GM manages tags from the **Tags** button: add, rename, recolor, and delete them.
- The GM shares todos from the **Shared** button: write a todo, pick a tag, and choose one or more players. Each player gets their own copy and checks it off independently. The GM sees who has finished each one and can edit, re-share, or remove it.
- Players can only check off shared todos. They can't edit or delete them.

Todos are stored in each user's `User` flags, so they sync across that user's devices within a world. Flags are visible to every connected client, so a technical player could read other players' lists from the console. Don't treat lists as secret.

Requires Foundry VTT v13 or newer (verified on v14).

## API

Macros and other modules can open the window:

```js
game.modules.get("foundryvtt-todos")?.api.open();
```

## Development

Built on LukeAbby's Foundry VTT starter project (MIT-0): Vite, TypeScript, [fvtt-types](https://github.com/League-of-Foundry-Developers/foundry-vtt-types), ESLint, Stylelint and Prettier.

### Setup

1. Install Node (v22+) and run `corepack enable` so the pinned Yarn version is used.
2. Install dependencies with `yarn install`.
3. In VSCode, pick the workspace TypeScript version: Command Palette → "TypeScript: Select TypeScript Version" → "Use Workspace Version".
4. Build once with `yarn build`, then symlink `dist` into your Foundry data folder so Foundry can find the manifest:

   ```sh
   # macOS. On Linux use ~/.local/share/FoundryVTT/Data, on Windows %LOCALAPPDATA%\FoundryVTT\Data.
   ln -s "$PWD/dist" "$HOME/Library/Application Support/FoundryVTT/Data/modules/foundryvtt-todos"
   ```

5. Start Foundry on `localhost:30000` and enable the module in your world. If Foundry runs elsewhere, set `FOUNDRY_HOST_NAME` and/or `FOUNDRY_PORT`.

### Workflow

- `yarn dev` starts the dev server at `localhost:30001`, proxying Foundry and serving this module's files with hot reload. Scripts and styles reload automatically; edits to `static/templates/*.hbs` and `static/lang/en.json` re-render the open Todos window.
- `yarn build` writes an optimized build to `dist`. It doesn't need Foundry running.
- `yarn typecheck`, `yarn lint` and `yarn format` check types, lint, and format the code.

### Layout

| Path                             | Purpose                                                            |
| -------------------------------- | ------------------------------------------------------------------ |
| `module.json`                    | Foundry manifest, copied into `dist` on build.                     |
| `src/module/index.ts`            | Entry point: hooks, scene control button, module API.              |
| `src/module/todos.ts`            | Reads and writes todos in a user's flags.                          |
| `src/module/tags.ts`             | The world `tags` setting, the default Personal tag, and colors.    |
| `src/module/shares.ts`           | GM sharing: copies todos into players' flags and reads progress.   |
| `src/module/todo-app.ts`         | The Todos window.                                                  |
| `src/module/tag-manager.ts`      | The GM's tag manager window.                                       |
| `src/module/shared-todos-app.ts` | The GM's shared todos window.                                      |
| `src/module/rerender.ts`         | Re-renders this module's open windows.                             |
| `src/module/configuration.ts`    | fvtt-types configuration for this module's flags, setting and API. |
| `src/module/hmr.ts`              | Dev-only template and translation hot reload.                      |
| `src/styles/styles.scss`         | Styles, scoped to the apps' root class.                            |
| `static/`                        | Served as-is: templates and language files.                        |

If you change the module id, update it in `module.json`, `vite.config.ts`, `src/module/constants.ts` and `src/module/configuration.ts`.

## License

[MIT](LICENSE)
