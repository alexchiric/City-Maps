// Mirrors the fill-color stops in LivabilityMap's scores-fill layer — keep in sync.
const GRADIENT = "linear-gradient(to right, #fee5d9, #fb6a4a, #a50f15)";

export default function Legend() {
  return (
    // bottom-right, clear of the MapLibre attribution control: bottom-left is
    // taken by ControlPanel, which is tall enough (max-h-[calc(100%-2rem)]) to
    // reach that corner at almost any viewport height and would paint over it.
    <div className="absolute right-4 bottom-10 z-10 rounded-lg bg-white/95 p-3 text-xs text-zinc-700 shadow-lg backdrop-blur-sm">
      <div className="mb-1 font-medium text-zinc-800">Livability score</div>
      <div className="h-2 w-40 rounded" style={{ background: GRADIENT }} />
      <div className="mt-1 flex w-40 justify-between">
        <span>Lower</span>
        <span>Higher</span>
      </div>
    </div>
  );
}
