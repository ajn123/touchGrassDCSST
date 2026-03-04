import { AddEventForm } from "@/components/AddEventForm";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit an Event",
  description:
    "Share your event with the DC community. Add concerts, meetups, sports, and more to TouchGrass DC.",
  openGraph: {
    title: "Submit an Event | TouchGrass DC",
    description:
      "Share your event with the Washington DC community.",
    url: "https://touchgrassdc.com/add-event",
  },
};

export default function AddEventPage() {
  return (
    <div className="min-h-screen py-8">
      <div className="container mx-auto px-4">
        <div className="mb-8">
          <h1 className="text-3xl font-bold ">Add New Event</h1>
          <p className="mt-2">Share your event with the DC community</p>
        </div>

        <AddEventForm />
      </div>
    </div>
  );
}
