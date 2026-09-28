import { MODULE_ID } from "./constants.ts";
import { registerHMR } from "./hmr.ts";
import { SharedTodosApp } from "./shared-todos-app.ts";
import { registerTagSettings } from "./tags.ts";
import { TodoApp } from "./todo-app.ts";

Hooks.once("init", () => {
  registerHMR();
  registerTagSettings();

  const module = game.modules?.get(MODULE_ID);
  if (module)
    module.api = {
      open: () => {
        TodoApp.open();
      },
    };
});

Hooks.on("getSceneControlButtons", (controls) => {
  const tokens = controls["tokens"];
  if (!tokens) return;

  tokens.tools ??= {};
  tokens.tools[MODULE_ID] = {
    name: MODULE_ID,
    title: "TODOS.Open",
    icon: "fa-solid fa-list-check",
    order: Object.keys(tokens.tools).length,
    button: true,
    visible: true,
    onChange: () => {
      TodoApp.open();
    },
  };
});

// Todos live in user flags, so any flag change may affect the open windows, including edits from another device.
Hooks.on("updateUser", (user, changes) => {
  if (!foundry.utils.hasProperty(changes, `flags.${MODULE_ID}`)) return;

  if (user.isSelf) TodoApp.refreshList();
  SharedTodosApp.refresh(["list"]);
});

// The GM's recipient checkboxes list every player.
Hooks.on("createUser", () => {
  SharedTodosApp.refresh();
});
Hooks.on("deleteUser", () => {
  SharedTodosApp.refresh();
});
