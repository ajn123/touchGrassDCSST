"use client";

import { useUser } from "@/contexts/UserContext";
import { createEvent, getCategories } from "@/lib/dynamodb/dynamodb-events";
import { useEffect, useState } from "react";
import { ImageUploadWithState } from "./ImageUploadWithState";

interface EventFormData {
  email: string;
  title: string;
  description: string;
  eventDate: string;
  location: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  cost?: string;
  selectedCategories: string[];
  image_url?: string;
  isPublic: boolean;
}

interface FormErrors {
  email?: string;
  title?: string;
  description?: string;
  location?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
}

interface UploadResult {
  key: string;
  filename: string;
  size: number;
  type: string;
}

export function AddEventForm() {
  const [formData, setFormData] = useState<EventFormData>({
    email: "",
    title: "",
    description: "",
    eventDate: "",
    location: "",
    website: "",
    instagram: "",
    facebook: "",
    cost: "",
    selectedCategories: [],
    image_url: "",
    isPublic: false,
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [categories, setCategories] = useState<Array<{ category: string }>>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>("");

  const { user } = useUser();

  console.log("user", user);
  // Check if user is admin based on allowed emails
  const isAdmin =
    user?.email &&
    [
      "hi@touchgrassdc.com",
      "hello@touchgrassdc.com",
      "admin@example.com", // Replace with actual admin email
    ].includes(user.email.toLowerCase());

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.title.trim()) {
      newErrors.title = "Event title is required";
    }

    if (!formData.description.trim()) {
      newErrors.description = "Event description is required";
    } else if (formData.description.length < 10) {
      newErrors.description =
        "Event description must be at least 10 characters long";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Event location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Fetch categories on component mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const fetchedCategories = await getCategories();
        setCategories(fetchedCategories as Array<{ category: string }>);
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
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
  };

  const handleImageUploaded = async (result: UploadResult) => {
    try {
      // Get presigned URL for the uploaded image
      const response = await fetch("/api/s3/presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          key: result.key,
          expiresIn: 604800, // 7 days (maximum allowed for S3 presigned URLs)
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.url;
        setUploadedImageUrl(imageUrl);
        setFormData((prev) => ({
          ...prev,
          image_url: imageUrl,
        }));
        console.log("Image URL set:", imageUrl);
      } else {
        console.error("Failed to get presigned URL");
      }
    } catch (error) {
      console.error("Error getting presigned URL:", error);
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
      // Create FormData object for the server action
      const formDataObj = new FormData();
      formDataObj.append("email", formData.email);
      formDataObj.append("title", formData.title);
      formDataObj.append("description", formData.description);
      formDataObj.append("eventDate", formData.eventDate);
      formDataObj.append("location", formData.location);
      // Create socials object if any social media fields are filled
      const socials: { [key: string]: string } = {};
      if (formData.website) {
        socials.website = formData.website;
      }
      if (formData.instagram) {
        socials.instagram = formData.instagram;
      }
      if (formData.facebook) {
        socials.facebook = formData.facebook;
      }

      // Only add socials if there are any social media links
      if (Object.keys(socials).length > 0) {
        // Store each social media field separately instead of as a JSON string
        Object.entries(socials).forEach(([key, value]) => {
          formDataObj.append(`socials.${key}`, value);
        });
      }
      if (
        formData.cost &&
        (formData.cost.trim().toLowerCase() === "free" ||
          formData.cost.trim().toLowerCase() === "0" ||
          formData.cost.trim().toLowerCase() === "0.00")
      ) {
        formDataObj.append(
          "cost",
          JSON.stringify({
            type: "free",
            currency: "USD",
            amount: 0,
          })
        );
      } else if (formData.cost) {
        formDataObj.append(
          "cost",
          JSON.stringify({
            type: "paid",
            currency: "USD",
            amount: formData.cost,
          })
        );
      }
      if (formData.selectedCategories.length > 0) {
        formDataObj.append("category", formData.selectedCategories.join(", "));
      }
      if (formData.image_url) {
        formDataObj.append("image_url", formData.image_url);
      }

      // Always include is_public field - unchecked checkboxes don't get sent in form data
      const finalIsPublic = isAdmin ? formData.isPublic : false;
      formDataObj.append("isPublic", finalIsPublic.toString());
      console.log(
        `🔒 Form submission - isPublic: ${
          formData.isPublic
        } -> finalIsPublic: ${finalIsPublic} -> string: "${finalIsPublic.toString()}"`
      );

      const result = await createEvent(formDataObj);

      if (result && result.includes("successfully")) {
        setSubmitStatus("success");
        setFormData({
          email: "",
          title: "",
          description: "",
          eventDate: "",
          location: "",
          website: "",
          instagram: "",
          facebook: "",
          cost: "",
          selectedCategories: [],
          image_url: "",
          isPublic: false, // Reset to false for new events
        });
        setUploadedImageUrl("");
        setErrors({}); // Clear any validation errors

        // Reset the form element as well
        const formElement = document.getElementById(
          "addEventForm"
        ) as HTMLFormElement;
        if (formElement) {
          formElement.reset();
        }
      } else {
        throw new Error(result || "Failed to create event");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      setSubmitStatus("error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      {/* Admin Status Indicator */}
      {user && (
        <div
          className={`mb-6 p-3 rounded-md ${
            isAdmin
              ? "bg-blue-50 border border-blue-200"
              : "bg-gray-50 border border-gray-200"
          }`}
        >
          <div className="flex items-center">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                isAdmin
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {isAdmin ? "👑 Admin" : "👤 User"}
            </span>
            <span className="ml-2 text-sm text-gray-600">
              {isAdmin
                ? "You can create public events visible to all users"
                : "This event will need to be approved first"}
            </span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" id="addEventForm">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Your Email *
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

          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Event Title *
            </label>
            <input
              type="text"
              id="title"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Event Title"
            />
            {errors.title && (
              <p className="mt-1 text-sm text-red-600">{errors.title}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label
              htmlFor="website"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Website
            </label>
            <input
              type="url"
              id="website"
              name="website"
              value={formData.website}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.website ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="https://example.com"
            />
            {errors.website && (
              <p className="mt-1 text-sm text-red-600">{errors.website}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="instagram"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Instagram
            </label>
            <input
              type="text"
              id="instagram"
              name="instagram"
              value={formData.instagram}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.instagram ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="@username or URL"
            />
            {errors.instagram && (
              <p className="mt-1 text-sm text-red-600">{errors.instagram}</p>
            )}
          </div>

          <div>
            <label
              htmlFor="facebook"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Facebook
            </label>
            <input
              type="text"
              id="facebook"
              name="facebook"
              value={formData.facebook}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.facebook ? "border-red-500" : "border-gray-300"
              }`}
              placeholder="Page name or URL"
            />
            {errors.facebook && (
              <p className="mt-1 text-sm text-red-600">{errors.facebook}</p>
            )}
          </div>
        </div>

        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Event Description *
          </label>
          <textarea
            id="description"
            name="description"
            value={formData.description}
            onChange={handleInputChange}
            rows={4}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.description ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="Describe your event..."
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-600">{errors.description}</p>
          )}
        </div>

        <div>
          <label
            htmlFor="eventDate"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Event Date (Optional)
          </label>
          <input
            type="date"
            id="eventDate"
            name="eventDate"
            value={formData.eventDate}
            onChange={handleInputChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Categories
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
        </div>

        {/* Only show is_public checkbox for admins */}
        {isAdmin && (
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                id="isPublic"
                name="isPublic"
                checked={formData.isPublic}
                onChange={(e) =>
                  setFormData({ ...formData, isPublic: e.target.checked })
                }
                className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Make this event public (visible to all users)
              </span>
            </label>
          </div>
        )}

        <div>
          <label
            htmlFor="location"
            className="block text-sm font-medium text-gray-700 mb-2"
          >
            Event Location (Address) *
          </label>
          <input
            type="text"
            id="location"
            name="location"
            value={formData.location}
            onChange={handleInputChange}
            className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
              errors.location ? "border-red-500" : "border-gray-300"
            }`}
            placeholder="e.g., 123 Main St, Washington, DC"
          />
          {errors.location && (
            <p className="mt-1 text-sm text-red-600">{errors.location}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Event Image
          </label>
          <ImageUploadWithState
            folder="events"
            onImageUploaded={handleImageUploaded}
            formId="addEventForm"
            className="mb-4"
          />
          {uploadedImageUrl && (
            <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded">
              <p className="text-sm text-green-700">
                ✅ Image uploaded and attached to event!
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label
              htmlFor="cost"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Cost
            </label>
            <input
              type="text"
              id="cost"
              name="cost"
              value={formData.cost}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="e.g., Free, $10, etc."
            />
          </div>
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
                Event created successfully! It will appear in the events list
                shortly.
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
                Sorry, there was an error creating the event. Please try again.
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
                Creating Event...
              </div>
            ) : (
              "Create Event"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
