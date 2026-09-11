import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { HugeiconsIcon, type IconSvgElement } from '@hugeicons/react';
import { Alert02Icon, ArrowLeft01Icon, Loading03Icon, ViewIcon, ViewOffIcon } from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';

/**
 * The pieces the sign-in, sign-up and reset screens are built from — one
 * column, sized for the side panel, in the same theme as the rest of it.
 */
const SITE = 'https://ai-casper.vercel.app';

export const AuthShell = ({
  title,
  subtitle,
  onBack,
  children,
  footer = true,
}: {
  title: string;
  subtitle: ReactNode;
  onBack?: () => void;
  children: ReactNode;
  footer?: boolean;
}) => (
  <div className="relative flex min-h-full flex-col overflow-hidden bg-canvas text-foreground">
    {/* A soft wash of the theme colour behind the logo. */}
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_70%_at_50%_0%,color-mix(in_oklch,var(--primary)_40%,transparent),transparent)]"
    />
    <div className="relative mx-auto flex w-full max-w-sm flex-1 flex-col px-5 pt-5 pb-6">
      <div className="h-9">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className="-ml-2 grid size-9 cursor-pointer place-items-center rounded-full text-foreground/80 transition hover:bg-foreground/5"
          >
            <HugeiconsIcon icon={ArrowLeft01Icon} strokeWidth={2.2} className="size-5" />
          </button>
        )}
      </div>

      <div className="mt-2 mb-7 flex flex-col items-center text-center">
        <img src={chrome.runtime.getURL('ghostly247logo.png')} alt="" className="size-16 object-contain drop-shadow-lg" />
        <h1 className="mt-5 font-display text-[26px] leading-tight font-extrabold tracking-tight">{title}</h1>
        <p className="mt-1.5 max-w-[28ch] text-sm leading-snug text-muted-foreground">{subtitle}</p>
      </div>

      {children}

      {footer && (
        <p className="mt-auto pt-8 text-center text-[11px] leading-relaxed text-muted-foreground">
          By continuing you agree to the{' '}
          <a href={`${SITE}/terms`} target="_blank" rel="noreferrer" className="font-medium text-foreground/80 underline-offset-2 hover:underline">
            Terms
          </a>{' '}
          and{' '}
          <a href={`${SITE}/privacy`} target="_blank" rel="noreferrer" className="font-medium text-foreground/80 underline-offset-2 hover:underline">
            Privacy Policy
          </a>
          .<br />
          Runs in your browser · v{chrome.runtime.getManifest().version}
        </p>
      )}
    </div>
  </div>
);

export const AuthCard = ({ children }: { children: ReactNode }) => (
  <div className="flex flex-col gap-4 rounded-[2rem] bg-card p-5 text-card-foreground shadow-sm ring-1 ring-[color:var(--card-ring)]">
    {children}
  </div>
);

/** A labelled field with a leading icon, and an optional show/hide toggle for passwords. */
export const Field = ({
  label,
  icon,
  password,
  trailing,
  className,
  ...input
}: InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon: IconSvgElement;
  password?: boolean;
  trailing?: ReactNode;
}) => {
  const [show, setShow] = useState(false);
  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-baseline justify-between px-1 text-[13px] font-semibold">
        {label}
        {trailing}
      </span>
      <span className="relative">
        <HugeiconsIcon
          icon={icon}
          strokeWidth={1.8}
          className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-muted-foreground"
        />
        <input
          {...input}
          type={password ? (show ? 'text' : 'password') : input.type}
          className={cn(
            'h-12 w-full rounded-2xl border border-transparent bg-muted/70 pr-4 pl-11 text-[15px] transition outline-none placeholder:text-muted-foreground/70 focus:border-primary focus:bg-background focus:ring-4 focus:ring-primary/15 disabled:opacity-60 aria-invalid:border-destructive',
            password && 'pr-12',
            className,
          )}
        />
        {password && (
          <button
            type="button"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? 'Hide password' : 'Show password'}
            aria-pressed={show}
            tabIndex={-1}
            className="absolute top-1/2 right-2 grid size-9 -translate-y-1/2 cursor-pointer place-items-center rounded-full text-muted-foreground transition hover:bg-foreground/5 hover:text-foreground"
          >
            <HugeiconsIcon icon={show ? ViewOffIcon : ViewIcon} strokeWidth={1.8} className="size-[18px]" />
          </button>
        )}
      </span>
    </label>
  );
};

