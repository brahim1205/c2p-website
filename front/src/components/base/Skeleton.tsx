interface SkeletonProps {
  className?: string;
  count?: number;
}

export function SkeletonRow({ className = '', count = 1 }: SkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`animate-pulse bg-gray-200 rounded ${className}`}
        />
      ))}
    </>
  );
}

export function SkeletonTable({ rows = 5, cols = 6 }: { rows?: number; cols?: number }) {
  return (
    <div className="w-full">
      {/* Header */}
      <div className="flex gap-4 mb-3">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={`h-${i}`} className="flex-1 h-8 bg-gray-200 rounded animate-pulse" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`r-${r}`} className="flex gap-4 mb-3">
          {Array.from({ length: cols }).map((_, c) => (
            <div key={`c-${c}`} className="flex-1 h-10 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
      ))}
    </div>
  );
}

export function SkeletonCard({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-lg" />
            <div className="w-16 h-6 bg-gray-200 rounded" />
          </div>
          <div className="w-24 h-8 bg-gray-200 rounded mb-1" />
          <div className="w-32 h-4 bg-gray-200 rounded" />
        </div>
      ))}
    </>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-start space-x-4 p-4 border border-gray-100 rounded-lg animate-pulse">
          <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-1/3 h-4 bg-gray-200 rounded" />
            <div className="w-2/3 h-3 bg-gray-100 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonAvatar({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' | 'xl' }) {
  const sizeClasses = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-14 h-14', xl: 'w-20 h-20' };
  return (
    <div
      className={`${sizeClasses[size]} bg-gray-200 rounded-full animate-pulse flex-shrink-0`}
    />
  );
}

export function SkeletonText({ lines = 1, className = '', width = 'full' }: { lines?: number; className?: string; width?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className={`h-4 bg-gray-200 rounded animate-pulse ${
            width === 'full' ? 'w-full' : width === '3/4' ? 'w-3/4' : width === '1/2' ? 'w-1/2' : 'w-2/3'
          }`}
          style={{ animationDelay: `${i * 100}ms` }}
        />
      ))}
    </div>
  );
}

export function SkeletonChart({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-6 animate-pulse ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="w-32 h-5 bg-gray-200 rounded" />
        <div className="w-20 h-4 bg-gray-200 rounded" />
      </div>
      <div className="flex items-end gap-3 h-48 mb-4">
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-gray-200 rounded-t-lg"
            style={{
              height: `${35 + ((i * 17) % 45)}%`,
              animationDelay: `${i * 80}ms`,
              opacity: 0.65 + ((i % 3) * 0.1),
            }}
          />
        ))}
      </div>
      <div className="flex justify-between">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="w-8 h-3 bg-gray-200 rounded" />
        ))}
      </div>
    </div>
  );
}

export function SkeletonDashboardCard({ count = 1 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 animate-pulse"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-200 rounded-xl" />
            <div className="w-16 h-6 bg-gray-200 rounded" />
          </div>
          <div className="w-24 h-8 bg-gray-200 rounded mb-2" />
          <div className="w-32 h-4 bg-gray-200 rounded" />
        </div>
      ))}
    </>
  );
}

export function SkeletonDashboardLayout() {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonDashboardCard count={4} />
      </div>
      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SkeletonChart />
        <SkeletonChart />
      </div>
      {/* Table */}
      <SkeletonCard count={3} />
    </div>
  );
}
