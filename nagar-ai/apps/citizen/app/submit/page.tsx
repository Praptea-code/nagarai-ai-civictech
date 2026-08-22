"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { submitComplaint } from "@/lib/api";
import { log } from "@/lib/logger";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const CATEGORY_OPTIONS = [
  { label: "Pothole", value: "pothole" },
  { label: "Garbage", value: "garbage" },
  { label: "Water Leakage", value: "water_leakage" },
  { label: "Streetlight", value: "streetlight" },
  { label: "Flooding", value: "flooding" },
  { label: "Drainage", value: "drainage" },
  { label: "Other", value: "other" },
] as const;

export default function SubmitPage() {
  const router = useRouter();
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [ward, setWard] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [image, setImage] = useState<File | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoStatus("Geolocation is unavailable in this browser — enter coordinates manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(6));
        setLongitude(position.coords.longitude.toFixed(6));
        setGeoStatus("Location captured automatically.");
        log("info", "geolocation captured", {
          accuracyM: Math.round(position.coords.accuracy),
        });
      },
      (err) => {
        setGeoStatus("Location permission denied or failed — enter coordinates manually.");
        log("warn", "geolocation unavailable", { code: err.code });
      },
    );
  }, []);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    setImageError(null);
    const file = e.target.files?.[0];
    if (!file) {
      setImage(null);
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setImage(null);
      e.target.value = "";
      setImageError("Photo is too large. Maximum size is 8MB.");
      log("warn", "rejected oversized image", { sizeBytes: file.size });
      return;
    }
    setImage(file);
    log("info", "image selected", { sizeBytes: file.size });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!description.trim()) {
      setFormError("Please describe the issue.");
      return;
    }
    if (!category) {
      setFormError("Please choose a category.");
      return;
    }
    if (latitude === "" || longitude === "" || Number.isNaN(lat) || Number.isNaN(lng)) {
      setFormError("Location is required — allow location access or enter coordinates manually.");
      return;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setFormError("Coordinates are out of range.");
      return;
    }

    setSubmitting(true);
    try {
      await submitComplaint({
        description: description.trim(),
        category,
        latitude: lat,
        longitude: lng,
        ward: ward.trim() || null,
        municipality: municipality.trim() || null,
        image,
      });
      router.push("/my-complaints");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Something went wrong.";
      setFormError(message);
      log("error", "submission failed client-side", { message });
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    "mt-1 w-full rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none";

  return (
    <main className="mx-auto max-w-lg space-y-4 p-4">
      <h1 className="text-xl font-bold">Report an issue</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium">
          Description <span className="text-red-500">*</span>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the problem and where it is..."
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium">
          Category <span className="text-red-500">*</span>
          <select
            required
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className={inputClass}
          >
            <option value="" disabled>
              Select a category...
            </option>
            {CATEGORY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>

        <fieldset>
          <legend className="text-sm font-medium">
            Location <span className="text-red-500">*</span>
          </legend>
          <p className="mt-1 text-xs text-gray-500">{geoStatus ?? "Requesting your location..."}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-xs text-gray-600">
              Latitude
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="27.7172"
                className={`mt-1 w-full rounded border p-2 ${geoStatus?.startsWith("Location captured") ? "bg-gray-100" : "border-gray-300"}`}
                readOnly={geoStatus?.startsWith("Location captured")}
              />
            </label>
            <label className="text-xs text-gray-600">
              Longitude
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="85.3240"
                className={`mt-1 w-full rounded border p-2 ${geoStatus?.startsWith("Location captured") ? "bg-gray-100" : "border-gray-300"}`}
                readOnly={geoStatus?.startsWith("Location captured")}
              />
            </label>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-2">
          <label className="block text-sm font-medium">
            Ward
            <input
              type="text"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </label>
          <label className="block text-sm font-medium">
            Municipality
            <input
              type="text"
              value={municipality}
              onChange={(e) => setMunicipality(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </label>
        </div>

        <label className="block text-sm font-medium">
          Photo (optional)
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleImageChange}
            className="mt-1 block w-full text-sm text-gray-600 file:mr-3 file:rounded file:border-0 file:bg-blue-50 file:p-2 file:text-sm file:text-blue-700"
          />
        </label>
        {imageError && (
          <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-600">
            {imageError}
          </p>
        )}

        {formError && (
          <p role="alert" className="rounded bg-red-50 p-2 text-sm text-red-600">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded bg-blue-600 p-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit report"}
        </button>
      </form>
    </main>
  );
}
