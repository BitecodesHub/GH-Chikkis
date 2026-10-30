type ClassValue = string | false | null | undefined | 0;

export function cn(...inputs: ClassValue[]): string {
  return inputs.filter(Boolean).join(" ");
}
