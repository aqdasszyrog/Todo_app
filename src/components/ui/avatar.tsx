export function initialsOf(name: string) {
  return name
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

const SIZES = {
  sm: "size-7 text-[10px]",
  md: "size-8 text-xs",
};

// Initials in a circle with the app's gradient ring.
export function Avatar({
  name,
  size = "md",
  dimmed,
}: {
  name: string;
  size?: keyof typeof SIZES;
  /** For people who haven't accepted yet. */
  dimmed?: boolean;
}) {
  return (
    <span
      title={name}
      // h-fit: never stretch to a taller flex row (e.g. a long notification).
      className={`h-fit shrink-0 rounded-full p-px ${
        dimmed ? "bg-line-strong" : "bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500"
      }`}
    >
      <span
        className={`grid place-items-center rounded-full bg-bg font-semibold ${SIZES[size]} ${
          dimmed ? "text-muted" : ""
        }`}
      >
        {initialsOf(name)}
      </span>
    </span>
  );
}
