"use client";

import { CATEGORIES, CATEGORY_COLORS, CATEGORY_LABELS, type Category } from "@/lib/categories";
import type { Weights } from "@/lib/livability";

interface Props {
  weights: Weights;
  onWeightsChange: (weights: Weights) => void;
  activeCategories: Set<Category>;
  onActiveCategoriesChange: (categories: Set<Category>) => void;
  streetsVisible: boolean;
  onStreetsVisibleChange: (visible: boolean) => void;
  scoresVisible: boolean;
  onScoresVisibleChange: (visible: boolean) => void;
}

export default function ControlPanel({
  weights,
  onWeightsChange,
  activeCategories,
  onActiveCategoriesChange,
  streetsVisible,
  onStreetsVisibleChange,
  scoresVisible,
  onScoresVisibleChange,
}: Props) {
  function toggleCategory(category: Category) {
    const next = new Set(activeCategories);
    if (next.has(category)) next.delete(category);
    else next.add(category);
    onActiveCategoriesChange(next);
  }

  return (
    <div className="absolute top-4 left-4 z-10 max-h-[calc(100%-2rem)] w-72 overflow-y-auto rounded-lg bg-white/95 p-4 text-sm text-zinc-800 shadow-lg backdrop-blur-sm">
      <h1 className="mb-3 text-base font-semibold text-zinc-900">Livability map</h1>

      <section className="mb-4">
        <h2 className="mb-2 font-medium text-zinc-700">Layers</h2>
        <label className="mb-1 flex items-center gap-2">
          <input
            type="checkbox"
            checked={streetsVisible}
            onChange={(e) => onStreetsVisibleChange(e.target.checked)}
          />
          Streets
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={scoresVisible}
            onChange={(e) => onScoresVisibleChange(e.target.checked)}
          />
          Livability score
        </label>
      </section>

      <section className="mb-4">
        <h2 className="mb-2 font-medium text-zinc-700">POI categories</h2>
        <div className="flex flex-col gap-1">
          {CATEGORIES.map((category) => (
            <label key={category} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={activeCategories.has(category)}
                onChange={() => toggleCategory(category)}
              />
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: CATEGORY_COLORS[category] }}
              />
              {CATEGORY_LABELS[category]}
            </label>
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-2 font-medium text-zinc-700">Category weights</h2>
        <div className="flex flex-col gap-2">
          {CATEGORIES.map((category) => (
            <div key={category}>
              <div className="flex justify-between text-xs text-zinc-600">
                <span>{CATEGORY_LABELS[category]}</span>
                <span>{weights[category]}</span>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={weights[category]}
                onChange={(e) => onWeightsChange({ ...weights, [category]: Number(e.target.value) })}
                className="w-full"
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
