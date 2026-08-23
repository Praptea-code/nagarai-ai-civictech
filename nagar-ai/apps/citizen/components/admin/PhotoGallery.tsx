"use client";

import { useState } from "react";
import { ImageIcon, X } from "lucide-react";

export default function PhotoGallery({ urls }: { urls: string[] }) {
  const [active, setActive] = useState<string | null>(null);

  if (urls.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-rule p-4 text-sm text-ink/40">
        <ImageIcon size={16} />
        No evidence photos attached.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {urls.map((url, i) => (
          <button
            key={url}
            onClick={() => setActive(url)}
            className="group relative aspect-square overflow-hidden rounded-md border border-rule bg-paper"
            title="View full size"
          >
            {/* Plain img: Supabase Storage URLs are unconfigured remote hosts. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={url}
              alt={`Evidence photo ${i + 1}`}
              className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {active && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-ink/90 p-6"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
        >
          <button
            onClick={() => setActive(null)}
            className="absolute right-5 top-5 rounded-md p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
            title="Close"
          >
            <X size={22} />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={active}
            alt="Evidence photo, full size"
            className="max-h-full max-w-full rounded-md object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
