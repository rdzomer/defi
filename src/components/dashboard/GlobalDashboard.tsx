
'use client';

import { usePools } from '@/app/providers';
import { KpiCard } from '@/components/KpiCard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import type { DailyEntry, Pool } from '@/types';
import {
  DollarSign,
  Landmark,
  TrendingUp,
  ArrowRight,
  PlusCircle,
  Wallet,
  Coins,
} from 'lucide-react';
import Link from 'next/link';
import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart';
import { useMemo, useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { DailyEntryForm } from '../entries/DailyEntryForm';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { fetchRealtimeTokenPrices } from '@/app/actions';
import { Badge } from '../ui/badge';


const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  
const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);

const chartConfig: ChartConfig = {
  positionValue: {
    label: 'Position Value (USD)',
    color: 'hsl(var(--accent))',
  },
  withdrawnFees: {
    label: 'Withdrawn Fees (USD)',
    color: 'hsl(var(--primary))',
  },
};

const formatYAxis = (tickItem: number) => {
    if (tickItem === 0) return '$0';
    if (Math.abs(tickItem) < 1000) {
        return `$${tickItem.toLocaleString(undefined, {
            minimumFractionDigits: 0,
            maximumFractionDigits: 2,
        })}`;
    }
    if (Math.abs(tickItem) >= 1000) {
      return `$${(tickItem / 1000).toLocaleString(undefined, {
          minimumFractionDigits: 0,
          maximumFractionDigits: 1,
      })}k`;
    }
    return `$${tickItem}`;
};

const formatXAxis = (tickItem: string) => {
    if (!tickItem) return '';
    const dateParts = tickItem.split('-');
    if (dateParts.length !== 3) return tickItem;
    const [year, month, day] = dateParts;
    return `${day}/${month}`;
}

const formatSmallNumber = (value: number) => {
    if (value === 0) return '0';
    if (isNaN(value)) return '0';
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 18 });
};

