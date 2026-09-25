import { CheckIcon } from "./icons";

export function Logo({ size = "sm" }: { size?: "sm" | "lg" }) {
  const box = size === "lg" ? "size-12 rounded-2xl" : "size-8 rounded-xl";
  const icon = size === "lg" ? "size-6" : "size-4";
  return (
    <span
      className={`grid ${box} place-items-center bg-gradient-to-br from-indigo-500 via-violet-500 to-fuchsia-500 text-white shadow-lg shadow-violet-500/30`}
    >
      <CheckIcon className={`${icon} stroke-[3]`} />
    </span>
  );
}
