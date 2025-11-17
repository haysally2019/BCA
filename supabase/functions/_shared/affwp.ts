import { createClient } from "jsr:@supabase/supabase-js@2";

export function verifyAffiliateWpSignature(bodyRaw: string, signature: string | null, secret: string) {
  if (!signature) return false;

  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(bodyRaw);

  return crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  ).then(key =>
    crypto.subtle.sign("HMAC", key, messageData)
  ).then(signatureBuffer => {
    const digest = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, "0"))
      .join("");

    return timingSafeEqual(signature, digest);
  });
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function getAppSettings(): Promise<Record<string, string>> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(url, serviceKey);

  const { data: rows, error } = await supabase
    .from("app_settings")
    .select("key, value");

  if (error) {
    throw new Error(`Failed to fetch app settings: ${error.message}`);
  }

  const map: Record<string, string> = {};
  for (const r of rows || []) {
    map[r.key] = r.value;
  }
  return map;
}

export async function affwpRequest(route: string, params: Record<string, any> = {}) {
  const settings = await getAppSettings();
  const site = settings["affiliatewp_site_url"];
  const user = settings["affiliatewp_api_username"];
  const pass = settings["affiliatewp_api_password"];

  if (!site || !user || !pass) {
    throw new Error("AffiliateWP credentials not configured");
  }

  const url = new URL(`${site.replace(/\/+$/, "")}/wp-json/affiliate-wp/v1/${route}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)));

  const credentials = btoa(`${user}:${pass}`);

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`AffiliateWP API ${route} failed: ${res.status} ${text}`);
  }
  return res.json();
}

export function sqlDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
