import { z } from "zod";

export const transactionSchema = z.object({
  description: z.string().trim().min(2, "Informe uma descrição (mín. 2 caracteres)."),
  amount: z.coerce.number().positive("O valor deve ser maior que zero."),
  date: z.string().min(1, "Informe a data."),
});

export const goalSchema = z.object({
  title: z.string().trim().min(2, "Informe um título."),
  target_amount: z.coerce.number().positive("A meta deve ser maior que zero."),
});

/** Helper: valida e retorna a primeira mensagem de erro (ou null se ok). */
export function firstError<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): string | null {
  const result = schema.safeParse(data);
  if (result.success) return null;
  return result.error.issues[0]?.message ?? "Dados inválidos.";
}
