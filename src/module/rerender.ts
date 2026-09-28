import { MODULE_ID } from "./constants.ts";

// Every app in this module carries `MODULE_ID` as a root class, which makes them easy to find.
export function rerenderApps(): void {
  for (const app of foundry.applications.instances.values()) {
    if (app.options.classes.includes(MODULE_ID)) void app.render();
  }
}
