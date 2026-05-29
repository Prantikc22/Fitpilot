import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import {
  rcAvailable,
  initRevenueCat,
  isProUser,
  presentPaywall,
  presentCustomerCenter,
  ENTITLEMENT,
} from '@/src/lib/revenuecat';

type SubscriptionContextValue = {
  hasLeanlyPro: boolean;
  initializing: boolean;
  refreshSubscription: () => Promise<void>;
  showPaywall: () => Promise<boolean>;
  showCustomerCenter: () => Promise<void>;
  rcAvailable: boolean;
};

const SubscriptionContext = createContext<SubscriptionContextValue | undefined>(undefined);

export const SubscriptionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { session, profile } = useAuth();
  const [hasLeanlyPro, setHasLeanlyPro] = useState(false);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    async function init() {
      if (session?.user?.id) {
        await initRevenueCat(session.user.id);
        const isPro = await isProUser();
        setHasLeanlyPro(isPro);
      }
      setInitializing(false);
    }
    init();
  }, [session?.user?.id]);

  // Also check profile subscription_tier as fallback (for sandbox/preview mode)
  useEffect(() => {
    if (profile?.subscription_tier && profile.subscription_tier !== 'free') {
      setHasLeanlyPro(true);
    }
  }, [profile?.subscription_tier]);

  const refreshSubscription = useCallback(async () => {
    const isPro = await isProUser();
    setHasLeanlyPro(isPro || (profile?.subscription_tier && profile.subscription_tier !== 'free'));
  }, [profile?.subscription_tier]);

  const showPaywall = useCallback(async (): Promise<boolean> => {
    const result = await presentPaywall();
    if (result === 'purchased') {
      await refreshSubscription();
      return true;
    }
    return false;
  }, [refreshSubscription]);

  const showCustomerCenter = useCallback(async () => {
    await presentCustomerCenter();
  }, []);

  const value: SubscriptionContextValue = {
    hasLeanlyPro,
    initializing,
    refreshSubscription,
    showPaywall,
    showCustomerCenter,
    rcAvailable,
  };

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = (): SubscriptionContextValue => {
  const ctx = useContext(SubscriptionContext);
  if (!ctx) {
    throw new Error('useSubscription must be used within SubscriptionProvider');
  }
  return ctx;
};

// Hook to check if user has Pro access (for gating features)
export const useIsPro = (): boolean => {
  const { hasLeanlyPro, initializing } = useSubscription();
  // Return false while initializing to prevent flash of premium content
  return !initializing && hasLeanlyPro;
};
