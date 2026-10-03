import { ChevronDownIcon } from "./icons";

type Props<T extends string> = {
  id: string;
  label: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
  disabled?: boolean;
  /** Colour classes for the pill (background, text, ring). */
  pillClassName: string;
  /** Text colour for the chevron, to match the pill. */
  chevronClassName?: string;
};

// A native <select> styled as a small rounded pill with a chevron.
export function PillSelect<T extends string>({
  id,
  label,
  value,
  options,
  onChange,
  disabled,
  pillClassName,
  chevronClassName = "text-muted",
}: Props<T>) {
  return (
    <div className="relative">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value as T)}
        disabled={disabled}
        className={`cursor-pointer appearance-none rounded-full py-1 pr-7 pl-2.5 text-xs font-medium ring-1 ring-inset transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 disabled:cursor-not-allowed ${pillClassName}`}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDownIcon
        className={`pointer-events-none absolute top-1/2 right-2 size-3 -translate-y-1/2 ${chevronClassName}`}
      />
    </div>
  );
}
