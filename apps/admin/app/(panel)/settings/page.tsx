"use client";

/**
 * Product settings an admin can change without a deploy. Today: the referral
 * programme — credits a successful invite pays (to both people) and how many
 * friends one inviter can be paid for. Changes apply to the next sign-up;
 * credits already earned are never rewritten.
 */

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { SectionCard, Spinner } from "@/components/admin-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/Shell";

interface ReferralSettings {
  creditsPerReferral: number;
  maxRewardedReferrals: number;
}

export default function SettingsPage() {
  const [saved, setSaved] = useState<ReferralSettings | null>(null);
  const [credits, setCredits] = useState("");
  const [cap, setCap] = useState("");
  const [status, setStatus] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api<ReferralSettings>("/api/admin/settings/referral").then((res) => {
      if (!res.ok) {
        setStatus({ tone: "err", text: res.error.message });
        return;
      }
      setSaved(res.data);
      setCredits(String(res.data.creditsPerReferral));
      setCap(String(res.data.maxRewardedReferrals));
    });
  }, []);

  const creditsN = Number(credits);
  const capN = Number(cap);
  const valid =
    Number.isInteger(creditsN) && creditsN >= 0 && creditsN <= 1000 && Number.isInteger(capN) && capN >= 0 && capN <= 10000;
  const dirty = saved !== null && (creditsN !== saved.creditsPerReferral || capN !== saved.maxRewardedReferrals);

  const save = async () => {
    setBusy(true);
    setStatus(null);
    const res = await api<ReferralSettings>("/api/admin/settings/referral", {
      method: "PUT",
      body: { creditsPerReferral: creditsN, maxRewardedReferrals: capN },
    });
    setBusy(false);
    if (res.ok) {
      setSaved(res.data);
      setStatus({ tone: "ok", text: "Saved — applies to the next sign-up." });
    } else {
      setStatus({ tone: "err", text: res.error.message });
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Product settings that change without a deploy" />
      <SectionCard
        className="max-w-xl"
        title="Referrals"
        description="When a friend signs up with an invite code, the friend and the inviter each get these credits (one credit = one extra action). The inviter is paid for at most the capped number of friends; friends past the cap still get theirs."
      >
        {saved === null && !status ? (
          <Spinner />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="credits">Credits per referral</Label>
              <Input id="credits" type="number" min={0} max={1000} value={credits} onChange={(e) => setCredits(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cap">Max rewarded referrals</Label>
              <Input id="cap" type="number" min={0} max={10000} value={cap} onChange={(e) => setCap(e.target.value)} />
            </div>
          </div>
        )}
        {valid && saved && (
          <p className="mt-4 text-xs text-muted-foreground">
            One inviter can earn up to {creditsN * capN} credits.
          </p>
        )}
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={() => void save()} disabled={!valid || !dirty || busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
          {status && (
            <span className={`text-xs ${status.tone === "ok" ? "text-emerald-600" : "text-destructive"}`}>{status.text}</span>
          )}
        </div>
      </SectionCard>
    </>
  );
}
