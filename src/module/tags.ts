import { MODULE_ID } from "./constants.ts";
import { rerenderApps } from "./rerender.ts";

export interface Tag {
  id: string;
  name: string;
  // Always a lowercase `#rrggbb` string, unique among tags.
  color: string;
}

export interface TagView extends Tag {
  textColor: string;
}

export const PERSONAL_TAG_ID = "personal";

// Handed out in order to new tags, then random colors once these are taken.
const PALETTE = [
  "#4a90d9",
  "#e5534b",
  "#57ab5a",
  "#c69026",
  "#986ee2",
  "#39c5cf",
  "#e0823d",
  "#d16d9e",
  "#768390",
];

const HEX_COLOR = /^#[0-9a-f]{6}$/;

// Tags live in a world setting: every user reads them, only users allowed to modify settings (GMs) write them.
export function registerTagSettings(): void {
  game.settings?.register(MODULE_ID, "tags", {
    scope: "world",
    config: false,
    type: Object,
    default: {
      [PERSONAL_TAG_ID]: {
        id: PERSONAL_TAG_ID,
        name: "Personal",
        color: PALETTE[0] ?? "#4a90d9",
      },
    },
    onChange: rerenderApps,
  });
}

export function canManageTags(): boolean {
  return game.user?.can("SETTINGS_MODIFY") ?? false;
}

function getTagMap(): Record<string, Tag> {
  return game.settings?.get(MODULE_ID, "tags") ?? {};
}

async function saveTags(tags: Record<string, Tag>): Promise<void> {
  await game.settings?.set(MODULE_ID, "tags", tags);
}

// Personal first, then alphabetical.
export function getTags(): TagView[] {
  return Object.values(getTagMap())
    .sort((a, b) =>
      a.id === PERSONAL_TAG_ID
        ? -1
        : b.id === PERSONAL_TAG_ID
          ? 1
          : a.name.localeCompare(b.name),
    )
    .map(toView);
}

export function getTag(id: string | null | undefined): TagView | undefined {
  const tag = id ? getTagMap()[id] : undefined;
  return tag ? toView(tag) : undefined;
}

// `selectOptions` choices, keyed by tag id.
export function getTagChoices(): Record<string, string> {
  return Object.fromEntries(getTags().map((tag) => [tag.id, tag.name]));
}

export async function createTag(): Promise<void> {
  const tags = foundry.utils.deepClone(getTagMap());
  const used = new Set(Object.values(tags).map((tag) => tag.color));
  const id = foundry.utils.randomID();

  tags[id] = {
    id,
    name: game.i18n?.localize("TODOS.Tags.NewTag") ?? "New Tag",
    color: PALETTE.find((color) => !used.has(color)) ?? randomColor(used),
  };

  await saveTags(tags);
}

export interface TagChanges {
  name?: string;
  color?: string;
}

// Applies edits from the tag manager, rejecting blank names and colors already used by another tag.
export async function updateTags(
  changes: Record<string, TagChanges>,
): Promise<void> {
  const tags = foundry.utils.deepClone(getTagMap());
  let changed = false;
  let colorTaken = false;

  for (const [id, change] of Object.entries(changes)) {
    const tag = tags[id];
    if (!tag) continue;

    const name = change.name?.trim();
    if (name && name !== tag.name) {
      tag.name = name;
      changed = true;
    }

    const color = change.color?.toLowerCase();
    if (!color || color === tag.color || !HEX_COLOR.test(color)) continue;

    if (Object.values(tags).some((other) => other.color === color)) {
      colorTaken = true;
      continue;
    }

    tag.color = color;
    changed = true;
  }

  if (colorTaken) {
    ui.notifications?.warn("TODOS.Tags.ColorTaken", { localize: true });
  }

  if (changed) {
    await saveTags(tags);
  } else {
    // Nothing saved means no `onChange` re-render, so reset the rejected inputs by hand.
    rerenderApps();
  }
}

export async function deleteTag(id: string): Promise<void> {
  if (id === PERSONAL_TAG_ID) return;

  const tags = foundry.utils.deepClone(getTagMap());
  // Settings are saved whole, so dropping the key removes the tag. Todos pointing at it simply show no tag.
  // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
  delete tags[id];
  await saveTags(tags);
}

function randomColor(used: Set<string>): string {
  let color: string;
  do {
    color = `#${Math.floor(Math.random() * 0x1000000)
      .toString(16)
      .padStart(6, "0")}`;
  } while (used.has(color));
  return color;
}

function toView(tag: Tag): TagView {
  return { ...tag, textColor: readableTextColor(tag.color) };
}

// Black or white, whichever reads better on the tag color (WCAG relative luminance).
function readableTextColor(hex: string): string {
  const channels = [1, 3, 5].map((start) => {
    const value = Number.parseInt(hex.slice(start, start + 2), 16) / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const [r = 0, g = 0, b = 0] = channels;
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.179 ? "#000000" : "#ffffff";
}
