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

export interface AffiliateSyncResult {
  ok: boolean;
  affiliate_id?: number;
  affiliate_url?: string;
  raw?: any;
}

export async function syncAffiliateForProfile(
  profile: AffiliateProfilePayload
): Promise<AffiliateSyncResult> {
  console.log('[affiliateService] Internal sync for profile:', profile.id);

  return {
    ok: true,
    affiliate_id: undefined,
    affiliate_url: undefined,
    raw: { message: 'Using internal CRM data only' },
  };
}

export async function disableAffiliateForProfile(
  profile: AffiliateProfilePayload
): Promise<AffiliateSyncResult> {
  console.log('[affiliateService] Internal disable for profile:', profile.id);

  return {
    ok: true,
    affiliate_id: undefined,
    affiliate_url: undefined,
    raw: { message: 'Using internal CRM data only' },
  };
}
