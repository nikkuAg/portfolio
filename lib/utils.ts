export function cn(...classes: Array<string | undefined | null | false>) {
  return classes.filter(Boolean).join(" ");
}

export function range(n: number) {
  return Array.from({ length: n }, (_, i) => i);
}
