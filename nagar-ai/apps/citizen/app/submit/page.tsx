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

  const inputClass =
    "mt-1 w-full rounded border border-rule bg-white p-2 focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal";

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6">
      <h1 className="font-display text-xl font-bold text-ink">Report an issue</h1>

      <form onSubmit={handleSubmit} className="w-full space-y-4 rounded-md border border-rule bg-white p-6 shadow-sm">
        <label className="block text-sm font-medium">
          Description <span className="text-hazard">*</span>
          <textarea
            required
            rows={4}
            maxLength={MAX_DESCRIPTION_LENGTH}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe the problem and where it is..."
            className={inputClass}
          />
        </label>

        <label className="block text-sm font-medium">
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
          <legend className="text-sm font-medium">
            Location <span className="text-hazard">*</span>
          </legend>
          <p className="mt-1 text-xs text-ink/60">{geoStatus ?? "Requesting your location..."}</p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="text-xs text-ink/70">`n              Latitude
              <input
                type="number"
                step="any"
                required
                value={latitude}
                onChange={(e) => setLatitude(e.target.value)}
                placeholder="27.7172"
                className={`mt-1 w-full rounded border bg-white p-2 font-mono text-sm ${geoStatus?.startsWith("Location captured") ? "border-rule bg-paper" : "border-rule"} focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal`}
                readOnly={geoStatus?.startsWith("Location captured")}
              />
            </label>
            <label className="text-xs text-ink/70">
              Longitude
              <input
                type="number"
                step="any"
                required
                value={longitude}
                onChange={(e) => setLongitude(e.target.value)}
                placeholder="85.3240"
                className={`mt-1 w-full rounded border bg-white p-2 font-mono text-sm ${geoStatus?.startsWith("Location captured") ? "border-rule bg-paper" : "border-rule"} focus:border-signal focus:outline-none focus:ring-1 focus:ring-signal`}
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

        <fieldset>
          <legend className="text-sm font-medium">
            Photos (optional, up to {MAX_IMAGES}) <span className="text-xs font-normal text-gray-500">JPEG or PNG, max 8MB each</span>
          </legend>
          <div className="mt-1 grid grid-cols-2 gap-2">
            <label className="block text-sm">
              <span className="text-ink/70">Choose from gallery</span>
              <input
                type="file"
                accept="image/jpeg,image/png"
                multiple
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
                className="mt-1 block w-full text-sm text-ink/70 file:mr-3 file:rounded file:border-0 file:bg-signal/10 file:p-2 file:text-sm file:text-signal"
              />
            </label>
            <label className="block text-sm">
              <span className="text-ink/70">Take photo</span>
              {/* capture="environment" opens the rear camera directly on mobile;
                  each capture appends to the same list, so users can tap it repeatedly. */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => {
                  addFiles(e.target.files);
                  e.target.value = "";
                }}
                className="mt-1 block w-full text-sm text-ink/70 file:mr-3 file:rounded file:border-0 file:bg-moss/10 file:p-2 file:text-sm file:text-moss"
              />
            </label>
          </div>

          {previews.length > 0 && (
            <ul className="mt-2 flex flex-wrap gap-2">
              {previews.map((preview, index) => (
                <li key={`${preview.file.name}-${index}`} className="relative">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={preview.url}
                    alt={`Photo ${index + 1}`}
                    className="h-20 w-20 rounded border border-rule object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    aria-label={`Remove photo ${index + 1}`}
                    className="absolute -right-2 -top-2 h-6 w-6 rounded-full bg-red-600 text-sm leading-none text-white"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

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
          className="w-full rounded bg-signal p-2 font-medium text-white transition-colors duration-150 hover:bg-signal-dark disabled:opacity-50"
        >
          {submitting ? "Submitting..." : "Submit report"}
        </button>
      </form>
    </main>
  );
}
