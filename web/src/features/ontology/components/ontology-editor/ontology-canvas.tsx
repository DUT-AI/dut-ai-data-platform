"use client";

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CirclePlus, Search, Trash2, Unplug } from "lucide-react";
import { Button } from "@/components/ui";
import type { VersionOutputLink } from "../../hooks";
import type {
  Category,
  OntologyInput,
  OntologyOutput,
  OntologyVersion,
} from "../../types";
import {
  OntologyNodeDetailDialog,
  type OntologyNodeDetails,
} from "./ontology-node-detail-dialog";
import { OntologyNodeCard } from "./ontology-node-card";
import { NodeVersionSummary } from "./node-version-summary";

interface OntologyCanvasProps {
  inputs: OntologyInput[];
  outputs: OntologyOutput[];
  categories: Category[];
  inputIds: string[];
  outputLinks: VersionOutputLink[];
  versions: OntologyVersion[];
  selectedVersionId: string;
  readOnly: boolean;
  onAddInput: () => void;
  onAddOutput: () => void;
  onAddCategory: () => void;
  onEditInput: (input: OntologyInput) => void;
  onEditOutput: (output: OntologyOutput) => void;
  onEditCategory: (category: Category) => void;
  onConnectInput: (inputId: string, outputId: string) => void;
  onToggleCategory: (outputId: string, categoryId: string) => void;
  onDisconnectOutput: (outputId: string) => void;
}

interface PathLine {
  id: string;
  d: string;
  tone: "input" | "category";
  midpoint: { x: number; y: number };
  outputId: string;
  categoryId?: string;
  deleteLabel: string;
}

const nodeColumnClassName = "space-y-3 pb-4 pl-3 pr-2";

const portPoint = (container: DOMRect, element: Element | null) => {
  if (!element) return null;
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left + rect.width / 2 - container.left,
    y: rect.top + rect.height / 2 - container.top,
  };
};

const curve = (
  start: { x: number; y: number },
  end: { x: number; y: number }
) => {
  const bend = Math.max(40, Math.abs(end.x - start.x) * 0.45);
  return `M ${start.x} ${start.y} C ${start.x + bend} ${start.y}, ${end.x - bend} ${end.y}, ${end.x} ${end.y}`;
};

function EmptyColumn({ children }: { children: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/60 px-3 py-8 text-center text-xs leading-5 text-slate-500 dark:border-slate-700 dark:bg-slate-950/40">
      {children}
    </div>
  );
}

function ColumnHeader({
  title,
  description,
  tone,
  readOnly,
  onAdd,
}: {
  title: string;
  description: string;
  tone: "input" | "output" | "category";
  readOnly: boolean;
  onAdd: () => void;
}) {
  const addButtonClass = {
    input: "bg-blue-600 text-white hover:bg-blue-700",
    output: "bg-violet-600 text-white hover:bg-violet-700",
    category: "bg-emerald-600 text-white hover:bg-emerald-700",
  }[tone];

  return (
    <header className="flex min-h-16 items-start justify-between gap-2">
      <div>
        <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
          {title}
        </h3>
        <p className="mt-1 text-xs leading-5 text-slate-500">{description}</p>
      </div>
      {!readOnly && (
        <Button
          type="button"
          size="sm"
          onClick={onAdd}
          aria-label={`Thêm ${title}`}
          className={addButtonClass}
        >
          <CirclePlus className="mr-1.5 size-4" aria-hidden="true" />
          Thêm {title}
        </Button>
      )}
    </header>
  );
}

function ColumnSearch({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative mb-3 block">
      <span className="sr-only">{label}</span>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
        aria-hidden="true"
      />
      <input
        type="search"
        name={`ontology-${label.toLowerCase()}-search`}
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Tìm tên, v1, Draft…"
        className="h-9 w-full rounded-md border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
      />
    </label>
  );
}

const versionTerms = (versions: OntologyVersion[]): string[] =>
  versions.flatMap((version) => [
    `v${version.version_no}`,
    version.name,
    version.status,
    `${version.status} v${version.version_no}`,
  ]);

const matchesSearch = (
  query: string,
  values: Array<string | null | undefined>
) => {
  const normalized = query.trim().toLocaleLowerCase("vi");
  if (!normalized) return true;
  return values
    .filter((value): value is string => Boolean(value))
    .some((value) => value.toLocaleLowerCase("vi").includes(normalized));
};

