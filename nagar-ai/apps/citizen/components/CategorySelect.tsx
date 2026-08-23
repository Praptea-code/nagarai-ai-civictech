"use client";

import { useEffect, useId, useRef, useState } from "react";

const CATEGORY_OPTIONS = [
  { label: "Pothole", value: "pothole" },
  { label: "Garbage", value: "garbage" },
  { label: "Water Leakage", value: "water_leakage" },
  { label: "Streetlight", value: "streetlight" },
  { label: "Flooding", value: "flooding" },
  { label: "Drainage", value: "drainage" },
  { label: "Other", value: "other" },
];

const triggerClass =
  "flex w-full items-center justify-between gap-2 rounded-lg border border-rule bg-paper/60 px-3 py-2.5 text-left text-sm text-ink transition-colors duration-150 focus:border-signal focus:bg-white focus:outline-none focus:ring-2 focus:ring-signal/30";

export default function CategorySelect({
  labelId,
  value,
  onChange,
}: {
  labelId: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const uid = useId();
  const listId = `${uid}-listbox`;
  const textId = `${uid}-value`;

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = CATEGORY_OPTIONS.find((opt) => opt.value === value) ?? null;
  const optionId = (index: number) => `${listId}-opt-${index}`;

  // Close when pressing/clicking anywhere outside the control.
  useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  // Move focus into the listbox when it opens so arrows work immediately.
  useEffect(() => {
    if (open) listRef.current?.focus();
  }, [open]);

  // Keep the highlighted option scrolled into view.
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(optionId(activeIndex))
      ?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  function openList() {
    const currentIndex = CATEGORY_OPTIONS.findIndex((opt) => opt.value === value);
    setActiveIndex(currentIndex >= 0 ? currentIndex : 0);
    setOpen(true);
  }

  function select(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
    buttonRef.current?.focus();
  }

  function closeToTrigger() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function handleListKeyDown(e: React.KeyboardEvent) {
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, CATEGORY_OPTIONS.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(CATEGORY_OPTIONS.length - 1);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        select(CATEGORY_OPTIONS[activeIndex].value);
        break;
      case "Escape":
        e.preventDefault();
        closeToTrigger();
        break;
      case "Tab":
        setOpen(false);
        break;
    }
  }

  return (
    <div ref={rootRef} className="relative mt-1.5">
      <button
        type="button"
        ref={buttonRef}
        onClick={() => (open ? setOpen(false) : openList())}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-labelledby={`${labelId} ${textId}`}
        className={triggerClass}
      >
        <span id={textId} className={selected ? "" : "text-ink/40"}>
          {selected ? selected.label : "Select a category..."}
        </span>
        <svg
          aria-hidden="true"
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`h-4 w-4 shrink-0 text-ink/50 transition-transform duration-150 ${
            open ? "rotate-180" : ""
          }`}
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.17l3.71-3.94a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {open && (
        <ul
          ref={listRef}
          role="listbox"
          tabIndex={-1}
          id={listId}
          aria-labelledby={labelId}
          aria-activedescendant={optionId(activeIndex)}
          onKeyDown={handleListKeyDown}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-60 overflow-y-auto rounded-lg border border-rule bg-white py-1 shadow-lg focus:outline-none"
        >
          {CATEGORY_OPTIONS.map((opt, index) => (
            <li
              key={opt.value}
              id={optionId(index)}
              role="option"
              aria-selected={opt.value === value}
              onClick={() => select(opt.value)}
              onMouseMove={() => setActiveIndex(index)}
              className={`flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors duration-100 ${
                index === activeIndex ? "bg-signal/10 text-ink" : "text-ink/80"
              }`}
            >
              {opt.label}
              {opt.value === value && (
                <svg
                  aria-hidden="true"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 shrink-0 text-signal"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0l-3.5-3.5a1 1 0 1 1 1.4-1.4L8.5 12l6.8-6.7a1 1 0 0 1 1.4 0Z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
