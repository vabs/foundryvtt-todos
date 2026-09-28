import type { Tag } from "./tags.ts";
import type { Todo } from "./todos.ts";

declare module "fvtt-types/configuration" {
  // Types `getFlag`/`setFlag`/`unsetFlag` on `User` for this module's scope.
  interface FlagConfig {
    User: {
      "foundryvtt-todos": {
        // Unset until the user gets their first todo.
        todos?: Record<string, Todo>;

        // fvtt-types only knows top-level keys, but `setFlag`/`unsetFlag` accept nested paths.
        // Nested writes merge into the stored todo, so a partial todo is enough.
        [todo: `todos.${string}`]: Partial<Todo>;
      };
    };
  }

  // Types `game.settings.get("foundryvtt-todos", ...)`.
  interface SettingConfig {
    // Registered with `type: Object`, keyed by tag id.
    "foundryvtt-todos.tags": Record<string, Tag>;
  }

  // Types `game.modules.get("foundryvtt-todos")?.api` for macros and other modules.
  interface ModuleConfig {
    "foundryvtt-todos": {
      api: {
        open: () => void;
      };
    };
  }
}
