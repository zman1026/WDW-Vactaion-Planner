"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
export function PrintButton() { const [copied, setCopied] = useState(false); return <div className="no-print flex flex-wrap gap-2"><Button type="button" variant="secondary" size="sm" onClick={async () => { await navigator.clipboard.writeText(window.location.href); setCopied(true); window.setTimeout(() => setCopied(false), 1800); }}>{copied ? "Link copied" : "Copy share link"}</Button><Button type="button" variant="secondary" size="sm" onClick={() => window.print()}>Print itinerary</Button></div>; }
