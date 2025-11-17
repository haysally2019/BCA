import type { Handler } from "@netlify/functions";

const API_BASE = process.env.AFFILIATEWP_API_BASE!;
const PUBLIC_KEY = process.env.AFFILIATEWP_API_KEY!;
const TOKEN = process.env.AFFILIATEWP_API_SECRET!;
const MARKETING_URL = process.env.NEXT_PUBLIC_MARKETING_SITE_URL!;

function authHeader() {
  const token = Buffer.from(`${PUBLIC_KEY}:${TOKEN}`).toString("base64");
  return `Basic ${token}`;
}

export const handler: Handler = async (event) => {
  try {
    const payload = JSON.parse(event.body || "{}");

    const email = payload.email;
    if (!email) {
      return {
        statusCode: 400,
        body: JSON.stringify({ ok: false, message: "Missing email" }),
      };
    }

    // Create AffiliateWP account
    const res = await fetch(`${API_BASE}/wp-json/affwp/v1/affiliates`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader()
      },
      body: JSON.stringify({
        email,
        payment_email: email,
        status: "active"
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      return {
        statusCode: 500,
        body: JSON.stringify({ ok: false, error: text }),
      };
    }

    const data = await res.json();
    const affiliate_id = String(data.affiliate_id);
    const affiliate_url = `${MARKETING_URL}/?ref=${affiliate_id}`;

    return {
      statusCode: 200,
      body: JSON.stringify({
        ok: true,
        affiliate_id,
        affiliate_url,
      }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        ok: false,
        error: err.message,
      }),
    };
  }
};

export default handler;