import React, { useState, useMemo } from "react";
import { useDataStore } from "../store/dataStore";
import { DollarSign, Filter } from "lucide-react";

const CommissionsTracker = () => {
  const { commissions } = useDataStore();

  // FIX 1: Define missing filterStatus
  const [filterStatus, setFilterStatus] = useState("all");

  // FIX 2: Protect commissions so .filter() never breaks
  const safeCommissions = Array.isArray(commissions) ? commissions : [];

  // FIX 3: Period filter (this was already defined)
  const [filterPeriod, setFilterPeriod] = useState("all");

  // FIX 4: Safe filtered commissions
  const filteredCommissions = useMemo(() => {
    return safeCommissions.filter((c) => {
      // protect fields inside c
      const status = c.status || "";
      const created = c.created_at ? new Date(c.created_at) : null;

      // status filtering
      const matchesStatus =
        filterStatus === "all" || status === filterStatus;

      // period filtering
      const matchesPeriod =
        filterPeriod === "all" ||
        (filterPeriod === "week" &&
          created &&
          created >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
        (filterPeriod === "month" &&
          created &&
          created >= new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));

      return matchesStatus && matchesPeriod;
    });
  }, [safeCommissions, filterStatus, filterPeriod]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <DollarSign className="w-6 h-6 text-green-600" />
        Commissions Tracker
      </h1>

      {/* FILTERS AREA */}
      <div className="flex items-center gap-4 bg-white p-4 border rounded-lg shadow-sm">
        <Filter className="w-5 h-5 text-gray-500" />

        {/* FIX 5: This used filterStatus even though filterStatus didn't exist */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
        </select>

        <select
          value={filterPeriod}
          onChange={(e) => setFilterPeriod(e.target.value)}
          className="px-3 py-2 border rounded-lg"
        >
          <option value="all">All Time</option>
          <option value="week">Past Week</option>
          <option value="month">Past Month</option>
        </select>
      </div>

      {/* COMMISSION LIST */}
      <div className="bg-white border rounded-lg shadow-sm p-4">
        {filteredCommissions.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No commissions found.</p>
        ) : (
          <ul className="divide-y">
            {filteredCommissions.map((c) => (
              <li key={c.id} className="py-3 flex justify-between">
                <span className="text-gray-800 font-medium">
                  {c.description || "Commission"}
                </span>

                <span className="text-green-700 font-bold">
                  ${c.amount || 0}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default CommissionsTracker;