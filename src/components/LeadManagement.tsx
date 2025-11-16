import React, { useState, useEffect } from "react";
import { LeadInput, LeadRecord, LEAD_STATUSES } from "../../lib/leadService";

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (payload: LeadInput) => Promise<void>;
  lead?: LeadRecord | null;
  reps?: { id: string; full_name: string }[];
}

const LeadModal: React.FC<Props> = ({ open, onClose, onSave, lead, reps }) => {
  const [form, setForm] = useState<LeadInput>({
    name: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    status: "new",
  });

  useEffect(() => {
    if (lead) {
      setForm({
        name: lead.name,
        phone: lead.phone,
        email: lead.email,
        address: lead.address,
        notes: lead.notes,
        status: lead.status,
        assigned_to: lead.assigned_to,
      });
    }
  }, [lead]);

  if (!open) return null;

  const handleChange = (field: keyof LeadInput, value: any) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg shadow-xl">

        <h2 className="text-xl font-semibold mb-4">
          {lead ? "Edit Lead" : "Create Lead"}
        </h2>

        <div className="space-y-3">
          <input
            value={form.name}
            onChange={(e) => handleChange("name", e.target.value)}
            placeholder="Lead Name"
            className="w-full px-3 py-2 border rounded"
          />

          <input
            value={form.phone || ""}
            onChange={(e) => handleChange("phone", e.target.value)}
            placeholder="Phone"
            className="w-full px-3 py-2 border rounded"
          />

          <input
            value={form.email || ""}
            onChange={(e) => handleChange("email", e.target.value)}
            placeholder="Email"
            className="w-full px-3 py-2 border rounded"
          />

          <input
            value={form.address || ""}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Address"
            className="w-full px-3 py-2 border rounded"
          />

          <textarea
            value={form.notes || ""}
            onChange={(e) => handleChange("notes", e.target.value)}
            placeholder="Notes"
            className="w-full px-3 py-2 border rounded"
            rows={4}
          />

          {/* STATUS */}
          <select
            className="w-full px-3 py-2 border rounded"
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            {LEAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s.toUpperCase()}
              </option>
            ))}
          </select>

          {/* ASSIGN TO REP */}
          {reps && (
            <select
              className="w-full px-3 py-2 border rounded"
              value={form.assigned_to || ""}
              onChange={(e) => handleChange("assigned_to", e.target.value)}
            >
              <option value="">Assign to...</option>
              {reps.map((rep) => (
                <option key={rep.id} value={rep.id}>
                  {rep.full_name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex justify-end mt-5 space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-400 rounded"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(form)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Save Lead
          </button>
        </div>
      </div>
    </div>
  );
};

export default LeadModal;