export const PrimaryButton = ({
  children,
  busy,
  disabled,
  type = 'submit',
  onClick,
}: {
  children: ReactNode;
  busy?: boolean;
  disabled?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
}) => (
  <button
    type={type}
    onClick={onClick}
    disabled={disabled || busy}
    className="flex h-12 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary font-display text-[15px] font-bold text-primary-foreground shadow-sm transition hover:bg-primary/90 active:scale-[0.99] disabled:cursor-default disabled:opacity-60"
  >
    {busy && <HugeiconsIcon icon={Loading03Icon} strokeWidth={2.2} className="size-5 animate-spin" />}
    {children}
  </button>
);

export const ErrorNote = ({ children }: { children: ReactNode }) => (
  <p role="alert" className="flex items-start gap-2 rounded-2xl bg-destructive/10 px-3.5 py-2.5 text-sm leading-snug text-destructive">
    <HugeiconsIcon icon={Alert02Icon} strokeWidth={2} className="mt-0.5 size-4 shrink-0" />
    <span>{children}</span>
  </p>
);

export const Divider = ({ children }: { children: string }) => (
  <div className="flex items-center gap-3">
    <span className="h-px flex-1 bg-foreground/10" />
    <span className="text-xs font-medium text-muted-foreground">{children}</span>
    <span className="h-px flex-1 bg-foreground/10" />
  </div>
);

/** How strong a new password is, 0–4: length, mixed case, a number, a symbol. */
export const passwordScore = (p: string) =>
  (p.length >= 8 ? 1 : 0) + (/[a-z]/.test(p) && /[A-Z]/.test(p) ? 1 : 0) + (/\d/.test(p) ? 1 : 0) + (/[^A-Za-z0-9]/.test(p) ? 1 : 0);

export const StrengthMeter = ({ password }: { password: string }) => {
  if (!password) return null;
  const score = passwordScore(password);
  const label = password.length < 8 ? 'At least 8 characters' : ['Weak', 'Okay', 'Good', 'Strong', 'Strong'][score];
  const tone = password.length < 8 || score <= 1 ? 'bg-destructive' : score === 2 ? 'bg-casper-attention' : 'bg-casper-working';
  return (
    <div className="-mt-2 flex items-center gap-2 px-1">
      <div className="flex flex-1 gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={cn('h-1 flex-1 rounded-full transition-colors', i < Math.max(1, score) ? tone : 'bg-foreground/10')} />
        ))}
      </div>
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
    </div>
  );
};

/**
 * Six boxes for a 6-digit code. One real input sits over them, so paste and
 * the browser's one-time-code autofill work exactly as they would anywhere.
 */
export const CodeInput = ({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled?: boolean }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div className="relative">
      <div className="grid grid-cols-6 gap-2" aria-hidden>
        {Array.from({ length: 6 }, (_, i) => {
          const active = focused && (i === value.length || (i === 5 && value.length === 6));
          return (
            <span
              key={i}
              className={cn(
                'grid h-14 place-items-center rounded-2xl bg-muted/70 font-display text-2xl font-bold tabular-nums transition',
                active && 'bg-background ring-2 ring-primary',
                value[i] && 'bg-primary/12',
              )}
            >
              {value[i] ?? (active ? <span className="h-6 w-0.5 animate-pulse rounded-full bg-primary" /> : '')}
            </span>
          );
        })}
      </div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        disabled={disabled}
        aria-label="6-digit code"
        autoFocus
        className="absolute inset-0 h-full w-full cursor-text opacity-0"
      />
    </div>
  );
};

export const GoogleMark = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
    <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
    <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.836.86-3.048.86-2.344 0-4.328-1.583-5.036-3.71H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853" />
    <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
    <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
  </svg>
);
