// Cores e helpers de gráfico — módulo neutro (sem "use client"),
// para poder ser usado tanto em Server Components quanto em Client Components.

export const PIE_COLORS = [
  "#7c3aed", "#0ea5e9", "#22c55e", "#f59e0b", "#ef4444",
  "#ec4899", "#14b8a6", "#8b5cf6", "#64748b", "#f97316",
];

export function categoryLegend(data: { name: string; value: number }[]) {
  return data.map((d, i) => ({ ...d, color: PIE_COLORS[i % PIE_COLORS.length] }));
}
