"use client";

import { useState } from "react";
import { useModal } from "../hooks/useModal";
import Modal from "./Modal";

interface ReportWrongInfoButtonProps {
  eventTitle: string;
  eventId: string;
}

const WRONG_INFO_OPTIONS = [
  "Event title is incorrect",
  "Date/time is wrong",
  "Location/address is incorrect",
  "Description has errors",
  "Cost information is wrong",
  "Contact information is outdated",
  "Event has been cancelled",
  "Event has been rescheduled",
  "Category/tags are wrong",
  "Other information is incorrect",
];

export function ReportWrongInfoButton({
  eventTitle,
  eventId,
}: ReportWrongInfoButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<string[]>([]);
  const [customMessage, setCustomMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { showError, showSuccess, modalState, hideModal } = useModal();

  const handleOptionChange = (option: string) => {
    setSelectedOptions((prev) =>
      prev.includes(option)
        ? prev.filter((item) => item !== option)
        : [...prev, option]
    );
  };

  const handleSubmit = async () => {
    if (selectedOptions.length === 0) {
      showError("Selection Required", "Please select at least one option for what's wrong.");
      return;
    }

    setIsSubmitting(true);
    try {
      const emailData = {
        to: "hi@touchgrassdc.com",
        subject: `Event Information Correction: ${eventTitle}`,
        body: `Hi,\n\nI found incorrect information on this event:\n\nEvent: ${eventTitle}\nEvent ID: ${eventId}\nURL: ${
          window.location.href
        }\n\nIssues reported:\n${selectedOptions
          .map((option) => `• ${option}`)
          .join("\n")}${
          customMessage ? `\n\nAdditional details:\n${customMessage}` : ""
        }\n\nPlease review and update the information.\n\nThanks!`,
        from: "hi@touchgrassdc.com",
      };

      const response = await fetch("/api/sendEmail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(emailData),
      });

      const result = await response.json();

      if (result.success) {
        showSuccess("Success!", "Thank you! Your correction request has been sent.");
        setIsModalOpen(false);
        setSelectedOptions([]);
        setCustomMessage("");
      } else {
        throw new Error(result.error || "Failed to send email");
      }
    } catch (error) {
      console.error("Error sending correction request:", error);
      showError(
        "Error",
        "Sorry, there was an error sending your request. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 border border-red-300 rounded-lg text-sm font-medium transition-colors duration-200"
      >
        ⚠️ Some of this information is wrong
      </button>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                Report Incorrect Information
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Please select what information is incorrect about this event:
            </p>

            <div className="space-y-3 mb-4">
              {WRONG_INFO_OPTIONS.map((option) => (
                <label
                  key={option}
                  className="flex items-start space-x-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedOptions.includes(option)}
                    onChange={() => handleOptionChange(option)}
                    className="mt-1 h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">{option}</span>
                </label>
              ))}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional details (optional):
              </label>
              <textarea
                value={customMessage}
                onChange={(e) => setCustomMessage(e.target.value)}
                placeholder="Please provide any additional details about what's wrong..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                rows={3}
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setIsModalOpen(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || selectedOptions.length === 0}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? "Sending..." : "Submit Report"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Notification Modal */}
      <Modal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
    </>
  );
}
