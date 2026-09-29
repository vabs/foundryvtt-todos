import type { DeepPartial } from "fvtt-types/utils";
import ApplicationV2 = foundry.applications.api.ApplicationV2;
import DialogV2 = foundry.applications.api.DialogV2;
import HandlebarsApplicationMixin = foundry.applications.api.HandlebarsApplicationMixin;
import { MODULE_ID, TEMPLATES } from "./constants.ts";
import {
  PERSONAL_TAG_ID,
  canManageTags,
  createTag,
  deleteTag,
  getTag,
  getTags,
  updateTags,
  type TagChanges,
  type TagView,
} from "./tags.ts";

export class TagManager extends HandlebarsApplicationMixin(
  ApplicationV2,
)<TagManager.RenderContext> {
  static #instance: TagManager | undefined;

  static open(): void {
    if (!canManageTags()) return;
    TagManager.#instance ??= new TagManager();
    void TagManager.#instance.render({ force: true });
  }

  static override DEFAULT_OPTIONS: ApplicationV2.DefaultOptions = {
    id: `${MODULE_ID}-tags`,
    tag: "form",
    classes: [MODULE_ID, "todos-tag-manager"],
    window: {
      title: "TODOS.Tags.Title",
      icon: "fa-solid fa-tags",
      resizable: true,
    },
    position: { width: 520, height: 460 },
    // Each edit saves as soon as the field changes, so there's no Save button to forget.
    form: {
      handler: TagManager.#onSubmit,
      submitOnChange: true,
      closeOnSubmit: false,
    },
    actions: {
      addTag: TagManager.#onAddTag,
      deleteTag: TagManager.#onDeleteTag,
    },
  };

  static override PARTS = {
    tags: { template: TEMPLATES.tagManager, scrollable: [".tag-list"] },
  };

  protected override async _prepareContext(
    options: DeepPartial<ApplicationV2.RenderOptions> & {
      isFirstRender: boolean;
    },
  ): Promise<TagManager.RenderContext> {
    const context = await super._prepareContext(options);

    return {
      ...context,
      tags: getTags().map((tag) => ({
        ...tag,
        deletable: tag.id !== PERSONAL_TAG_ID,
      })),
    };
  }

  static async #onSubmit(
    this: TagManager,
    _event: SubmitEvent | Event,
    _form: HTMLFormElement,
    formData: foundry.applications.ux.FormDataExtended,
  ): Promise<void> {
    // Fields are named `<tagId>.name` and `<tagId>.color`.
    const changes = foundry.utils.expandObject(formData.object) as Record<
      string,
      TagChanges
    >;
    await updateTags(changes);
  }

  static async #onAddTag(this: TagManager): Promise<void> {
    await createTag();
  }

  static async #onDeleteTag(
    this: TagManager,
    _event: PointerEvent,
    target: HTMLElement,
  ): Promise<void> {
    const tag = getTag(
      target.closest<HTMLElement>("[data-tag-id]")?.dataset["tagId"],
    );
    if (!tag) return;

    const confirmed = await DialogV2.confirm({
      window: { title: "TODOS.Tags.DeleteTitle" },
      content: `<p>${
        game.i18n?.format("TODOS.Tags.DeleteConfirm", {
          name: foundry.utils.escapeHTML(tag.name),
        }) ?? ""
      }</p>`,
    });
    if (confirmed) await deleteTag(tag.id);
  }
}

export declare namespace TagManager {
  interface RenderContext
    extends HandlebarsApplicationMixin.RenderContext,
      ApplicationV2.RenderContext {
    tags: (TagView & { deletable: boolean })[];
  }
}
