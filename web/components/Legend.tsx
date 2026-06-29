// Mirrors the fill-color stops in LivabilityMap's scores-fill layer — keep in sync.
const GRADIENT = "linear-gradient(to right, #fee5d9, #fb6a4a, #a50f15)";

export default function Legend() {
  return (
    <div className="absolute bottom-4 left-4 z-10 rounded-lg bg-white/95 p-3 text-xs text-zinc-700 shadow-lg backdrop-blur-sm">
      <div className="mb-1 font-medium text-zinc-800">Livability score</div>
      <div className="h-2 w-40 rounded" style={{ background: GRADIENT }} />
      <div className="mt-1 flex w-40 justify-between">
        <span>Lower</span>
        <span>Higher</span>
      </div>
    </div>
  );
}