export function GlobalDashboard() {
  const { pools, entries, dataLoading, usdToBRL } = usePools();
  const [isEntryModalOpen, setEntryModalOpen] = useState(false);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [realtimePrices, setRealtimePrices] = useState<Record<string, number>>({});
  const [pricesLoading, setPricesLoading] = useState(true);

  const handleNewEntryClick = (pool: Pool) => {
    setSelectedPool(pool);
    setEntryModalOpen(true);
  };
  
  const activePools = useMemo(() => {
    return pools.filter(pool => {
        const lastEntry = entries
            .filter(e => e.poolId === pool.id)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        // If there's no entry, pool is new and considered active
        if (!lastEntry) {
            return true;
        }
        
        // If last entry has value > 0, it's active
        return lastEntry.positionValueUSD > 0;
    });
  }, [pools, entries]);


  useEffect(() => {
    async function getRealtimePrices() {
        if (activePools.length === 0) {
            setPricesLoading(false);
            return;
        };

        setPricesLoading(true);
        const tokenIds = activePools.flatMap(p => [p.tokenAId, p.tokenBId]);
        const result = await fetchRealtimeTokenPrices(tokenIds);

        if (result.success && result.prices) {
            setRealtimePrices(result.prices);
        } else {
            console.error("Failed to fetch real-time prices:", result.error);
        }
        setPricesLoading(false);
    }

    if (!dataLoading) {
      getRealtimePrices();
    }
  }, [activePools, dataLoading]);

  const {
    totalInvested,
    totalWithdrawn,
    currentTotalValue,
    totalAccumulatedFees,
    netProfitability,
  } = useMemo(() => {
    let totalInvested = 0;
    const initialInvestments = new Map<string, number>();

    pools.forEach(pool => {
      const poolEntries = entries
        .filter(e => e.poolId === pool.id)
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (poolEntries.length > 0) {
        initialInvestments.set(pool.id, poolEntries[0].positionValueUSD);
        totalInvested += poolEntries[0].positionValueUSD;
      }
    });

    const currentTotalValue = pools.reduce((acc, pool) => {
      const lastEntry = entries
        .filter(e => e.poolId === pool.id)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      return acc + (lastEntry?.positionValueUSD || 0);
    }, 0);

    const totalWithdrawn = entries.reduce((acc, entry) => acc + (entry.feesWithdrawnUSD || 0), 0);
    
    const totalAccumulatedFees = pools.reduce((acc, pool) => {
        const lastEntry = entries
          .filter(e => e.poolId === pool.id)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
        
        if (!lastEntry) return acc;

        const priceA = realtimePrices[pool.tokenAId] ?? lastEntry.tokenAPriceUSD;
        const priceB = realtimePrices[pool.tokenBId] ?? lastEntry.tokenBPriceUSD;

        const feesInUSD = 
            (lastEntry.feesAccumulatedTokenA * (priceA || 0)) + 
            (lastEntry.feesAccumulatedTokenB * (priceB || 0));

        return acc + (feesInUSD || 0);
    }, 0);

    const netProfitability = totalInvested > 0
      ? ((currentTotalValue + totalWithdrawn) - totalInvested) / totalInvested
      : 0;

    return { totalInvested, totalWithdrawn, currentTotalValue, totalAccumulatedFees, netProfitability };
  }, [pools, entries, realtimePrices]);
  
  const aggregatedChartData = useMemo(() => {
    if (entries.length === 0) return [];
  
    const allDates = [...new Set(entries.map(e => e.date))].sort((a,b) => new Date(a).getTime() - new Date(b).getTime());
    if (allDates.length === 0) return [];
  
    const latestPoolValues: { [poolId: string]: DailyEntry } = {};
  
    return allDates.map(date => {
      entries.forEach(entry => {
        if (entry.date === date) {
          latestPoolValues[entry.poolId] = entry;
        }
      });
  
      let totalPositionValueOnDate = 0;
      let withdrawnFeesOnDate = 0;
      
      for (const poolId in latestPoolValues) {
        const latestEntry = latestPoolValues[poolId];
        if (latestEntry.positionValueUSD > 0) {
            totalPositionValueOnDate += latestEntry.positionValueUSD;
        }
      }
      
       entries.forEach(entry => {
        if (entry.date === date) {
            withdrawnFeesOnDate += entry.feesWithdrawnUSD || 0;
        }
      });
  
      return {
        date,
        positionValue: totalPositionValueOnDate,
        withdrawnFees: withdrawnFeesOnDate,
      };
    });
  
  }, [pools, entries]);

  if (dataLoading) {
    return (
        <div className="space-y-8">
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
                <Skeleton className="h-[300px]" />
                <Skeleton className="h-[300px]" />
            </div>
            <div>
                <Skeleton className="h-8 w-48 mb-4" />
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                </div>
            </div>
        </div>
    );
  }

  if (pools.length === 0) {
    return (
      <div className="text-center py-16">
        <h2 className="font-headline text-3xl mb-2">Bem-vindo ao Liquidity-Tracker</h2>
        <p className="text-muted-foreground mb-6">Comece criando sua primeira posição de liquidez.</p>
        <p className="text-sm text-muted-foreground">Clique no botão "Nova Posição" no cabeçalho.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 items-start">
        <KpiCard title="Valor Total em Pools" value={formatCurrency(currentTotalValue)} description={formatBRL(currentTotalValue * usdToBRL)} icon={DollarSign} />
        <KpiCard title="Total de Taxas Acumuladas" value={formatCurrency(totalAccumulatedFees)} description={formatBRL(totalAccumulatedFees * usdToBRL)} icon={TrendingUp} />
        <KpiCard title="Total de Taxas Sacadas" value={formatCurrency(totalWithdrawn)} description={formatBRL(totalWithdrawn * usdToBRL)} icon={Landmark} />
        <KpiCard title="Rentabilidade Líquida" value={`${(netProfitability * 100).toFixed(2)}%`} description="Realizado + Não Realizado" icon={TrendingUp} />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Evolução do Valor Total da Posição</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={aggregatedChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={12} tickFormatter={formatXAxis} />
                <YAxis tickFormatter={formatYAxis} tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={12} />
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent indicator="line" />}
                />
                <Line type="monotone" dataKey="positionValue" stroke="hsl(var(--accent))" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Taxas Diárias Sacadas</CardTitle>
          </CardHeader>
          <CardContent>
             <ChartContainer config={chartConfig} className="h-[250px] w-full">
                <BarChart data={aggregatedChartData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={12} tickFormatter={formatXAxis} />
                    <YAxis tickFormatter={formatYAxis} tick={{ fill: 'hsl(var(--muted-foreground))' }} fontSize={12} />
                    <ChartTooltip
                      cursor={false}
                      content={<ChartTooltipContent indicator="dot" />}
                    />
                    <Bar dataKey="withdrawnFees" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-2xl font-headline mb-4">Suas Posições</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {activePools.map(pool => {
            const realtimePriceA = realtimePrices[pool.tokenAId];
            const realtimePriceB = realtimePrices[pool.tokenBId];
            
            const lastEntry = entries
              .filter(e => e.poolId === pool.id)
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
            
            let currentPriceRatio: number | null = null;
            let usingRealtimePrice = false;

            if (realtimePriceA && realtimePriceB && realtimePriceA !== 0) {
                currentPriceRatio = realtimePriceA / realtimePriceB;
                usingRealtimePrice = true;
            } else if (lastEntry && lastEntry.tokenBPriceUSD !== 0) {
                currentPriceRatio = lastEntry.tokenAPriceUSD / lastEntry.tokenBPriceUSD;
            }

            const rangeMin = pool.rangeMin;
            const rangeMax = pool.rangeMax;

            const isInRange = currentPriceRatio !== null && !isNaN(rangeMin) && !isNaN(rangeMax)
                ? currentPriceRatio >= rangeMin && currentPriceRatio <= rangeMax
                : null;
            
            const currentPositionValue = lastEntry?.positionValueUSD ?? 0;
            
            const priceA = realtimePriceA ?? lastEntry?.tokenAPriceUSD;
            const priceB = realtimePriceB ?? lastEntry?.tokenBPriceUSD;
            const feesA = lastEntry?.feesAccumulatedTokenA ?? 0;
            const feesB = lastEntry?.feesAccumulatedTokenB ?? 0;

            const accumulatedFeesValue = (feesA * (priceA || 0)) + (feesB * (priceB || 0));

            return (
              <Card key={pool.id} className="flex flex-col justify-between shadow-md hover:shadow-accent/20 transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="font-headline">{pool.name}</CardTitle>
                      <CardDescription>
                        {pool.platform} - {pool.feeTier}
                        <br />
                        <span className="text-xs text-accent/80 font-mono">
                          Range: {formatSmallNumber(pool.rangeMin)} &ndash; {formatSmallNumber(pool.rangeMax)}
                        </span>
                        {pricesLoading ? (
                            <>
                                <br />
                                <Skeleton className="h-4 w-32 mt-1" />
                            </>
                        ) : currentPriceRatio !== null && (
                           <>
                            <br />
                            <span className="flex items-center gap-2">
                              <span className={cn(
                                  "text-xs font-medium",
                                  isInRange === null ? '' : (isInRange ? "text-green-400" : "text-red-500")
                              )}>
                                  Preço Atual: {currentPriceRatio.toLocaleString('pt-BR', { maximumFractionDigits: 8 })}
                              </span>
                               {usingRealtimePrice && <Badge variant="outline" className="px-1 py-0 text-xs border-accent/50 text-accent/80">ao vivo</Badge>}
                            </span>
                          </>
                        )}
                      </CardDescription>
                    </div>
                    <Link href={`/pools/${pool.id}`} passHref>
                      <Button variant="ghost" size="icon">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col flex-grow justify-end">
                    <div className="space-y-3 mb-4">
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center text-muted-foreground">
                                <Wallet className="mr-2 h-4 w-4" />
                                Valor da Posição
                            </span>
                            <span className="font-medium font-mono">{formatCurrency(currentPositionValue)}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center text-muted-foreground">
                                <Coins className="mr-2 h-4 w-4" />
                                Taxas a Recolher
                            </span>
                            <span className="font-medium font-mono">{formatCurrency(accumulatedFeesValue)}</span>
                        </div>
                    </div>
                   <Button onClick={() => handleNewEntryClick(pool)} className="w-full rounded-2xl mt-auto">
                      <PlusCircle className="mr-2 h-4 w-4" />
                      Nova Entrada Diária
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
      <Dialog open={isEntryModalOpen} onOpenChange={setEntryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Nova Entrada Diária para {selectedPool?.name}</DialogTitle>
            <DialogDescription>
              Registre seus rendimentos diários e valores de posição.
            </DialogDescription>
          </DialogHeader>
          {selectedPool && <DailyEntryForm pool={selectedPool} onSuccess={() => setEntryModalOpen(false)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

    