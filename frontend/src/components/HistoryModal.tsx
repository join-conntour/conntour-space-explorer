import React, { useState } from "react";
import { Modal } from "./Modal";

export const paginationButtonStyle = "px-3 py-1 text-sm font-medium rounded-md bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed";

export function HistoryModal({
  history, onClose, onDelete, maxEntriesInPage = 10,
}: {
  history: readonly { query: string; }[];
  onClose: () => void;
  onDelete: (i: number) => void;
  maxEntriesInPage?: number;
}) {
  const [page, setPage] = useState(0);

  const hasPrev = page > 0;
  const hasNext = (page + 1) * maxEntriesInPage < history.length;

  const start = page * maxEntriesInPage;
  const end = Math.min(history.length, start + maxEntriesInPage);
  const thisPage = history.slice(start, end + 1);

  return (
    <Modal onClose={onClose}>
      <button
        onClick={onClose}
        className="p-1 text-gray-500 hover:text-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded absolute top-[10px] right-[20px]"
      >
        X
      </button>

      <div className="flex flex-col w-full ">
        {/* Header */}
        <h2 className="text-base font-semibold text-gray-800 truncate text-center">
          Past searches
        </h2>

        {/* Body: List */}
        <div className="flex-1 overflow-y-auto max-h-full divide-y divide-gray-100">
          {history.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              No items found.
            </div>
          ) : (
            thisPage.map((item, i) => i == 0 ? null : (
              <div
                key={i}
                className="flex items-center justify-start px-4 py-2"
              >
                <button
                  onClick={() => onDelete(i)}
                  className="inline-flex items-center justify-center rounded-md focus:outline-none focus-visible:ring-2 transition-colors p-2 text-base text-red-600 hover:bg-red-50 focus-visible:ring-red-500 active:bg-red-100"
                >
                  <img src="trash.svg" alt="delete" />
                </button>

                <span className="text-sm text-gray-800 truncate pr-2">
                  {item.query}
                </span>
              </div>
            )
            )
          )}
        </div>

        {/* Footer: Pagination */}
        {(hasNext || hasPrev) && (
          <div className="flex items-center justify-end border-t border-gray-200 px-4 py-2 gap-1">
            <span className="flex-1">
              Showing {start + 1}-{end} out of {history.length - 1}
            </span>

            <button
              onClick={() => setPage((i) => i - 1)}
              disabled={!hasPrev}
              className={paginationButtonStyle}
            >
              Previous page
            </button>

            <button
              onClick={() => setPage((i) => i + 1)}
              disabled={!hasNext}
              className={paginationButtonStyle}
            >
              Next page
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
