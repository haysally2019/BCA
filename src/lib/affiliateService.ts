// src/lib/affiliateService.ts

export interface AffiliateProfilePayload {
  id: string;
  email?: string | null;
  company_email?: string | null;
  full_name?: string | null;
  company_name?: string | null;
  user_role?: string | null;
  is_active?: boolean | null;
}

// You can override this with Vite env if you want:
const DEFAULT_ENDPOINT = "/.netlify/functions/affiliatewp-sync";

const ENDPOINT =
  import.meta.env.VITE_AFFILIATEWP_FUNCTION_URL || DEFAULT_ENDPOINT;

export interface AffiliateSyncResult {
  ok: boolean;
  affiliate_id?: number;
  affiliate_url?: string;
  raw?: any;
}

export async function syncAffiliateForProfile(
  profile: AffiliateProfilePayload
): Promise<AffiliateSyncResult> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "sync",
      profile,
    }),
  });

  if (!res.ok) {
    console.error("[affiliateService] HTTP error", res.status);
    return { ok: false };
  }

  const data = await res.json().catch(() => ({}));

  return {
    ok: data.ok ?? true,
    affiliate_id: data.affiliate_id,
    affiliate_url: data.affiliate_url,
    raw: data,
  };
}

export async function disableAffiliateForProfile(
  profile: AffiliateProfilePayload
): Promise<AffiliateSyncResult> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "disable",
      profile,
    }),
  });

  if (!res.ok) {
    console.error("[affiliateService] HTTP error", res.status);
    return { ok: false };
  }

  const data = await res.json().catch(() => ({}));

  return {
    ok: data.ok ?? true,
    affiliate_id: data.affiliate_id,
    affiliate_url: data.affiliate_url,
    raw: data,
  };
}