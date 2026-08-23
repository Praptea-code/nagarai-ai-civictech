"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { submitComplaint } from "@/lib/api";
import { log } from "@/lib/logger";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_IMAGES = 5;
const MAX_DESCRIPTION_LENGTH = 2000;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png"]);

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
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]);
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

  // Object URLs for thumbnail previews; revoked when the list changes/unmounts.
  useEffect(() => {
    const next = images.map((file) => ({ file, url: URL.createObjectURL(file) }));
    setPreviews(next);
    return () => next.forEach((p) => URL.revokeObjectURL(p.url));
  }, [images]);

  function addFiles(incoming: FileList | null) {
    if (!incoming || incoming.length === 0) return;
    setImageError(null);
    const list = Array.from(incoming);
    const badType = list.find((f) => !ALLOWED_IMAGE_TYPES.has(f.type));
    if (badType) {
      setImageError(`"${badType.name}" is not a JPEG or PNG.`);
      log("warn", "rejected unsupported image type", { type: badType.type });
      return;
    }
    const tooBig = list.find((f) => f.size > MAX_IMAGE_BYTES);
    if (tooBig) {
      setImageError(`"${tooBig.name}" is over the 8MB limit.`);
      log("warn", "rejected oversized image", { sizeBytes: tooBig.size });
      return;
    }
    if (images.length + list.length > MAX_IMAGES) {
      setImageError(`You can attach at most ${MAX_IMAGES} photos per report.`);
      log("warn", "rejected image batch over the limit", {
        current: images.length,
        incoming: list.length,
        max: MAX_IMAGES,
      });
      return;
    }
    setImages((prev) => [...prev, ...list]);
  }

  function removeImage(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
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
    if (description.trim().length > MAX_DESCRIPTION_LENGTH) {
      setFormError(`Description is too long. Maximum is ${MAX_DESCRIPTION_LENGTH} characters.`);
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
        images,
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

  const labelClass = "block text-sm font-medium text-ink";

  const inputClass =
    "mt-1.5 w-full rounded-lg border border-rule bg-paper/60 px-3 py-2.5 text-sm text-ink placeholder:text-ink/40 transition-colors duration-150 focus:border-signal focus:bg-white focus:outline-none focus:ring-2 focus:ring-signal/30";

  const coordInputClass = `mt-1.5 w-full rounded-lg border bg-paper/60 px-3 py-2 font-mono text-sm text-ink placeholder:text-ink/40 transition-colors duration-150 ${
    geoStatus?.startsWith("Location captured")
      ? "border-rule bg-paper text-ink/70"
      : "border-rule"
  } focus:border-signal focus:bg-white focus:outline-none focus:ring-2 focus:ring-signal/30`;

  const dropzoneClass =
    "flex cursor-pointer flex-col items-center justify-center gap-0.5 rounded-lg border border-dashed border-rule bg-paper/50 px-4 py-6 text-center transition-colors duration-150 hover:border-signal hover:bg-signal/5 focus-within:border-signal focus-within:bg-signal/5 focus-within:ring-2 focus-within:ring-signal/25";

  return (
    <main className="mx-auto w-full max-w-2xl space-y-7">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          Report an issue
        </h1>
        <p className="mt-1.5 text-sm leading-relaxed text-ink/55">
          Describe the problem and where it is — your report goes straight to the municipality.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full space-y-6 rounded-xl border border-rule bg-white p-6 shadow-sm sm:p-8"
      >
        <label className={labelClass}>
          Description <span className="text-hazard">*</span>
          <textarea
            required
            rows={4}
            maxLength={MAX_DESCRIPTION_LENGTH}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the problem and where it is..."
            className={`${inputClass} resize-y`}
          />
        </label>

        <label className={labelClass}>
          Category <span className="text-hazard">*</span>
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
          <legend className={labelClass}>
            Location <span className="text-hazard">*</span>
          </legend>
          <p className="mt-1 text-xs font-normal leading-relaxed text-ink/50">
            {geoStatus ?? "Requesting your location..."}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <label className="block text-xs font-medium text-ink/70">
              Latitude
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="27.7172"
                className={coordInputClass}
                readOnly={geoStatus?.startsWith("Location captured")}
              />
            </label>
            <label className="block text-xs font-medium text-ink/70">
              Longitude
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="85.3240"
                className={coordInputClass}
                readOnly={geoStatus?.startsWith("Location captured")}
              />
            </label>
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Ward
            <input
              type="text"
              value={ward}
              onChange={(e) => setWard(e.target.value)}
              placeholder="Optional"
              className={inputClass}
            />
          </label>
          <label className={labelClass}>
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

        <fieldset className="border-t border-rule pt-6">
          <legend className={labelClass}>
            Photos (optional, up to {MAX_IMAGES}){" "}
            <span className="text-xs font-normal text-ink/50">JPEG or PNG, max 8MB each</span>
          </legend>
          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className={dropzoneClass}>
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-1 h-6 w-6 text-signal"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="m21 15-5-5L5 21" />
              </svg>
              <span className="text-sm font-medium text-signal">Choose from gallery</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
                className="sr-only"
              />
            </label>
            <label className={dropzoneClass}>
              {/* capture="environment" opens the rear camera directly on mobile;
                  each capture appends to the same list, so users can tap it repeatedly. */}
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="mb-1 h-6 w-6 text-moss"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
              <span className="text-sm font-medium text-moss">Take photo</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
                className="sr-only"
              />
            </label>
          </div>

          {previews.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-3">
              {previews.map((preview, index) => (
                <li key={`${preview.file.name}-${index}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.url}
                    alt={`Photo ${index + 1}`}
                    className="h-20 w-20 rounded-lg border border-rule object-cover shadow-sm"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`Remove photo ${index + 1}`}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-red-600 text-sm leading-none text-white shadow-sm transition-colors duration-150 hover:bg-red-700"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {imageError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {imageError}
          </p>
        )}

        {formError && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-signal px-4 py-3 text-sm font-semibold tracking-wide text-white transition-colors duration-150 hover:bg-signal-dark disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit report"}
        </button>
      </form>
    </main>
  );
}
