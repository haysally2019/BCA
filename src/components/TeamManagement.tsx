import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import {
  Search,
  X,
  UserPlus,
  Settings as SettingsIcon,
  Shield,
  Users,
  Briefcase,
  CheckCircle2,
  MoreHorizontal,
  Mail,
  Smartphone,
  Calendar,
  MapPin,
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
          p.full_name || p.company_name || p.email || p.company_email || "";
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
          .localeCompare((b.full_name || b.company_name || "").toLowerCase())
      );
    } else if (sortBy === "name_desc") {
      result.sort((a, b) =>
        (b.full_name || b.company_name || "")
          .toLowerCase()
          .localeCompare((a.full_name || a.company_name || "").toLowerCase())
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

  // Helper to generate initials for avatar
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
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
      ? new Date(u.created_at).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })
      : "—";

    return (
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 transition-all p-4">
        <div className="bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden border border-gray-100">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              User Profile
            </h2>
            <button
              className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-full p-1 transition-colors"
              onClick={() => setSelectedUser(null)}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Header Info */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-2xl font-bold border-4 border-white shadow-sm">
                {getInitials(name)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">{name}</h3>
                <p className="text-gray-500 text-sm flex items-center gap-1.5">
                  <Mail size={14} /> {email}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Role
                  </label>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="capitalize font-medium text-gray-900 bg-gray-100 px-2.5 py-0.5 rounded-md border border-gray-200 text-sm">
                      {role}
                    </span>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Phone
                  </label>
                  <div className="mt-1 flex items-center gap-2 text-gray-700">
                    <Smartphone size={14} className="text-gray-400" />
                    {u.phone || "—"}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Territory
                  </label>
                  <div className="mt-1 flex items-center gap-2 text-gray-700">
                    <MapPin size={14} className="text-gray-400" />
                    {u.territory || "Unassigned"}
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Joined
                  </label>
                  <div className="mt-1 flex items-center gap-2 text-gray-700">
                    <Calendar size={14} className="text-gray-400" />
                    {created}
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Account Status
              </label>
              <div className="mt-2">
                <span
                  className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${
                    u.is_active !== false
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : "bg-gray-100 text-gray-600 border-gray-200"
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full mr-2 ${
                      u.is_active !== false ? "bg-emerald-500" : "bg-gray-400"
                    }`}
                  ></span>
                  {u.is_active !== false ? "Active Account" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 flex justify-end gap-3 border-t border-gray-100">
            <button
              onClick={() => setSelectedUser(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 shadow-sm transition-all"
            >
              Close
            </button>
            <button
              onClick={() => {
                setEditingUser(u);
                setSelectedUser(null);
              }}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 shadow-sm transition-all"
            >
              <SettingsIcon className="w-4 h-4 mr-2" />
              Edit Settings
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
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-0 overflow-hidden relative">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-900">
              <SettingsIcon className="w-5 h-5 text-indigo-600" />
              Edit User
            </h2>
            <button
              className="text-gray-400 hover:text-gray-600"
              onClick={() => setEditingUser(null)}
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <p className="text-sm font-medium text-gray-900">
                {u.full_name ||
                  u.company_name ||
                  u.email ||
                  u.company_email ||
                  "—"}
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                {u.email || u.company_email}
              </p>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Role Permissions
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="manager">Manager</option>
                <option value="rep">Rep</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Sales Territory
              </label>
              <input
                type="text"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                value={territory}
                onChange={(e) => setTerritory(e.target.value)}
                placeholder="e.g. Northeast"
              />
            </div>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900">
                  Active Status
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Toggle login access
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsActive((prev) => !prev)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  isActive ? "bg-indigo-600" : "bg-gray-200"
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    isActive ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
            <button
              onClick={() => setEditingUser(null)}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-800 shadow-lg shadow-gray-200 disabled:opacity-70 transition-all"
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
      <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 relative">
          <button
            className="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
            onClick={() => {
              setInviteOpen(false);
              setGeneratedLink(null);
            }}
          >
            <X size={20} />
          </button>

          <div className="mb-6">
            <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
              <UserPlus className="w-5 h-5 text-indigo-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Invite New User
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Create a new user invitation link to share.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Email Address
              </label>
              <input
                type="email"
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-gray-700">
                Role Assignment
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                value={inviteRole}
                onChange={(e) =>
                  setInviteRole(e.target.value as "manager" | "rep")
                }
              >
                <option value="manager">Manager</option>
                <option value="rep">Rep</option>
              </select>
            </div>

            {generatedLink && (
              <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                <label className="block text-xs font-medium text-emerald-600 mb-1">
                  Unique Invite Link Generated
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 border border-emerald-200 bg-emerald-50 rounded-lg p-2.5 text-xs text-emerald-900 font-mono break-all">
                    {generatedLink}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-3">
            <button
              onClick={() => {
                setInviteOpen(false);
                setGeneratedLink(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900"
            >
              Close
            </button>
            <button
              onClick={handleGenerateInvite}
              className="px-5 py-2 text-sm font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all"
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
    <div className="min-h-screen bg-gray-50/50 space-y-4 md:space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 tracking-tight">
            Team
          </h1>
          <p className="text-gray-500 mt-1.5 md:mt-2 text-sm max-w-lg leading-relaxed">
            Manage your organization's members, assign roles, and track activity
            across your territories.
          </p>
        </div>

        <div className="flex items-center gap-2 md:gap-3 w-full md:w-auto">
          <button
            onClick={() => void loadProfiles()}
            className="hidden md:inline-flex items-center px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            Refresh List
          </button>
          <button
            onClick={() => setInviteOpen(true)}
            className="inline-flex items-center justify-center px-4 md:px-5 py-2.5 text-sm font-medium rounded-lg bg-gray-900 text-white hover:bg-black transition-all shadow-lg shadow-gray-200 w-full md:w-auto"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Invite Member
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
        {[
          {
            label: "Total Users",
            val: totalUsers,
            sub: "Total database count",
            icon: Users,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Managers",
            val: managersCount,
            sub: "Admin access enabled",
            icon: Shield,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Field Reps",
            val: repsCount,
            sub: "Standard access",
            icon: Briefcase,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
          {
            label: "Active Now",
            val: activeCount,
            sub: "Able to log in",
            icon: CheckCircle2,
            color: "text-emerald-600",
            bg: "bg-emerald-50",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="border border-gray-100 rounded-2xl p-5 bg-white shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex items-start justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">{stat.val}</p>
              <p className="text-sm font-medium text-gray-600 mt-1">
                {stat.label}
              </p>
              <p className="text-xs text-gray-400 mt-1">{stat.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative w-full md:w-80 group">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-gray-400 group-focus-within:text-indigo-500 transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Search members..."
            className="block w-full pl-10 pr-3 py-2.5 border-none rounded-lg text-sm bg-transparent focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-gray-400 text-gray-900"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto px-2">
          <div className="h-6 w-px bg-gray-200 hidden md:block"></div>
          <div className="flex gap-3 w-full md:w-auto">
            <select
              className="flex-1 md:flex-none border-none bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-colors"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as RoleFilter)}
            >
              <option value="all">All Roles</option>
              <option value="manager">Managers Only</option>
              <option value="rep">Reps Only</option>
            </select>

            <select
              className="flex-1 md:flex-none border-none bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 focus:ring-2 focus:ring-indigo-500/20 cursor-pointer transition-colors"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
            >
              <option value="created_desc">Newest</option>
              <option value="created_asc">Oldest</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
        {loading && (
          <div className="py-20 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-500 text-sm">Syncing team data...</p>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="py-20 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              No members found
            </h3>
            <p className="text-gray-500 text-sm mt-1 max-w-xs mx-auto">
              We couldn't find anyone matching your search filters. Try adjusting
              the role or search term.
            </p>
            <button
              onClick={() => {
                setSearch("");
                setRoleFilter("all");
              }}
              className="mt-4 text-indigo-600 text-sm font-medium hover:underline"
            >
              Clear filters
            </button>
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Member
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Role & Territory
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Joined
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Manage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {filtered.map((p) => {
                  const name =
                    p.full_name ||
                    p.company_name ||
                    p.email ||
                    p.company_email ||
                    "Unnamed";
                  const email = p.email || p.company_email || "—";
                  const created = p.created_at
                    ? new Date(p.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "—";
                  const role = p.user_role || "rep";
                  const isActive = p.is_active !== false;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-gray-50/80 transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                            {getInitials(name)}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              {email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize w-fit ${
                              role === "manager"
                                ? "bg-purple-50 text-purple-700 border border-purple-100"
                                : "bg-blue-50 text-blue-700 border border-blue-100"
                            }`}
                          >
                            {role}
                          </span>
                          <span className="text-xs text-gray-500">
                            {p.territory || "No territory"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {created}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-gray-400" />
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => setSelectedUser(p)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="View Details"
                          >
                            <MoreHorizontal size={18} />
                          </button>
                          <button
                            onClick={() => setEditingUser(p)}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                            title="Edit Settings"
                          >
                            <SettingsIcon size={18} />
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
      </div>

      {/* Modals */}
      <UserDetailModal />
      <EditUserModal />
      <InviteUserModal />
    </div>
  );
};

export default TeamManagement;