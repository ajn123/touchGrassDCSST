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
    if (!cost) {
      return <span className="text-gray-500">unknown</span>;
    }

    switch (cost.type) {
      case "free":
        return <span className="text-green-600 font-semibold">Free</span>;
      case "unknown":
        return <span className="text-gray-500 font-semibold">Unknown</span>;
      case "variable":
        return (
          <span className="text-blue-600 font-semibold">
            ${formatAmount(cost.amount)}
          </span>
        );
      case "fixed":
        return (
          <span className="text-gray-800 font-semibold">
            ${formatAmount(cost.amount)}
          </span>
        );
      default:
        return (
          <span className="text-gray-600">
            {cost.amount} {cost.currency}
          </span>
        );
    }
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
