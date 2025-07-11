'use client';
import { usePools } from '@/app/providers';
import type { DailyEntry, Pool } from '@/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2 } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DailyEntryForm } from './DailyEntryForm';
import { Badge } from '../ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';


interface DailyEntriesTableProps {
  pool: Pool;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value);

const formatFullDate = (dateString: string) => {
    // The 'dateString' is in 'YYYY-MM-DD' format.
    // To prevent timezone issues where 'new Date()' might interpret it as the previous day,
    // we explicitly tell it to use UTC.
    return new Date(dateString).toLocaleDateString('pt-BR', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

export function DailyEntriesTable({ pool }: DailyEntriesTableProps) {
  const { entries, deleteEntry } = usePools();
  const [editingEntry, setEditingEntry] = useState<DailyEntry | null>(null);
  const { toast } = useToast();

  const poolEntries = useMemo(() => {
    return entries
      .filter(e => e.poolId === pool.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [entries, pool.id]);

  const handleDelete = async (entryId: string) => {
    try {
      await deleteEntry(entryId);
      toast({ title: 'Entrada Excluída', description: 'A entrada foi excluída com sucesso.' });
    } catch (error) {
      toast({ title: 'Erro', description: 'Não foi possível excluir a entrada.', variant: 'destructive' });
      console.error('Failed to delete entry:', error);
    }
  };
  
  const formatNumber = (value: number | null | undefined) => {
    if (typeof value !== 'number' || isNaN(value)) {
        return <span className="text-muted-foreground">-</span>;
    }
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 6 });
  }

  if (poolEntries.length === 0) {
    return <p className="text-center text-muted-foreground py-8">Ainda não há entradas para este pool.</p>
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data</TableHead>
              <TableHead className="text-right">Valor da Posição</TableHead>
              <TableHead className="text-right">Taxas Acumuladas ({pool.tokenA})</TableHead>
              <TableHead className="text-right">Taxas Acumuladas ({pool.tokenB})</TableHead>
              <TableHead className="text-right">Sacado (USD)</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {poolEntries.map(entry => (
              <TableRow key={entry.id}>
                <TableCell>
                  <div className="font-medium">{formatFullDate(entry.date)}</div>
                  {entry.updatedAt && (
                      <div className="text-xs text-muted-foreground">
                          Atualizado às {new Date(entry.updatedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                  )}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(entry.positionValueUSD)}</TableCell>
                <TableCell className="text-right">{formatNumber(entry.feesAccumulatedTokenA)}</TableCell>
                <TableCell className="text-right">{formatNumber(entry.feesAccumulatedTokenB)}</TableCell>
                <TableCell className="text-right">
                    {entry.feesWithdrawnUSD && entry.feesWithdrawnUSD > 0 ? (
                        <Badge variant="secondary" className='bg-green-500/20 text-green-300 border-green-500/30'>
                            {formatCurrency(entry.feesWithdrawnUSD)}
                        </Badge>
                    ) : (
                        <span className='text-muted-foreground'>-</span>
                    )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Open menu</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingEntry(entry)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <AlertDialog>
                          <AlertDialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                <Trash2 className="mr-2 h-4 w-4 text-destructive" />
                                <span className="text-destructive">Excluir</span>
                              </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                              <AlertDialogHeader>
                                  <AlertDialogTitle>Excluir Entrada?</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Isso excluirá permanentemente a entrada para {formatFullDate(entry.date)}. Esta ação não pode ser desfeita.
                                  </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                  <AlertDialogAction onClick={() => handleDelete(entry.id)}>Excluir</AlertDialogAction>
                              </AlertDialogFooter>
                          </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <Dialog open={!!editingEntry} onOpenChange={(isOpen) => !isOpen && setEditingEntry(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Entrada Diária</DialogTitle>
          </DialogHeader>
          {editingEntry && <DailyEntryForm pool={pool} entry={editingEntry} onSuccess={() => setEditingEntry(null)} />}
        </DialogContent>
      </Dialog>
    </>
  );
}
