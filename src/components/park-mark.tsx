import { clsx } from "clsx";
import type { DayThemeId } from "@/lib/day-themes";

export function ParkMark({ theme, className }: { theme: DayThemeId; className?: string }) {
  const shared = { className: clsx("fill-none stroke-current", className), viewBox: "0 0 48 48", "aria-hidden": true } as const;

  if (theme === "mk") return <svg {...shared}><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M9 41h30M12 41V27l5-3v-7l4 3 3-12 3 12 4-3v7l5 3v14M18 41V29h12v12M22 41v-7a2 2 0 0 1 4 0v7M8 15l1.1 2.9L12 19l-2.9 1.1L8 23l-1.1-2.9L4 19l2.9-1.1L8 15Z" /></svg>;
  if (theme === "epcot") return <svg {...shared}><circle cx="24" cy="25" r="16" strokeWidth="1.8" /><path strokeWidth="1.2" d="M8.5 22h31M10 31h28M24 9v32M15 12.5c3.4 3.4 5.2 7.5 5.2 12.5S18.4 34.1 15 37.5M33 12.5c-3.4 3.4-5.2 7.5-5.2 12.5s1.8 9.1 5.2 12.5M12 17l12 8 12-8M12 33l12-8 12 8" /></svg>;
  if (theme === "hs") return <svg {...shared}><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M8 40h32M13 40V25h22v15M18 25v-8h12v8M24 17V8M20 8h8M16 31h4m4 0h8m-14 5h12" /><path strokeWidth="1.4" strokeLinecap="round" d="m35 8 1.1 3.1L39 12l-2.9 1.1L35 16l-1.1-2.9L31 12l2.9-.9L35 8Z" /></svg>;
  if (theme === "ak") return <svg {...shared}><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M24 41V25m0 5-7-7m7 4 8-8m-8 16-5 6m5-8 6 8M9 23c0-5 4-9 9-9a9 9 0 0 1 16-1c4 .5 7 4 7 8 0 5-4 9-9 9H17c-4 0-8-3-8-7Z" /></svg>;
  return <svg {...shared}><path strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" d="M7 35c5-3 9-3 14 0s9 3 14 0 7-3 8-2M9 41c5-3 9-3 14 0s9 3 14 0M24 9v4m11 1-3 3M13 14l3 3m8 12a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z" /></svg>;
}
