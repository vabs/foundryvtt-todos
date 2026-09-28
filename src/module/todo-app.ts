import type { DeepPartial } from "fvtt-types/utils";
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import { MODULE_ID, TEMPLATES } from "./constants.ts";
import { canShare } from "./shares.ts";
import { SharedTodosApp } from "./shared-todos-app.ts";
import { TagManager } from "./tag-manager.ts";
import {
  PERSONAL_TAG_ID,
  canManageTags,
  getTag,
  getTagChoices,
  type TagView,
} from "./tags.ts";
import {
  addTodo,
  clearCompleted,
  deleteTodo,
  getTodos,
  toggleTodo,
  type Todo,
} from "./todos.ts";

export class TodoApp extends HandlebarsApplicationMixin(
  ApplicationV2,
)<TodoApp.RenderContext> {
  static #instance: TodoApp | undefined;

  static open(): void {
    TodoApp.#instance ??= new TodoApp();
    void TodoApp.#instance.render({ force: true });
  }

  // Re-render only the list when todos change so a half-typed todo in the form survives.
  static refreshList(): void {
    if (TodoApp.#instance?.rendered) {
      void TodoApp.#instance.render({ parts: ["list"] });
    }
  }

  static override DEFAULT_OPTIONS: ApplicationV2.DefaultOptions = {
    id: `${MODULE_ID}-app`,
    tag: "form",
    classes: [MODULE_ID, "todos-app"],
    window: {
      title: "TODOS.Title",
      icon: "fa-solid fa-list-check",
      resizable: true,
    },
    position: { width: 400, height: 520 },
    form: {
      handler: TodoApp.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: false,
    },
    actions: {
      toggle: TodoApp.#onToggle,
      delete: TodoApp.#onDelete,
      clearCompleted: TodoApp.#onClearCompleted,
      openTags: () => {
        TagManager.open();
      },
      openShared: () => {
        SharedTodosApp.open();
      },
    },
  };

  static override PARTS = {
    form: { template: TEMPLATES.todoForm },
    list: { template: TEMPLATES.todoList, scrollable: [".todos-list"] },
  };

  protected override async _prepareContext(
    options: DeepPartial<ApplicationV2.RenderOptions> & {
      isFirstRender: boolean;
    },
  ): Promise<TodoApp.RenderContext> {
    const context = await super._prepareContext(options);
    const todos = getTodos();
    const tagChoices = getTagChoices();

    return {
      ...context,
      canShare: canShare(),
      canManageTags: canManageTags(),
      tagChoices,
      defaultTagId: PERSONAL_TAG_ID in tagChoices ? PERSONAL_TAG_ID : "",
      todos: todos.map((todo) => ({
        ...todo,
        tag: getTag(todo.tagId),
        sharedByName: todo.sharedBy ? userName(todo.sharedBy) : undefined,
      })),
      remaining: todos.filter((todo) => !todo.done).length,
      hasCompleted: todos.some((todo) => todo.done && !todo.sharedBy),
    };
  }

  protected override async _onFirstRender(
    context: DeepPartial<TodoApp.RenderContext>,
    options: DeepPartial<ApplicationV2.RenderOptions>,
  ): Promise<void> {
    await super._onFirstRender(context, options);
    this.#textInput()?.focus();
  }

  #textInput(): HTMLInputElement | null {
    return this.element.querySelector<HTMLInputElement>("input[name=text]");
  }

  static async #onSubmit(
    this: TodoApp,
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    const { text, tagId } = formData.object as {
      text?: string;
      tagId?: string;
    };
    if (!text?.trim()) return;

    await addTodo(text, tagId || null);

    // The form part isn't re-rendered, so clear it by hand and keep the chosen tag for the next todo.
    const input = this.#textInput();
    if (input) {
      input.value = "";
      input.focus();
    }
  }

  static async #onToggle(
    this: TodoApp,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const id = todoIdFor(target);
    if (id) await toggleTodo(id);
  }

  static async #onDelete(
    this: TodoApp,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const id = todoIdFor(target);
    if (id) await deleteTodo(id);
  }

  static async #onClearCompleted(this: TodoApp): Promise<void> {
    await clearCompleted();
  }
}

function todoIdFor(target: HTMLElement): string | undefined {
  return target.closest<HTMLElement>("[data-todo-id]")?.dataset["todoId"];
}

export function userName(id: string): string {
  const user = game.users?.get(id);
  return user ? user.name : "";
}

declare namespace TodoApp {
  interface TodoView extends Todo {
    tag: TagView | undefined;
    sharedByName: string | undefined;
  }

  interface RenderContext
    extends HandlebarsApplicationMixin.RenderContext,
      ApplicationV2.RenderContext {
    canShare: boolean;
    canManageTags: boolean;
    tagChoices: Record<string, string>;
    defaultTagId: string;
    todos: TodoView[];
    remaining: number;
    hasCompleted: boolean;
  }
}
