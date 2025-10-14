"use client";

import { sendEmailSignup } from "@/lib/email";
import { useState } from "react";

interface EmailSignupFormProps {
  categories: Array<{ category: string }>;
}

interface FormData {
  name: string;
  email: string;
  selectedCategories: string[];
}

interface FormErrors {
  name?: string;
  email?: string;
  selectedCategories?: string;
}

export function EmailSignupForm({ categories }: EmailSignupFormProps) {
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    selectedCategories: [],
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (formData.selectedCategories.length === 0) {
      newErrors.selectedCategories = "Please select at least one category";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({
        ...prev,
        [name]: undefined,
      }));
    }
  };

  const handleCategoryChange = (category: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedCategories: prev.selectedCategories.includes(category)
        ? prev.selectedCategories.filter((cat) => cat !== category)
        : [...prev.selectedCategories, category],
    }));

    // Clear category error when user makes a selection
    if (errors.selectedCategories) {
      setErrors((prev) => ({
        ...prev,
        selectedCategories: undefined,
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus("idle");

    try {
      const response = await sendEmailSignup({
        to: formData.email,
        subject: `Thank you for signing up for TouchGrass DC ${formData.name}`,
        body: `Thank you for signing up for TouchGrass DC ${formData.email}`,
      });

      console.log("Sending email signup:", formData);

      // Analytics handled centrally in middleware

      if (response.success) {
        setSubmitStatus("success");
        setFormData({
          name: "",
          email: "",
          selectedCategories: [],
        });
      } else {
        throw new Error("Failed to submit email signup");
      }
    } catch (error) {
      console.error("Error submitting email signup:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Name *
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.name ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Your Name"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600">{errors.name}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.email ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="your.email@example.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-600">{errors.email}</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Categories of Interest *
          </label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {categories.map((cat) => (
              <button
                key={cat.category}
                type="button"
                onClick={() => handleCategoryChange(cat.category)}
                style={{
                  backgroundColor: formData.selectedCategories.includes(
                    cat.category
                  )
                    ? "#10b981"
                    : "white",
                  borderColor: formData.selectedCategories.includes(
                    cat.category
                  )
                    ? "#10b981"
                    : "#d1d5db",
                  color: formData.selectedCategories.includes(cat.category)
                    ? "white"
                    : "#374151",
                }}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all duration-200 hover:shadow-md ${
                  formData.selectedCategories.includes(cat.category)
                    ? "hover:bg-emerald-600 hover:border-emerald-600"
                    : "hover:bg-gray-50 hover:border-gray-400"
                }`}
              >
                {cat.category}
              </button>
            ))}
          </div>
          {errors.selectedCategories && (
            <p className="mt-2 text-sm text-red-600">
              {errors.selectedCategories}
            </p>
          )}
        </div>

        {submitStatus === "success" && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <div className="flex">
              <svg
                className="w-5 h-5 text-green-400 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-green-800">
                Thank you for signing up! You'll receive updates about events in
                your selected categories.
              </p>
            </div>
          </div>
        )}

        {submitStatus === "error" && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <svg
                className="w-5 h-5 text-red-400 mr-3"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p className="text-red-800">
                Sorry, there was an error submitting your signup. Please try
                again.
              </p>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className={`px-6 py-3 text-white font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              isSubmitting
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {isSubmitting ? (
              <div className="flex items-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Signing Up...
              </div>
            ) : (
              "Sign Up For Updates"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
