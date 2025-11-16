import React, { useEffect, useState, useMemo } from "react";
import { supabase } from "../lib/supabaseClient";
import { Search, X } from "lucide-react";

export default function TeamManagement() {
  const [profiles, setProfiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [sortBy, setSortBy] = useState("created_desc");

  const [selectedUser, setSelectedUser] = useState<any | null>(null);

  // ----------------------------------------------------
  // LOAD ALL USERS
  // ----------------------------------------------------
  const loadProfiles = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    else setProfiles(data || []);

    setLoading(false);
  };

  useEffect(() => {
    loadProfiles();
  }, []);

  // ----------------------------------------------------
  // SEARCH FILTER
  // ----------------------------------------------------
  const filtered = useMemo(() => {
    let result = [...profiles];

    // search
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter((p) => {
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
    }

    // role filter
    if (roleFilter !== "all") {
      result = result.filter((p) => (p.user_role || "rep") === roleFilter);
    }

    // sorting
    if (sortBy === "name_asc") {
      result.sort((a, b) =>
        (a.full_name || a.company_name || "").localeCompare(
          b.full_name || b.company_name || ""
        )
      );
    } else if (sortBy === "name_desc") {
      result.sort((a, b) =>
        (b.full_name || b.company_name || "").localeCompare(
          a.full_name || a.company_name || ""
        )
      );
    } else if (sortBy === "created_asc") {
      result.sort(
        (a, b) =>
          new Date(a.created_at).getTime() -
          new Date(b.created_at).getTime()
      );
    } else {
      // created_desc (default)
      result.sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      );
    }

    return result;
  }, [profiles, search, roleFilter, sortBy]);

  // ----------------------------------------------------
  // USER DETAIL MODAL
  // ----------------------------------------------------
  const UserModal = () => {
    if (!selectedUser) return null;

    const u = selectedUser;

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
        <div className="bg-white w-full max-w-lg p-6 rounded-lg shadow-lg relative">
          <button
            className="absolute right-4 top-4 text-gray-600"
            onClick={() => setSelectedUser(null)}
          >
            <X size={20} />
          </button>

          <h2 className="text-xl font-semibold mb-4">User Details</h2>

          <div className="space-y-3 text-sm">
            <p><span className="font-semibold">Name:</span> {u.full_name || u.company_name || "—"}</p>
            <p><span className="font-semibold">Email:</span> {u.email || u.company_email}</p>
            <p><span className="font-semibold">Role:</span> {u.user_role || "rep"}</p>
            <p><span className="font-semibold">Phone:</span> {u.phone || "—"}</p>
            <p><span className="font-semibold">Territory:</span> {u.territory || "—"}</p>
            <p><span className="font-semibold">Created:</span> {u.created_at ? new Date(u.created_at).toLocaleString() : "—"}</p>
          </div>

          <div className="mt-6 text-right">
            <button
              className="px-4 py-2 bg-gray-900 text-white rounded-lg"
              onClick={() => setSelectedUser(null)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // MAIN UI
  // ----------------------------------------------------
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Team Management</h1>
        <p className="text-gray-600 mt-1">
          Managing {filtered.length} of {profiles.length} users.
        </p>
      </div>

      {/* Filters + Search */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        {/* SEARCH */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* ROLE FILTER */}
        <select
          className="border py-2 px-3 rounded-lg text-sm"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="all">All Roles</option>
          <option value="manager">Managers</option>
          <option value="rep">Reps</option>
        </select>

        {/* SORT */}
        <select
          className="border py-2 px-3 rounded-lg text-sm"
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
        >
          <option value="created_desc">Newest First</option>
          <option value="created_asc">Oldest First</option>
          <option value="name_asc">Name A–Z</option>
          <option value="name_desc">Name Z–A</option>
        </select>
      </div>

      {/* LOADING */}
      {loading && <div className="py-10 text-center text-gray-600">Loading users...</div>}

      {/* TABLE */}
      {!loading && filtered.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full text-sm bg-white">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((p) => {
                const name =
                  p.full_name ||
                  p.company_name ||
                  p.email ||
                  p.company_email ||
                  "Unnamed";

                return (
                  <tr key={p.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3">{name}</td>
                    <td className="px-4 py-3">{p.email || p.company_email}</td>
                    <td className="px-4 py-3 capitalize">{p.user_role || "rep"}</td>
                    <td className="px-4 py-3">
                      {p.created_at ? new Date(p.created_at).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        className="text-sm text-blue-600 hover:underline"
                        onClick={() => setSelectedUser(p)}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* NO RESULTS */}
      {!loading && filtered.length === 0 && (
        <div className="py-10 text-center text-gray-600">No users found.</div>
      )}

      {/* MODAL */}
      <UserModal />
    </div>
  );
}