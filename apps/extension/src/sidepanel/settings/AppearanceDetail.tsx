import { useEffect, useState } from 'react';
import { HugeiconsIcon } from '@hugeicons/react';
import { ComputerIcon, Moon02Icon, Sun03Icon } from '@hugeicons/core-free-icons';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import {
  ACCENT_COLORS,
  BASE_COLORS,
  CUSTOM_RADIUS_MAX,
  RADII,
  label,
  useAppearance,
  type AccentColor,
  type BaseColor,
  type BorderColor,
  type Radius,
  type ThemeMode,
} from '../appearance';
import { Group, Pad, Row } from './kit';

/** Swatch colours for the pickers — from the generated palettes (light primary / base mid-tone). */
export const SWATCH: Record<BaseColor | (typeof ACCENT_COLORS)[number], string> = {
  amber: 'oklch(0.555 0.163 48.998)',
  blue: 'oklch(0.488 0.243 264.376)',
  cyan: 'oklch(0.52 0.105 223.128)',
  emerald: 'oklch(0.508 0.118 165.612)',
  fuchsia: 'oklch(0.518 0.253 323.949)',
  green: 'oklch(0.527 0.154 150.069)',
  indigo: 'oklch(0.457 0.24 277.023)',
  lime: 'oklch(0.841 0.238 128.85)',
  orange: 'oklch(0.553 0.195 38.402)',
  pink: 'oklch(0.525 0.223 3.958)',
  purple: 'oklch(0.496 0.265 301.924)',
  red: 'oklch(0.505 0.213 27.518)',
  rose: 'oklch(0.514 0.222 16.935)',
  sky: 'oklch(0.5 0.134 242.749)',
  teal: 'oklch(0.511 0.096 186.391)',
  violet: 'oklch(0.491 0.27 292.581)',
  yellow: 'oklch(0.852 0.199 91.936)',
  neutral: 'oklch(0.556 0 0)',
  stone: 'oklch(0.553 0.013 58.071)',
  zinc: 'oklch(0.552 0.016 285.938)',
  mauve: 'oklch(0.542 0.034 322.5)',
  olive: 'oklch(0.58 0.031 107.3)',
  mist: 'oklch(0.56 0.021 213.5)',
  taupe: 'oklch(0.547 0.021 43.1)',
};

const Dot = ({ color }: { color: string }) => (
  <span className="size-3.5 shrink-0 rounded-full ring-1 ring-foreground/15" style={{ background: color }} />
);

const MODES: { id: ThemeMode; label: string; icon: typeof Sun03Icon }[] = [
  { id: 'light', label: 'Light', icon: Sun03Icon },
  { id: 'dark', label: 'Dark', icon: Moon02Icon },
  { id: 'system', label: 'System', icon: ComputerIcon },
];

const trigger = 'h-9 min-w-32 justify-between rounded-full';

