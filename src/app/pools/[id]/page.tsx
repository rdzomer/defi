'use client';
import { usePools } from '@/app/providers';
import { DailyEntriesTable } from '@/components/entries/DailyEntriesTable';
import { KpiCard } from '@/components/KpiCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DailyEntryForm } from '@/components/entries/DailyEntryForm';
import { ArrowLeft, DollarSign, Landmark, TrendingUp, Wallet, PlusCircle, Trash2, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useMemo, useState, useEffect } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { PoolForm } from '@/components/PoolForm';
import { fetchRealtimeTokenPrices } from '@/app/actions';


const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);
  
const formatBRL = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);


const positionChartConfig: ChartConfig = {
  positionValueUSD: {
    label: 'Position Value',
    color: 'hsl(var(--primary))',
  },
};

const feesChartConfig: ChartConfig = {
  feesValueUSD: {
    label: 'Accumulated Fees (USD)',
    color: 'hsl(var(--accent))',
  },
};

const formatYAxis = (tickItem: number) => {
    if (tickItem >= 1000) {
      return `$${(tickItem / 1000).toFixed(1).replace(/\.0$/, '')}k`;
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
    return value.toLocaleString('pt-BR', { maximumFractionDigits: 18 });
};

export default function PoolPage() {
  const params = useParams();
  const router = useRouter();
  const { pools, entries, deletePool, dataLoading, usdToBRL } = usePools();
  const { toast } = useToast();
  const id = params.id as string;
  const [isEntryModalOpen, setEntryModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [realtimePrices, setRealtimePrices] = useState<Record<string, number>>({});
  const [pricesLoading, setPricesLoading] = useState(true);

  const pool = useMemo(() => pools.find(p => p.id === id), [pools, id]);
  const poolEntries = useMemo(() => {
    return entries
      .filter(e => e.poolId === id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [entries, id]);
  
  const poolEntriesWithFeesUSD = useMemo(() => {
      return poolEntries.map(entry => ({
          ...entry,
          feesValueUSD: (entry.feesAccumulatedTokenA * entry.tokenAPriceUSD) + (entry.feesAccumulatedTokenB * entry.tokenBPriceUSD)
      }))
  }, [poolEntries]);

  useEffect(() => {
    async function getRealtimePrices() {
        if (!pool) {
            setPricesLoading(false);
            return;
        }
        setPricesLoading(true);
        const result = await fetchRealtimeTokenPrices([pool.tokenAId, pool.tokenBId]);

        if (result.success && result.prices) {
            setRealtimePrices(result.prices);
        } else {
            console.error("Failed to fetch real-time prices for pool page:", result.error);
        }
        setPricesLoading(false);
    }

    if (!dataLoading) {
        getRealtimePrices();
    }
  }, [pool, dataLoading]);


  const {
    initialValue,
    currentValue,
    totalWithdrawn,
    grossProfitability,
    netProfitability,
    valueBRL,
  } = useMemo(() => {
    if (poolEntries.length === 0) {
      return { initialValue: 0, currentValue: 0, totalWithdrawn: 0, grossProfitability: 0, netProfitability: 0, valueBRL: 0 };
    }
    const initialValue = poolEntries[0].positionValueUSD;
    const lastEntry = poolEntries[poolEntries.length - 1];
    const currentValue = lastEntry.positionValueUSD;
    const totalWithdrawn = poolEntries.reduce((sum, e) => sum + (e.feesWithdrawnUSD || 0), 0);
    
    const grossProfitability = initialValue > 0 ? (currentValue - initialValue) / initialValue : 0;
    const netProfitability = initialValue > 0 ? ((currentValue + totalWithdrawn) - initialValue) / initialValue : 0;

    const valueBRL = currentValue * usdToBRL;

    return { initialValue, currentValue, totalWithdrawn, grossProfitability, netProfitability, valueBRL };
  }, [poolEntries, usdToBRL]);
  
  const { currentPriceRatio, isInRange, usingRealtimePrice } = useMemo(() => {
      if (!pool) return { currentPriceRatio: null, isInRange: null, usingRealtimePrice: false };

      const checkRange = (ratio: number) => {
          const rangeMin = pool.rangeMin;
          const rangeMax = pool.rangeMax;
          if (isNaN(rangeMin) || isNaN(rangeMax)) return null;
          return ratio >= rangeMin && ratio <= rangeMax;
      };

      const realtimePriceA = realtimePrices[pool?.tokenAId ?? ''];
      const realtimePriceB = realtimePrices[pool?.tokenBId ?? ''];

      if (realtimePriceA && realtimePriceB && realtimePriceB !== 0) {
          const ratio = realtimePriceA / realtimePriceB;
          return {
              currentPriceRatio: ratio,
              isInRange: checkRange(ratio),
              usingRealtimePrice: true
          };
      }

      const lastEntry = poolEntries.length > 0 ? poolEntries[poolEntries.length - 1] : null;
      if (lastEntry && lastEntry.tokenBPriceUSD !== 0) {
          const ratio = lastEntry.tokenAPriceUSD / lastEntry.tokenBPriceUSD;
          return {
              currentPriceRatio: ratio,
              isInRange: checkRange(ratio),
              usingRealtimePrice: false
          };
      }

      return { currentPriceRatio: null, isInRange: null, usingRealtimePrice: false };
  }, [realtimePrices, poolEntries, pool]);
  
  const isSingleEntry = poolEntries.length === 1;

  const handleDeletePool = async () => {
    if (!pool) return;
    try {
        await deletePool(pool.id);
        toast({ title: 'Posição Excluída', description: 'A posição e todos os seus registros foram excluídos.' });
        router.push('/');
    } catch (error) {
        toast({ title: 'Erro', description: 'Não foi possível excluir a posição.', variant: 'destructive' });
        console.error('Failed to delete pool:', error);
    }
  }

  if (dataLoading) {
    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <Skeleton className="h-10 w-48" />
                <Skeleton className="h-9 w-32" />
            </div>
            <div>
                <Skeleton className="h-9 w-1/2 mb-2" />
                <Skeleton className="h-5 w-1/3" />
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
                <Skeleton className="h-64" />
                <Skeleton className="h-64" />
            </div>
            <Skeleton className="h-80" />
        </div>
    );
  }

  if (!pool) {
    return (
      <div className="text-center py-16">
        <h2 className="font-headline text-2xl">Posição não encontrada</h2>
        <p className="text-muted-foreground">A posição que você está procurando não existe.</p>
        <Button asChild variant="link" className="text-accent">
          <Link href="/">Ir para o Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <Button variant="outline" asChild>
          <Link href="/">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao Dashboard
          </Link>
        </Button>
        <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setEditModalOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Editar Posição
            </Button>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir Posição
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Você tem certeza absoluta?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação não pode ser desfeita. Isto irá apagar permanentemente esta posição e todos os seus registos diários associados.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeletePool}>Continuar</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </div>

      <div>
        <h1 className="text-3xl font-headline">{pool.name}</h1>
        <p className="text-muted-foreground">{pool.platform} - {pool.tokenA}/{pool.tokenB} - {pool.feeTier}</p>
        <p className="text-sm text-accent font-medium">
            Range: {formatSmallNumber(pool.rangeMin)} - {formatSmallNumber(pool.rangeMax)}
        </p>
         {pricesLoading ? (
            <Skeleton className="h-5 w-48 mt-2" />
        ) : currentPriceRatio !== null && isInRange !== null && (
            <div className="mt-2 flex items-center gap-2">
                <p className={cn(
                    "font-medium text-sm",
                    isInRange ? "text-green-400" : "text-red-500"
                )}>
                    Preço Atual: {currentPriceRatio.toLocaleString('pt-BR', { maximumFractionDigits: 8 })}
                </p>
                {usingRealtimePrice && <Badge variant="outline" className="px-1 py-0 text-xs border-accent/50 text-accent/80">ao vivo</Badge>}
            </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Valor Atual" value={formatCurrency(currentValue)} description={`Em BRL: ${formatBRL(valueBRL)}`} icon={Wallet} />
        <KpiCard title="Rentabilidade Bruta" value={`${(grossProfitability * 100).toFixed(2)}%`} description="Não Realizado" icon={TrendingUp} />
        <KpiCard title="Taxas Sacadas" value={formatCurrency(totalWithdrawn)} description={`Em BRL: ${formatBRL(totalWithdrawn * usdToBRL)}`} icon={Landmark} />
        <KpiCard title="Rentabilidade Líquida" value={`${(netProfitability * 100).toFixed(2)}%`} description="Realizado + Não Realizado" icon={DollarSign} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Valor da Posição (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={positionChartConfig} className="h-[200px] w-full">
              {isSingleEntry ? (
                 <BarChart data={poolEntries} margin={{ left: 12, right: 12 }}>
                    <CartesianGrid vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatXAxis} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatYAxis} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                    <Bar dataKey="positionValueUSD" fill="var(--color-positionValueUSD)" radius={4} />
                  </BarChart>
              ) : (
                <AreaChart data={poolEntries} margin={{ left: 12, right: 12 }}>
                  <CartesianGrid vertical={false} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatXAxis} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatYAxis} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                  <Area dataKey="positionValueUSD" type="natural" fill="var(--color-positionValueUSD)" fillOpacity={0.4} stroke="var(--color-positionValueUSD)" />
                </AreaChart>
              )}
            </ChartContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="font-headline">Taxas Acumuladas (USD)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={feesChartConfig} className="h-[200px] w-full">
              <BarChart data={poolEntriesWithFeesUSD} margin={{ left: 12, right: 12 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatXAxis} />
                <YAxis tickLine={false} axisLine={false} tickMargin={8} tickFormatter={formatYAxis} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="dot" />} />
                <Bar dataKey="feesValueUSD" fill="var(--color-feesValueUSD)" radius={4} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle className="font-headline">Entradas Diárias</CardTitle>
                <CardDescription>Todos os dados históricos para esta posição.</CardDescription>
            </div>
            <Button onClick={() => setEntryModalOpen(true)}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova Entrada
            </Button>
        </CardHeader>
        <CardContent>
          <DailyEntriesTable pool={pool} />
        </CardContent>
      </Card>

      <Dialog open={isEntryModalOpen} onOpenChange={setEntryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Nova Entrada Diária para {pool.name}</DialogTitle>
            <DialogDescription>
              Registre seus rendimentos diários e valores de posição.
            </DialogDescription>
          </DialogHeader>
          <DailyEntryForm pool={pool} onSuccess={() => setEntryModalOpen(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle className="font-headline text-2xl">Editar Posição</DialogTitle>
                <DialogDescription>
                   Atualize os detalhes da sua posição de liquidez.
                </DialogDescription>
            </DialogHeader>
            <PoolForm pool={pool} firstEntry={poolEntries[0]} onSuccess={() => setEditModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
}
