'use server';
/**
 * @fileOverview Um fluxo de IA para analisar o rendimento diário de um pool.
 *
 * - suggestYield - Uma função que analisa o novo valor de taxas acumuladas com base no histórico.
 * - SuggestYieldInput - O tipo de entrada para a função suggestYield.
 * - SuggestYieldOutput - O tipo de retorno para a função suggestYield.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestYieldInputSchema = z.object({
  pool: z.object({
    name: z.string(),
    tokenA: z.string(),
    tokenB: z.string(),
  }),
  entries: z.array(z.object({
      date: z.string(),
      feesAccumulatedUSD: z.number(),
  })).describe("Uma lista de entradas diárias históricas para o pool, da mais recente para a mais antiga."),
  currentFeesAccumulatedUSD: z.number().describe("O novo valor total de taxas acumuladas que o usuário acabou de inserir para o dia atual."),
});
export type SuggestYieldInput = z.infer<typeof SuggestYieldInputSchema>;


const SuggestYieldOutputSchema = z.object({
    analysis: z.string().describe("Uma breve análise em português, comparando o ganho do dia atual com a média histórica. Ex: 'O ganho de hoje de $5.20 está acima da sua média diária de $4.80.'"),
});
export type SuggestYieldOutput = z.infer<typeof SuggestYieldOutputSchema>;

export async function suggestYield(input: SuggestYieldInput): Promise<SuggestYieldOutput> {
  return suggestYieldFlow(input);
}

const prompt = ai.definePrompt({
  name: 'suggestYieldPrompt',
  input: { schema: SuggestYieldInputSchema },
  output: { schema: SuggestYieldOutputSchema },
  prompt: `Você é um analista especialista em DeFi. Sua tarefa é analisar um novo ponto de dados de taxas acumuladas para um pool de liquidez e fornecer um breve insight.

O usuário inseriu o novo valor total de taxas acumuladas para hoje: \${{currentFeesAccumulatedUSD}}.

Baseado no histórico de entradas, faça o seguinte:
1. Calcule o ganho do dia. Para isso, pegue o valor que o usuário inseriu (currentFeesAccumulatedUSD) e subtraia o valor de 'feesAccumulatedUSD' da entrada mais recente no histórico (o primeiro item na lista de 'entries').
2. Calcule o ganho médio diário com base nas entradas históricas fornecidas.
3. Forneça uma análise concisa em uma única frase em português, comparando o ganho do dia com a média.

Dados do Pool:
- Nome: {{pool.name}}
- Par: {{pool.tokenA}}/{{pool.tokenB}}

Novo Total de Taxas Acumuladas (informado pelo usuário): \${{currentFeesAccumulatedUSD}}

Histórico de Entradas (da mais recente para a mais antiga):
\`\`\`json
{{{json entries}}}
\`\`\`

Exemplo de saída: "O ganho de hoje de $5.20 está um pouco acima da sua média diária de $4.80."
Arredonde todos os valores para duas casas decimais.`,
});

const suggestYieldFlow = ai.defineFlow(
  {
    name: 'suggestYieldFlow',
    inputSchema: SuggestYieldInputSchema,
    outputSchema: SuggestYieldOutputSchema,
  },
  async (input) => {
    // Garante que há pelo menos uma entrada para basear a sugestão.
    if (input.entries.length === 0) {
        throw new Error("Não há dados históricos suficientes para fazer uma análise.");
    }

    const { output } = await prompt(input);
    return output!;
  }
);
