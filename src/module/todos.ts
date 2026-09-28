import { MODULE_ID } from "./constants.ts";

export interface Todo {
  id: string;
  text: string;
  done: boolean;
  tagId: string | null;
  createdAt: number;
  // The GM who shared this todo. Shared todos keep the same `id` in every recipient's list.
  sharedBy?: string;
}

// Todos live in each user's own flags, keyed by id: `flags.foundryvtt-todos.todos.<id>`.
// Players may update their own `User` document and GMs may update anyone's, so no socket relay is needed.
// Writing one todo at a time merges server-side, so a GM edit and a player's check-off never clobber each other.
export function currentUser(): User.Stored {
  const user = game.user;
  if (!user) {
    throw new Error(`${MODULE_ID} | Todos accessed before the user was ready.`);
  }

  return user;
}

export function getTodos(user: User.Implementation = currentUser()): Todo[] {
  return Object.values(user.getFlag(MODULE_ID, "todos") ?? {}).sort(
    (a, b) => a.createdAt - b.createdAt,
  );
}

function findTodo(id: string): Todo | undefined {
  return getTodos().find((todo) => todo.id === id);
}

export async function addTodo(
  text: string,
  tagId: string | null,
): Promise<void> {
  const trimmed = text.trim();
  if (!trimmed) return;

  const id = foundry.utils.randomID();
  await currentUser().setFlag(MODULE_ID, `todos.${id}`, {
    id,
    text: trimmed,
    done: false,
    tagId,
    createdAt: Date.now(),
  });
}

export async function toggleTodo(id: string): Promise<void> {
  const todo = findTodo(id);
  if (!todo) return;

  await currentUser().setFlag(MODULE_ID, `todos.${id}`, { done: !todo.done });
}

// Shared todos belong to the GM who sent them: recipients can only check them off.
export async function deleteTodo(id: string): Promise<void> {
  const todo = findTodo(id);
  if (!todo || todo.sharedBy) return;

  await currentUser().unsetFlag(MODULE_ID, `todos.${id}`);
}

export async function clearCompleted(): Promise<void> {
  const user = currentUser();
  const completed = getTodos(user).filter(
    (todo) => todo.done && !todo.sharedBy,
  );

  await Promise.all(
    completed.map((todo) => user.unsetFlag(MODULE_ID, `todos.${todo.id}`)),
  );
}
