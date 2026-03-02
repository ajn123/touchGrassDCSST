import { faDollarSign } from "@fortawesome/free-solid-svg-icons";
import { IconSection } from "./IconSection";

export const Cost = ({
  cost,
  className = "",
}: {
  cost: any;
  className?: string;
}) => {
  const formatAmount = (amount: string | number) => {
    if (typeof amount === "string" && amount.includes("-")) {
      return amount;
    }
    return amount.toString();
  };

  const getCostDisplay = () => {
    // Handle null, undefined, or empty cost
    if (!cost) {
      return <span className="text-gray-500">unknown</span>;
    }

    // Handle string cost (legacy format)
    if (typeof cost === "string") {
      // If string is empty or just whitespace, show unknown
      if (!cost.trim()) {
        return <span className="text-gray-500">unknown</span>;
      }
      return <span className="text-gray-600">{cost}</span>;
    }

    // Handle object cost - check if it's a valid cost object
    if (typeof cost === "object") {
      // If object is empty or has no type/amount, show unknown
      if (!cost.type && (cost.amount === undefined || cost.amount === null)) {
        return <span className="text-gray-500">unknown</span>;
      }

      // Get currency, defaulting to USD if not provided or empty
      const currency = (cost.currency && cost.currency.trim()) || "USD";
      const currencySymbol = currency === "USD" ? "$" : currency;

      switch (cost.type) {
        case "free":
          return <span className="text-green-600 font-semibold">Free</span>;
        case "unknown":
          return <span className="text-gray-500 font-semibold">Unknown</span>;
        case "variable":
          return (
            <span className="text-blue-600 font-semibold">
              {currencySymbol}{formatAmount(cost.amount)}
            </span>
          );
        case "fixed":
          return (
            <span className="text-gray-800 font-semibold">
              {currencySymbol}{formatAmount(cost.amount)}
            </span>
          );
        default:
          // If no type but has amount, still try to display it
          if (cost.amount !== undefined && cost.amount !== null) {
            return (
              <span className="text-gray-600">
                {cost.amount} {currency}
              </span>
            );
          }
          // Otherwise show unknown
          return <span className="text-gray-500">unknown</span>;
      }
    }

    // Fallback for any other case
    return <span className="text-gray-500">unknown</span>;
  };

  return (
    <IconSection
      icon={faDollarSign}
      iconClassName="text-black"
      className={className}
    >
      <div className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg border">
        {getCostDisplay()}
      </div>
    </IconSection>
  );
};
