"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  Database,
  Goal,
  Layers3,
  UserRound,
} from "lucide-react";
import { Badge, Button, ConfirmDialog, Notice } from "@/components/ui";
import { useProjectDatasetsQuery } from "@/features/dataset/hooks";
import { useProjectOntologiesQuery } from "@/features/ontology/hooks/use-ontologies";
import { useArchiveProjectMutation } from "../hooks";
import type { Project } from "../types";

function formatDate(value?: string | null): string {
  if (!value) return "Chưa ghi nhận";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function ProjectOverviewTab({ project }: { project: Project }) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const archiveMutation = useArchiveProjectMutation(project.id);
  const datasetsQuery = useProjectDatasetsQuery(project.id);
  const ontologiesQuery = useProjectOntologiesQuery(project.id);

  const datasets = datasetsQuery.data ?? [];
  const ontologies = ontologiesQuery.data ?? [];
  const contractLoading = datasetsQuery.isLoading || ontologiesQuery.isLoading;

  return (
    <div className="space-y-6">
      <section className="data-panel overflow-hidden">
        <div className="grid lg:grid-cols-[1.35fr_.65fr]">
          <div className="p-5 sm:p-6">
            <p className="text-xs font-bold text-blue-700">Bài toán AI</p>
            <h2 className="mt-2 text-lg font-bold text-slate-950">
              {project.name}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {project.description ||
                "Project chưa mô tả bài toán AI. Hãy bổ sung mô tả để thành viên hiểu dữ liệu cần thu thập và gán nhãn."}
            </p>
          </div>
          <div className="border-t border-slate-200 bg-slate-50 p-5 sm:p-6 lg:border-l lg:border-t-0">
            <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Goal className="h-4 w-4 text-blue-700" aria-hidden="true" />
              Mục tiêu vận hành
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Duy trì dữ liệu, ontology và annotation revision có phiên bản để
              mọi kết quả đều truy vết được về đúng contract.
            </p>
            <Badge
              variant={project.status === "active" ? "success" : "neutral"}
              className="mt-3"
            >
              {project.status === "active" ? "Đang vận hành" : "Đã lưu trữ"}
            </Badge>
          </div>
        </div>
      </section>

      <section aria-labelledby="contract-title">
        <div className="mb-3">
          <h2 id="contract-title" className="text-sm font-bold text-slate-950">
            Dữ liệu và contract hiện có
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Số liệu đọc trực tiếp từ API project, dataset và ontology.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Summary
            label="Dataset"
            value={contractLoading ? "…" : String(datasets.length)}
            detail="Tập dữ liệu trong project"
            icon={Database}
          />
          <Summary
            label="Ontology"
            value={contractLoading ? "…" : String(ontologies.length)}
            detail="Schema contract của project"
            icon={Layers3}
          />
          <Summary
            label="Chủ sở hữu"
            value={`User ${project.created_by}`}
            detail="Danh tính từ project record"
            icon={UserRound}
          />
          <Summary
            label="Cập nhật"
            value={formatDate(project.updated_at || project.created_at)}
            detail="Mốc thay đổi project gần nhất"
            icon={CalendarDays}
          />
        </div>
      </section>

      {(datasetsQuery.isError || ontologiesQuery.isError) && (
        <Notice tone="warning" title="Một phần contract chưa tải được">
          Bạn vẫn có thể mở từng tab để thử lại. Không có số liệu giả được dùng
          thay cho phản hồi API.
        </Notice>
      )}

      <section className="grid gap-4 md:grid-cols-2">
        <div className="data-panel p-5">
          <Database className="h-5 w-5 text-blue-700" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-bold text-slate-950">
            Dataset versions và assets
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Mở trình duyệt dữ liệu để quản lý version, nguồn gốc, upload và
            chuyển asset sang workspace gán nhãn.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href={`/projects/${project.id}?tab=datasets`}>
              Mở tập dữ liệu
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
        <div className="data-panel p-5">
          <Layers3 className="h-5 w-5 text-blue-700" aria-hidden="true" />
          <h2 className="mt-3 text-sm font-bold text-slate-950">
            Ontology contract
          </h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            Chọn version, kiểm tra Input → Output → Categories, validate và
            publish contract dùng cho annotation.
          </p>
          <Button asChild variant="outline" size="sm" className="mt-4">
            <Link href={`/projects/${project.id}?tab=ontology`}>
              Mở ontology
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </section>

      {project.status === "active" && (
        <section className="rounded-xl border border-rose-200 bg-rose-50 p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-bold text-rose-800">
                Lưu trữ project
              </h2>
              <p className="mt-1 text-xs leading-5 text-rose-700">
                Project rời khỏi luồng làm việc chính. Dữ liệu không bị xoá và
                có thể được khôi phục bằng API hiện có.
              </p>
            </div>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setArchiveOpen(true)}
            >
              Lưu trữ project
            </Button>
          </div>
        </section>
      )}

      <ConfirmDialog
        open={archiveOpen}
        title={`Lưu trữ “${project.name}”?`}
        description="Project sẽ chuyển sang trạng thái lưu trữ và rời khỏi luồng làm việc chính. Dữ liệu hiện có không bị xoá."
        confirmLabel="Lưu trữ project"
        destructive
        isLoading={archiveMutation.isPending}
        onClose={() => setArchiveOpen(false)}
        onConfirm={async () => {
          await archiveMutation.mutateAsync();
          setArchiveOpen(false);
        }}
      />
    </div>
  );
}

function Summary({
  label,
  value,
  detail,
  icon: Icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: typeof Database;
}) {
  return (
    <article className="data-panel p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-500">{label}</p>
        <Icon className="h-4 w-4 text-blue-700" aria-hidden="true" />
      </div>
      <p className="mt-2 break-words text-lg font-bold text-slate-950">
        {value}
      </p>
      <p className="mt-1 text-[11px] text-slate-500">{detail}</p>
    </article>
  );
}
