"use client";

import {
  useState,
  type DragEvent,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import { GripVertical, LockKeyhole, Pencil } from "lucide-react";
import { Button } from "@/components/ui";
import { cn } from "@/lib/utils";

interface OntologyNodeCardProps {
  id: string;
  tone: "input" | "output" | "category";
  title: string;
  subtitle: string;
  description?: string | null;
  color?: string | null;
  locked: boolean;
  readOnly: boolean;
  versionBadge?: {
    label: string;
    title: string;
  };
  leftPort?: {
    id: string;
    label: string;
    acceptedKind?: "input" | "output";
    onDrop?: (sourceId: string) => void;
  };
  rightPort?: {
    id: string;
    label: string;
    sourceKind?: "input" | "output";
  };
  footer?: ReactNode;
  onView: () => void;
  onEdit: () => void;
}

const toneClass = {
  input:
    "border-blue-200 bg-blue-50/70 dark:border-blue-900 dark:bg-blue-950/25",
  output:
    "border-violet-200 bg-violet-50/70 dark:border-violet-900 dark:bg-violet-950/25",
  category:
    "border-emerald-200 bg-emerald-50/70 dark:border-emerald-900 dark:bg-emerald-950/25",
};

function readDraggedNode(
  event: DragEvent,
  acceptedKind: "input" | "output"
): string | null {
  return (
    event.dataTransfer.getData(`application/x-ontology-${acceptedKind}`) || null
  );
}

export function OntologyNodeCard({
  id,
  tone,
  title,
  subtitle,
  description,
  color,
  locked,
  readOnly,
  versionBadge,
  leftPort,
  rightPort,
  footer,
  onView,
  onEdit,
}: OntologyNodeCardProps) {
  const disabled = readOnly || locked;
  const [dropActive, setDropActive] = useState(false);

  const acceptDrop = (event: DragEvent): void => {
    if (readOnly || !leftPort?.acceptedKind || !leftPort.onDrop) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "link";
    setDropActive(true);
  };

  const completeDrop = (event: DragEvent): void => {
    setDropActive(false);
    if (readOnly || !leftPort?.acceptedKind || !leftPort.onDrop) return;
    event.preventDefault();
    event.stopPropagation();
    const sourceId = readDraggedNode(event, leftPort.acceptedKind);
    if (sourceId) leftPort.onDrop(sourceId);
  };

  const openDetails = (event: MouseEvent<HTMLElement>): void => {
    const target = event.target as HTMLElement;
    if (target.closest("button, input, select, textarea, a, label")) return;
    onView();
  };

  const openDetailsFromKeyboard = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onView();
  };

  return (
    <article
      data-node-id={id}
      role="button"
      tabIndex={0}
      aria-label={`Xem chi tiết ${title}`}
      aria-haspopup="dialog"
      onClick={openDetails}
      onKeyDown={openDetailsFromKeyboard}
      onDragOver={acceptDrop}
      onDragLeave={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setDropActive(false);
        }
      }}
      onDrop={completeDrop}
      className={cn(
        "relative cursor-pointer rounded-xl border p-3 shadow-sm transition-shadow hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500",
        dropActive &&
          "ring-2 ring-blue-500 ring-offset-2 dark:ring-offset-slate-950",
        toneClass[tone]
      )}
    >
      {leftPort && (
        <button
          type="button"
          data-port-id={leftPort.id}
          aria-label={leftPort.label}
          title={leftPort.label}
          disabled={readOnly}
          onDragOver={acceptDrop}
          onDrop={completeDrop}
          className="absolute -left-2.5 top-8 z-20 size-5 rounded-full border-2 border-white bg-violet-600 shadow-md ring-2 ring-violet-300 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-500 disabled:cursor-default disabled:hover:scale-100 dark:border-slate-950 dark:ring-violet-700"
        />
      )}

      {rightPort && (
        <button
          type="button"
          draggable={!readOnly}
          data-port-id={rightPort.id}
          aria-label={rightPort.label}
          title={rightPort.label}
          disabled={readOnly}
          onDragStart={(event) => {
            if (!rightPort.sourceKind) return;
            event.dataTransfer.effectAllowed = "link";
            event.dataTransfer.setData(
              `application/x-ontology-${rightPort.sourceKind}`,
              id
            );
          }}
          className="absolute -right-2.5 top-8 z-20 size-5 cursor-grab rounded-full border-2 border-white bg-blue-600 shadow-md ring-2 ring-blue-300 transition-transform hover:scale-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 active:cursor-grabbing disabled:cursor-default disabled:hover:scale-100 dark:border-slate-950 dark:ring-blue-700"
        />
      )}

      <div className="flex items-start gap-2">
        <GripVertical
          className="mt-0.5 size-4 shrink-0 text-slate-400"
          aria-hidden="true"
        />
        {color && (
          <span
            className="mt-1 size-3 shrink-0 rounded-full ring-2 ring-white dark:ring-slate-950"
            style={{ backgroundColor: color }}
            aria-hidden="true"
          />
        )}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-semibold text-slate-950 dark:text-white">
            {title}
          </h4>
          <p className="mt-0.5 truncate text-xs font-medium text-slate-500">
            {subtitle}
          </p>
        </div>
        {!readOnly && (
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label={`Sửa ${title}`}
            title={`Sửa ${title}`}
            disabled={disabled}
            onClick={onEdit}
            className="size-7 shrink-0"
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </Button>
        )}
        {locked && (
          <LockKeyhole
            className="size-4 shrink-0 text-amber-600"
            aria-label="Node đang được một version Published sử dụng"
          />
        )}
        {versionBadge && (
          <span
            className="inline-flex min-w-10 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white/80 px-2 py-1 text-xs font-bold tabular-nums text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200"
            title={versionBadge.title}
            aria-label={versionBadge.title}
          >
            {versionBadge.label}
          </span>
        )}
      </div>

      {description && (
        <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      )}

      {footer && <div className="mt-3">{footer}</div>}
    </article>
  );
}
