export interface AffiliateResponse {
  ok: boolean;
  affiliate_id?: string;
  affiliate_url?: string;
}

const ENDPOINT = "/.netlify/functions/affiliatewp-sync";

export async function createAffiliateProfile(email: string): Promise<AffiliateResponse> {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    body: JSON.stringify({ email }),
  });

  if (!res.ok) {
    console.error("[affiliateService] error:", res.status);
    return { ok: false };
  }

  return res.json();
}