// client/src/utils/cn.js
// Utility to merge Tailwind class names conditionally.
// Replaces the need for the clsx/tailwind-merge packages for simple cases.
export function cn(...classes) {
  return classes
    .flat()
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
