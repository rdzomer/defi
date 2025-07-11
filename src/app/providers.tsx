'use client';

import type { DailyEntry, Pool } from '@/types';
import React, { createContext, useContext, useEffect, useState } from 'react';
import { db, app } from '@/lib/firebase';
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  updateDoc,
  where,
  writeBatch,
  setDoc,
  limit,
} from 'firebase/firestore';
import { 
  type User, 
  onAuthStateChanged, 
  signInWithRedirect,
  GoogleAuthProvider,
  signOut,
  getAuth,
  type Auth
} from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { LoginPage } from '@/components/auth/Login';
import { Skeleton } from '@/components/ui/skeleton';
import { fetchTokenPrice } from './actions';

interface DataContextType {
  user: User;
  pools: Pool[];
  entries: DailyEntry[];
  platforms: string[];
  dataLoading: boolean;
  usdToBRL: number;
  updateUsdToBRL: (newRate: number) => Promise<void>;
  addPlatform: (platform: string) => Promise<void>;
  addPool: (pool: any) => Promise<void>;
  updatePool: (pool: any) => Promise<void>;
  deletePool: (poolId: string) => Promise<void>;
  saveEntry: (entry: Omit<DailyEntry, 'id' | 'userId'>) => Promise<void>;
  updateEntry: (entry: DailyEntry) => Promise<void>;
  deleteEntry: (entryId: string) => Promise<void>;
  logout: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export function Providers({ children }: { children: React.ReactNode }) {
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);

  useEffect(() => {
    const authInstance = getAuth(app);
    setAuth(authInstance);

    const unsubscribe = onAuthStateChanged(authInstance, (currentUser) => {
        setUser(currentUser);
        setLoginError(null);
        setLoading(false);
    }, (error) => {
        console.error("Firebase onAuthStateChanged error:", error);
        setLoginError("Ocorreu um erro ao verificar o status de autenticação.");
        setUser(null);
        setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const login = async () => {
    if (!auth) return;
    setLoginError(null);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithRedirect(auth, provider);
    } catch (error: any) {
       if (error.code === 'auth/unauthorized-domain') {
          setLoginError(`Este domínio (${window.location.hostname}) não está autorizado para login. Adicione-o no seu console do Firebase em Authentication > Domínios Autorizados.`);
      } else {
          setLoginError("Não foi possível iniciar o processo de login. Verifique o console para mais detalhes.");
      }
      console.error("Firebase signInWithRedirect error:", error);
    }
  };

  const logout = async () => {
    if (auth) {
      await signOut(auth);
    }
  };

  if (loading) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <LoginPage login={login} loginError={loginError} />;
  }

  return <DataProviders user={user} logout={logout}>{children}</DataProviders>;
}

function DataProviders({ children, user, logout }: { children: React.ReactNode, user: User, logout: () => Promise<void> }) {
  const [pools, setPools] = useState<Pool[]>([]);
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [platforms, setPlatforms] = useState<string[]>([]);
  const [usdToBRL, setUsdToBRL] = useState<number>(5.5);
  const [dataLoading, setDataLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
        setDataLoading(false);
        return;
    }
    
    const unsubscribers: (() => void)[] = [];
    setDataLoading(true);

    const collectionsToSubscribe = [
      { name: 'pools', setter: setPools, orderByField: 'createdAt' },
      { name: 'dailyEntries', setter: setEntries, orderByField: 'date' },
    ];

    let loadedCount = 0;
    const totalToLoad = collectionsToSubscribe.length + 2; // +2 for settings and platforms

    const checkLoadingDone = () => {
      loadedCount++;
      if (loadedCount === totalToLoad) {
        setDataLoading(false);
      }
    };
    
    const handleError = (error: any, name: string) => {
        console.error(`Erro ao buscar ${name}:`, error);
        toast({
            title: `Erro ao carregar ${name}`,
            description: `Não foi possível carregar os dados. Verifique suas regras de segurança do Firestore.`,
            variant: 'destructive'
        });
        checkLoadingDone();
    };

    collectionsToSubscribe.forEach(({ name, setter, orderByField }) => {
      const q = query(
        collection(db, name),
        where('userId', '==', user.uid),
        orderBy(orderByField, 'desc')
      );
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setter(data as any);
        checkLoadingDone();
      }, (error) => handleError(error, name));
      unsubscribers.push(unsubscribe);
    });
    
