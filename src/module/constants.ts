// Must match the `id` in `module.json` and `packageID` in `vite.config.ts`.
export const MODULE_ID = "foundryvtt-todos";

const templatePath = (name: string) =>
  `modules/${MODULE_ID}/templates/${name}.hbs`;

export const TEMPLATES = {
  todoForm: templatePath("todo-form"),
  todoList: templatePath("todo-list"),
  tagManager: templatePath("tag-manager"),
  shareForm: templatePath("share-form"),
  shareList: templatePath("share-list"),
} as const;
