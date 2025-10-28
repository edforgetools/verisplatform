export function ProofSkeleton() {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden animate-pulse">
      {/* Header Skeleton */}
      <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-700 dark:to-slate-600 px-8 py-6 border-b border-slate-200 dark:border-slate-700">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="h-8 bg-slate-200 dark:bg-slate-600 rounded w-64"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-48"></div>
          </div>
          <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded-full w-24"></div>
        </div>
      </div>

      {/* Content Skeleton */}
      <div className="p-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Left Column Skeleton */}
          <div className="space-y-6">
            <div>
              <div className="h-6 bg-slate-200 dark:bg-slate-600 rounded w-32 mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-20"></div>
                    <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column Skeleton */}
          <div className="space-y-6">
            <div>
              <div className="h-6 bg-slate-200 dark:bg-slate-600 rounded w-40 mb-4"></div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="space-y-2">
                    <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-24"></div>
                    <div className="h-10 bg-slate-200 dark:bg-slate-600 rounded w-full"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Signature Section Skeleton */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700">
          <div className="h-6 bg-slate-200 dark:bg-slate-600 rounded w-32 mb-4"></div>
          <div className="bg-slate-50 dark:bg-slate-700 rounded-lg p-4">
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-full mb-2"></div>
            <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-3/4"></div>
          </div>
        </div>

        {/* Actions Skeleton */}
        <div className="mt-8 flex flex-wrap gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-200 dark:bg-slate-600 rounded-lg w-32"></div>
          ))}
        </div>

        {/* Footer Skeleton */}
        <div className="mt-8 pt-6 border-t border-slate-200 dark:border-slate-700 text-center">
          <div className="h-4 bg-slate-200 dark:bg-slate-600 rounded w-64 mx-auto"></div>
        </div>
      </div>
    </div>
  );
}
