"use client";

import Categories from "@/components/Categories";
import { Cost } from "@/components/Cost";
import { DateDisplay } from "@/components/Date";
import { Description } from "@/components/Description";
import { Location } from "@/components/Location";
import { Schedule } from "@/components/Schedule";
import { Socials } from "@/components/Socials";
import { ReactNode } from "react";

interface EntityDetailProps {
  title: string;
  imageUrl?: string;
  cost?: string;
  socials?: Record<string, string>;
  date?: string | number | Date;
  location?: string;
  categories?: string | string[];
  schedules?: any[];
  description?: string;
  rightActionNode?: ReactNode;
}

export function EntityDetail({
  title,
  imageUrl,
  cost,
  socials,
  date,
  location,
  categories,
  schedules,
  description,
  rightActionNode,
}: EntityDetailProps) {
  return (
    <div className="border-t pt-6 mb-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {rightActionNode}
      </div>

      {/* Image and Details Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Image Section */}
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full rounded-lg shadow-md"
          />
        ) : (
          <div className="w-full h-64 rounded-lg flex items-center justify-center">
            <span>No image available</span>
          </div>
        )}

        <div className="grid grid-cols-1">
          <div className="space-y-4">
            {cost && <Cost cost={cost} />}
            {socials && <Socials socials={socials} />}
            {date != null && <DateDisplay date={date} />}
            {location && <Location location={location} />}
            {categories && (
              <Categories displayMode="display" eventCategories={categories} />
            )}
            {Array.isArray(schedules) && schedules.length > 0 && (
              <Schedule schedules={schedules} />
            )}
          </div>
        </div>
      </div>

      <hr className="my-6 border-t border-gray-800" />

      {description && (
        <div className="mb-6">
          <Description description={description} />
        </div>
      )}
    </div>
  );
}
