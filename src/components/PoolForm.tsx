'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { poolSchema } from '@/schemas';
import type { DailyEntry, Pool } from '@/types';
import { usePools } from '@/app/providers';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';
import { Separator } from './ui/separator';

interface PoolFormProps {
  pool?: Pool;
  firstEntry?: DailyEntry | null;
  onSuccess?: () => void;
}

export function PoolForm({ pool, firstEntry, onSuccess }: PoolFormProps) {
  const { addPool, updatePool, platforms, addPlatform } = usePools();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isCreateMode = !pool;

  const form = useForm<z.infer<typeof poolSchema>>({
    resolver: zodResolver(poolSchema),
    defaultValues: pool
      ? { 
        ...pool, 
        rangeMin: String(pool.rangeMin), // Pass as string to form
        rangeMax: String(pool.rangeMax), // Pass as string to form
        newPlatform: '',
        initialPositionValueUSD: firstEntry?.positionValueUSD,
        initialFeesAccumulatedTokenA: firstEntry?.feesAccumulatedTokenA,
        initialFeesAccumulatedTokenB: firstEntry?.feesAccumulatedTokenB,
       }
      : {
          platform: '',
          name: '',
          tokenA: '',
          tokenB: '',
          tokenAId: '',
          tokenBId: '',
          feeTier: '',
          rangeMin: '',
          rangeMax: '',
          newPlatform: '',
          initialPositionValueUSD: undefined,
          initialFeesAccumulatedTokenA: undefined,
          initialFeesAccumulatedTokenB: undefined,
        },
  });

  const watchedPlatform = form.watch('platform');

  async function onSubmit(values: z.infer<typeof poolSchema>) {
    setIsSubmitting(true);
    try {
        let submissionValues = { ...values };

        if (values.platform === 'Outra' && values.newPlatform) {
          const newPlatformName = values.newPlatform.trim();
          await addPlatform(newPlatformName);
          submissionValues.platform = newPlatformName;
        }

        if (pool) {
          await updatePool({ ...pool, ...submissionValues });
          toast({ title: 'Posição Atualizada', description: 'A posição de liquidez foi atualizada com sucesso.' });
        } else {
          await addPool(submissionValues);
          toast({ title: 'Posição Criada', description: 'Uma nova posição de liquidez e sua primeira entrada foram criadas.' });
        }
        setIsSubmitting(false);
        onSuccess?.();
    } catch (error: any) {
        toast({ title: 'Erro', description: error.message || 'Ocorreu um erro ao salvar a posição.', variant: 'destructive' });
        console.error(error);
        setIsSubmitting(false);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome da Posição</FormLabel>
              <FormControl>
                <Input placeholder="ex: ETH-AAVE 0.3%" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="platform"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plataforma</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma plataforma" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {platforms.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                  <SelectItem value="Outra">Outra...</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        {watchedPlatform === 'Outra' && (
          <FormField
            control={form.control}
            name="newPlatform"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Nome da Nova Plataforma</FormLabel>
                <FormControl>
                  <Input placeholder="ex: PancakeSwap" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tokenA"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Símbolo do Token A</FormLabel>
                <FormControl>
                  <Input placeholder="ex: ETH" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tokenB"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Símbolo do Token B</FormLabel>
                <FormControl>
                  <Input placeholder="ex: AAVE" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="tokenAId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID CoinGecko (Token A)</FormLabel>
                <FormControl>
                  <Input placeholder="ex: ethereum" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="tokenBId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>ID CoinGecko (Token B)</FormLabel>
                <FormControl>
                  <Input placeholder="ex: aave" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormDescription className="text-xs text-muted-foreground">
            Encontre o "ID da API" na página do token no CoinGecko.
        </FormDescription>

        <FormField
          control={form.control}
          name="feeTier"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Taxa de Ganhos</FormLabel>
              <FormControl>
                <Input placeholder="ex: 0.3%" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="rangeMin"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Range Mínimo</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="ex: 12.427,03 ou 196.12"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rangeMax"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Range Máximo</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="ex: 21.842,50 ou 205.55"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormDescription className="text-xs text-muted-foreground">
            Defina o range de preço da sua posição. Ex: para ETH/USDC, o range é em USDC.
        </FormDescription>

        
          <>
            <Separator className="my-4" />
             <div className="space-y-2">
                <h3 className="text-sm font-medium">
                  {isCreateMode ? 'Posição Inicial' : 'Ajustar Valores Iniciais'}
                </h3>
                <p className="text-xs text-muted-foreground">
                   {isCreateMode 
                    ? 'Isto criará a primeira entrada diária para esta posição.'
                    : 'A alteração destes valores irá atualizar a primeira entrada diária registrada para esta posição.'
                  }
                </p>
            </div>
            <FormField
              control={form.control}
              name="initialPositionValueUSD"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Valor Inicial da Posição (USD)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="any"
                      placeholder="ex: 5000.00"
                      {...field}
                      value={field.value ?? ''}
                      onChange={(e) => field.onChange(e.target.value === '' ? undefined : e.target.valueAsNumber)}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="initialFeesAccumulatedTokenA"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxas Iniciais ({form.getValues('tokenA') || 'Token A'})</FormLabel>
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
                  name="initialFeesAccumulatedTokenB"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Taxas Iniciais ({form.getValues('tokenB') || 'Token B'})</FormLabel>
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
          </>
        


        <Button type="submit" className="w-full rounded-2xl shadow-lg transition-all hover:shadow-primary/40" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : (pool ? 'Atualizar Posição' : 'Criar Posição')}
        </Button>
      </form>
    </Form>
  );
}
