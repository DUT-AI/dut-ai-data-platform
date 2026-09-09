import { ArrowRight, Boxes } from "lucide-react";
import type { Ontology } from "../../types";

interface OntologyCardProps {
  ontology: Ontology;
  onOpen: () => void;
}

export function OntologyCard({ ontology, onOpen }: OntologyCardProps) {
  const published = ontology.versions.filter(
    (version) => version.status === "published"
  ).length;
  const drafts = ontology.versions.length - published;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group min-w-0 rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:-translate-y-0.5 hover:border-blue-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex items-start justify-between gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300">
          <Boxes className="size-5" aria-hidden="true" />
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium tabular-nums text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {published} Published · {drafts} Draft
        </span>
      </div>
      <h3 className="mt-4 truncate font-semibold text-slate-950 dark:text-white">
        {ontology.name}
      </h3>
      <p className="mt-1 line-clamp-2 min-h-10 text-sm leading-5 text-slate-500">
        {ontology.description || "Chưa có mô tả."}
      </p>
      <span className="mt-4 flex items-center gap-1 text-xs font-semibold text-blue-600">
        Mở trình thiết kế
        <ArrowRight
          className="size-3.5 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </button>
  );
}
