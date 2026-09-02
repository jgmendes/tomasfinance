import { z } from "zod";

export { firstError } from "@/lib/schemas";

export const negotiationSchema = z.object({
  client_user_id: z.string().trim().min(1, "Selecione o cliente."),
  client_company_name: z.string().trim().min(2, "Informe o nome da empresa do cliente."),
  necessidade: z.string().trim().min(2, "Descreva a necessidade."),
  taxa_atual: z.string().trim().optional(),
  volume_atual: z.string().trim().optional(),
  custo_estimado_atual: z.string().trim().optional(),
  taxa_inicial: z.string().trim().min(1, "Informe a taxa/condição da proposta inicial."),
  custo_estimado_inicial: z.string().trim().optional(),
});

export const proposalTermsSchema = z.object({
  taxa: z.string().trim().min(1, "Informe a taxa/condição desejada."),
  volume: z.coerce.number().optional(),
  prazo_meses: z.coerce.number().optional(),
  condicao_pagamento: z.string().trim().optional(),
  message: z.string().trim().optional(),
});
