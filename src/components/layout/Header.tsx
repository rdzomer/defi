'use client';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { LogOut, PlusCircle } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PoolForm } from '../PoolForm';
import { usePools } from '@/app/providers';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '../ui/dropdown-menu';


function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-xl font-headline font-bold text-accent">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-primary">
        <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 17L12 22L22 17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M2 12L12 17L22 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      Liquidity-Tracker
    </Link>
  );
}

function UserNav() {
    const { user, logout } = usePools();

    if (!user) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-9 w-9">
                        <AvatarImage src={user.photoURL ?? ''} alt={user.displayName ?? 'Avatar'} />
                        <AvatarFallback>{user.displayName?.charAt(0) ?? 'U'}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.displayName}</p>
                        <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sair</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export default function Header() {
  const [isPoolModalOpen, setPoolModalOpen] = useState(false);
  const { user } = usePools();

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-14 items-center">
          <div className="mr-4 flex flex-1 items-center justify-start">
            <Logo />
          </div>
          <div className="flex items-center justify-end space-x-4">
            <Button onClick={() => setPoolModalOpen(true)} className="rounded-2xl shadow-sm">
              <PlusCircle className="mr-2 h-4 w-4" />
              Nova Posição
            </Button>
            <UserNav />
          </div>
        </div>
      </header>

      <Dialog open={isPoolModalOpen} onOpenChange={setPoolModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline text-2xl">Criar Nova Posição</DialogTitle>
          </DialogHeader>
          <PoolForm onSuccess={() => setPoolModalOpen(false)} />
        </DialogContent>
      </Dialog>
    </>
  );
}
