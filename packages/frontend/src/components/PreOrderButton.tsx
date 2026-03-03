"use client";

interface PreOrderButtonProps {
  externalUrl: string;
  status: "pre-order" | "in-stock" | "sold-out" | "coming-soon";
  productSlug: string;
}

const statusConfig = {
  "pre-order": { label: "Pre-Order Now", enabled: true },
  "in-stock": { label: "Buy Now", enabled: true },
  "sold-out": { label: "Sold Out", enabled: false },
  "coming-soon": { label: "Coming Soon", enabled: false },
};

export default function PreOrderButton({
  externalUrl,
  status,
  productSlug,
}: PreOrderButtonProps) {
  const config = statusConfig[status];

  const handleClick = () => {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "PRE_ORDER_CLICK", productSlug }),
    }).catch(() => {});
  };

  if (!config.enabled) {
    return (
      <button
        disabled
        className="w-full py-3 px-6 rounded-lg font-semibold text-lg bg-gray-300 text-gray-500 cursor-not-allowed"
      >
        {config.label}
      </button>
    );
  }

  return (
    <a
      href={externalUrl}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="block w-full py-3 px-6 rounded-lg font-semibold text-lg text-center text-white bg-green-600 hover:bg-green-700 transition-colors"
    >
      {config.label}
    </a>
  );
}
