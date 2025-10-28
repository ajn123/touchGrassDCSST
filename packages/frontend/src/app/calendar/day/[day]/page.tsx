"use client";

import { Socials } from "@/components/Socials";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type EventItem = {
  pk: string;
  title: string;
  start_date?: string;
  end_date?: string;
  start_time?: string;
  venue?: string;
  location?: string;
  url?: string;
  socials?: {
    website?: string;
  };
};

export default function DayPage() {
  const params = useParams();
  const { rawParam, normalizedDay } = useMemo(() => {
    const raw = params?.day as string | string[] | undefined;
    const first = Array.isArray(raw) ? raw[0] : raw || "";
    const decoded = first ? decodeURIComponent(first) : "";
    const dayOnly = decoded.includes("T") ? decoded.split("T")[0] : decoded;
    return { rawParam: decoded, normalizedDay: dayOnly };
  }, [params]);

  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!normalizedDay) return;

    const controller = new AbortController();
    const run = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/events/by-day/${encodeURIComponent(normalizedDay)}`,
          // Passes an AbortController's signal to the fetch API,
          // allowing the fetch to be cancelled if the component unmounts or the effect cleans up.
          {
            signal: controller.signal,
          }
        );
        if (!res.ok) {
          throw new Error(`Failed to load events (${res.status})`);
        }
        const data = await res.json();
        console.log("data", data);
        console.log(data);
        setEvents(data.events || []);
      } catch (err: any) {
        if (err.name !== "AbortError") {
          setError(err?.message || "Failed to load events");
        }
      } finally {
        setLoading(false);
      }
    };
    run();
    return () => controller.abort();
  }, [normalizedDay]);

  return (
    <div className="mx-auto max-w-4xl p-4">
      <h1 className="mb-4 text-2xl font-semibold">
        Events on{" "}
        {normalizedDay ? new Date(normalizedDay).toLocaleDateString() : ""}
      </h1>

      {loading && <p>Loading…</p>}
      {error && <p className="text-red-600">{error}</p>}

      {!loading && !error && events.length === 0 && (
        <p>No events found for this day.</p>
      )}

      <ul className="space-y-3">
        {events.map((ev) => (
          <li key={ev.pk} className="rounded-lg border p-4">
            <div className="flex items-baseline justify-between gap-4">
              <h2 className="text-lg font-medium">{ev.title}</h2>
              <span className="text-sm">
                {ev.start_date}
                {ev.end_date && ev.end_date !== ev.start_date
                  ? ` – ${ev.end_date}`
                  : ""}
                {ev.start_time ? ` • ${ev.start_time}` : ""}
              </span>
            </div>
            {(ev.venue || ev.location) && (
              <p className="text-sm">{ev.venue || ev.location}</p>
            )}
            {ev.url && !ev.socials && <Socials socials={{ website: ev.url }} />}
            {ev.socials && <Socials socials={ev.socials} />}
          </li>
        ))}
      </ul>
    </div>
  );
}
