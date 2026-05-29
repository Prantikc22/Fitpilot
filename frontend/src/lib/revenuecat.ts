// RevenueCat wrapper that no-ops inside Expo Go (native module not available).
import Constants from "expo-constants";
import { Platform } from "react-native";

const IS_EXPO_GO = Constants.executionEnvironment === "storeClient";
const IOS_KEY = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY!;
const ANDROID_KEY = process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY!;
export const ENTITLEMENT = process.env.EXPO_PUBLIC_REVENUECAT_ENTITLEMENT || "Leanly Pro";

export const rcAvailable = !IS_EXPO_GO && Platform.OS !== "web";

let Purchases: any = null;
let RevenueCatUI: any = null;

if (rcAvailable) {
  try {
    Purchases = require("react-native-purchases").default;
    RevenueCatUI = require("react-native-purchases-ui").default;
  } catch {
    /* not available */
  }
}

export async function initRevenueCat(appUserID: string | null) {
  if (!rcAvailable || !Purchases) return;
  try {
    const key = Platform.OS === "ios" ? IOS_KEY : ANDROID_KEY;
    await Purchases.configure({ apiKey: key, appUserID: appUserID || undefined });
  } catch (e) {
    console.warn("RevenueCat init failed", e);
  }
}

export async function isProUser(): Promise<boolean> {
  if (!rcAvailable || !Purchases) return false;
  try {
    const info = await Purchases.getCustomerInfo();
    return !!info?.entitlements?.active?.[ENTITLEMENT];
  } catch {
    return false;
  }
}

export async function presentPaywall(): Promise<"purchased" | "cancelled" | "error" | "not_available"> {
  if (!rcAvailable || !RevenueCatUI) return "not_available";
  try {
    const result = await RevenueCatUI.presentPaywall({ requiredEntitlementIdentifier: ENTITLEMENT });
    if (result === "PURCHASED" || result === "RESTORED") return "purchased";
    if (result === "CANCELLED") return "cancelled";
    return "error";
  } catch (e) {
    console.warn("Paywall error", e);
    return "error";
  }
}

export async function presentCustomerCenter() {
  if (!rcAvailable || !RevenueCatUI) return;
  try {
    await RevenueCatUI.presentCustomerCenter();
  } catch (e) {
    console.warn("CC error", e);
  }
}
