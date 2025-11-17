// src/dashboard.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseService";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [affiliateUrl, setAffiliateUrl] = useState<string | null>(null);
  const [affiliateId, setAffiliateId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAffiliateData() {
      try {
        setLoading(true);

        // Get Supabase user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
          setError("User not logged in.");
          setLoading(false);
          return;
        }

        // Fetch profile row
        const { data: profile, error: profileError } = await supabase
          .from("profiles")
          .select("affiliate_id, affiliate_url")
          .eq("user_id", user.id)
          .single();

        if (profileError) {
          console.error(profileError);
          setError("Could not load profile.");
          setLoading(false);
          return;
        }

        setAffiliateId(profile?.affiliate_id || null);
        setAffiliateUrl(profile?.affiliate_url || null);

      } catch (err: any) {
        console.error(err);
        setError("Unexpected error loading affiliate data.");
      }

      setLoading(false);
    }

    loadAffiliateData();
  }, []);

  // -----------------------------
  // LOADING STATE
  // -----------------------------
  if (loading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        <div className="p-4 border rounded-lg bg-white shadow">
          <p className="animate-pulse text-gray-400">Loading your affiliate link…</p>
        </div>
      </div>
    );
  }

  // -----------------------------
  // ERROR STATE
  // -----------------------------
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

  // -----------------------------
  // NO AFFILIATE YET
  // -----------------------------
  if (!affiliateUrl) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

        <div className="p-4 border rounded-lg bg-yellow-100 text-yellow-800 shadow">
          <p>Your affiliate link is not ready yet. Refresh in a moment.</p>
        </div>
      </div>
    );
  }

  // -----------------------------
  // READY STATE
  // -----------------------------
  const copyToClipboard = () => {
    navigator.clipboard.writeText(affiliateUrl);
  };

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-bold">Dashboard</h1>

      {/* Affiliate Card */}
      <div className="p-6 border rounded-lg bg-white shadow space-y-4">
        <h2 className="text-xl font-semibold">Your Affiliate Link</h2>

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