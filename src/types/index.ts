/** Representa um pool de liquidez registrado pelo usuário */
export interface Pool {
  id: string; // UUID gerado na criação
  userId: string; // Firebase Auth User ID
  platform: string;
  name: string; // Ex.: "ETH-AAVE 0.3%"
  tokenA: string; // Símbolo do primeiro ativo
  tokenB: string; // Símbolo do segundo ativo
  tokenAId: string; // ID do CoinGecko para o Token A (ex: 'ethereum')
  tokenBId: string; // ID do CoinGecko para o Token B (ex: 'aave')
  feeTier: string; // Ex.: "0.3%"
  rangeMin: number; // Preço mínimo do range
  rangeMax: number; // Preço máximo do range
  createdAt: string; // Data ISO
}

/** Entrada de rendimento diário */
export interface DailyEntry {
  id: string; // UUID
  poolId: string; // FK -> Pool.id
  userId: string; // Firebase Auth User ID
  date: string; // YYYY-MM-DD
  positionValueUSD: number; // valor total da posição no dia
  feesAccumulatedTokenA: number; // total de taxas do token A acumuladas *até* a data
  feesAccumulatedTokenB: number; // total de taxas do token B acumuladas *até* a data
  feesWithdrawnUSD?: number; // se houver um saque neste dia
  note?: string; // observação sobre o saque
  tokenAPriceUSD: number; // preço do token A
  tokenBPriceUSD: number; // preço do token B
  usdToBRL: number; // cotação do dólar para o dia
  updatedAt?: string; // Data ISO da última atualização
}
