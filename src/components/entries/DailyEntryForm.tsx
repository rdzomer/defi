'use client';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { dailyEntrySchema } from '@/schemas';
import type { DailyEntry, Pool } from '@/types';
import { usePools } from '@/app/providers';
import { useToast } from '@/hooks/use-toast';
import { useState, useEffect, useMemo } from 'react';
import { fetchTokenPrice } from '@/app/actions';
import { Loader2, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { suggestYield } from '@/ai/flows/suggest-yield-flow';

interface DailyEntryFormProps {
  pool: Pool;
  entry?: DailyEntry;
  onSuccess?: () => void;
}

const getTodayDateString = () => {
    const today = new Date();
    // Use local date parts to align with the user's timezone
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

export function DailyEntryForm({ pool, entry, onSuccess }: DailyEntryFormProps) {
  const { entries, saveEntry, updateEntry, usdToBRL } = usePools();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingPrices, setIsFetchingPrices] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [priceError, setPriceError] = useState<string[] | null>(null);
  const [tokenAPrice, setTokenAPrice] = useState<number | null>(null);
  const [tokenBPrice, setTokenBPrice] = useState<number | null>(null);

  const poolEntries = useMemo(() => {
    return entries
      .filter(e => e.poolId === pool.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, pool.id]);

  const form = useForm<z.infer<typeof dailyEntrySchema>>({
    resolver: zodResolver(dailyEntrySchema),
    defaultValues: entry
      ? { 
        ...entry, 
        feesWithdrawnUSD: entry.feesWithdrawnUSD ?? null,
      }
      : {
          poolId: pool.id,
          date: getTodayDateString(),
          positionValueUSD: undefined,
          feesAccumulatedTokenA: poolEntries[0]?.feesAccumulatedTokenA ?? undefined,
          feesAccumulatedTokenB: poolEntries[0]?.feesAccumulatedTokenB ?? undefined,
          feesWithdrawnUSD: null,
          note: '',
        },
  });
  
  useEffect(() => {
    if(entry) {
        setTokenAPrice(entry.tokenAPriceUSD);
        setTokenBPrice(entry.tokenBPriceUSD);
    }
  }, [entry]);

  const selectedDate = form.watch('date');

  useEffect(() => {
    async function getPrices() {
      if (!selectedDate || !pool.tokenAId || !pool.tokenBId) {
        return;
      }
      
      setPriceError(null);
      setIsFetchingPrices(true);
      setTokenAPrice(null);
      setTokenBPrice(null);

      try {
        const [priceAResult, priceBResult] = await Promise.all([
          fetchTokenPrice(pool.tokenAId, selectedDate),
          fetchTokenPrice(pool.tokenBId, selectedDate),
        ]);

        let errors: string[] = [];
        if (priceAResult.success && priceAResult.price !== undefined) {
          setTokenAPrice(priceAResult.price);
        } else {
          errors.push(`Token A (${pool.tokenA}): ${priceAResult.error}`);
        }

        if (priceBResult.success && priceBResult.price !== undefined) {
          setTokenBPrice(priceBResult.price);
        } else {
          errors.push(`Token B (${pool.tokenB}): ${priceBResult.error}`);
        }

        if (errors.length > 0) {
          setPriceError(errors);
        }

      } catch (e) {
        console.error(e);
        setPriceError(["Falha na comunicação com a API de preços."]);
      } finally {
        setIsFetchingPrices(false);
      }
    }

    if (!entry) {
        getPrices();
    }
  }, [selectedDate, pool.tokenAId, pool.tokenBId, pool.tokenA, pool.tokenB, entry]);

  async function handleAnalysis() {
    const feesA = form.getValues('feesAccumulatedTokenA');
    const feesB = form.getValues('feesAccumulatedTokenB');
    
    if (feesA === undefined || feesB === undefined) {
      toast({ title: 'Aviso', description: 'Por favor, insira o valor das taxas para ambos os tokens antes de analisar.', variant: 'default' });
      return;
    }
     if (tokenAPrice === null || tokenBPrice === null) {
      toast({ title: 'Aviso', description: 'Aguarde o carregamento dos preços dos tokens para analisar.', variant: 'default' });
      return;
    }
    
    setIsAnalyzing(true);
    try {
        // Convert current token fees to USD for the AI prompt
        const currentFeesInUSD = (feesA * tokenAPrice) + (feesB * tokenBPrice);

        // Map historical entries, calculating historical USD value
        const last5EntriesForAI = poolEntries.slice(0, 5).map(e => ({
            date: e.date,
            feesAccumulatedUSD: (e.feesAccumulatedTokenA * e.tokenAPriceUSD) + (e.feesAccumulatedTokenB * e.tokenBPriceUSD),
        }));

        const result = await suggestYield({ 
            pool: { name: pool.name, tokenA: pool.tokenA, tokenB: pool.tokenB }, 
            entries: last5EntriesForAI,
            currentFeesAccumulatedUSD: currentFeesInUSD,
        });
        
        toast({ title: 'Análise da IA', description: result.analysis });
    } catch (error: any) {
        toast({ title: 'Erro na Análise', description: error.message || 'Não foi possível obter uma análise.', variant: 'destructive' });
    } finally {
        setIsAnalyzing(false);
    }
  }

  async function onSubmit(values: z.infer<typeof dailyEntrySchema>) {
    setIsSubmitting(true);
    
    if (tokenAPrice === null || tokenBPrice === null) {
        toast({ title: 'Erro de Preço', description: 'Os preços dos tokens não puderam ser carregados. Verifique os erros e tente novamente.', variant: 'destructive' });
        setIsSubmitting(false);
        return;
    }

    const dataWithAllValues = {
        ...values,
        feesWithdrawnUSD: values.feesWithdrawnUSD ?? 0,
        usdToBRL: usdToBRL,
        tokenAPriceUSD: tokenAPrice,
        tokenBPriceUSD: tokenBPrice,
    };

    try {
      if (entry) {
        await updateEntry({ ...entry, ...dataWithAllValues });
        toast({ title: 'Entrada Atualizada', description: 'A entrada diária foi atualizada.' });
      } else {
        await saveEntry(dataWithAllValues as Omit<DailyEntry, 'id' | 'userId'>);
        toast({ title: 'Entrada Criada', description: 'A nova entrada diária foi salva.' });
      }
      onSuccess?.();
    } catch (error) {
      toast({ title: 'Erro', description: 'Ocorreu um erro ao salvar a entrada.', variant: 'destructive' });
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  const isButtonDisabled = isSubmitting || isFetchingPrices || isAnalyzing;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data</FormLabel>
              <FormControl>
                <Input type="date" {...field} disabled={!!entry} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="positionValueUSD"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Valor da Posição (USD)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="ex: 1500.50"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        {isFetchingPrices && (
            <div className="flex items-center text-sm text-muted-foreground p-2 bg-muted rounded-md">
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Buscando preços dos tokens para a data selecionada...
            </div>
        )}
        {priceError && (
            <Alert variant="destructive">
                <AlertTitle>Erro ao Buscar Preços</AlertTitle>
                <AlertDescription>
                    <ul className="list-disc pl-5">
                        {priceError.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                </AlertDescription>
            </Alert>
        )}
        
        <div>
            <div className="flex justify-between items-center mb-2">
                <FormLabel>Total de Taxas Acumuladas</FormLabel>
                {!entry && poolEntries.length > 0 && (
                    <Button type="button" variant="link" size="sm" className="h-auto p-0 text-accent" onClick={handleAnalysis} disabled={isButtonDisabled}>
                        {isAnalyzing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                        {isAnalyzing ? 'Analisando...' : 'Analisar com IA'}
                    </Button>
                )}
            </div>
            <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="feesAccumulatedTokenA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">{pool.tokenA}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="ex: 0.05"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="feesAccumulatedTokenB"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs text-muted-foreground">{pool.tokenB}</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="any"
                          placeholder="ex: 15.50"
                          {...field}
                          value={field.value ?? ''}
                          onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
            </div>
        </div>

        <FormField
          control={form.control}
          name="feesWithdrawnUSD"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Taxas Sacadas Hoje (USD) (Opcional)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="ex: 50.00"
                  {...field}
                  value={field.value ?? ''}
                  onChange={(e) => field.onChange(e.target.value === '' ? null : e.target.valueAsNumber)}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="note"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observação (Opcional)</FormLabel>
              <FormControl>
                <Textarea placeholder="Alguma observação sobre esta entrada?" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full rounded-2xl shadow-lg transition-all hover:shadow-primary/40" disabled={isButtonDisabled}>
          {isSubmitting ? 'Salvando...' : (isFetchingPrices ? 'Buscando preços...' : (entry ? 'Atualizar Entrada' : 'Salvar Entrada'))}
        </Button>
      </form>
    </Form>
  );
}
