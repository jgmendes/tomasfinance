import type { TransactionType } from "@/lib/database.types";

// Mapa de palavras-chave → nome da categoria (deve bater com as categorias padrão).
const RULES: Record<TransactionType, { category: string; keywords: string[] }[]> = {
  despesa: [
    { category: "Alimentação", keywords: ["mercado", "supermerc", "restaurante", "ifood", "lanche", "comida", "padaria", "almoço", "almoco", "jantar", "rappi"] },
    { category: "Transporte", keywords: ["uber", "99", "gasolina", "combust", "ônibus", "onibus", "metrô", "metro", "passagem", "posto", "estaciona", "pedágio", "pedagio"] },
    { category: "Moradia", keywords: ["aluguel", "condomín", "condomin", "iptu", "imóvel", "imovel"] },
    { category: "Internet", keywords: ["internet", "wifi", "wi-fi", "vivo fibra", "banda larga"] },
    { category: "Energia", keywords: ["energia", "luz", "elétric", "eletric", "enel", "cemig", "cpfl", "light"] },
    { category: "Água", keywords: ["água", "agua", "saneamento", "sabesp", "cedae"] },
    { category: "Funcionários", keywords: ["salário", "salario", "funcion", "folha", "pró-labore", "pro-labore"] },
    { category: "Marketing", keywords: ["anúncio", "anuncio", "ads", "facebook", "google ads", "marketing", "tráfego", "trafego", "instagram"] },
    { category: "Impostos", keywords: ["imposto", "das", "simples nacional", "inss", "tributo", "darf", "fgts"] },
    { category: "Investimentos", keywords: ["aporte", "investimento", "cdb", "tesouro", "ação", "acao", "cripto"] },
  ],
  receita: [
    { category: "Salário", keywords: ["salário", "salario", "holerite", "contracheque"] },
    { category: "Freelance", keywords: ["freela", "freelance", "projeto", "job"] },
    { category: "Comissões", keywords: ["comissão", "comissao", "bônus", "bonus"] },
    { category: "Empresa", keywords: ["venda", "cliente", "faturamento", "nota fiscal", "nf"] },
    { category: "Investimentos", keywords: ["dividendo", "rendimento", "juros", "proventos"] },
  ],
};

/** Sugere o NOME da categoria a partir da descrição. Retorna null se nada casar. */
export function suggestCategory(
  description: string,
  type: TransactionType
): string | null {
  const text = description.toLowerCase();
  for (const rule of RULES[type]) {
    if (rule.keywords.some((kw) => text.includes(kw))) {
      return rule.category;
    }
  }
  return null;
}
