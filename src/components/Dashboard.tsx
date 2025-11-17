import React from "react";
import { useEffect, useState } from "react";
import supabase from "../lib/supabaseService";

// TEMPORARY — sync missing affiliate links (remove after running once)
import { runAffiliateSync } from "../utils/runAffiliateSync";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [affiliateUrl, setAffiliateUrl] = useState<string | null>(null);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // -------------------------------------------------------------
    // 🔥 TEMP SYNC: RUN ONCE AFTER YOU FIX PROFILES WITH SQL
    // Delete this line after your affiliate links populate.
    // -------------------------------------------------------------
    runAffiliateSync();
    // -------------------------------------------------------------

    async function loadAffiliateData() {
      try {
        setLoading(true);

        // 1. Get logged-in user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("User not logged in.");
          setLoading(false);
          return;
        }

        // 2. Fetch affiliate info from PROFILES (no auth.users needed)
        const { data, error: profileError } = await supabase
          .from("profiles")
          .select("affiliate_id, affiliate_url")
          .eq("user_id", user.id)
          .single();

        if (profileError) {
          console.error("[Dashboard] Profile fetch error:", profileError);
          setError("Could not load your profile.");
          setLoading(false);
          return;
        }

        setAffiliateId(data?.affiliate_id || null);
        setAffiliateUrl(data?.affiliate_url || null);
      } catch (err) {
        console.error("[Dashboard] Unexpected error:", err);
        setError("Unexpected error loading dashboard.");
      }

      setLoading(false);
    }

    loadAffiliateData();
  }, []);

  // -----------------------------------------
  // Loading State
  // -----------------------------------------
  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="p-4 border rounded-lg bg-white shadow">
          <p className="animate-pulse text-gray-400">
            Loading your affiliate info…
          </p>
        </div>
      </div>
    );
  }

  // -----------------------------------------
  // Error State
  // -----------------------------------------
  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="p-4 border rounded-lg bg-red-100 text-red-700 shadow">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  // -----------------------------------------
  // No Affiliate ID available
  // -----------------------------------------
  if (!affiliateUrl) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
        <div className="p-4 border rounded-lg bg-yellow-100 text-yellow-800 shadow">
          <p>Your affiliate link is still generating. Try refreshing in a moment.</p>
        </div>
      </div>
    );
  }

  // -----------------------------------------
  // Copy Handler
  // -----------------------------------------
  const copyToClipboard = () => {
    navigator.clipboard.writeText(affiliateUrl);
  };

  // -----------------------------------------
  // Success: Display affiliate info
  // -----------------------------------------
  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      <div className="p-6 border rounded-lg bg-white shadow space-y-4">
        <h2 className="text-xl font-semibold">Your Affiliate Link</h2>

        {/* Affiliate URL */}
        <div className="space-y-1">
          <label className="text-sm text-gray-600">Referral Link</label>
          <input
            value={affiliateUrl}
            readOnly
            className="border p-2 rounded w-full bg-gray-50"
          />
          <button
            onClick={copyToClipboard}
            className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800"
          >
            Copy Link
          </button>
        </div>

        {/* Affiliate ID */}
        <div className="space-y-1 pt-3">
          <label className="text-sm text-gray-600">Affiliate ID</label>
          <input
            value={affiliateId ?? "Not Assigned"}
            readOnly
            className="border p-2 rounded w-full bg-gray-50"
          />
        </div>
      </div>
    </div>
  );
}