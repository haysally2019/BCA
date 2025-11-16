import React, { useEffect, useMemo, useState } from "react";
import {
  Users,
  PlusCircle,
  Search,
  ShieldAlert,
  BadgeCheck,
} from "lucide-react";
import { useAuthStore } from "../store/authStore";
import { teamService, type TeamMember } from "../lib/teamService";
import AddTeamMemberModal from "./modals/AddTeamMemberModal";
import EditTeamMemberModal from "./modals/EditTeamMemberModal";
import TeamMemberDetailModal from "./modals/TeamMemberDetailModal";

const TeamManagement: React.FC = () => {
  const { profile, loading: authLoading } = useAuthStore();
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // In your schema, team_members.company_id = manager's profile.id
  const companyId = profile?.id ?? "";

  const isManager = useMemo(() => {
    if (!profile) return false;
    if (profile.user_role === "manager") return true;

    // Treat account owner as manager (no company_id or self-owned)
    if (!profile.company_id || profile.company_id === profile.user_id) {
      return true;
    }

    return false;
  }, [profile]);

  const loadTeamMembers = async () => {
    if (!companyId) return;
    try {
      setLoading(true);
      const data = await teamService.getTeamMembers(companyId);
      setTeamMembers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("[TeamManagement] Error loading team members:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!profile || !companyId) return;
    if (!isManager) return;
    void loadTeamMembers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id, isManager]);

  const handleRefresh = () => {
    void loadTeamMembers();
  };

  const filteredMembers = useMemo(() => {
    if (!search.trim()) return teamMembers;

    const term = search.toLowerCase();
    return teamMembers.filter((member) => {
      const name =
        member.profile?.company_name ||
        member.profile?.company_email ||
        member.employee_id ||
        "";
      const email = member.profile?.company_email || "";
      const territory = member.profile?.territory || "";
      const position = member.position || "";
      const department = member.department || "";

      return (
        name.toLowerCase().includes(term) ||
        email.toLowerCase().includes(term) ||
        territory.toLowerCase().includes(term) ||
        position.toLowerCase().includes(term) ||
        department.toLowerCase().includes(term)
      );
    });
  }, [teamMembers, search]);

  if (authLoading) {
    return (
      <div className="p-6">
        <p className="text-gray-600 text-sm">Loading your account...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="p-6">
        <p className="text-red-600 text-sm">
          You must be signed in to view team management.
        </p>
      </div>
    );
  }

  if (!isManager) {
    return (
      <div className="p-6 flex flex-col space-y-3">
        <div className="inline-flex items-center space-x-2 text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg max-w-md">
          <ShieldAlert className="w-4 h-4" />
          <p className="text-sm font-medium">
            Team Management is restricted to managers and account owners.
          </p>
        </div>
        <p className="text-sm text-gray-600 max-w-md">
          If you believe this is a mistake, please contact your manager or admin
          so they can update your role.
        </p>
      </div>
    );
  }

  const activeCount = teamMembers.filter(
    (m) => m.employment_status === "active"
  ).length;
  const inactiveCount = teamMembers.length - activeCount;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-gray-700" />
            <h1 className="text-xl font-semibold text-gray-900">
              Team Management
            </h1>
          </div>
          <p className="text-sm text-gray-600 mt-1 max-w-2xl">
            Add, edit, and manage your sales team. This view is scoped to your
            company account and powered by the dedicated
            <span className="font-mono text-xs px-1 py-0.5 bg-gray-100 rounded border border-gray-200 ml-1">
              team_members
            </span>{" "}
            table.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleRefresh}
            className="hidden md:inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center px-4 py-2 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-900"
          >
            <PlusCircle className="w-4 h-4 mr-2" />
            Add Team Member
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Total Team
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {teamMembers.length}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Includes all reps linked to your company.
          </p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Active
          </p>
          <p className="mt-2 text-2xl font-semibold text-emerald-700">
            {activeCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Marked as currently employed.
          </p>
        </div>
        <div className="border border-gray-200 rounded-xl p-4 bg-white">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            Inactive / Other
          </p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">
            {inactiveCount}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            On leave, inactive, or terminated.
          </p>
        </div>
      </div>

      {/* Search + Table */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, email, territory, or role..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
            />
          </div>
          <p className="text-xs text-gray-500">
            Showing {filteredMembers.length} of {teamMembers.length} team
            members
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2 font-medium text-xs text-gray-500 uppercase tracking-wide">
                  Name
                </th>
                <th className="text-left px-4 py-2 font-medium text-xs text-gray-500 uppercase tracking-wide">
                  Email
                </th>
                <th className="text-left px-4 py-2 font-medium text-xs text-gray-500 uppercase tracking-wide">
                  Role
                </th>
                <th className="text-left px-4 py-2 font-medium text-xs text-gray-500 uppercase tracking-wide">
                  Territory
                </th>
                <th className="text-left px-4 py-2 font-medium text-xs text-gray-500 uppercase tracking-wide">
                  Status
                </th>
                <th className="text-left px-4 py-2 font-medium text-xs text-gray-500 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredMembers.length === 0 && !loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-sm text-gray-500"
                  >
                    No team members found. Use{" "}
                    <span className="font-medium">Add Team Member</span> to
                    invite your first rep.
                  </td>
                </tr>
              )}

              {loading && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-6 text-center text-sm text-gray-500"
                  >
                    Loading team members...
                  </td>
                </tr>
              )}

              {!loading &&
                filteredMembers.map((member) => {
                  const name =
                    member.profile?.company_name ||
                    member.profile?.company_email ||
                    member.employee_id ||
                    "Team Member";

                  const email = member.profile?.company_email || "—";
                  const roleLabel =
                    member.profile?.user_role === "manager"
                      ? "Manager"
                      : "Sales Rep";

                  const territory =
                    member.profile?.territory || member.department || "—";

                  const statusLabel = member.employment_status || "active";

                  const statusClass =
                    statusLabel === "active"
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                      : statusLabel === "on_leave"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-gray-50 text-gray-700 border-gray-200";

                  return (
                    <tr
                      key={member.id}
                      className="border-b border-gray-100 hover:bg-gray-50/60"
                    >
                      <td className="px-4 py-2.5 text-sm text-gray-900">
                        <button
                          type="button"
                          onClick={() => setSelectedMember(member)}
                          className="inline-flex items-center space-x-2 hover:text-gray-900"
                        >
                          <span>{name}</span>
                          {member.profile?.is_active && (
                            <BadgeCheck className="w-4 h-4 text-emerald-500" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">
                        {email}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">
                        {roleLabel}
                      </td>
                      <td className="px-4 py-2.5 text-sm text-gray-600">
                        {territory}
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full border text-xs font-medium capitalize ${statusClass}`}
                        >
                          {statusLabel.replace("_", " ")}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-sm">
                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => setSelectedMember(member)}
                            className="text-xs font-medium text-gray-700 hover:text-gray-900 underline"
                          >
                            View
                          </button>
                          <span className="text-gray-300">|</span>
                          <button
                            type="button"
                            onClick={() => setEditingMember(member)}
                            className="text-xs font-medium text-gray-700 hover:text-gray-900 underline"
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
      </div>

      {/* Modals */}
      <AddTeamMemberModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        companyId={companyId}
        onSuccess={handleRefresh}
      />

      <EditTeamMemberModal
        isOpen={!!editingMember}
        onClose={() => setEditingMember(null)}
        member={editingMember}
        onSuccess={handleRefresh}
      />

      <TeamMemberDetailModal
        isOpen={!!selectedMember}
        onClose={() => setSelectedMember(null)}
        member={selectedMember}
      />
    </div>
  );
};

export default TeamManagement;