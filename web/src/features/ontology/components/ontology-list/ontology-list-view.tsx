"use client";

import { useState } from "react";
import { Boxes, Plus, RefreshCcw } from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import {
  useCreateOntologyMutation,
  useProjectOntologyQuery,
} from "../../hooks";
import type { OntologyCreatePayload } from "../../types";
import { OntologyEditorView } from "../ontology-editor/ontology-editor-view";
import { CreateOntologyDialog } from "./create-ontology-dialog";

interface OntologyListViewProps {
  projectId: string;
}

export function OntologyListView({ projectId }: OntologyListViewProps) {
  const [createOpen, setCreateOpen] = useState(false);
  const query = useProjectOntologyQuery(projectId);
  const create = useCreateOntologyMutation(projectId);

  if (query.data) {
    return (
      <OntologyEditorView
        ontology={query.data}
        projectId={projectId}
        onBack={() => {}}
      />
    );
  }

  return (
    <section className="space-y-5" aria-labelledby="ontology-list-title">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-4">
          <div>
            <CardTitle id="ontology-list-title">Ontology</CardTitle>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
              Định nghĩa cấu trúc Input, Output và Category để Dataset,
              Annotation và bước đánh giá cùng hiểu một kiểu dữ liệu.
            </p>
          </div>
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 size-4" aria-hidden="true" />
            Tạo Ontology
          </Button>
        </CardHeader>
        <CardContent>
          {query.isLoading ? (
            <div
              className="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              aria-label="Đang tải Ontology"
            >
              {[0, 1, 2].map((item) => (
                <div
                  key={item}
                  className="h-48 animate-pulse rounded-2xl bg-slate-100 dark:bg-slate-800"
                />
              ))}
            </div>
          ) : query.isError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 text-center dark:border-rose-900 dark:bg-rose-950/30">
              <p className="text-sm text-rose-700 dark:text-rose-200">
                Không tải được danh sách Ontology.
              </p>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => query.refetch()}
              >
                <RefreshCcw className="mr-2 size-4" aria-hidden="true" />
                Thử lại
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
              <Boxes
                className="mx-auto size-9 text-slate-400"
                aria-hidden="true"
              />
              <h3 className="mt-3 font-semibold">Chưa có Schema Ontology</h3>
              <p className="mt-1 text-sm text-slate-500">
                Khởi tạo bộ nhãn và schema cho dự án để bắt đầu cấu hình.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-2 size-4" aria-hidden="true" />
                Khởi tạo Schema
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <CreateOntologyDialog
        open={createOpen}
        pending={create.isPending}
        onClose={() => setCreateOpen(false)}
        onSubmit={async (payload: OntologyCreatePayload) => {
          await create.mutateAsync(payload);
          await query.refetch();
          setCreateOpen(false);
        }}
      />
    </section>
  );
}
