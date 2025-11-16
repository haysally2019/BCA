import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Search,
  X,
  UserPlus,
  Settings as SettingsIcon,
  Shield,
} from "lucide-react";

interface Profile {
  id: string;
  full_name?: string | null;
  company_name?: string | null;
  email?: string | null;
  company_email?: string | null;
  user_role?: string | null;
  created_at?: string | null;
  phone?: string | null;
  territory?: string | null;
  is_active?: boolean | null;
}

type RoleFilter = "all" | "manager" | "rep";
type SortOption = "created_desc" | "created_asc" | "name_asc" | "name_desc";

const TeamManagement: React.FC = () => {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");
  const [sortBy, setSortBy] = useState<SortOption>("created_desc");

  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [editingUser, setEditingUser] = useState<Profile | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"manager" | "rep">("rep");
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  // ----------------------------------------------------
  // LOAD ALL PROFILES
  // ----------------------------------------------------
  const loadProfiles = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[TeamManagement] error loading profiles:", error);
    } else {
      setProfiles((data as Profile[]) || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadProfiles();
  }, []);

  // ----------------------------------------------------
  // DERIVED COUNTS
  // ----------------------------------------------------
  const totalUsers = profiles.length;
  const managersCount = profiles.filter(
    (p) => (p.user_role || "rep") === "manager"
  ).length;
  const repsCount = profiles.filter(
    (p) => (p.user_role || "rep") === "rep"
  ).length;
  const activeCount = profiles.filter((p) => p.is_active !== false).length;

  // ----------------------------------------------------
  // FILTER + SORT
  // ----------------------------------------------------
  const filtered = useMemo(() => {
    let result = [...profiles];

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

    if (roleFilter !== "all") {
      result = result.filter((p) => (p.user_role || "rep") === roleFilter);
    }

    if (sortBy === "name_asc") {
      result.sort((a, b) =>
        (a.full_name || a.company_name || "")
          .toLowerCase()
          .localeCompare(
            (b.full_name || b.company_name || "").toLowerCase()
          )
      );
    } else if (sortBy === "name_desc") {
      result.sort((a, b) =>
        (b.full_name || b.company_name || "")
          .toLowerCase()
          .localeCompare(
            (a.full_name || a.company_name || "").toLowerCase()
          )
      );
    } else if (sortBy === "created_asc") {
      result.sort(
        (a, b) =>
          new Date(a.created_at || "").getTime() -
          new Date(b.created_at || "").getTime()
      );
    } else {
      // created_desc default
      result.sort(
        (a, b) =>
          new Date(b.created_at || "").getTime() -
          new Date(a.created_at || "").getTime()
      );
    }

    return result;
  }, [profiles, search, roleFilter, sortBy]);

  // ----------------------------------------------------
  // UPDATE PROFILE (USER SETTINGS)
  // ----------------------------------------------------
  const handleUpdateUser = async (
    id: string,
    updates: Partial<Profile>
  ): Promise<void> => {
    const { error, data } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.error("[TeamManagement] error updating user:", error);
      return;
    }

    setProfiles((prev) =>
      prev.map((p) => (p.id === id ? ({ ...p, ...data } as Profile) : p))
    );
  };

  // ----------------------------------------------------
  // INVITE LINK GENERATION (UI-ONLY)
  // ----------------------------------------------------
  const handleGenerateInvite = () => {
    if (!inviteEmail.trim()) return;

    const baseUrl = window.location.origin;
    const link = `${baseUrl}/invite?email=${encodeURIComponent(
      inviteEmail.trim()
    )}&role=${inviteRole}`;

    setGeneratedLink(link);
  };

  // ----------------------------------------------------
  // MODALS
  // ----------------------------------------------------
  const UserDetailModal: React.FC = () => {
    if (!selectedUser) return null;

    const u = selectedUser;

    const name =
      u.full_name || u.company_name || u.email || u.company_email || "—";
    const email = u.email || u.company_email || "—";
    const role = u.user_role || "rep";
    const created = u.created_at
      ? new Date(u.created_at).toLocaleString()
      : "—";

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
        <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6 relative">
          <button
            className="absolute right-4 top-4 text-gray-500 hover:text-gray-800"
            onClick={() => setSelectedUser(null)}
          >
            <X size={18} />
          </button>

          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-gray-700" />
            User Details
          </h2>

          <div className="space-y-3 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase mb-1">Name</p>
              <p className="text-gray-900">{name}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase mb-1">Email</p>
              <p className="text-gray-900">{email}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-xs uppercase mb-1">Role</p>
                <p className="capitalize text-gray-900">{role}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase mb-1">
                  Territory
                </p>
                <p className="text-gray-900">{u.territory || "—"}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-500 text-xs uppercase mb-1">Phone</p>
                <p className="text-gray-900">{u.phone || "—"}</p>
              </div>
              <div>
                <p className="text-gray-500 text-xs uppercase mb-1">Created</p>
                <p className="text-gray-900">{created}</p>
              </div>
            </div>
            <div>
              <p className="text-gray-500 text-xs uppercase mb-1">Status</p>
              <p className="text-gray-900">
                {u.is_active === false ? "Inactive" : "Active"}
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setEditingUser(u);
                setSelectedUser(null);
              }}
              className="inline-flex items-center px-3 py-2 text-xs font-medium border rounded-lg hover:bg-gray-50"
            >
              <SettingsIcon className="w-4 h-4 mr-1" />
              Edit Settings
            </button>
            <button
              onClick={() => setSelectedUser(null)}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-black"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  const EditUserModal: React.FC = () => {
    if (!editingUser) return null;

    const u = editingUser;
    const [role, setRole] = useState<string>(u.user_role || "rep");
    const [territory, setTerritory] = useState<string>(u.territory || "");
    const [isActive, setIsActive] = useState<boolean>(u.is_active !== false);
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
      setSaving(true);
      await handleUpdateUser(u.id, {
        user_role: role,
        territory: territory || null,
        is_active: isActive,
      });
      setSaving(false);
      setEditingUser(null);
    };

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
        <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6 relative">
          <button
            className="absolute right-4 top-4 text-gray-500 hover:text-gray-800"
            onClick={() => setEditingUser(null)}
          >
            <X size={18} />
          </button>

          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-gray-700" />
            Edit User Settings
          </h2>

          <div className="space-y-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs uppercase mb-1">User</p>
              <p className="text-gray-900">
                {u.full_name ||
                  u.company_name ||
                  u.email ||
                  u.company_email ||
                  "—"}
              </p>
              <p className="text-xs text-gray-500">
                {u.email || u.company_email || "No email on file"}
              </p>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Role
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="manager">Manager</option>
                <option value="rep">Rep</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Territory
              </label>
              <input
                type="text"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
                placeholder="Optional"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600">Status</p>
                <p className="text-xs text-gray-500">
                  Inactive users cannot log in or be assigned new work.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((prev) => !prev)}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  isActive
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-gray-50 text-gray-600 border-gray-200"
                }`}
              >
                {isActive ? "Active" : "Inactive"}
              </button>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setEditingUser(null)}
              className="px-3 py-2 text-xs font-medium border rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-black disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    );
  };

  const InviteUserModal: React.FC = () => {
    if (!inviteOpen) return null;

    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40">
        <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6 relative">
          <button
            className="absolute right-4 top-4 text-gray-500 hover:text-gray-800"
            onClick={() => {
              setInviteOpen(false);
              setGeneratedLink(null);
            }}
          >
            <X size={18} />
          </button>

          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-gray-700" />
            Invite New User
          </h2>

          <div className="space-y-4 text-sm">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Email
              </label>
              <input
                type="email"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                placeholder="user@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Role
              </label>
              <select
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as "manager" | "rep")
                }
              >
                <option value="manager">Manager</option>
                <option value="rep">Rep</option>
              </select>
            </div>

            <p className="text-xs text-gray-500">
              This generates a link you can send manually by email, text, or
              chat. You can later wire this to your Supabase Auth invite flow.
            </p>

            {generatedLink && (
              <div className="mt-3">
                <p className="text-xs font-medium text-gray-600 mb-1">
                  Invite Link
                </p>
                <div className="border rounded-lg p-2 bg-gray-50 text-xs break-all">
                  {generatedLink}
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => {
                setInviteOpen(false);
                setGeneratedLink(null);
              }}
              className="px-3 py-2 text-xs font-medium border rounded-lg hover:bg-gray-50"
            >
              Close
            </button>
            <button
              onClick={handleGenerateInvite}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-black"
            >
              Generate Link
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ----------------------------------------------------
  // MAIN RENDER
  // ----------------------------------------------------
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">
            Team Management
          </h1>
          <p className="text-gray-600 mt-1 text-sm max-w-xl">
            Clean view of every profile in your system. Filter by role, view
            details, adjust user settings, and generate invite links.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => void loadProfiles()}
            className="hidden md:inline-flex items-center px-3 py-2 text-xs font-medium border rounded-lg hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-black"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite User
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Total Users
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {totalUsers}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            All profiles in your database.
          </p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Managers
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {managersCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Users with manager permissions.
          </p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Reps
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {repsCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Field and sales reps.
          </p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase">
            Active
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Users marked as active.
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
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

        <div className="flex flex-wrap gap-3 text-sm">
          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
          >
            <option value="all">All roles</option>
            <option value="manager">Managers</option>
            <option value="rep">Reps</option>
          </select>

          <select
            className="border rounded-lg px-3 py-2 text-sm"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
          >
            <option value="created_desc">Newest first</option>
            <option value="created_asc">Oldest first</option>
            <option value="name_asc">Name A–Z</option>
            <option value="name_desc">Name Z–A</option>
          </select>
        </div>
      </div>

      {/* Table / State */}
      {loading && (
        <div className="py-10 text-center text-gray-600">
          Loading users...
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="py-10 text-center text-gray-600">
          No users found for this view.
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Name
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Email
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Role
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Created
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
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

                const email = p.email || p.company_email || "—";
                const created = p.created_at
                  ? new Date(p.created_at).toLocaleDateString()
                  : "—";
                const role = p.user_role || "rep";
                const isActive = p.is_active !== false;

                return (
                  <tr
                    key={p.id}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-gray-900">{name}</td>
                    <td className="px-4 py-3 text-gray-700">{email}</td>
                    <td className="px-4 py-3 capitalize text-gray-700">
                      {role}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{created}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                          isActive
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-gray-50 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-3 text-xs">
                        <button
                          className="text-blue-600 hover:underline"
                          onClick={() => setSelectedUser(p)}
                        >
                          View
                        </button>
                        <button
                          className="text-gray-700 hover:underline"
                          onClick={() => setEditingUser(p)}
                        >
                          Edit
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      <UserDetailModal />
      <EditUserModal />
      <InviteUserModal />
    </div>
  );
};

export default TeamManagement;