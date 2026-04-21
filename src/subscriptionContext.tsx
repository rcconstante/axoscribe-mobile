import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import Purchases, {
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';

// ── Constants ────────────────────────────────────────────────────────────────
export const REVENUECAT_API_KEY = 'test_fpoIZvKbiivbjnUTvGJPCkpgRHA';
/**
 * Must match exactly what you created in the RevenueCat dashboard:
 *   Entitlements → "AxoScribe - Transcriber Pro"
 */
export const ENTITLEMENT_ID = 'AxoScribe - Transcriber Pro';

// ── Context type ──────────────────────────────────────────────────────────────
interface SubscriptionContextValue {
  /** true when the user has an active Pro entitlement */
  isPro: boolean;
  /** Full RevenueCat customer info (null while loading or offline) */
  customerInfo: CustomerInfo | null;
  /** true during the initial SDK fetch */
  isLoading: boolean;
  /** Restore previous purchases; throws on network / store error */
  restorePurchases: () => Promise<CustomerInfo>;
}

// ── Context default ───────────────────────────────────────────────────────────
const SubscriptionContext = createContext<SubscriptionContextValue>({
  isPro: false,
  customerInfo: null,
  isLoading: true,
  restorePurchases: async () => {
    throw new Error('SubscriptionProvider is not mounted');
  },
});

// ── Provider ──────────────────────────────────────────────────────────────────
export function SubscriptionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verbose logs in dev builds only
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }

    // Initialise the SDK with your public API key
    Purchases.configure({ apiKey: REVENUECAT_API_KEY });

    // Fetch the current entitlement state
    Purchases.getCustomerInfo()
      .then((info) => setCustomerInfo(info))
      .catch(() => {
        // Network unavailable on first launch — stays null (free tier assumed)
      })
      .finally(() => setIsLoading(false));

    // Subscribe to real-time changes (purchase, expiry, restore)
    const listener = Purchases.addCustomerInfoUpdateListener((info) => {
      setCustomerInfo(info);
    });

    return () => {
      listener.remove();
    };
  }, []);

  const restorePurchases = useCallback(async (): Promise<CustomerInfo> => {
    const info = await Purchases.restorePurchases();
    setCustomerInfo(info);
    return info;
  }, []);

  const isPro = !!customerInfo?.entitlements.active[ENTITLEMENT_ID];

  return (
    <SubscriptionContext.Provider
      value={{ isPro, customerInfo, isLoading, restorePurchases }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────────────────────
export function useSubscription(): SubscriptionContextValue {
  return useContext(SubscriptionContext);
}
