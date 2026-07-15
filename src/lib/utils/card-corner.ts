export function targetEntityCornerLabel(id: string | number | null | undefined): string | undefined {
  const label = String(id ?? "").trim();
  return /^\d+$/.test(label) ? label : undefined;
}
