import type { DeepPartial } from "fvtt-types/utils";
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import DialogV2 = foundry.applications.api.DialogV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import { MODULE_ID, TEMPLATES } from "./constants.ts";
import {
  canShare,
  deleteShare,
  getPlayers,
  getShare,
  getShares,
  saveShare,
} from "./shares.ts";
import { getTag, getTagChoices, type TagView } from "./tags.ts";

// GM-only window for sharing todos with players and tracking who has finished them.
export class SharedTodosApp extends HandlebarsApplicationMixin(
  ApplicationV2,
)<SharedTodosApp.RenderContext> {
  static #instance: SharedTodosApp | undefined;

  static open(): void {
    if (!canShare()) return;
    SharedTodosApp.#instance ??= new SharedTodosApp();
    void SharedTodosApp.#instance.render({ force: true });
  }

  static refresh(parts?: string[]): void {
    if (SharedTodosApp.#instance?.rendered) {
      void SharedTodosApp.#instance.render(parts ? { parts } : {});
    }
  }

  // The share being edited in the form, if any.
  #editingId: string | undefined;

  static override DEFAULT_OPTIONS: ApplicationV2.DefaultOptions = {
    id: `${MODULE_ID}-shared`,
    tag: "form",
    classes: [MODULE_ID, "todos-shared"],
    window: {
      title: "TODOS.Shared.Title",
      icon: "fa-solid fa-share-nodes",
      resizable: true,
    },
    position: { width: 460, height: 560 },
    form: {
      handler: SharedTodosApp.#onSubmit,
      submitOnChange: false,
      closeOnSubmit: false,
    },
    actions: {
      editShare: SharedTodosApp.#onEditShare,
      deleteShare: SharedTodosApp.#onDeleteShare,
      cancelEdit: SharedTodosApp.#onCancelEdit,
    },
  };

  static override PARTS = {
    form: { template: TEMPLATES.shareForm },
    list: { template: TEMPLATES.shareList, scrollable: [".share-list"] },
  };

  protected override async _prepareContext(
    options: DeepPartial<ApplicationV2.RenderOptions> & {
      isFirstRender: boolean;
    },
  ): Promise<SharedTodosApp.RenderContext> {
    const context = await super._prepareContext(options);
    const editing = this.#editingId ? getShare(this.#editingId) : undefined;
    const selected = new Set(editing?.recipients.map(({ user }) => user.id));

    return {
      ...context,
      editing: editing !== undefined,
      draft: { text: editing?.text ?? "", tagId: editing?.tagId ?? "" },
      tagChoices: getTagChoices(),
      players: getPlayers().map((user) => ({
        id: user.id,
        name: user.name,
        color: user.color.css,
        selected: selected.has(user.id),
      })),
      shares: getShares().map((share) => ({
        id: share.id,
        text: share.text,
        tag: getTag(share.tagId),
        doneCount: share.recipients.filter(({ done }) => done).length,
        recipients: share.recipients
          .map(({ user, done }) => ({
            name: user.name,
            color: user.color.css,
            done,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      })),
    };
  }

  static async #onSubmit(
    this: SharedTodosApp,
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    // Recipient checkboxes are named `recipients.<userId>`.
    const data = foundry.utils.expandObject(formData.object) as {
      text?: string;
      tagId?: string;
      recipients?: Record<string, boolean>;
    };
    const recipientIds = Object.entries(data.recipients ?? {})
      .filter(([, checked]) => checked)
      .map(([id]) => id);

    const saved = await saveShare(
      { text: data.text ?? "", tagId: data.tagId || null, recipientIds },
      this.#editingId,
    );
    if (!saved) return;

    this.#editingId = undefined;
    await this.render();
  }

  static async #onEditShare(
    this: SharedTodosApp,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    this.#editingId = shareIdFor(target);
    await this.render({ parts: ["form"] });
    this.element.querySelector<HTMLInputElement>("input[name=text]")?.focus();
  }

  static async #onCancelEdit(this: SharedTodosApp): Promise<void> {
    this.#editingId = undefined;
    await this.render({ parts: ["form"] });
  }

  static async #onDeleteShare(
    this: SharedTodosApp,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const id = shareIdFor(target);
    const share = id ? getShare(id) : undefined;
    if (!share) return;

    const confirmed = await DialogV2.confirm({
      window: { title: "TODOS.Shared.DeleteTitle" },
      content: `<p>${
        game.i18n?.format("TODOS.Shared.DeleteConfirm", {
          text: foundry.utils.escapeHTML(share.text),
        }) ?? ""
      }</p>`,
    });
    if (!confirmed) return;

    if (this.#editingId === share.id) this.#editingId = undefined;
    await deleteShare(share.id);
    await this.render();
  }
}

function shareIdFor(target: HTMLElement): string | undefined {
  return target.closest<HTMLElement>("[data-share-id]")?.dataset["shareId"];
}

export declare namespace SharedTodosApp {
  interface RecipientView {
    name: string;
    color: string;
    done: boolean;
  }

  interface ShareView {
    id: string;
    text: string;
    tag: TagView | undefined;
    doneCount: number;
    recipients: RecipientView[];
  }

  interface RenderContext
    extends HandlebarsApplicationMixin.RenderContext,
      ApplicationV2.RenderContext {
    editing: boolean;
    draft: { text: string; tagId: string };
    tagChoices: Record<string, string>;
    players: { id: string; name: string; color: string; selected: boolean }[];
    shares: ShareView[];
  }
}
