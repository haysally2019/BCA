// lib/affiliatewpClient.ts

const AFFILIATEWP_API_BASE = process.env.AFFILIATEWP_API_BASE!;
const AFFILIATEWP_API_KEY = process.env.AFFILIATEWP_API_KEY!;
const AFFILIATEWP_API_SECRET = process.env.AFFILIATEWP_API_SECRET!;
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_SITE_URL!;

function buildAuth() {
  const token = Buffer.from(`${AFFILIATEWP_API_KEY}:${AFFILIATEWP_API_SECRET}`).toString("base64");
  return `Basic ${token}`;
}

export async function createAffiliateForEmail(email: string) {
  const res = await fetch(`${AFFILIATEWP_API_BASE}/wp-json/affwp/v1/affiliates`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: buildAuth(),
    },
    body: JSON.stringify({
      email,
      payment_email: email,
      status: "active"
    })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("AffiliateWP Error: " + text);
  }

  const data = await res.json();

  const affiliateId = String(data.affiliate_id);
  const affiliateUrl = `${MARKETING_URL}/?ref=${affiliateId}`;

  return { affiliateId, affiliateUrl };
}