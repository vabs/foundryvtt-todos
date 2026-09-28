import { MODULE_ID } from "./constants.ts";
import { currentUser, getTodos } from "./todos.ts";

// A todo the GM shared, gathered from every recipient's copy.
export interface Share {
  id: string;
  text: string;
  tagId: string | null;
  createdAt: number;
  recipients: { user: User.Stored; done: boolean }[];
}

export interface ShareInput {
  text: string;
  tagId: string | null;
  recipientIds: string[];
}

export function canShare(): boolean {
  return game.user?.isGM ?? false;
}

export function getPlayers(): User.Stored[] {
  return (game.users?.filter((user) => !user.isGM) ?? []).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}

// Shares aren't stored separately: every client already has every `User`, so they're rebuilt from the recipients' flags.
export function getShares(): Share[] {
  const shares = new Map<string, Share>();

  for (const user of game.users ?? []) {
    for (const todo of getTodos(user)) {
      if (!todo.sharedBy) continue;

      let share = shares.get(todo.id);
      if (!share) {
        share = {
          id: todo.id,
          text: todo.text,
          tagId: todo.tagId,
          createdAt: todo.createdAt,
          recipients: [],
        };
        shares.set(todo.id, share);
      }

      share.recipients.push({ user, done: todo.done });
    }
  }

  return [...shares.values()].sort((a, b) => b.createdAt - a.createdAt);
}

export function getShare(id: string): Share | undefined {
  return getShares().find((share) => share.id === id);
}

// Creates a share, or with `id` updates one: recipients added get a fresh copy, removed ones lose theirs,
// and everyone else keeps their own done state.
export async function saveShare(
  input: ShareInput,
  id?: string,
): Promise<boolean> {
  if (!canShare()) return false;

  const text = input.text.trim();
  if (!text) {
    ui.notifications?.warn("TODOS.Shared.TextRequired", { localize: true });
    return false;
  }

  if (!input.recipientIds.length) {
    ui.notifications?.warn("TODOS.Shared.RecipientsRequired", {
      localize: true,
    });
    return false;
  }

  const existing = id ? getShare(id) : undefined;
  const shareId = existing?.id ?? foundry.utils.randomID();
  const createdAt = existing?.createdAt ?? Date.now();
  const previous = new Set(existing?.recipients.map(({ user }) => user.id));
  const next = new Set(input.recipientIds);
  const writes: Promise<unknown>[] = [];

  for (const userId of next) {
    const user = game.users?.get(userId);
    if (!user) continue;

    writes.push(
      user.setFlag(
        MODULE_ID,
        `todos.${shareId}`,
        previous.has(userId)
          ? { text, tagId: input.tagId }
          : {
              id: shareId,
              text,
              tagId: input.tagId,
              done: false,
              createdAt,
              sharedBy: currentUser().id,
            },
      ),
    );
  }

  for (const userId of previous) {
    if (next.has(userId)) continue;
    const user = game.users?.get(userId);
    if (user) writes.push(user.unsetFlag(MODULE_ID, `todos.${shareId}`));
  }

  await Promise.all(writes);
  return true;
}

export async function deleteShare(id: string): Promise<void> {
  const share = getShare(id);
  if (!share || !canShare()) return;

  await Promise.all(
    share.recipients.map(({ user }) =>
      user.unsetFlag(MODULE_ID, `todos.${id}`),
    ),
  );
}
