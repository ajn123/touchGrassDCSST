"use client";

import EventCard from "./EventCard";

interface Group {
  pk?: string;
  title?: string;
  description?: string;
  category?: string;
  image_url?: string;
  imageKey?: string;
  scheduleDay?: string;
  scheduleTime?: string;
  scheduleLocation?: string;
  cost?: string;
  schedules?: any[];
  socials?: {
    website?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
    youtube?: string;
    linkedin?: string;
    meetup?: string;
  };
}

export default function FeaturedGroup({ group }: { group: Group }) {
  const groupTitle = group.title || "";

  const formatSchedule = () => {
    if (group.scheduleDay && group.scheduleTime && group.scheduleLocation) {
      return `${group.scheduleDay}s at ${group.scheduleTime} - ${group.scheduleLocation}`;
    }
    return "Schedule varies";
  };

  return (
    <EventCard
      href={`/groups/${encodeURIComponent(groupTitle)}`}
      title={groupTitle}
      imageUrl={group.image_url}
      category={group.category}
      description={group.description}
      venue={formatSchedule()}
    />
  );
}