    const settingsDocRef = doc(db, 'userSettings', user.uid);
    const unsubscribeSettings = onSnapshot(settingsDocRef, (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        if (data && typeof data.usdToBRL === 'number') {
            setUsdToBRL(data.usdToBRL);
        }
      }
      checkLoadingDone();
    }, (error) => handleError(error, 'user settings'));
    unsubscribers.push(unsubscribeSettings);

    const platformsQuery = query(collection(db, 'platforms'), orderBy('name'));
    const unsubscribePlatforms = onSnapshot(platformsQuery, (snapshot) => {
      const firestorePlatforms = snapshot.docs.map(doc => doc.data().name as string);
      const defaultPlatforms = ['UniswapV3', 'Sushi', 'Curve'];
      const allPlatforms = [...new Set([...defaultPlatforms, ...firestorePlatforms])];
      setPlatforms(allPlatforms);
      checkLoadingDone();
    }, (error) => handleError(error, 'platforms'));
    unsubscribers.push(unsubscribePlatforms);
    
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user, toast]);

  const addPlatform = async (platformName: string) => {
    if (!platforms.includes(platformName.trim())) {
      await addDoc(collection(db, 'platforms'), { name: platformName.trim() });
    }
  };
  
  const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const addPool = async (poolData: any) => {
    const { 
      initialPositionValueUSD, 
      initialFeesAccumulatedTokenA,
      initialFeesAccumulatedTokenB,
      newPlatform,
      id,
      ...newPoolCoreData 
    } = poolData;

    const today = getTodayDateString();
    const [priceAResult, priceBResult] = await Promise.all([
        fetchTokenPrice(newPoolCoreData.tokenAId, today),
        fetchTokenPrice(newPoolCoreData.tokenBId, today),
    ]);

    if (!priceAResult.success || !priceBResult.success) {
        const errors = [];
        if (!priceAResult.success) errors.push(`Token A (${newPoolCoreData.tokenA}): ${priceAResult.error}`);
        if (!priceBResult.success) errors.push(`Token B (${newPoolCoreData.tokenB}): ${priceBResult.error}`);
        throw new Error(`Falha ao buscar preços: ${errors.join(' ')}`);
    }

    const batch = writeBatch(db);

    const poolRef = doc(collection(db, 'pools'));
    const finalPoolData = {
      ...newPoolCoreData,
      userId: user.uid,
      createdAt: new Date().toISOString(),
    };
    batch.set(poolRef, finalPoolData);

    const firstEntry: Omit<DailyEntry, 'id'> = {
        poolId: poolRef.id,
        userId: user.uid,
        date: today,
        positionValueUSD: initialPositionValueUSD,
        feesAccumulatedTokenA: initialFeesAccumulatedTokenA,
        feesAccumulatedTokenB: initialFeesAccumulatedTokenB,
        feesWithdrawnUSD: 0,
        note: 'Entrada inicial criada com a posição.',
        tokenAPriceUSD: priceAResult.price!,
        tokenBPriceUSD: priceBResult.price!,
        usdToBRL,
        updatedAt: new Date().toISOString(),
    };
    const entryRef = doc(collection(db, 'dailyEntries'));
    batch.set(entryRef, firstEntry);
    
    await batch.commit();
  };

  const updatePool = async (updatedPoolData: any) => {
    const {
      id,
      userId: poolUserId,
      createdAt,
      newPlatform,
      initialPositionValueUSD,
      initialFeesAccumulatedTokenA,
      initialFeesAccumulatedTokenB,
      ...corePoolData
    } = updatedPoolData;
  
    if (!id) throw new Error("ID da posição está faltando para a atualização.");
  
    const batch = writeBatch(db);
    const poolRef = doc(db, 'pools', id);
    batch.update(poolRef, corePoolData);
  
    const hasInitialValuesToUpdate = initialPositionValueUSD !== undefined || 
                                     initialFeesAccumulatedTokenA !== undefined || 
                                     initialFeesAccumulatedTokenB !== undefined;
  
    if (hasInitialValuesToUpdate) {
      const entriesQuery = query(
        collection(db, 'dailyEntries'),
        where('poolId', '==', id),
        where('userId', '==', user.uid)
      );
  
      const entriesSnapshot = await getDocs(entriesQuery);
  
      if (!entriesSnapshot.empty) {
        const allEntries = entriesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyEntry));
        allEntries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const firstEntry = allEntries[0];

        const firstEntryRef = doc(db, 'dailyEntries', firstEntry.id);
        const updateData: { [key: string]: any } = {};
  
        if (initialPositionValueUSD !== undefined) {
          updateData.positionValueUSD = initialPositionValueUSD;
        }
        if (initialFeesAccumulatedTokenA !== undefined) {
          updateData.feesAccumulatedTokenA = initialFeesAccumulatedTokenA;
        }
        if (initialFeesAccumulatedTokenB !== undefined) {
          updateData.feesAccumulatedTokenB = initialFeesAccumulatedTokenB;
        }
        batch.update(firstEntryRef, updateData);
      } else if (initialPositionValueUSD !== undefined && initialFeesAccumulatedTokenA !== undefined && initialFeesAccumulatedTokenB !== undefined) {
        const today = getTodayDateString();
        const [priceAResult, priceBResult] = await Promise.all([
          fetchTokenPrice(corePoolData.tokenAId, today),
          fetchTokenPrice(corePoolData.tokenBId, today),
        ]);
  
        if (!priceAResult.success || !priceBResult.success) {
          const errors = [];
          if (!priceAResult.success) errors.push(`Token A (${corePoolData.tokenA}): ${priceAResult.error}`);
          if (!priceBResult.success) errors.push(`Token B (${corePoolData.tokenB}): ${priceBResult.error}`);
          throw new Error(`Não foi possível criar a entrada inicial ao editar. Falha ao buscar preços: ${errors.join(' ')}`);
        }
  
        const firstEntry: Omit<DailyEntry, 'id'> = {
          poolId: id,
          userId: user.uid,
          date: today,
          positionValueUSD: initialPositionValueUSD,
          feesAccumulatedTokenA: initialFeesAccumulatedTokenA,
          feesAccumulatedTokenB: initialFeesAccumulatedTokenB,
          feesWithdrawnUSD: 0,
          note: 'Entrada inicial criada ao editar a posição.',
          tokenAPriceUSD: priceAResult.price!,
          tokenBPriceUSD: priceBResult.price!,
          usdToBRL,
          updatedAt: new Date().toISOString(),
        };
        const entryRef = doc(collection(db, 'dailyEntries'));
        batch.set(entryRef, firstEntry);
      }
    }
  
    await batch.commit();
  };

  const deletePool = async (poolId: string) => {
    const batch = writeBatch(db);
    
    const poolRef = doc(db, 'pools', poolId);
    batch.delete(poolRef);

    const entriesQuery = query(collection(db, 'dailyEntries'), where('poolId', '==', poolId), where('userId', '==', user.uid));
    const entriesSnapshot = await getDocs(entriesQuery);
    entriesSnapshot.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
  };

  const saveEntry = async (entryData: Omit<DailyEntry, 'id' | 'userId'>) => {
    const { poolId, date } = entryData;

    const q = query(
      collection(db, 'dailyEntries'),
      where('userId', '==', user.uid),
      where('poolId', '==', poolId),
      where('date', '==', date),
      limit(1)
    );

    const querySnapshot = await getDocs(q);
    const dataWithTimestamp = { ...entryData, updatedAt: new Date().toISOString() };
    
    if (!querySnapshot.empty) {
      const existingDoc = querySnapshot.docs[0];
      const entryRef = doc(db, 'dailyEntries', existingDoc.id);
      await updateDoc(entryRef, dataWithTimestamp);
    } else {
      await addDoc(collection(db, 'dailyEntries'), { ...dataWithTimestamp, userId: user.uid });
    }
  };

  const updateEntry = async (updatedEntry: DailyEntry) => {
    const { id, ...entryData } = updatedEntry;
    if (id) {
      const entryRef = doc(db, 'dailyEntries', id);
      await updateDoc(entryRef, { ...entryData, updatedAt: new Date().toISOString() });
    }
  };

  const deleteEntry = async (entryId: string) => {
    await deleteDoc(doc(db, 'dailyEntries', entryId));
  };
  
  const updateUsdToBRL = async (newRate: number) => {
    const settingsRef = doc(db, 'userSettings', user.uid);
    await setDoc(settingsRef, { usdToBRL: newRate }, { merge: true });
    setUsdToBRL(newRate);
  };
  
  const contextValue: DataContextType = {
    user,
    pools,
    entries,
    platforms,
    dataLoading,
    usdToBRL,
    updateUsdToBRL,
    addPlatform,
    addPool,
    updatePool,
    deletePool,
    saveEntry,
    updateEntry,
    deleteEntry,
    logout,
  };

  return (
    <DataContext.Provider value={contextValue}>
      {dataLoading ? <LoadingScreen /> : children}
    </DataContext.Provider>
  );
}


function LoadingScreen() {
    return (
      <div className="flex flex-col min-h-screen">
          <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-14 items-center">
                  <Skeleton className="h-6 w-48" />
                  <div className="flex-grow" />
                  <Skeleton className="h-8 w-8 rounded-full" />
              </div>
          </header>
          <main className="flex-grow container mx-auto px-4 py-8">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
                  <Skeleton className="h-24" />
              </div>
              <Skeleton className="h-[300px] mt-8" />
          </main>
      </div>
    );
}


// Hook to use the data context
export function usePools() {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('usePools must be used within a Providers component');
  }
  return context;
}
