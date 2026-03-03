"use client";

import { useEffect } from "react";

export function ShopPageTracker({
  action,
  productSlug,
}: {
  action: "PRODUCT_VIEW" | "PRE_ORDER_CLICK" | "SHOP_PAGE_VISIT";
  productSlug?: string;
}) {
  useEffect(() => {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, productSlug }),
    }).catch(() => {});
  }, [action, productSlug]);

  return null;
}
