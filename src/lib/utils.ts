export function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || `workspace-${Math.random().toString(36).slice(2, 8)}`;
}

export function randomId(prefix = "") {
  return `${prefix}${Math.random().toString(36).slice(2, 8)}${Math.random().toString(36).slice(2, 8)}`;
}
