import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { Search } from "lucide-react";

export default function TeamManagement() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  // 1. Load all profiles
  const loadProfiles = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading profiles:", error);
    } else {
      setProfiles(data || []);
    }

    setLoading(false);
  };

  // 2. on mount, load data
  useEffect(() => {
    loadProfiles();
  }, []);

  // 3. Search filter
  const filteredProfiles = useMemo(() => {
    const term = search.toLowerCase();

    return profiles.filter((p) => {
      const name =
        p.full_name ||
        p.company_name ||
        p.email ||
        p.company_email ||
        "";
      const email = p.email || p.company_email || "";

      return (
        name.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term)
      );
    });
  }, [profiles, search]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">
          Team Management
        </h1>
        <p className="text-gray-600 mt-1">
          Viewing all {profiles.length} users in the system.
        </p>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
        <input
          type="text"
          placeholder="Search by name or email..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-1 focus:ring-gray-900"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* Loading */}
      {loading && (
        <div className="py-10 text-center text-gray-600">
          Loading team members...
        </div>
      )}

      {/* Empty */}
      {!loading && filteredProfiles.length === 0 && (
        <div className="py-10 text-center text-gray-600">
          No profiles found.
        </div>
      )}

      {/* Table */}
      {!loading && filteredProfiles.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-xs text-gray-500 uppercase">
                  Name
                </th>
                <th className="text-left px-4 py-2 font-medium text-xs text-gray-500 uppercase">
                  Email
                </th>
                <th className="text-left px-4 py-2 font-medium text-xs text-gray-500 uppercase">
                  Role
                </th>
                <th className="text-left px-4 py-2 font-medium text-xs text-gray-500 uppercase">
                  Created
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredProfiles.map((p) => {
                const name =
                  p.full_name ||
                  p.company_name ||
                  p.email ||
                  p.company_email ||
                  "Unnamed";

                const email = p.email || p.company_email || "—";

                const created = p.created_at
                  ? new Date(p.created_at).toLocaleDateString()
                  : "—";

                return (
                  <tr
                    key={p.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2.5 text-gray-900">
                      {name}
                    </td>

                    <td className="px-4 py-2.5 text-gray-700">
                      {email}
                    </td>

                    <td className="px-4 py-2.5 text-gray-700 capitalize">
                      {p.user_role || "rep"}
                    </td>

                    <td className="px-4 py-2.5 text-gray-600">
                      {created}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}