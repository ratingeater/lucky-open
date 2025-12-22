"use client";

import { useEffect, useMemo } from "react";
import { X } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function BrowserSetupModal({ open, onClose }: Props) {
  const templateUrl = useMemo(() => {
    if (typeof window === "undefined") return "https://YOUR_DOMAIN/api?q=%s";
    return `${window.location.origin}/api?q=%s`;
  }, []);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-6"
      role="dialog"
      aria-modal="true"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-xl rounded-2xl border border-gray-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <div className="text-base font-semibold">Setup your browser</div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-gray-100"
            aria-label="Close"
          >
            <X className="h-5 w-5 text-gray-700" />
          </button>
        </div>

        <div className="px-5 py-5 text-sm text-gray-800">
          <ol className="list-decimal space-y-2 pl-5">
            <li>
              Go to <span className="font-medium">Settings</span> &gt;{" "}
              <span className="font-medium">Search engine</span>
            </li>
            <li>
              Click <span className="font-medium">Add</span> button on the right of{" "}
              <span className="font-medium">Site search</span> title
            </li>
            <li>
              Fill the form with <span className="font-medium">Quick Open</span> as the name and{" "}
              <span className="font-medium">open</span> as the shortcut.
            </li>
            <li>
              Then paste the following URL in the{" "}
              <span className="font-medium">URL with %s in place of query</span> field:
              <div className="mt-2">
                <code className="block select-all rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs">
                  {templateUrl}
                </code>
              </div>
            </li>
          </ol>

          <div className="mt-5 rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
            Type <span className="font-medium">open</span> in the address bar and press{" "}
            <span className="font-medium">Space</span> or <span className="font-medium">Tab</span> to search.
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-gray-900 px-4 py-2 text-sm font-semibold text-white hover:bg-gray-800"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
