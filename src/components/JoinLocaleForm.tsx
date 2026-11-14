"use client";

import { useState } from "react";
import { Building2, MapPin, Phone, Send, UserCheck } from "lucide-react";
import { submitMembershipRequestAction } from "@/app/actions/membership";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { parseLocaleMetadata } from "@/lib/locale-metadata";
import type { Locale } from "@/types/database";

export function JoinLocaleForm({ activeLocales }: { activeLocales: Locale[] }) {
  const [selectedLocaleId, setSelectedLocaleId] = useState<string>("");

  const selectedLocale = activeLocales.find((loc) => loc.id === selectedLocaleId) ?? null;
  const selectedMeta = selectedLocale
    ? parseLocaleMetadata(selectedLocale.contact_info)
    : null;

  return (
    <form action={submitMembershipRequestAction} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-2">
            1. Select Congregation *
          </label>
          <select
            name="locale_id"
            required
            value={selectedLocaleId}
            onChange={(e) => setSelectedLocaleId(e.target.value)}
            className="w-full rounded-xl border border-[#D6C6A5] bg-white px-4 py-2.5 text-sm text-[#202820] focus:border-[#303B32] focus:outline-none"
          >
            <option value="" disabled>
              Choose a Locale...
            </option>
            {activeLocales.map((loc) => {
              const { headMinister } = parseLocaleMetadata(loc.contact_info);
              return (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                  {headMinister ? ` — Head Minister: ${headMinister}` : ""}
                  {!headMinister && loc.address ? ` — ${loc.address}` : ""}
                </option>
              );
            })}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium uppercase tracking-widest text-[#636B62] mb-2">
            2. Enter Invitation Code *
          </label>
          <input
            type="text"
            name="code"
            required
            placeholder="e.g., TORIL-V38D-QUKH"
            className="w-full rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/40 px-4 py-2.5 text-sm uppercase font-mono tracking-wider text-[#202820] focus:border-[#303B32] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Selected Congregation Details Card (Indicating Head Minister upon joining) */}
      {selectedLocale && (
        <div className="rounded-xl border border-[#D6C6A5] bg-[#F5F1E9]/80 p-4 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4 text-[#303B32]" />
              <span className="font-serif text-base font-semibold text-[#202820]">
                {selectedLocale.name}
              </span>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D6C6A5] bg-white px-3 py-1 text-xs font-medium text-[#303B32] shadow-sm">
              <UserCheck className="h-3.5 w-3.5 text-[#8C7853]" />
              <span>
                Head Minister:{" "}
                <strong className="text-[#202820]">
                  {selectedMeta?.headMinister ?? "To be assigned"}
                </strong>
              </span>
            </span>
          </div>

          <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-[#475048]">
            {selectedLocale.address && (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-[#8C7853]" />
                {selectedLocale.address}
              </span>
            )}
            {selectedMeta?.contactInfo && (
              <span className="inline-flex items-center gap-1.5">
                <Phone className="h-3.5 w-3.5 text-[#8C7853]" />
                {selectedMeta.contactInfo}
              </span>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end pt-1">
        <SubmitButton
          pendingText="Validating Code..."
          className="rounded-xl bg-[#303B32] px-6 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-[#202820]"
        >
          <Send className="h-4 w-4 text-[#D6C6A5]" />
          <span>Submit Membership Request</span>
        </SubmitButton>
      </div>
    </form>
  );
}
