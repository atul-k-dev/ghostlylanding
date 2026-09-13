import type { Metadata } from "next";
import { A, Callout, DocShell, H2, OL, P, UL } from "@/components/page-kit";
import { FREE_MONTHLY_ACTIONS, PRICING } from "@/lib/limits";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Refund policy",
  description:
    "When Ghostly247 refunds a subscription, how to cancel, and why the free tier exists instead of a trial.",
  alternates: { canonical: "/refunds" },
};

const UPDATED = "2026-09-13";

export default function RefundsPage() {
  return (
    <DocShell
      eyebrow="Legal"
      title="Refund policy"
      updated={UPDATED}
      intro={
        <>
          How cancellations and refunds work for Ghostly247 Pro. Short, because
          the free tier is meant to answer &ldquo;is this worth paying
          for?&rdquo; before you ever pay.
        </>
      }
    >
      <Callout title="Try it without paying">
        Every feature works on the free plan — the only limit is{" "}
        {FREE_MONTHLY_ACTIONS} actions a month. There is no trial to forget to
        cancel, because you can use the whole product before you subscribe.
      </Callout>

      <H2>Cancelling</H2>
      <P>
        You can cancel at any time from the Stripe billing portal, reachable in
        the extension under Settings → Plan → Manage billing. Cancelling stops
        the next renewal. You keep Pro for the rest of the period you have
        already paid for, then drop back to the free plan with your settings,
        logs and drafts intact.
      </P>

      <H2>When we refund</H2>
      <P>We will issue a refund in these cases:</P>
      <UL>
        <li>
          <strong>Billed after cancelling.</strong> If a renewal is charged
          after you cancelled, we refund it in full.
        </li>
        <li>
          <strong>Duplicate charge.</strong> Charged twice for the same period,
          we refund the duplicate.
        </li>
        <li>
          <strong>The service was broken.</strong> If a fault on our side meant
          Pro did not work for a meaningful part of your billing period, tell us
          and we will refund that period.
        </li>
        <li>
          <strong>Accidental subscription.</strong> Email us within 48 hours of
          the first charge on a new subscription and we will refund it, provided
          the plan has not been used heavily in the meantime.
        </li>
      </UL>

      <H2>When we don&rsquo;t</H2>
      <UL>
        <li>
          Action X takes against your account. This is set out plainly in the{" "}
          <A href="/terms">terms</A>: automation carries that risk, and it is
          the risk you accept by using the product.
        </li>
        <li>
          Not getting the growth you hoped for. Ghostly247 does the work you
          configure; it does not promise an outcome.
        </li>
        <li>
          Periods already elapsed on a subscription you simply stopped using.
          Weekly billing exists so that unused time is measured in days, not
          months.
        </li>
      </UL>

      <H2>Statutory rights</H2>
      <P>
        Nothing here removes a refund right you have under the consumer law
        where you live. If your local law entitles you to a refund we have not
        offered above, you are entitled to it.
      </P>

      <H2>How to ask</H2>
      <OL>
        <li>
          Email <A href={`mailto:${SITE.email}`}>{SITE.email}</A> from the
          address on your account.
        </li>
        <li>Tell us which charge, and roughly what happened.</li>
        <li>
          We reply within two business days. Approved refunds are issued through
          Stripe to the original payment method and usually appear within five to
          ten business days, depending on your bank.
        </li>
      </OL>

      <H2>Prices</H2>
      <P>
        Pro is {PRICING.weekly.amount} per week or {PRICING.monthly.amount} per
        month. The amount actually charged is whatever is shown at checkout in
        your own currency; if the two ever disagree, the checkout figure is the
        one that counts.
      </P>
    </DocShell>
  );
}
