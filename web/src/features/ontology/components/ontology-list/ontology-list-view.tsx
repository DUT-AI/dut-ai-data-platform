"use client";

import { useState } from "react";
import { Boxes, Plus, RefreshCcw } from "lucide-react";
import { Button, Card, CardContent, CardHeader, CardTitle } from "@/components/ui";
import { useCreateOntologyMutation, useProjectOntologiesQuery } from "../../hooks";
import type { OntologyCreatePayload } from "../../types";
import { OntologyEditorView } from "../ontology-editor/ontology-editor-view";
import { CreateOntologyDialog } from "./create-ontology-dialog";
import { OntologyCard } from "./ontology-card";

interface OntologyListViewProps {
  projectId: string;
}

export function OntologyListView({ projectId }: OntologyListViewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const query = useProjectOntologiesQuery(projectId);
  const create = useCreateOntologyMutation(projectId);
  const selected = query.data?.find((ontology) => ontology.id === selectedId);

  if (selected) {
    return (
      <OntologyEditorView
        ontology={selected}
        projectId={projectId}
        onBack={() => setSelectedId(null)}
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
          ) : query.data?.length ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {query.data.map((ontology) => (
                <OntologyCard
                  key={ontology.id}
                  ontology={ontology}
                  onOpen={() => setSelectedId(ontology.id)}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 p-10 text-center dark:border-slate-700">
              <Boxes
                className="mx-auto size-9 text-slate-400"
                aria-hidden="true"
              />
              <h3 className="mt-3 font-semibold">Chưa có Ontology</h3>
              <p className="mt-1 text-sm text-slate-500">
                Tạo Ontology đầu tiên hoặc dùng bản mẫu sau khi mở Draft.
              </p>
              <Button
                type="button"
                size="sm"
                className="mt-4"
                onClick={() => setCreateOpen(true)}
              >
                <Plus className="mr-2 size-4" aria-hidden="true" />
                Tạo Ontology
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
          const ontology = await create.mutateAsync(payload);
          setSelectedId(ontology.id);
        }}
      />
    </section>
  );
}
