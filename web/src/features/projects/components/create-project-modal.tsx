"use client";

import { useMemo, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/components/ui";
import {
  useCreateProjectMutation,
  useTaskDefinitionsQuery,
} from "../hooks/use-projects";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateProjectModal({ open, onOpenChange }: Props) {
  const { data: tasks = [], isLoading } = useTaskDefinitionsQuery();
  const createMutation = useCreateProjectMutation();
  const [category, setCategory] = useState("");
  const [taskId, setTaskId] = useState("");
  const [templateVersionId, setTemplateVersionId] = useState("");
  const [provider, setProvider] = useState("label_studio");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const categories = useMemo(
    () => [...new Set(tasks.map((task) => task.category))],
    [tasks]
  );
  const visibleTasks = category
    ? tasks.filter((task) => task.category === category)
    : tasks;
  const task = tasks.find((item) => item.id === taskId);
  const taskVersion = task?.versions[0];
  const templates = task?.templates ?? [];
  const templateVersion = templates
    .flatMap((item) => item.versions)
    .find((item) => item.id === templateVersionId);
  const providers = templateVersion?.providers ?? [
    "label_studio",
    "cvat",
    "doccano",
  ];

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!name.trim() || !taskVersion) {
      setError("Vui lòng chọn bài toán và nhập tên Project.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        task_definition_version_id: taskVersion.id,
        project_template_version_id: templateVersionId || undefined,
        annotation_provider_key: provider,
        storage_provider_key: "minio",
      });
      setName("");
      setDescription("");
      onOpenChange(false);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Không thể tạo Project."
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        onClose={() => onOpenChange(false)}
        className="sm:max-w-2xl"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Create AI Project
          </DialogTitle>
          <DialogDescription>
            Chọn Task, Template và provider tương thích trước khi tạo workspace.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-rose-50 p-3 text-sm text-rose-700">
              {error}
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-xs font-semibold">
              1. Category
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setTaskId("");
                }}
                className="w-full rounded-md border p-2 text-sm"
              >
                <option value="">Tất cả</option>
                {categories.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">
              2. Task Definition
              <select
                value={taskId}
                onChange={(e) => {
                  setTaskId(e.target.value);
                  setTemplateVersionId("");
                }}
                className="w-full rounded-md border p-2 text-sm"
                disabled={isLoading}
              >
                <option value="">Chọn bài toán</option>
                {visibleTasks.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">
              3. Project Template
              <select
                value={templateVersionId}
                onChange={(e) => setTemplateVersionId(e.target.value)}
                className="w-full rounded-md border p-2 text-sm"
                disabled={!task}
              >
                <option value="">Blank project</option>
                {templates.flatMap((item) =>
                  item.versions.map((version) => (
                    <option key={version.id} value={version.id}>
                      {item.name} · {version.version}
                    </option>
                  ))
                )}
              </select>
            </label>
            <label className="space-y-1 text-xs font-semibold">
              4. Annotation Provider
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="w-full rounded-md border p-2 text-sm"
              >
                {providers.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
          </div>
          <label className="block space-y-1 text-xs font-semibold">
            5. Project name
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={255}
              required
            />
          </label>
          <label className="block space-y-1 text-xs font-semibold">
            Description
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={3}
              className="w-full rounded-md border p-2 text-sm"
            />
          </label>
          <div className="rounded-md bg-slate-50 p-3 text-xs text-slate-600">
            6. Review: {task?.name ?? "Chưa chọn task"} ·{" "}
            {templateVersionId ? "Template selected" : "Blank"} · {provider} ·
            MinIO
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={
                createMutation.isPending || !taskVersion || !name.trim()
              }
            >
              {createMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Tạo Project
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
