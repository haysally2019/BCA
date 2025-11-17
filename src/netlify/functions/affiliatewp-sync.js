// netlify/functions/affiliatewp-sync.js

const AFFWP_BASE_URL = process.env.AFFWP_BASE_URL;
const AFFWP_PUBLIC_KEY = process.env.AFFWP_PUBLIC_KEY;
const AFFWP_TOKEN = process.env.AFFWP_TOKEN;

const jsonResponse = (status, body) => ({
  statusCode: status,
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const makeAuthHeader = () => {
  const raw = `${AFFWP_PUBLIC_KEY}:${AFFWP_TOKEN}`;
  const b64 = Buffer.from(raw).toString("base64");
  return `Basic ${b64}`;
};

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return jsonResponse(405, { ok: false, error: "Method not allowed" });
  }

  if (!AFFWP_BASE_URL || !AFFWP_PUBLIC_KEY || !AFFWP_TOKEN) {
    return jsonResponse(500, {
      ok: false,
      error: "AffiliateWP env vars missing",
    });
  }

  let payload;
  try {
    payload = JSON.parse(event.body || "{}");
  } catch {
    return jsonResponse(400, { ok: false, error: "Invalid JSON" });
  }

  const { action, profile } = payload || {};
  if (!profile || !profile.id) {
    return jsonResponse(400, { ok: false, error: "Missing profile.id" });
  }

  try {
    if (action === "sync") {
      const result = await syncAffiliate(profile);
      return jsonResponse(200, { ok: true, ...result });
    }

    if (action === "disable") {
      const result = await disableAffiliate(profile);
      return jsonResponse(200, { ok: true, ...result });
    }

    return jsonResponse(400, { ok: false, error: "Unknown action" });
  } catch (err) {
    console.error("[affiliatewp-sync] error:", err);
    return jsonResponse(500, {
      ok: false,
      error: "Internal error",
      detail: String(err.message || err),
    });
  }
};

// ---------- CORE LOGIC ----------

async function syncAffiliate(profile) {
  const email = profile.email || profile.company_email;
  if (!email) throw new Error("Profile has no email");

  const role = profile.user_role || "rep";
  const active = profile.is_active !== false;

  const baseUrl = AFFWP_BASE_URL.replace(/\/$/, "");

  // 1) Get affiliates list
  const listUrl = `${baseUrl}/wp-json/affwp/v1/affiliates?number=9999`;

  const listRes = await fetch(listUrl, {
    method: "GET",
    headers: { Authorization: makeAuthHeader() },
  });

  if (!listRes.ok) {
    throw new Error(`Failed to fetch affiliates: ${listRes.status}`);
  }

  const affiliates = await listRes.json();
  let found = null;

  if (Array.isArray(affiliates)) {
    found = affiliates.find((aff) => {
      const affEmail =
        (aff.user && aff.user.user_email) ||
        aff.email ||
        aff.payment_email;
      return (
        affEmail &&
        String(affEmail).toLowerCase() === email.toLowerCase()
      );
    });
  }

  // 2) If exists, update status
  if (found) {
    const id = found.affiliate_id || found.ID || found.id;
    if (!id) {
      return { affiliate_id: null, affiliate_url: null, raw: found };
    }

    const updateUrl = `${baseUrl}/wp-json/affwp/v1/affiliates/${id}`;

    // You may need to change POST → PUT depending on your AffiliateWP REST config.
    const updateRes = await fetch(updateUrl, {
      method: "POST",
      headers: {
        Authorization: makeAuthHeader(),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        status: active ? "active" : "inactive",
        // You can pass additional fields if your API supports them
      }),
    });

    if (!updateRes.ok) {
      console.warn(
        "[affiliatewp-sync] update failed, status",
        updateRes.status
      );
      return {
        affiliate_id: Number(id),
        affiliate_url: affiliateUrlFromId(id),
        raw: found,
      };
    }

    const updated = await updateRes.json().catch(() => found);

    return {
      affiliate_id: Number(id),
      affiliate_url: affiliateUrlFromId(id),
      raw: updated,
    };
  }

  // 3) Create new affiliate
  const createUrl = `${baseUrl}/wp-json/affwp/v1/affiliates`;

  const createPayload = {
    user_email: email,
    user_login: email,
    payment_email: email,
    status: active ? "active" : "inactive",
    // meta: { role },
  };

  const createRes = await fetch(createUrl, {
    method: "POST",
    headers: {
      Authorization: makeAuthHeader(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify(createPayload),
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(
      `Failed to create affiliate (status ${createRes.status}): ${body}`
    );
  }

  const created = await createRes.json();
  const id =
    created.affiliate_id || created.ID || created.id || created?.data?.ID;

  return {
    affiliate_id: id ? Number(id) : undefined,
    affiliate_url: id ? affiliateUrlFromId(id) : undefined,
    raw: created,
  };
}

async function disableAffiliate(profile) {
  const cloned = { ...profile, is_active: false };
  return await syncAffiliate(cloned);
}

function affiliateUrlFromId(id) {
  const base = AFFWP_BASE_URL.replace(/\/$/, "");
  return `${base}/?ref=${encodeURIComponent(id)}`;
}