function versionBadge(versions: OntologyVersion[]) {
  if (versions.length === 0) return undefined;
  const ordered = [...versions].sort(
    (left, right) => left.version_no - right.version_no
  );
  const latest = ordered.at(-1);
  if (!latest) return undefined;
  const status = latest.status === "published" ? "Published" : "Draft";
  return {
    label: `v${latest.version_no} ${status}`,
    title: `Các Version của node: ${ordered
      .map(
        (version) =>
          `v${version.version_no} ${version.status === "published" ? "Published" : "Draft"}`
      )
      .join(" · ")}`,
  };
}

export function OntologyCanvas({
  inputs,
  outputs,
  categories,
  inputIds,
  outputLinks,
  versions,
  selectedVersionId,
  readOnly,
  onAddInput,
  onAddOutput,
  onAddCategory,
  onEditInput,
  onEditOutput,
  onEditCategory,
  onConnectInput,
  onToggleCategory,
  onDisconnectOutput,
}: OntologyCanvasProps) {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [paths, setPaths] = useState<PathLine[]>([]);
  const [hoveredPathId, setHoveredPathId] = useState<string | null>(null);
  const [inputSearch, setInputSearch] = useState("");
  const [outputSearch, setOutputSearch] = useState("");
  const [categorySearch, setCategorySearch] = useState("");
  const [nodeDetails, setNodeDetails] = useState<OntologyNodeDetails | null>(
    null
  );

  const inputUsage = useMemo(
    () =>
      new Map(
        inputs.map((input) => [
          input.id,
          versions.filter((version) =>
            version.id === selectedVersionId
              ? inputIds.includes(input.id) ||
                outputLinks.some((link) => link.inputId === input.id)
              : version.inputs.some(
                  (item) => item.ontology_input_id === input.id
                ) ||
                version.outputs.some(
                  (item) => item.ontology_input_id === input.id
                )
          ),
        ])
      ),
    [inputIds, inputs, outputLinks, selectedVersionId, versions]
  );
  const outputUsage = useMemo(
    () =>
      new Map(
        outputs.map((output) => [
          output.id,
          versions.filter((version) =>
            version.id === selectedVersionId
              ? outputLinks.some((link) => link.outputId === output.id)
              : version.outputs.some(
                  (item) => item.ontology_output_id === output.id
                )
          ),
        ])
      ),
    [outputLinks, outputs, selectedVersionId, versions]
  );
  const categoryUsage = useMemo(
    () =>
      new Map(
        categories.map((category) => [
          category.id,
          versions.filter((version) =>
            version.id === selectedVersionId
              ? outputLinks.some((link) =>
                  link.categoryIds.includes(category.id)
                )
              : version.outputs.some((output) =>
                  output.categories.some(
                    (item) => item.category_id === category.id
                  )
                )
          ),
        ])
      ),
    [categories, outputLinks, selectedVersionId, versions]
  );

  const visibleInputs = useMemo(
    () =>
      inputs.filter((input) => {
        const usedVersions = inputUsage.get(input.id) ?? [];
        return matchesSearch(inputSearch, [
          input.name,
          input.description,
          input.definition?.name,
          input.input_schema.type,
          input.scope,
          ...versionTerms(usedVersions),
        ]);
      }),
    [inputSearch, inputUsage, inputs]
  );
  const visibleOutputs = useMemo(
    () =>
      outputs.filter((output) => {
        const usedVersions = outputUsage.get(output.id) ?? [];
        return matchesSearch(outputSearch, [
          output.name,
          output.description,
          output.definition?.name,
          output.definition?.code,
          ...versionTerms(usedVersions),
        ]);
      }),
    [outputSearch, outputUsage, outputs]
  );
  const visibleCategories = useMemo(
    () =>
      categories.filter((category) => {
        const usedVersions = categoryUsage.get(category.id) ?? [];
        return matchesSearch(categorySearch, [
          category.name,
          category.key,
          category.description,
          ...versionTerms(usedVersions),
        ]);
      }),
    [categories, categorySearch, categoryUsage]
  );

  const measurePaths = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const container = canvas.getBoundingClientRect();
    const next: PathLine[] = [];

    for (const link of outputLinks) {
      const inputStart = portPoint(
        container,
        canvas.querySelector(`[data-port-id="input:${link.inputId}:out"]`)
      );
      const outputEnd = portPoint(
        container,
        canvas.querySelector(`[data-port-id="output:${link.outputId}:in"]`)
      );
      if (inputStart && outputEnd) {
        const inputName = inputs.find(
          (input) => input.id === link.inputId
        )?.name;
        const outputName = outputs.find(
          (output) => output.id === link.outputId
        )?.name;
        next.push({
          id: `input-${link.inputId}-${link.outputId}`,
          d: curve(inputStart, outputEnd),
          tone: "input",
          midpoint: {
            x: (inputStart.x + outputEnd.x) / 2,
            y: (inputStart.y + outputEnd.y) / 2,
          },
          outputId: link.outputId,
          deleteLabel: `Xóa kết nối từ ${inputName ?? "Input"} đến ${outputName ?? "Output"}`,
        });
      }

      for (const categoryId of link.categoryIds) {
        const outputStart = portPoint(
          container,
          canvas.querySelector(`[data-port-id="output:${link.outputId}:out"]`)
        );
        const categoryEnd = portPoint(
          container,
          canvas.querySelector(`[data-port-id="category:${categoryId}:in"]`)
        );
        if (outputStart && categoryEnd) {
          const outputName = outputs.find(
            (output) => output.id === link.outputId
          )?.name;
          const categoryName = categories.find(
            (category) => category.id === categoryId
          )?.name;
          next.push({
            id: `category-${link.outputId}-${categoryId}`,
            d: curve(outputStart, categoryEnd),
            tone: "category",
            midpoint: {
              x: (outputStart.x + categoryEnd.x) / 2,
              y: (outputStart.y + categoryEnd.y) / 2,
            },
            outputId: link.outputId,
            categoryId,
            deleteLabel: `Xóa kết nối từ ${outputName ?? "Output"} đến ${categoryName ?? "Category"}`,
          });
        }
      }
    }
    setPaths(next);
  }, [categories, inputs, outputLinks, outputs]);

  useLayoutEffect(() => {
    measurePaths();
    const observer = new ResizeObserver(measurePaths);
    if (canvasRef.current) observer.observe(canvasRef.current);
    window.addEventListener("resize", measurePaths);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", measurePaths);
    };
  }, [
    categories,
    inputs,
    measurePaths,
    outputs,
    visibleCategories,
    visibleInputs,
    visibleOutputs,
  ]);

  return (
    <>
      <section
        ref={canvasRef}
        onMouseLeave={() => setHoveredPathId(null)}
        className="relative min-h-[540px] overflow-x-auto rounded-2xl border border-slate-200 bg-[radial-gradient(circle_at_center,_rgb(203_213_225/0.45)_1px,_transparent_1px)] bg-[size:18px_18px] p-4 dark:border-slate-800 dark:bg-[radial-gradient(circle_at_center,_rgb(51_65_85/0.6)_1px,_transparent_1px)]"
        aria-label="Không gian kết nối Ontology"
      >
        <svg
          className="pointer-events-none absolute inset-0 z-30 h-full w-full overflow-visible"
          role="group"
          aria-label="Các kết nối của version đang xem"
        >
          {paths.map((path) => (
            <g key={path.id} data-connection-id={path.id}>
              <path
                d={path.d}
                fill="none"
                stroke={path.tone === "input" ? "#2563eb" : "#7c3aed"}
                strokeWidth="2.5"
                strokeLinecap="round"
                opacity="0.8"
                style={{ pointerEvents: "none" }}
              />
              {!readOnly && (
                <path
                  d={path.d}
                  fill="none"
                  stroke="transparent"
                  strokeWidth="18"
                  style={{ pointerEvents: "stroke" }}
                  onMouseEnter={() => setHoveredPathId(path.id)}
                />
              )}
            </g>
          ))}
        </svg>

        {!readOnly &&
          paths
            .filter((path) => path.id === hoveredPathId)
            .map((path) => (
              <button
                key={`delete-${path.id}`}
                type="button"
                aria-label={path.deleteLabel}
                title={path.deleteLabel}
                onClick={() => {
                  setHoveredPathId(null);
                  if (path.categoryId) {
                    onToggleCategory(path.outputId, path.categoryId);
                  } else {
                    onDisconnectOutput(path.outputId);
                  }
                }}
                style={{ left: path.midpoint.x, top: path.midpoint.y }}
                className="absolute z-40 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-rose-200 bg-white text-rose-600 shadow-md hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 dark:border-rose-900 dark:bg-slate-950 dark:hover:bg-rose-950"
              >
                <Trash2 className="size-3.5" aria-hidden="true" />
              </button>
            ))}

        <div className="relative z-20 grid min-w-[960px] grid-cols-3 items-start gap-16">
          <div className="flex flex-col">
            <ColumnHeader
              title="Input"
              description="Một Input có thể cấp dữ liệu cho nhiều Output."
              tone="input"
              readOnly={readOnly}
              onAdd={onAddInput}
            />
            <ColumnSearch
              label="Input"
              value={inputSearch}
              onChange={setInputSearch}
            />
            <div className={nodeColumnClassName}>
              {visibleInputs.length === 0 ? (
                <EmptyColumn>
                  {inputs.length === 0
                    ? "Chưa có Input. Hãy tạo Input đầu tiên."
                    : "Không tìm thấy Input phù hợp."}
                </EmptyColumn>
              ) : (
                visibleInputs.map((input) => {
                  const included = inputIds.includes(input.id);
                  const connectedOutputCount = outputLinks.filter(
                    (link) => link.inputId === input.id
                  ).length;
                  const usedVersions = inputUsage.get(input.id) ?? [];
                  const formats =
                    input.input_schema.allowed_extensions.join(", ");

                  return (
                    <OntologyNodeCard
                      key={input.id}
                      id={input.id}
                      tone="input"
                      title={input.name}
                      subtitle={`${input.definition?.name ?? input.input_schema.type} · ${input.scope === "ONE_ITEM" ? "1 Asset = 1 Item" : "1 Asset = N Items"}`}
                      description={input.description}
                      locked={input.locked}
                      readOnly={readOnly}
                      versionBadge={versionBadge(usedVersions)}
                      rightPort={{
                        id: `input:${input.id}:out`,
                        label: `Kéo để nối Input ${input.name} sang Output`,
                        sourceKind: "input",
                      }}
                      footer={
                        <div className="space-y-2">
                          <NodeVersionSummary
                            included={included}
                            detail={
                              included
                                ? `${connectedOutputCount} Output đang nhận Input này.`
                                : "Kéo chấm bên phải sang một Output để thêm vào Draft."
                            }
                          />
                          <p className="text-[11px] text-slate-500">
                            Định dạng: {formats || "Không giới hạn"}
                          </p>
                        </div>
                      }
                      onView={() =>
                        setNodeDetails({
                          kind: "input",
                          node: input,
                          versions: usedVersions,
                        })
                      }
                      onEdit={() => onEditInput(input)}
                    />
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <ColumnHeader
              title="Output"
              description="Thả dây Input vào bất kỳ vị trí nào trên card."
              tone="output"
              readOnly={readOnly}
              onAdd={onAddOutput}
            />
            <ColumnSearch
              label="Output"
              value={outputSearch}
              onChange={setOutputSearch}
            />
            <div className={nodeColumnClassName}>
              {visibleOutputs.length === 0 ? (
                <EmptyColumn>
                  {outputs.length === 0
                    ? "Chưa có Output để kết nối."
                    : "Không tìm thấy Output phù hợp."}
                </EmptyColumn>
              ) : (
                visibleOutputs.map((output) => {
                  const link = outputLinks.find(
                    (item) => item.outputId === output.id
                  );
                  const usedVersions = outputUsage.get(output.id) ?? [];
                  return (
                    <OntologyNodeCard
                      key={output.id}
                      id={output.id}
                      tone="output"
                      title={output.name}
                      subtitle={`${output.definition?.name ?? "Output"} · ${output.multiple ? "Nhiều kết quả" : "Một kết quả"}`}
                      description={output.description}
                      locked={output.locked}
                      readOnly={readOnly}
                      versionBadge={versionBadge(usedVersions)}
                      leftPort={{
                        id: `output:${output.id}:in`,
                        label: `Thả Input vào ${output.name}`,
                        acceptedKind: "input",
                        onDrop: (inputId) => onConnectInput(inputId, output.id),
                      }}
                      rightPort={
                        output.definition?.supports_categories && link
                          ? {
                              id: `output:${output.id}:out`,
                              label: `Kéo để nối ${output.name} sang Category`,
                              sourceKind: "output",
                            }
                          : undefined
                      }
                      footer={
                        <div className="space-y-2">
                          <NodeVersionSummary
                            included={Boolean(link)}
                            detail={
                              link
                                ? `Nhận dữ liệu từ ${inputs.find((input) => input.id === link.inputId)?.name ?? "Input đã chọn"} · ${link.categoryIds.length} Category.`
                                : "Chọn Input nguồn hoặc kéo dây vào node này."
                            }
                          />
                          <p className="text-[11px] text-slate-500">
                            {output.required ? "Bắt buộc" : "Không bắt buộc"} ·{" "}
                            {output.definition?.supports_categories
                              ? "Có sử dụng Category"
                              : "Không sử dụng Category"}
                          </p>
                          <label className="grid gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                            Input nguồn
                            <select
                              value={link?.inputId ?? ""}
                              disabled={readOnly}
                              onChange={(event) => {
                                if (event.target.value) {
                                  onConnectInput(event.target.value, output.id);
                                } else {
                                  onDisconnectOutput(output.id);
                                }
                              }}
                              className="h-8 rounded-md border border-slate-300 bg-white px-2 text-xs dark:border-slate-700 dark:bg-slate-950"
                            >
                              <option value="">Chưa kết nối</option>
                              {inputs.map((input) => (
                                <option key={input.id} value={input.id}>
                                  {input.name}
                                </option>
                              ))}
                            </select>
                          </label>
                          {link && !readOnly && (
                            <button
                              type="button"
                              onClick={() => onDisconnectOutput(output.id)}
                              className="flex items-center gap-1 text-[11px] font-medium text-rose-600 hover:underline"
                            >
                              <Unplug className="size-3" aria-hidden="true" />
                              Tháo các kết nối
                            </button>
                          )}
                        </div>
                      }
                      onView={() =>
                        setNodeDetails({
                          kind: "output",
                          node: output,
                          versions: usedVersions,
                        })
                      }
                      onEdit={() => onEditOutput(output)}
                    />
                  );
                })
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <ColumnHeader
              title="Category"
              description="Thả dây Output vào card để gắn nhãn."
              tone="category"
              readOnly={readOnly}
              onAdd={onAddCategory}
            />
            <ColumnSearch
              label="Category"
              value={categorySearch}
              onChange={setCategorySearch}
            />
            <div className={nodeColumnClassName}>
              {visibleCategories.length === 0 ? (
                <EmptyColumn>
                  {categories.length === 0
                    ? "Chưa có Category. Output không dùng nhãn có thể để trống."
                    : "Không tìm thấy Category phù hợp."}
                </EmptyColumn>
              ) : (
                visibleCategories.map((category) => {
                  const linkedOutputs = outputLinks.filter((link) =>
                    link.categoryIds.includes(category.id)
                  );
                  const usedVersions = categoryUsage.get(category.id) ?? [];
                  return (
                    <OntologyNodeCard
                      key={category.id}
                      id={category.id}
                      tone="category"
                      title={category.name}
                      subtitle={category.key}
                      description={category.description}
                      color={category.color}
                      locked={category.locked}
                      readOnly={readOnly}
                      versionBadge={versionBadge(usedVersions)}
                      leftPort={{
                        id: `category:${category.id}:in`,
                        label: `Thả Output vào Category ${category.name}`,
                        acceptedKind: "output",
                        onDrop: (outputId) =>
                          onToggleCategory(outputId, category.id),
                      }}
                      footer={
                        <div className="space-y-2">
                          <NodeVersionSummary
                            included={linkedOutputs.length > 0}
                            detail={
                              linkedOutputs.length > 0
                                ? `${linkedOutputs.length} Output đang dùng Category này.`
                                : "Kéo Output vào card này để gắn nhãn trong Draft."
                            }
                          />
                          <div className="space-y-1.5">
                            {outputs
                              .filter(
                                (output) =>
                                  output.definition?.supports_categories &&
                                  outputLinks.some(
                                    (link) => link.outputId === output.id
                                  )
                              )
                              .map((output) => (
                                <label
                                  key={output.id}
                                  className="flex items-center gap-2 text-[11px] text-slate-600 dark:text-slate-300"
                                >
                                  <input
                                    type="checkbox"
                                    disabled={readOnly}
                                    checked={linkedOutputs.some(
                                      (link) => link.outputId === output.id
                                    )}
                                    onChange={() =>
                                      onToggleCategory(output.id, category.id)
                                    }
                                  />
                                  {output.name}
                                </label>
                              ))}
                          </div>
                        </div>
                      }
                      onView={() =>
                        setNodeDetails({
                          kind: "category",
                          node: category,
                          versions: usedVersions,
                        })
                      }
                      onEdit={() => onEditCategory(category)}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </section>
      <OntologyNodeDetailDialog
        details={nodeDetails}
        onClose={() => setNodeDetails(null)}
      />
    </>
  );
}
