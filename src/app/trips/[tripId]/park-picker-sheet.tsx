"use client";

import { ParkMark } from "@/components/park-mark";
import { Modal } from "@/components/ui/modal";
import { resolveDayTheme, type DayThemeId } from "@/lib/day-themes";
import type { ParkOption } from "./day-planner-types";

const PARK_ORDER: DayThemeId[] = ["mk", "epcot", "hs", "ak"];

export function ParkPickerSheet({ open, themeId, parkId, parks, disabled, onClose, onChoose }: {
  open: boolean;
  themeId: DayThemeId;
  parkId: string | null;
  parks: ParkOption[];
  disabled: boolean;
  onClose: () => void;
  onChoose: (parkId: string | null) => void;
}) {
  const mainParks = PARK_ORDER.flatMap((themeId) => {
    const park = parks.find((option) => resolveDayTheme({ parkName: option.name }).id === themeId);
    return park ? [{ park, theme: resolveDayTheme({ parkName: park.name }) }] : [];
  });
  const selectedOtherPark = parkId && !mainParks.some(({ park }) => park.id === parkId)
    ? parks.find((park) => park.id === parkId)
    : null;
  const restTheme = resolveDayTheme({});

  return (
    <Modal open={open} title="Choose a park" onClose={onClose} size="compact" theme={themeId}>
      <p className="text-sm text-muted">Pick the main place for this day. Choose Rest day when you want room to slow down.</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <ParkChoice
          label="Rest day"
          help="Pool, resort, or free time"
          theme={restTheme.id}
          selected={!parkId}
          disabled={disabled}
          onClick={() => onChoose(null)}
        />
        {mainParks.map(({ park, theme }) => (
          <ParkChoice
            key={park.id}
            label={theme.label}
            help={parkHelp(theme.id)}
            theme={theme.id}
            selected={park.id === parkId}
            disabled={disabled}
            onClick={() => onChoose(park.id)}
          />
        ))}
        {selectedOtherPark && (
          <ParkChoice
            label={selectedOtherPark.name}
            help="Current selection"
            theme="rest"
            selected
            disabled={disabled}
            onClick={() => onChoose(selectedOtherPark.id)}
          />
        )}
      </div>
    </Modal>
  );
}

function ParkChoice({ label, help, theme, selected, disabled, onClick }: {
  label: string;
  help: string;
  theme: DayThemeId;
  selected: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      data-theme={theme}
      disabled={disabled}
      aria-pressed={selected}
      onClick={onClick}
      className={`day-theme day-theme__hero flex min-h-24 flex-col items-start rounded-card border p-3 text-left transition disabled:opacity-50 ${selected ? "ring-2 ring-[rgb(var(--day-accent))] ring-offset-2" : "hover:-translate-y-0.5 hover:shadow-card"}`}
    >
      <span className="day-accent-text grid size-9 place-items-center rounded-full border border-[rgb(var(--day-accent)/.25)] bg-white/70">
        <ParkMark theme={theme} className="size-6" />
      </span>
      <strong className="mt-2 text-sm text-primary">{label}</strong>
      <span className="mt-0.5 text-[11px] leading-snug text-muted">{help}</span>
    </button>
  );
}

function parkHelp(theme: DayThemeId) {
  if (theme === "mk") return "Classic park day";
  if (theme === "epcot") return "Discovery and flavors";
  if (theme === "hs") return "Shows and adventures";
  if (theme === "ak") return "Wild paths and animals";
  return "Park day";
}