export const AppearanceDetail = () => {
  const [a, set] = useAppearance();
  const baseItems = BASE_COLORS.map((b) => ({ value: b, label: label(b) }));
  const accentItems = [
    { value: 'base', label: label(a.base) },
    ...ACCENT_COLORS.map((c) => ({ value: c, label: label(c) })),
  ];

  return (
    <>
      <Group label="Theme" footer="System follows your computer's light or dark setting.">
        <div className="p-2">
          <ToggleGroup
            value={[a.mode]}
            onValueChange={(v) => v[0] && set({ mode: v[0] as ThemeMode })}
            variant="outline"
            spacing={0}
            className="w-full"
          >
            {MODES.map((m) => (
              <ToggleGroupItem key={m.id} value={m.id} className="h-10 flex-1 gap-1.5">
                <HugeiconsIcon icon={m.icon} strokeWidth={2} />
                {m.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </Group>

      <Group label="Colours" footer="Base colour tints the backgrounds, borders and text. Theme colour is the accent — buttons, switches and highlights.">
        <Row
          label="Base colour"
          trailing={
            <Select items={baseItems} value={a.base} onValueChange={(v) => v && set({ base: v as BaseColor })}>
              <SelectTrigger className={trigger} aria-label="Base colour">
                <Dot color={SWATCH[a.base]} />
                <SelectValue className="flex-1 text-left" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {BASE_COLORS.map((b) => (
                    <SelectItem key={b} value={b}>
                      <Dot color={SWATCH[b]} />
                      {label(b)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          }
        />
        <Row
          label="Theme colour"
          trailing={
            <Select items={accentItems} value={a.accent} onValueChange={(v) => v && set({ accent: v as AccentColor })}>
              <SelectTrigger className={trigger} aria-label="Theme colour">
                <Dot color={SWATCH[a.accent === 'base' ? a.base : a.accent]} />
                <SelectValue className="flex-1 text-left" />
              </SelectTrigger>
              <SelectContent className="max-h-80">
                <SelectGroup>
                  <SelectItem value="base">
                    <Dot color={SWATCH[a.base]} />
                    {label(a.base)}
                  </SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  {ACCENT_COLORS.map((c) => (
                    <SelectItem key={c} value={c}>
                      <Dot color={SWATCH[c]} />
                      {label(c)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          }
        />
      </Group>

      <LineGroup
        label="Borders"
        footer="The outline around each card."
        showLabel="Show borders"
        on={a.borders}
        color={a.borderColor}
        custom={a.customBorder}
        onChange={(p) =>
          set({
            ...(p.on !== undefined && { borders: p.on }),
            ...(p.color && { borderColor: p.color }),
            ...(p.custom && { customBorder: p.custom }),
          })
        }
      />

      <LineGroup
        label="Separators"
        footer="The lines between two settings inside a card."
        showLabel="Show separators"
        on={a.dividers}
        color={a.dividerColor}
        custom={a.customDivider}
        onChange={(p) =>
          set({
            ...(p.on !== undefined && { dividers: p.on }),
            ...(p.color && { dividerColor: p.color }),
            ...(p.custom && { customDivider: p.custom }),
          })
        }
      />

      <Group label="Shape">
        <Row label="Shadows" toggle={{ checked: a.shadows, onChange: (v) => set({ shadows: v }) }} />
        <Row
          label="Corner radius"
          trailing={
            <Select items={RADIUS_ITEMS} value={a.radius} onValueChange={(v) => v && set({ radius: v as Radius })}>
              <SelectTrigger className={trigger} aria-label="Corner radius">
                <SelectValue className="flex-1 text-left" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="default">Default</SelectItem>
                </SelectGroup>
                <SelectSeparator />
                <SelectGroup>
                  {RADII.map((r) => (
                    <SelectItem key={r} value={r}>
                      {label(r)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          }
        />
        {a.radius === 'custom' && (
          <Pad className="flex flex-col gap-3">
            <div className="flex items-center justify-between text-[15px]">
              <span>Custom radius</span>
              <span className="text-muted-foreground tabular-nums">{a.customRadius}px</span>
            </div>
            <Slider
              min={0}
              max={CUSTOM_RADIUS_MAX}
              step={1}
              value={a.customRadius}
              onValueChange={(v) => set({ customRadius: Array.isArray(v) ? (v[0] ?? 0) : v })}
              aria-label="Custom corner radius"
            />
            <div className="flex justify-between text-xs text-muted-foreground tabular-nums">
              <span>0px</span>
              <span>{CUSTOM_RADIUS_MAX}px</span>
            </div>
          </Pad>
        )}
      </Group>
    </>
  );
};

const BORDER_ITEMS = [
  { value: 'default', label: 'Default' },
  { value: 'subtle', label: 'Subtle' },
  { value: 'strong', label: 'Strong' },
  { value: 'accent', label: 'Theme colour' },
  { value: 'custom', label: 'Custom' },
] satisfies { value: BorderColor; label: string }[];

const RADIUS_ITEMS = [
  { value: 'default', label: 'Default' },
  ...RADII.map((r) => ({ value: r, label: label(r) })),
];

const HEX = /^#[0-9a-f]{6}$/i;

/** A swatch that opens the system colour picker, plus the hex to type or paste. */
const ColorField = ({ value, onChange }: { value: string; onChange: (hex: string) => void }) => {
  const [text, setText] = useState(value);
  useEffect(() => setText(value), [value]);
  const commit = (raw: string) => {
    const hex = raw.startsWith('#') ? raw : `#${raw}`;
    if (HEX.test(hex)) onChange(hex.toLowerCase());
    else setText(value);
  };
  return (
    <div className="flex items-center gap-2">
      <label
        className="relative size-8 shrink-0 cursor-pointer overflow-hidden rounded-full ring-1 ring-foreground/15"
        style={{ background: value }}
      >
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          aria-label="Pick a colour"
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <Input
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => commit(text.trim())}
        onKeyDown={(e) => e.key === 'Enter' && commit(text.trim())}
        aria-label="Colour hex"
        maxLength={7}
        className="h-8 w-24 font-mono text-xs uppercase"
      />
    </div>
  );
};

/** On/off, a colour preset and a custom colour — shared by Borders and Separators. */
const LineGroup = ({
  label: title,
  footer,
  showLabel,
  on,
  color,
  custom,
  onChange,
}: {
  label: string;
  footer: string;
  showLabel: string;
  on: boolean;
  color: BorderColor;
  custom: string;
  onChange: (patch: { on?: boolean; color?: BorderColor; custom?: string }) => void;
}) => (
  <Group label={title} footer={footer}>
    <Row label={showLabel} toggle={{ checked: on, onChange: (v) => onChange({ on: v }) }} />
    {on && (
      <Row
        label="Colour"
        trailing={
          <Select items={BORDER_ITEMS} value={color} onValueChange={(v) => v && onChange({ color: v as BorderColor })}>
            <SelectTrigger className={trigger} aria-label={`${title} colour`}>
              {color === 'custom' && <Dot color={custom} />}
              <SelectValue className="flex-1 text-left" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="default">Default</SelectItem>
              </SelectGroup>
              <SelectSeparator />
              <SelectGroup>
                {BORDER_ITEMS.slice(1).map((b) => (
                  <SelectItem key={b.value} value={b.value}>
                    {b.label}
                  </SelectItem>
                ))}
              </SelectGroup>
            </SelectContent>
          </Select>
        }
      />
    )}
    {on && color === 'custom' && (
      <Row label="Custom colour" trailing={<ColorField value={custom} onChange={(hex) => onChange({ custom: hex })} />} />
    )}
  </Group>
);
