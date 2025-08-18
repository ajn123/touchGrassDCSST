import { faDollarSign } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

export const Cost = ({ cost }: { cost: any }) => {
  const formatAmount = (amount: string | number) => {
    if (typeof amount === "string" && amount.includes("-")) {
      return amount;
    }
    return amount.toString();
  };

  const getCostDisplay = () => {
    if (!cost) {
      return <span className="text-gray-500">No data available</span>;
    }

    switch (cost.type) {
      case "free":
        return <span className="text-green-600 font-semibold">Free</span>;
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
    <>
      <div>
        <FontAwesomeIcon
          icon={faDollarSign}
          className="inline-flex w-10 h-10 items-center gap-2 px-3 py-2 "
        />
        <div className="inline-flex items-center p-6 py-1 bg-gray-100 rounded-full text-sm">
          {getCostDisplay()}
        </div>
      </div>
    </>
  );
};
