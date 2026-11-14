import { Building2, CheckCircle2, MapPin, ShieldCheck, UserCheck, XCircle } from "lucide-react";
import {
  acceptLocaleAdminInvitationAction,
  declineLocaleAdminInvitationAction,
} from "@/app/actions/district-admin";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { parseLocaleMetadata } from "@/lib/locale-metadata";
import type { Locale } from "@/types/database";

export function LocaleAdminInvitationCards({
  invites,
  returnPath = "/notifications",
}: {
  invites: Locale[];
  returnPath?: string;
}) {
  if (!invites || invites.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      {invites.map((loc) => {
        const { headMinister, contactInfo } = parseLocaleMetadata(loc.contact_info);

        return (
          <div
            key={loc.id}
            data-gsap="item"
            className="relative overflow-hidden rounded-2xl border border-[#C2AE86] bg-gradient-to-br from-[#FBF9F4] via-[#F2ECE0] to-[#E4D6B8] p-6 shadow-md space-y-4"
          >
            <div
              aria-hidden="true"
              className="inset-x-0 top-0 h-1.5 absolute bg-gradient-to-r from-[#303B32] via-[#8C7853] to-[#D6C6A5]"
            />
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-3.5">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-[#D6C6A5] bg-gradient-to-br from-[#3A483D] via-[#303B32] to-[#1F2720] text-[#F5F1E9] shadow-sm">
                  <ShieldCheck className="h-5 w-5 text-[#D6C6A5]" />
                </span>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center rounded-full border border-[#303B32] bg-gradient-to-r from-[#3A483D] to-[#202820] px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-widest text-[#F5F1E9] shadow-sm">
                      Locale Admin Invitation
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#D6C6A5] bg-white px-2.5 py-0.5 text-[11px] font-medium text-[#303B32]">
                      <Building2 className="h-3 w-3 text-[#8C7853]" />
                      <span>{loc.name}</span>
                    </span>
                  </div>
                  <h3 className="font-serif text-lg sm:text-xl font-semibold text-[#202820] pt-0.5">
                    Invitation to Serve as Locale Admin — {loc.name}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#475048] leading-relaxed">
                    You have been assigned by the Davao District Administration to serve as a{" "}
                    <strong className="text-[#202820]">Locale Admin</strong> for{" "}
                    <strong className="text-[#202820]">{loc.name}</strong>. Accepting this
                    invitation will{" "}
                    <strong className="text-[#202820]">
                      automatically grant you membership in {loc.name}
                    </strong>{" "}
                    (without needing an invitation code) and unlock the{" "}
                    <strong className="text-[#202820]">Locale Admin Console</strong> to manage
                    your congregation.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#D6C6A5] bg-white/90 px-4 py-3 text-xs">
              <div className="flex flex-wrap items-center gap-4 text-[#475048]">
                <span className="inline-flex items-center gap-1.5 font-medium text-[#202820]">
                  <UserCheck className="h-3.5 w-3.5 text-[#8C7853]" />
                  <span>
                    Head Minister:{" "}
                    <strong>{headMinister ?? "Assigned by District"}</strong>
                  </span>
                </span>
                {loc.address && (
                  <span className="inline-flex items-center gap-1 text-[#636B62]">
                    <MapPin className="h-3.5 w-3.5 text-[#8C7853]" />
                    <span>{loc.address}</span>
                  </span>
                )}
                {contactInfo && (
                  <span className="text-[#636B62]">Contact: {contactInfo}</span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <form action={declineLocaleAdminInvitationAction}>
                  <input type="hidden" name="locale_id" value={loc.id} />
                  <input type="hidden" name="return_path" value={returnPath} />
                  <SubmitButton
                    pendingText="Declining..."
                    className="rounded-xl border border-[#D6C6A5] bg-white px-3.5 py-2 text-xs font-medium text-[#6E3429] hover:bg-[#FAF4F2]"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    <span>Decline</span>
                  </SubmitButton>
                </form>

                <form action={acceptLocaleAdminInvitationAction}>
                  <input type="hidden" name="locale_id" value={loc.id} />
                  <SubmitButton
                    pendingText="Accepting & Joining Locale..."
                    className="rounded-xl bg-gradient-to-r from-[#3A483D] via-[#303B32] to-[#1F2720] px-4 py-2 text-xs font-medium text-white shadow-sm hover:from-[#303B32] hover:to-[#181E19]"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-[#D6C6A5]" />
                    <span>Accept Invitation &amp; Manage {loc.name}</span>
                  </SubmitButton>
                </form>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
