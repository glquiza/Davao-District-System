export default function AuthenticatedLoading() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2.5">
          <div className="h-9 w-64 rounded-xl bg-[#F0ECE3] border border-[#D6C6A5]/40" />
          <div className="h-4 w-80 rounded-lg bg-[#F0ECE3]/80" />
        </div>
        <div className="h-10 w-56 rounded-xl bg-[#F0ECE3] border border-[#D6C6A5]/40" />
      </div>

      {/* Cards Grid Skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {[1, 2, 3, 4].map((idx) => (
          <div
            key={idx}
            className="rounded-2xl border border-[#D6C6A5]/50 bg-white p-6 shadow-sm space-y-4"
          >
            <div className="flex items-center gap-2">
              <div className="h-5 w-20 rounded-full bg-[#F0ECE3]" />
              <div className="h-5 w-24 rounded-full bg-[#F5F1E9]" />
            </div>
            <div className="h-6 w-3/4 rounded-lg bg-[#F0ECE3]" />
            <div className="h-4 w-full rounded-lg bg-[#F5F1E9]" />
            <div className="h-4 w-2/3 rounded-lg bg-[#F5F1E9]" />
            <div className="pt-2 border-t border-[#F0ECE3] flex justify-between items-center">
              <div className="h-4 w-32 rounded-lg bg-[#F5F1E9]" />
              <div className="h-8 w-24 rounded-xl bg-[#F0ECE3]" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
