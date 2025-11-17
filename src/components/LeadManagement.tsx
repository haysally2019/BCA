import React, { useState, useEffect } from "react";

import {
  LEAD_STATUSES,
  createLead,
  updateLead,
  getLeads,
  type LeadInput,
  type LeadRecord
} from "./lib/leadService";

import LeadModal from "./leads/LeadModal";
import { useAuthStore } from "../store/authStore";

const LeadManagement: React.FC = () => {
  const { profile } = useAuthStore();
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(false);
  const [editLead, setEditLead] = useState<LeadRecord | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await getLeads();
      setLeads(data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const saveLead = async (form: LeadInput) => {
    if (editLead) {
      const updated = await updateLead(editLead.id, form);
      setLeads((prev) =>
        prev.map((l) => (l.id === editLead.id ? updated : l))
      );
    } else {
      const newLead = await createLead(form);
      setLeads((prev) => [newLead, ...prev]);
    }
    setModal(false);
    setEditLead(null);
  };

  const openEdit = (lead: LeadRecord) => {
    setEditLead(lead);
    setModal(true);
  };

  return (
    <div className="p-4">

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Lead Management</h1>

        <button
          onClick={() => {
            setEditLead(null);
            setModal(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          + New Lead
        </button>
      </div>

      <div className="flex space-x-4 mt-4">
        {LEAD_STATUSES.map((s) => (
          <button
            key={s}
            onClick={() =>
              setLeads((prev) => prev.filter((l) => l.status === s))
            }
            className="px-3 py-1 rounded bg-gray-200 text-gray-700"
          >
            {s.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {loading && <div>Loading leads...</div>}

        {!loading &&
          leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white border rounded p-4 shadow-sm hover:shadow cursor-pointer"
              onClick={() => openEdit(lead)}
            >
              <div className="font-semibold text-lg">{lead.name}</div>
              <div className="text-gray-600 text-sm">
                Status: {lead.status.toUpperCase()}
              </div>
              <div className="text-sm">{lead.phone} • {lead.email}</div>
            </div>
          ))}
      </div>

      <LeadModal
        open={modal}
        lead={editLead}
        reps={[]}
        onClose={() => setModal(false)}
        onSave={saveLead}
      />
    </div>
  );
};

export default LeadManagement;