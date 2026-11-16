"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownAZ,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  Lock,
  PauseCircle,
  PlayCircle,
  PlusCircle,
  Printer,
  QrCode,
  RotateCcw,
  Search,
  StopCircle,
  Trash2,
  Users,
  X,
} from "lucide-react";
import {
  manualCheckInAction,
  removeAttendanceRecordAction,
  updateAttendanceStatusAction,
} from "@/app/actions/activities";
import {
  exportAttendanceToExcel,
  exportAttendanceToWord,
  printAttendancePdf,
} from "@/lib/attendance-export";
import { formatPhilippineDateTime } from "@/lib/date-utils";
import { generateQrMatrix, generateQrSvgPath } from "@/lib/qr-code";
import type {
  ActivityAttendanceRecord,
  AttendanceStatus,
  Locale,
  Profile,
  ProgramActivity,
} from "@/types/database";

interface DistrictAttendanceManagerProps {
  activity: ProgramActivity;
  attendanceRecords: ActivityAttendanceRecord[];
  allLocales: Pick<Locale, "id" | "name">[];
  allMembers?: Pick<Profile, "id" | "full_name" | "email">[];
  returnPath?: string;
}

export function DistrictAttendanceManager({
  activity,
  attendanceRecords,
  allLocales,
  allMembers = [],
  returnPath = "/district-admin",
}: DistrictAttendanceManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [showManualAddModal, setShowManualAddModal] = useState(false);

  // Status & Code management
  const status: AttendanceStatus = activity.attendance_status || "not_started";
  const [customCode, setCustomCode] = useState(activity.attendance_code || "");
  const [copied, setCopied] = useState(false);

  // Filter & Sort state
  const [sortMode, setSortMode] = useState<"alpha" | "locale">("alpha");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedLocaleId, setSelectedLocaleId] = useState<string>("all");

  // Member search for manual check-in
  const [manualMemberSearch, setManualMemberSearch] = useState("");

  const handleCopyCode = async () => {
    if (!customCode) return;
    await navigator.clipboard.writeText(customCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleGenerateCode = () => {
    // Generate clean 6-digit code e.g. 749215
    const randomCode = String(Math.floor(100000 + Math.random() * 900000));
    setCustomCode(randomCode);
  };

  // Filtered attendees
  const filteredRecords = useMemo(() => {
    let list = [...attendanceRecords];

    if (selectedLocaleId !== "all") {
      list = list.filter((r) => r.locale_id === selectedLocaleId);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.profile?.full_name?.toLowerCase().includes(q) ||
          r.profile?.email?.toLowerCase().includes(q) ||
          r.locale?.name?.toLowerCase().includes(q)
      );
    }

    if (sortMode === "alpha") {
      list.sort((a, b) =>
        (a.profile?.full_name || "").localeCompare(b.profile?.full_name || "")
      );
    }

    return list;
  }, [attendanceRecords, selectedLocaleId, searchQuery, sortMode]);

  // Grouped by Locale
  const localeGroups = useMemo(() => {
    const map = new Map<string, ActivityAttendanceRecord[]>();

    for (const rec of attendanceRecords) {
      const key = rec.locale?.name || "No Assigned Locale";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(rec);
    }

    return Array.from(map.entries())
      .map(([localeName, attendees]) => ({
        localeName,
        attendees: attendees.sort((a, b) =>
          (a.profile?.full_name || "").localeCompare(b.profile?.full_name || "")
        ),
      }))
      .sort((a, b) => b.attendees.length - a.attendees.length);
  }, [attendanceRecords]);

  // Attendance Link & QR Code
  const attendanceUrl = typeof window !== "undefined"
    ? `${window.location.origin}/activities/${activity.id}?code=${encodeURIComponent(customCode || "")}`
    : `/activities/${activity.id}?code=${encodeURIComponent(customCode || "")}`;

  const qrMatrix = useMemo(() => {
    if (!customCode) return null;
    try {
      return generateQrMatrix(attendanceUrl);
    } catch {
      return null;
    }
  }, [attendanceUrl, customCode]);

  const qrSvgPath = useMemo(() => {
    return qrMatrix ? generateQrSvgPath(qrMatrix) : "";
  }, [qrMatrix]);

  // Export handlers
  const exportPayload = {
    activity,
    records: filteredRecords,
    localeGroups,
    totalAttendees: attendanceRecords.length,
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6C6A5] bg-[#F0ECE3] px-3.5 py-1.5 text-xs font-semibold text-[#202820] hover:bg-[#303B32] hover:text-white hover:border-[#303B32] transition-colors"
      >
        <Users className="h-3.5 w-3.5 text-[#8C7853]" />
        <span>Manage Attendance</span>
        {attendanceRecords.length > 0 && (
          <span className="ml-1 rounded-full bg-[#8C7853] px-1.5 py-0.2 text-[10px] font-bold text-white">
            {attendanceRecords.length}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="flex flex-col h-[92vh] w-full max-w-5xl rounded-2xl border border-[#D6C6A5] bg-[#FCFBF8] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150"
            role="dialog"
            aria-modal="true"
          >
            {/* Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E0DACD] bg-[#F5F1E9] px-6 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#8C7853]">
                    Attendance Management
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                      status === "active"
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                        : status === "paused"
                        ? "bg-amber-100 text-amber-800 border border-amber-300"
                        : status === "closed"
                        ? "bg-stone-200 text-stone-700 border border-stone-300"
                        : "bg-stone-100 text-stone-600 border border-stone-200"
                    }`}
                  >
                    {status.replace("_", " ")}
                  </span>
                </div>
                <h2 className="font-serif text-lg sm:text-xl font-bold text-[#202820] mt-0.5">
                  {activity.title}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="rounded-lg p-2 text-[#475048] hover:bg-[#E0DACD] transition-colors"
                  aria-label="Close modal"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* 1. Attendance Control Bar */}
              <div className="rounded-2xl border border-[#D6C6A5] bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#475048]">
                      Attendance Code &amp; Lifecycle Controls
                    </h3>
                    <p className="text-xs text-[#636B62]">
                      Control submission periods and provide the code to attendees.
                    </p>
                  </div>

                  {/* QR Code button */}
                  {status === "active" && customCode && (
                    <button
                      type="button"
                      onClick={() => setShowQrModal(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-[#8C7853] bg-[#F5F1E9] px-3.5 py-1.5 text-xs font-semibold text-[#303B32] hover:bg-[#8C7853] hover:text-white transition-colors"
                    >
                      <QrCode className="h-4 w-4" />
                      <span>Project QR Code</span>
                    </button>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {/* Code Input & Generator */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#636B62]">
                      Attendance Code
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={customCode}
                        onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                        placeholder="e.g. 582914 or DAVAO-2026"
                        className="flex-1 rounded-xl border-2 border-[#D6C6A5] px-3.5 py-2 font-mono text-sm font-bold tracking-widest text-[#202820] focus:border-[#303B32] focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={handleGenerateCode}
                        title="Generate random 6-digit code"
                        className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9] px-3 py-2 text-xs font-semibold text-[#475048] hover:bg-[#E0DACD]"
                      >
                        Generate
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyCode}
                        disabled={!customCode}
                        title="Copy code to clipboard"
                        className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9] px-3 py-2 text-xs font-semibold text-[#475048] hover:bg-[#E0DACD] disabled:opacity-50"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Status Action Buttons */}
                  <div className="space-y-2">
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-[#636B62]">
                      Change Attendance Status
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      {status === "not_started" && (
                        <form action={updateAttendanceStatusAction}>
                          <input type="hidden" name="activity_id" value={activity.id} />
                          <input type="hidden" name="status" value="active" />
                          <input type="hidden" name="attendance_code" value={customCode} />
                          <input type="hidden" name="return_path" value={returnPath} />
                          <button
                            type="submit"
                            disabled={!customCode.trim()}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 shadow-sm transition-colors"
                          >
                            <PlayCircle className="h-4 w-4" />
                            <span>Start Attendance</span>
                          </button>
                        </form>
                      )}

                      {status === "active" && (
                        <>
                          <form action={updateAttendanceStatusAction}>
                            <input type="hidden" name="activity_id" value={activity.id} />
                            <input type="hidden" name="status" value="paused" />
                            <input type="hidden" name="return_path" value={returnPath} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-700 shadow-sm transition-colors"
                            >
                              <PauseCircle className="h-4 w-4" />
                              <span>Stop Attendance</span>
                            </button>
                          </form>
                          <form action={updateAttendanceStatusAction}>
                            <input type="hidden" name="activity_id" value={activity.id} />
                            <input type="hidden" name="status" value="closed" />
                            <input type="hidden" name="return_path" value={returnPath} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 shadow-sm transition-colors"
                            >
                              <StopCircle className="h-4 w-4" />
                              <span>Close Attendance</span>
                            </button>
                          </form>
                        </>
                      )}

                      {status === "paused" && (
                        <>
                          <form action={updateAttendanceStatusAction}>
                            <input type="hidden" name="activity_id" value={activity.id} />
                            <input type="hidden" name="status" value="active" />
                            <input type="hidden" name="attendance_code" value={customCode} />
                            <input type="hidden" name="return_path" value={returnPath} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition-colors"
                            >
                              <PlayCircle className="h-4 w-4" />
                              <span>Continue Attendance</span>
                            </button>
                          </form>
                          <form action={updateAttendanceStatusAction}>
                            <input type="hidden" name="activity_id" value={activity.id} />
                            <input type="hidden" name="status" value="closed" />
                            <input type="hidden" name="return_path" value={returnPath} />
                            <button
                              type="submit"
                              className="inline-flex items-center gap-1.5 rounded-xl bg-stone-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-stone-800 shadow-sm transition-colors"
                            >
                              <Lock className="h-4 w-4" />
                              <span>Close Attendance</span>
                            </button>
                          </form>
                        </>
                      )}

                      {status === "closed" && (
                        <form action={updateAttendanceStatusAction}>
                          <input type="hidden" name="activity_id" value={activity.id} />
                          <input type="hidden" name="status" value="active" />
                          <input type="hidden" name="attendance_code" value={customCode} />
                          <input type="hidden" name="return_path" value={returnPath} />
                          <button
                            type="submit"
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 shadow-sm transition-colors"
                          >
                            <RotateCcw className="h-4 w-4" />
                            <span>Re-enable Attendance</span>
                          </button>
                        </form>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Metrics & Export Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#D6C6A5]/70 bg-[#F5F1E9] p-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-[#303B32]" />
                    <span className="font-serif text-2xl font-bold text-[#202820]">
                      {attendanceRecords.length}
                    </span>
                    <span className="text-xs font-medium text-[#636B62]">
                      Total Attendees
                    </span>
                  </div>
                  <div className="h-5 w-px bg-[#D6C6A5]" />
                  <div className="text-xs text-[#636B62]">
                    <strong>{localeGroups.length}</strong> Locales Represented
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowManualAddModal(true)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[#D6C6A5] bg-white px-3 py-2 text-xs font-semibold text-[#303B32] hover:bg-[#E0DACD] transition-colors"
                  >
                    <PlusCircle className="h-4 w-4 text-[#8C7853]" />
                    <span>Check In Member</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportAttendanceToExcel(exportPayload)}
                    disabled={attendanceRecords.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-800 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-900 disabled:opacity-50 transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Export Excel (.xlsx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => exportAttendanceToWord(exportPayload)}
                    disabled={attendanceRecords.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-800 px-3 py-2 text-xs font-semibold text-white hover:bg-blue-900 disabled:opacity-50 transition-colors"
                  >
                    <FileText className="h-4 w-4" />
                    <span>Export Word (.docx)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => printAttendancePdf(exportPayload)}
                    disabled={attendanceRecords.length === 0}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[#303B32] px-3 py-2 text-xs font-semibold text-white hover:bg-[#202820] disabled:opacity-50 transition-colors"
                  >
                    <Printer className="h-4 w-4" />
                    <span>Print / PDF</span>
                  </button>
                </div>
              </div>

              {/* 3. Filter & Sort Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[260px]">
                  <div className="relative flex-1 min-w-[180px]">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
                    <input
                      type="text"
                      placeholder="Search attendee by name or email..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full rounded-xl border border-[#D6C6A5] bg-white pl-9 pr-4 py-2 text-xs text-[#202820] placeholder:text-stone-400 focus:border-[#303B32] focus:outline-none"
                    />
                  </div>

                  <select
                    value={selectedLocaleId}
                    onChange={(e) => setSelectedLocaleId(e.target.value)}
                    className="rounded-xl border border-[#D6C6A5] bg-white px-3 py-2 text-xs font-medium text-[#202820] focus:border-[#303B32] focus:outline-none"
                  >
                    <option value="all">All Locales</option>
                    {allLocales.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-1 bg-[#F5F1E9] p-1 rounded-xl border border-[#D6C6A5]/60">
                  <button
                    type="button"
                    onClick={() => setSortMode("alpha")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      sortMode === "alpha"
                        ? "bg-white text-[#202820] shadow-sm"
                        : "text-[#636B62] hover:text-[#202820]"
                    }`}
                  >
                    <ArrowDownAZ className="h-3.5 w-3.5" />
                    <span>Alphabetical (A–Z)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortMode("locale")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                      sortMode === "locale"
                        ? "bg-white text-[#202820] shadow-sm"
                        : "text-[#636B62] hover:text-[#202820]"
                    }`}
                  >
                    <Building2 className="h-3.5 w-3.5" />
                    <span>By Locale Church</span>
                  </button>
                </div>
              </div>

              {/* 4. Attendance Tables */}
              {attendanceRecords.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-[#D6C6A5] p-12 text-center space-y-2">
                  <Users className="mx-auto h-10 w-10 text-[#8C7853]/60" />
                  <h4 className="font-serif text-base font-semibold text-[#202820]">
                    No Attendance Submissions Yet
                  </h4>
                  <p className="text-xs text-[#636B62] max-w-sm mx-auto">
                    Start attendance and provide the code to members. Submitted records will appear here automatically.
                  </p>
                </div>
              ) : sortMode === "locale" ? (
                /* Grouped by Locale View */
                <div className="space-y-6">
                  {localeGroups.map((group) => {
                    const attendeesInGroup = group.attendees.filter((r) =>
                      filteredRecords.some((fr) => fr.id === r.id)
                    );
                    if (attendeesInGroup.length === 0) return null;

                    return (
                      <div
                        key={group.localeName}
                        className="rounded-2xl border border-[#D6C6A5] bg-white overflow-hidden shadow-sm"
                      >
                        <div className="flex items-center justify-between bg-[#F5F1E9] px-5 py-3 border-b border-[#D6C6A5]/60">
                          <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-[#8C7853]" />
                            <h4 className="font-serif text-sm font-bold text-[#202820]">
                              {group.localeName}
                            </h4>
                          </div>
                          <span className="rounded-full bg-[#303B32] px-2.5 py-0.5 text-xs font-bold text-white">
                            {attendeesInGroup.length} attendees
                          </span>
                        </div>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-[#FCFBF8] text-[#636B62] border-b border-[#E0DACD]">
                              <tr>
                                <th className="px-4 py-2.5 w-12 text-center">#</th>
                                <th className="px-4 py-2.5">Full Name</th>
                                <th className="px-4 py-2.5">Email Account</th>
                                <th className="px-4 py-2.5 text-center">Time Submitted</th>
                                <th className="px-4 py-2.5 text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#E0DACD]">
                              {attendeesInGroup.map((rec, idx) => (
                                <tr key={rec.id} className="hover:bg-[#FAF8F5]">
                                  <td className="px-4 py-2.5 text-center font-mono font-medium text-[#636B62]">
                                    {idx + 1}
                                  </td>
                                  <td className="px-4 py-2.5 font-semibold text-[#202820]">
                                    {rec.profile?.full_name ?? "Unknown"}
                                  </td>
                                  <td className="px-4 py-2.5 text-[#636B62]">
                                    {rec.profile?.email ?? "—"}
                                  </td>
                                  <td className="px-4 py-2.5 text-center text-[#636B62]">
                                    {formatPhilippineDateTime(rec.attended_at, { timeStyle: "short" })}
                                  </td>
                                  <td className="px-4 py-2.5 text-right">
                                    <form action={removeAttendanceRecordAction}>
                                      <input type="hidden" name="record_id" value={rec.id} />
                                      <input type="hidden" name="activity_id" value={activity.id} />
                                      <input type="hidden" name="return_path" value={returnPath} />
                                      <button
                                        type="submit"
                                        title="Remove attendee"
                                        className="text-stone-400 hover:text-rose-600 p-1"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" />
                                      </button>
                                    </form>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Alphabetical Unified Master Roster */
                <div className="rounded-2xl border border-[#D6C6A5] bg-white overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#F5F1E9] text-[#475048] border-b border-[#D6C6A5]">
                        <tr>
                          <th className="px-4 py-3 w-12 text-center font-bold">#</th>
                          <th className="px-4 py-3 font-bold">Full Name</th>
                          <th className="px-4 py-3 font-bold">Gmail / Email Account</th>
                          <th className="px-4 py-3 font-bold">Locale Church</th>
                          <th className="px-4 py-3 text-center font-bold">Time Recorded</th>
                          <th className="px-4 py-3 text-right font-bold">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E0DACD]">
                        {filteredRecords.map((rec, idx) => (
                          <tr key={rec.id} className="hover:bg-[#FAF8F5]">
                            <td className="px-4 py-3 text-center font-mono font-medium text-[#636B62]">
                              {idx + 1}
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#202820]">
                              {rec.profile?.full_name ?? "Unknown"}
                            </td>
                            <td className="px-4 py-3 text-[#636B62]">
                              {rec.profile?.email ?? "—"}
                            </td>
                            <td className="px-4 py-3 font-medium text-[#475048]">
                              {rec.locale?.name ?? "No Locale"}
                            </td>
                            <td className="px-4 py-3 text-center text-[#636B62]">
                              {formatPhilippineDateTime(rec.attended_at, {
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </td>
                            <td className="px-4 py-3 text-right">
                              <form action={removeAttendanceRecordAction}>
                                <input type="hidden" name="record_id" value={rec.id} />
                                <input type="hidden" name="activity_id" value={activity.id} />
                                <input type="hidden" name="return_path" value={returnPath} />
                                <button
                                  type="submit"
                                  title="Remove attendee"
                                  className="text-stone-400 hover:text-rose-600 p-1"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* QR Code Projector Modal */}
      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="w-full max-w-sm rounded-3xl border border-[#D6C6A5] bg-white p-7 text-center shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#8C7853]">
                Scan to Attend
              </span>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="rounded-lg p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <h3 className="font-serif text-lg font-bold text-[#202820] leading-snug">
              {activity.title}
            </h3>

            {/* QR Code Render */}
            <div className="mx-auto flex h-60 w-60 items-center justify-center rounded-2xl border-2 border-[#D6C6A5] bg-white p-4 shadow-inner">
              {qrMatrix ? (
                <svg
                  viewBox={`-2 -2 ${qrMatrix.length + 4} ${qrMatrix.length + 4}`}
                  className="h-full w-full"
                >
                  <rect
                    x="-2"
                    y="-2"
                    width={qrMatrix.length + 4}
                    height={qrMatrix.length + 4}
                    fill="#ffffff"
                  />
                  <path d={qrSvgPath} fill="#202820" />
                </svg>
              ) : (
                <p className="text-xs text-stone-400">Unable to generate QR</p>
              )}
            </div>

            <div className="space-y-1">
              <p className="text-xs text-[#636B62]">Or enter this code on the Activities tab:</p>
              <div className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9] py-2 px-3 font-mono text-2xl font-bold tracking-widest text-[#202820]">
                {customCode}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowQrModal(false)}
              className="w-full rounded-xl bg-[#303B32] py-2.5 text-xs font-semibold text-white hover:bg-[#202820]"
            >
              Close Display
            </button>
          </div>
        </div>
      )}

      {/* Manual Check-In Modal */}
      {showManualAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl border border-[#D6C6A5] bg-white p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#E0DACD] pb-3">
              <h3 className="font-serif text-lg font-bold text-[#202820]">
                Manual Attendee Check-In
              </h3>
              <button
                type="button"
                onClick={() => setShowManualAddModal(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs text-[#636B62]">
              Select a registered member to record their attendance (e.g. for members without phones).
            </p>

            <div className="space-y-2">
              <input
                type="text"
                placeholder="Search member by name or email..."
                value={manualMemberSearch}
                onChange={(e) => setManualMemberSearch(e.target.value)}
                className="w-full rounded-xl border border-[#D6C6A5] px-3.5 py-2 text-xs text-[#202820] focus:border-[#303B32] focus:outline-none"
              />

              <div className="max-h-56 overflow-y-auto rounded-xl border border-[#E0DACD] divide-y divide-[#E0DACD]">
                {allMembers
                  .filter(
                    (m) =>
                      !attendanceRecords.some((r) => r.user_id === m.id) &&
                      (m.full_name?.toLowerCase().includes(manualMemberSearch.toLowerCase()) ||
                        m.email?.toLowerCase().includes(manualMemberSearch.toLowerCase()))
                  )
                  .slice(0, 15)
                  .map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-3 hover:bg-[#FAF8F5]"
                    >
                      <div>
                        <p className="text-xs font-bold text-[#202820]">{member.full_name}</p>
                        <p className="text-[11px] text-[#636B62]">{member.email}</p>
                      </div>
                      <form action={manualCheckInAction}>
                        <input type="hidden" name="activity_id" value={activity.id} />
                        <input type="hidden" name="user_id" value={member.id} />
                        <input type="hidden" name="return_path" value={returnPath} />
                        <button
                          type="submit"
                          className="rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800"
                        >
                          Check In
                        </button>
                      </form>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowManualAddModal(false)}
                className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9] px-4 py-2 text-xs font-semibold text-[#475048]"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
