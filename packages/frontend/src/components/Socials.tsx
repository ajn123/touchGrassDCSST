import {
  faDiscord,
  faFacebook,
  faInstagram,
  faLinkedin,
  faTwitter,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";
import { faGlobe, faLink } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { IconSection } from "./IconSection";

interface SocialsData {
  website?: string;
  instagram?: string;
  facebook?: string;
  twitter?: string;
  youtube?: string;
  linkedin?: string;
  meetup?: string;
  discord?: string;
  [key: string]: string | undefined;
}

interface SocialsProps {
  socials: SocialsData;
  className?: string;
}

export function Socials({ socials, className = "" }: SocialsProps) {
  if (!socials || typeof socials !== "object") {
    return null;
  }

  const socialIcons = {
    website: faLink,
    instagram: faInstagram,
    facebook: faFacebook,
    twitter: faTwitter,
    youtube: faYoutube,
    linkedin: faLinkedin,
    meetup: faLink, // Using generic link icon for meetup
    discord: faDiscord,
  };

  const getSocialName = (key: string) => {
    const names: { [key: string]: string } = {
      website: "Website",
      instagram: "Instagram",
      facebook: "Facebook",
      twitter: "Twitter",
      youtube: "YouTube",
      linkedin: "LinkedIn",
      meetup: "Meetup",
      discord: "Discord",
    };
    return names[key] || key.charAt(0).toUpperCase() + key.slice(1);
  };

  const validSocials = Object.entries(socials).filter(
    ([key, value]) => value && typeof value === "string" && value.trim() !== ""
  );

  if (validSocials.length === 0) {
    return null;
  }

  return (
    <IconSection icon={faGlobe} className={`py-4 ${className}`}>
      {validSocials.map(([key, url]) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 transition-colors duration-200 border border-purple-200 hover:shadow-md"
        >
          <FontAwesomeIcon
            icon={socialIcons[key as keyof typeof socialIcons] || faLink}
            className="w-4 h-4"
          />
          <span className="text-sm font-medium">{getSocialName(key)}</span>
        </a>
      ))}
    </IconSection>
  );
}
