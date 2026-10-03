import {
  DESCRIPTION_MAX_LENGTH,
  isDueDate,
  isPriority,
  isProgress,
  TITLE_MAX_LENGTH,
  type Priority,
  type Progress,
  type TaskChangesInput,
} from "./tasks";

// Input checks shared by the Server Actions. Each returns the cleaned value,
// or `{ error }` with a message that's safe to show the user.

export type Invalid = { error: string };

export function isInvalid(value: unknown): value is Invalid {
  return typeof value === "object" && value !== null && "error" in value;
}

export function validateTitle(title: unknown): string | Invalid {
  if (typeof title !== "string" || title.trim().length === 0) {
    return { error: "Task title can't be empty." };
  }
  if (title.trim().length > TITLE_MAX_LENGTH) {
    return { error: `Keep it under ${TITLE_MAX_LENGTH} characters.` };
  }
  return title.trim();
}

// Empty (or only whitespace) clears the description.
export function validateDescription(description: unknown): string | null | Invalid {
  if (description === null || description === undefined) return null;
  if (typeof description !== "string") return { error: "Invalid description." };
  const value = description.trim();
  if (value.length > DESCRIPTION_MAX_LENGTH) {
    return { error: `Keep the description under ${DESCRIPTION_MAX_LENGTH} characters.` };
  }
  return value || null;
}

export function validatePriority(priority: unknown): Priority | Invalid {
  return isPriority(priority) ? priority : { error: "Invalid priority." };
}

// Empty means "no due date"; anything else must be a real YYYY-MM-DD date.
export function validateDueDate(dueDate: unknown): string | null | Invalid {
  if (dueDate === null || dueDate === "" || dueDate === undefined) return null;
  return isDueDate(dueDate) ? dueDate : { error: "Pick a valid due date." };
}

export const EMAIL_MAX_LENGTH = 254;

// Deliberately loose: the real check is whether a user has this email.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: unknown): string | Invalid {
  const value = typeof email === "string" ? email.trim().toLowerCase() : "";
  if (!value || value.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(value)) {
    return { error: "Enter a valid email address." };
  }
  return value;
}

/** Column values for a task update, validated. Only fields present in `input` are included. */
export type TaskColumnChanges = {
  title?: string;
  description?: string | null;
  progress?: Progress;
  priority?: Priority;
  due_date?: string | null;
};

export function validateTaskChanges(input: TaskChangesInput): TaskColumnChanges | Invalid {
  const changes: TaskColumnChanges = {};

  if (input.title !== undefined) {
    const title = validateTitle(input.title);
    if (isInvalid(title)) return title;
    changes.title = title;
  }
  if (input.description !== undefined) {
    const description = validateDescription(input.description);
    if (isInvalid(description)) return description;
    changes.description = description;
  }
  if (input.progress !== undefined) {
    if (!isProgress(input.progress)) return { error: "Invalid progress value." };
    changes.progress = input.progress;
  }
  if (input.priority !== undefined) {
    const priority = validatePriority(input.priority);
    if (isInvalid(priority)) return priority;
    changes.priority = priority;
  }
  if (input.dueDate !== undefined) {
    const dueDate = validateDueDate(input.dueDate);
    if (isInvalid(dueDate)) return dueDate;
    changes.due_date = dueDate;
  }
  return changes;
}
