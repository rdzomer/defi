'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useEffect, useState } from 'react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle, Loader2 } from 'lucide-react';

interface LoginPageProps {
    login: () => Promise<void>;
    loginError: string | null;
}

function GoogleIcon() {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="24px" height="24px">
            <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24s8.955,20,20,20s20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
            <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
            <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.612-3.356-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
            <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.574l6.19,5.238C39.99,35.533,44,28.717,44,20C44,22.659,43.862,21.35,43.611,20.083z"/>
        </svg>
    )
}

export function LoginPage({ login, loginError }: LoginPageProps) {
  const [hostname, setHostname] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    // This code runs only on the client side
    if (typeof window !== 'undefined') {
        setHostname(window.location.hostname);
    }
  }, []);
  
  const handleLoginClick = async () => {
    setIsLoggingIn(true);
    await login();
    // In case of an error, loginError will be set in the parent,
    // and we should stop the loading indicator.
    // The success case will unmount this component, so no need to set it to false.
    setTimeout(() => setIsLoggingIn(false), 2000); // Failsafe timeout
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-200px)]">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">Bem-vindo ao Liquidity-Tracker</CardTitle>
          <CardDescription>Para continuar, por favor, faça login com sua conta Google.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loginError && (
              <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Erro de Autenticação</AlertTitle>
                  <AlertDescription>{loginError}</AlertDescription>
              </Alert>
          )}

          <Button onClick={handleLoginClick} className="w-full rounded-2xl" size="lg" disabled={isLoggingIn}>
            {isLoggingIn ? (
                <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Aguarde...
                </>
            ) : (
                <>
                    <GoogleIcon />
                    Login com Google
                </>
            )}
          </Button>

          {hostname && (
            <div className="text-center text-xs text-muted-foreground p-2 border rounded-md">
              <p className="font-bold">Problemas com o login?</p>
              <p>Certifique-se de que o seguinte domínio está na sua lista de "Domínios autorizados" no Firebase Authentication:</p>
              <p className="font-mono bg-muted p-1 rounded-sm my-1 inline-block">{hostname}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}