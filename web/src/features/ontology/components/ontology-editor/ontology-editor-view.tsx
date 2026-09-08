"use client";

import { useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import type { OntologyPreset } from "../../helpers/ontology-presets";
import { getOntologyApiError } from "../../helpers/ontology-error";
import {
  useApplyOntologyPresetMutation,
  useCategoryMutations,
  useDeleteOntologyMutation,
  useInputMutations,
  useOntologyWorkspace,
  useOutputMutations,
  useUpdateOntologyMutation,
  useVersionGraph,
  useVersionMutations,
} from "../../hooks";
import type {
  Category,
  ExportedOntologySchema,
  InputDefinition,
  InputNodeForm,
  Ontology,
  OntologyInput,
  OntologyOutput,
  OutputDefinition,
  OutputNodeForm,
  ValidationResult,
} from "../../types";
import {
  CategoryNodeDialog,
  InputNodeDialog,
  OutputNodeDialog,
} from "../ontology-node-dialogs";
import { OntologyPresetPicker } from "../ontology-preset-picker";
import { OntologyCanvas } from "./ontology-canvas";
import { OntologyEditorHeader } from "./ontology-editor-header";
import { PresetReviewPanel } from "./preset-review-panel";
import { SchemaExportDialog } from "./schema-export-dialog";
import { ValidationResultPanel } from "./validation-result-panel";

interface OntologyEditorViewProps {
  ontology: Ontology;
  projectId: string;
  onBack: () => void;
}

type DialogKind = "input" | "output" | "category" | null;

const selectInitialVersion = (ontology: Ontology): string =>
  ontology.versions.find((version) => version.status === "draft")?.id ??
  ontology.current_version_id ??
  ontology.versions[0]?.id ??
  "";

export function OntologyEditorView({
  ontology: initialOntology,
  projectId,
  onBack,
}: OntologyEditorViewProps) {
  const [selectedVersionId, setSelectedVersionId] = useState(() =>
    selectInitialVersion(initialOntology)
  );
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [editingInput, setEditingInput] = useState<OntologyInput | null>(null);
  const [editingOutput, setEditingOutput] = useState<OntologyOutput | null>(
    null
  );
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [preset, setPreset] = useState<OntologyPreset | null>(null);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [exportedSchema, setExportedSchema] =
    useState<ExportedOntologySchema | null>(null);
  const [schemaOpen, setSchemaOpen] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const workspace = useOntologyWorkspace(
    projectId,
    initialOntology.id,
    selectedVersionId
  );
  const ontology = workspace.ontology.data ?? initialOntology;
  const versions = workspace.versions.data ?? ontology.versions;
  const selectedVersion =
    workspace.version.data ??
    versions.find((version) => version.id === selectedVersionId);
  const graph = useVersionGraph(selectedVersion);
  const inputMutations = useInputMutations(projectId, ontology.id);
  const outputMutations = useOutputMutations(projectId, ontology.id);
  const categoryMutations = useCategoryMutations(projectId, ontology.id);
  const versionMutations = useVersionMutations(
    projectId,
    ontology.id,
    selectedVersionId
  );
  const updateOntology = useUpdateOntologyMutation(projectId, ontology.id);
  const deleteOntology = useDeleteOntologyMutation(projectId, ontology.id);
  const applyPreset = useApplyOntologyPresetMutation(
    projectId,
    ontology.id,
    selectedVersionId
  );

  const inputs = workspace.inputs.data ?? [];
  const outputs = workspace.outputs.data ?? [];
  const categories = workspace.categories.data ?? [];
  const inputDefinitions = workspace.inputDefinitions.data ?? [];
  const outputDefinitions = workspace.outputDefinitions.data ?? [];
  const readOnly = selectedVersion?.status !== "draft";

  const busy =
    versionMutations.compose.isPending ||
    versionMutations.validate.isPending ||
    versionMutations.publish.isPending ||
    versionMutations.exportSchema.isPending ||
    versionMutations.create.isPending ||
    applyPreset.isPending;

  useEffect(() => {
    const warnBeforeUnload = (event: BeforeUnloadEvent): void => {
      if (!graph.dirty) return;
      event.preventDefault();
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [graph.dirty]);

  const showError = (error: unknown): void => {
    setMessage(getOntologyApiError(error));
  };

  const saveGraph = async (): Promise<void> => {
    await versionMutations.compose.mutateAsync(graph.payload);
    setMessage("Đã lưu các kết nối của Draft.");
  };

  const validateVersion = async (): Promise<ValidationResult> => {
    if (graph.dirty) {
      await versionMutations.compose.mutateAsync(graph.payload);
    }
    const result = await versionMutations.validate.mutateAsync();
    setValidation(result);
    return result;
  };

  const handlePublish = async (): Promise<void> => {
    try {
      const result = await validateVersion();
      if (!result.valid) return;
      await versionMutations.publish.mutateAsync();
      setMessage("Version đã được Publish và chuyển sang chế độ chỉ đọc.");
    } catch (error) {
      showError(error);
    }
  };

  const handleExport = async (): Promise<void> => {
    try {
      setSchemaOpen(true);
      setExportedSchema(await versionMutations.exportSchema.mutateAsync());
    } catch (error) {
      setSchemaOpen(false);
      showError(error);
    }
  };

  const handleCreateDraft = async (): Promise<void> => {
    if (
      graph.dirty &&
      !window.confirm("Bỏ các thay đổi kết nối chưa lưu và tạo Draft mới?")
    ) {
      return;
    }
    const nextNumber =
      Math.max(0, ...versions.map((item) => item.version_no)) + 1;
    const name = window.prompt("Tên Draft mới", `Draft v${nextNumber}`)?.trim();
    if (!name) return;
    try {
      const created = await versionMutations.create.mutateAsync({
        name,
        based_on_version_id:
          selectedVersion?.status === "published" ? selectedVersion.id : null,
      });
      setSelectedVersionId(created.id);
    } catch (error) {
      showError(error);
    }
  };

  const handleRenameVersion = async (): Promise<void> => {
    if (!selectedVersion) return;
    const name = window.prompt("Tên Draft", selectedVersion.name)?.trim();
    if (!name || name === selectedVersion.name) return;
    try {
      await versionMutations.update.mutateAsync(name);
      setMessage("Đã đổi tên Draft.");
    } catch (error) {
      showError(error);
    }
  };

  const handleDeleteDraft = async (): Promise<void> => {
    if (!selectedVersion || selectedVersion.status !== "draft") return;
    if (!window.confirm(`Xóa Draft “${selectedVersion.name}”?`)) return;
    const fallbackVersion = versions.find(
      (version) => version.id !== selectedVersion.id
    );
    try {
      await versionMutations.remove.mutateAsync();
      if (fallbackVersion) setSelectedVersionId(fallbackVersion.id);
      setMessage("Đã xóa Draft.");
    } catch (error) {
      showError(error);
    }
  };

  const handleRenameOntology = async (): Promise<void> => {
    const name = window.prompt("Tên Ontology", ontology.name)?.trim();
    if (!name || name === ontology.name) return;
    const description = window.prompt(
      "Mô tả Ontology",
      ontology.description ?? ""
    );
    if (description === null) return;
    try {
      await updateOntology.mutateAsync({
        name,
        description: description.trim() || undefined,
      });
      setMessage("Đã cập nhật thông tin Ontology.");
    } catch (error) {
      showError(error);
    }
  };

  const handleDeleteOntology = async (): Promise<void> => {
    if (!window.confirm(`Xóa Ontology “${ontology.name}”?`)) return;
    try {
      await deleteOntology.mutateAsync();
      onBack();
    } catch (error) {
      showError(error);
    }
  };

  const handleApplyPreset = async (
    reviewedPreset: OntologyPreset
  ): Promise<void> => {
    const inputDefinition = inputDefinitions.find(
      (definition) => definition.code === reviewedPreset.input.definitionCode
    );
    const outputDefinition = outputDefinitions.find(
      (definition) => definition.code === reviewedPreset.output.definitionCode
    );
    if (!inputDefinition || !outputDefinition) {
      setMessage("Catalog chưa có loại Input hoặc Output mà bản mẫu yêu cầu.");
      return;
    }
    try {
      const appliedVersion = await applyPreset.mutateAsync({
        preset: reviewedPreset,
        inputDefinition,
        outputDefinition,
      });
      graph.replaceGraph({
        inputIds: appliedVersion.inputs.map((item) => item.ontology_input_id),
        outputLinks: appliedVersion.outputs.map((item) => ({
          outputId: item.ontology_output_id,
          inputId: item.ontology_input_id,
          categoryIds: item.categories.map((category) => category.category_id),
        })),
      });
      setPreset(null);
      setMessage(
        "Đã tạo node và kết nối theo bản mẫu. Bạn vẫn có thể chỉnh lại Draft."
      );
    } catch (error) {
      showError(error);
    }
  };

  const deleteInputNode = async (input: OntologyInput): Promise<boolean> => {
    if (!window.confirm(`Xóa Input “${input.name}”?`)) return false;
    try {
      await inputMutations.remove.mutateAsync(input.id);
      graph.removeInput(input.id);
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  };

  const deleteOutputNode = async (output: OntologyOutput): Promise<boolean> => {
    if (!window.confirm(`Xóa Output “${output.name}”?`)) return false;
    try {
      await outputMutations.remove.mutateAsync(output.id);
      graph.removeOutput(output.id);
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  };

  const deleteCategoryNode = async (category: Category): Promise<boolean> => {
    if (!window.confirm(`Xóa Category “${category.name}”?`)) return false;
    try {
      await categoryMutations.remove.mutateAsync(category.id);
      graph.removeCategory(category.id);
      return true;
    } catch (error) {
      showError(error);
      return false;
    }
  };

  const openCreateDialog = (kind: Exclude<DialogKind, null>): void => {
    setEditingInput(null);
    setEditingOutput(null);
    setEditingCategory(null);
    setDialog(kind);
  };

  const handleBack = (): void => {
    if (
      graph.dirty &&
      !window.confirm("Bỏ các thay đổi kết nối chưa lưu và quay lại?")
    ) {
      return;
    }
    onBack();
  };

  const isLoading =
    workspace.ontology.isLoading ||
    workspace.version.isLoading ||
    workspace.inputs.isLoading ||
    workspace.outputs.isLoading ||
    workspace.categories.isLoading;

  return (
    <section className="space-y-4" aria-label={`Ontology ${ontology.name}`}>
      <OntologyEditorHeader
        name={ontology.name}
        description={ontology.description}
        versions={versions}
        selectedVersionId={selectedVersionId}
        status={selectedVersion?.status ?? "draft"}
        hasChanges={graph.dirty}
        busy={busy}
        onBack={handleBack}
        onSelectVersion={(versionId) => {
          if (
            graph.dirty &&
            !window.confirm("Bỏ các thay đổi kết nối chưa lưu?")
          )
            return;
          setValidation(null);
          setMessage(null);
          setPreset(null);
          setSelectedVersionId(versionId);
        }}
        onCreateDraft={handleCreateDraft}
        onRenameVersion={handleRenameVersion}
        onDeleteDraft={handleDeleteDraft}
        canDeleteDraft={versions.length > 1}
        onRenameOntology={handleRenameOntology}
        onDeleteOntology={handleDeleteOntology}
        onSave={() => saveGraph().catch(showError)}
        onValidate={() => validateVersion().catch(showError)}
        onPublish={handlePublish}
        onExport={handleExport}
      />

      {!readOnly && (
        <OntologyPresetPicker
          disabled={busy || !selectedVersionId}
          disabledReason="Chờ thao tác hiện tại hoàn tất rồi thử lại."
          onApply={setPreset}
        />
      )}
      {preset && !readOnly && (
        <PresetReviewPanel
          key={preset.id}
          preset={preset}
          pending={applyPreset.isPending}
          onCancel={() => setPreset(null)}
          onApply={handleApplyPreset}
        />
      )}
      {validation && (
        <ValidationResultPanel
          result={validation}
          onClose={() => setValidation(null)}
        />
      )}
      {message && (
        <div
          className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900"
          aria-live="polite"
        >
          <Info
            className="mt-0.5 size-4 shrink-0 text-blue-600"
            aria-hidden="true"
          />
          <span className="flex-1">{message}</span>
          <button
            type="button"
            onClick={() => setMessage(null)}
            className="text-xs font-semibold text-slate-500 hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      <div className="relative min-h-[540px]">
        {isLoading && (
          <div className="absolute inset-0 z-30 flex items-center justify-center rounded-2xl bg-white/80 text-sm text-slate-500 backdrop-blur-sm dark:bg-slate-950/80">
            <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
            Đang tải Ontology…
          </div>
        )}
        <OntologyCanvas
          inputs={inputs}
          outputs={outputs}
          categories={categories}
          inputIds={graph.inputIds}
          outputLinks={graph.outputLinks}
          versions={versions}
          selectedVersionId={selectedVersionId}
          readOnly={readOnly}
          onAddInput={() => openCreateDialog("input")}
          onAddOutput={() => openCreateDialog("output")}
          onAddCategory={() => openCreateDialog("category")}
          onEditInput={(input) => {
            setEditingInput(input);
            setDialog("input");
          }}
          onEditOutput={(output) => {
            setEditingOutput(output);
            setDialog("output");
          }}
          onEditCategory={(category) => {
            setEditingCategory(category);
            setDialog("category");
          }}
          onConnectInput={graph.connectInputToOutput}
          onToggleCategory={graph.toggleOutputCategory}
          onDisconnectOutput={graph.disconnectOutput}
        />
      </div>

      {dialog === "input" && (
        <InputNodeDialog
          open
          onClose={() => setDialog(null)}
          definitions={inputDefinitions}
          initial={editingInput}
          pending={
            inputMutations.create.isPending ||
            inputMutations.update.isPending ||
            inputMutations.remove.isPending
          }
          onDelete={
            editingInput ? () => deleteInputNode(editingInput) : undefined
          }
          onSubmit={async (
            form: InputNodeForm,
            definition: InputDefinition
          ) => {
            if (editingInput) {
              await inputMutations.update.mutateAsync({
                id: editingInput.id,
                form,
                definition,
              });
            } else {
              const created = await inputMutations.create.mutateAsync({
                form,
                definition,
              });
              graph.addInput(created.id);
            }
          }}
        />
      )}
      {dialog === "output" && (
        <OutputNodeDialog
          open
          onClose={() => setDialog(null)}
          definitions={outputDefinitions}
          initial={editingOutput}
          pending={
            outputMutations.create.isPending ||
            outputMutations.update.isPending ||
            outputMutations.remove.isPending
          }
          onDelete={
            editingOutput ? () => deleteOutputNode(editingOutput) : undefined
          }
          onSubmit={async (
            form: OutputNodeForm,
            definition: OutputDefinition
          ) => {
            if (editingOutput) {
              await outputMutations.update.mutateAsync({
                id: editingOutput.id,
                form,
                definition,
              });
            } else {
              await outputMutations.create.mutateAsync({ form, definition });
            }
          }}
        />
      )}
      {dialog === "category" && (
        <CategoryNodeDialog
          open
          onClose={() => setDialog(null)}
          initial={editingCategory}
          pending={
            categoryMutations.create.isPending ||
            categoryMutations.update.isPending ||
            categoryMutations.remove.isPending
          }
          onDelete={
            editingCategory
              ? () => deleteCategoryNode(editingCategory)
              : undefined
          }
          onSubmit={async (form) => {
            if (editingCategory) {
              await categoryMutations.update.mutateAsync({
                id: editingCategory.id,
                form,
              });
            } else {
              await categoryMutations.create.mutateAsync(form);
            }
          }}
        />
      )}
      <SchemaExportDialog
        schema={exportedSchema}
        open={schemaOpen}
        onClose={() => {
          setSchemaOpen(false);
          setExportedSchema(null);
        }}
      />
    </section>
  );
}
