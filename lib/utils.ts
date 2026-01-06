import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Extract department code (2 first digits) from French zip code
 * @param zipCode - French zip code (e.g., "75001", "13008")
 * @returns Department code (e.g., "75", "13") or null if invalid
 */
export function getDepartmentFromZipCode(zipCode: string): string | null {
  if (!zipCode || zipCode.length < 2) return null;
  const dept = zipCode.substring(0, 2);
  return /^[0-9]{2}$/.test(dept) ? dept : null;
}
