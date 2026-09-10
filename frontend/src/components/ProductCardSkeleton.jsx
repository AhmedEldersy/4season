export default function ProductCardSkeleton() {
  return (
    <div className="bg-white rounded-2xl overflow-hidden border border-[var(--line)]">
      <div className="aspect-[4/3] skeleton" />
      <div className="p-4 space-y-2">
        <div className="h-4 w-2/3 rounded skeleton" />
        <div className="h-3 w-full rounded skeleton" />
        <div className="h-5 w-1/3 rounded skeleton mt-3" />
      </div>
    </div>
  );
}
