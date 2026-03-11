import { IconSection } from "./IconSection";

const DollarIcon = <svg className="w-full h-full" fill="currentColor" viewBox="0 0 320 512"><path d="M160 0c17.7 0 32 14.3 32 32V67.7c1.6 .2 3.1 .4 4.7 .7c.4 .1 .7 .1 1.1 .2l48 8.8c17.4 3.2 28.9 19.9 25.7 37.2s-19.9 28.9-37.2 25.7l-47.5-8.7c-31.3-4.6-58.9-1.5-78.3 6.2s-27.2 18.3-29 28.1c-2 10.7-.5 16.7 1.2 20.4c1.8 3.9 5.5 8.3 12.8 13.2c16.3 10.7 41.3 17.7 73.7 26.3l2.9 .8c28.6 7.6 63.6 16.8 89.6 33.8c14.2 9.3 27.6 21.9 35.9 39.5c8.5 17.9 10.3 37.9 6.4 59.2c-6.9 38-33.1 63.4-65.6 76.7c-13.7 5.6-28.6 9.2-44.4 11V480c0 17.7-14.3 32-32 32s-32-14.3-32-32V445.1c-.4-.1-.9-.1-1.3-.2l-.2 0 0 0c-24.4-3.8-64.5-14.3-91.5-26.3c-16.1-7.2-23.4-26-16.2-42.2s26-23.4 42.2-16.2c20.9 9.3 55.3 18.5 75.2 21.6c31.9 4.7 58.2 2 76-5.3c16.9-6.9 24.6-16.9 26.8-28.9c1.9-10.6 .4-16.7-1.3-20.4c-1.9-4-5.6-8.4-13-13.3c-16.4-10.7-41.5-17.7-74-26.3l-2.8-.7 0 0C119.4 279.3 84.4 270 58.4 253c-14.2-9.3-27.5-22-35.8-39.6c-8.4-17.9-10.1-37.9-6.1-59.2C23.7 116 52.3 91.2 84.8 78.3c13.3-5.3 27.9-8.9 43.2-11V32c0-17.7 14.3-32 32-32z"/></svg>;

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
      icon={DollarIcon}
      iconClassName="text-black"
      className={className}
    >
      <div className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg border">
        {getCostDisplay()}
      </div>
    </IconSection>
  );
};
