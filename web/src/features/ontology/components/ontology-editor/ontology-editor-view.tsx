"use client";

import { useEffect, useState } from "react";
import { Info, Loader2 } from "lucide-react";
import {
  Button,
  ConfirmDialog,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
} from "@/components/ui";
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
type EditorFormKind =
  "create-draft" | "rename-version" | "edit-ontology" | null;
type ConfirmKind =
  | "discard-create"
  | "publish"
  | "delete-draft"
  | "delete-ontology"
  | "delete-input"
  | "delete-output"
  | "delete-category"
  | "discard-back"
  | "discard-version"
  | null;

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
  const [editorForm, setEditorForm] = useState<EditorFormKind>(null);
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [confirmKind, setConfirmKind] = useState<ConfirmKind>(null);
  const [pendingVersionId, setPendingVersionId] = useState<string | null>(null);
  const [pendingInput, setPendingInput] = useState<OntologyInput | null>(null);
  const [pendingOutput, setPendingOutput] = useState<OntologyOutput | null>(
    null
  );
  const [pendingCategory, setPendingCategory] = useState<Category | null>(null);

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

  const openCreateDraftForm = (): void => {
    const nextNumber =
      Math.max(0, ...versions.map((item) => item.version_no)) + 1;
    setFormName(`Draft v${nextNumber}`);
    setFormDescription("");
    setEditorForm("create-draft");
  };

  const handleCreateDraft = async (): Promise<void> => {
    if (graph.dirty) {
      setConfirmKind("discard-create");
      return;
    }
    openCreateDraftForm();
  };

  const createDraft = async (): Promise<void> => {
    const name = formName.trim();
    if (!name) return;
    try {
      const created = await versionMutations.create.mutateAsync({
        name,
        based_on_version_id:
          selectedVersion?.status === "published" ? selectedVersion.id : null,
      });
      setSelectedVersionId(created.id);
      setEditorForm(null);
    } catch (error) {
      showError(error);
    }
  };

  const handleRenameVersion = async (): Promise<void> => {
    if (!selectedVersion) return;
    setFormName(selectedVersion.name);
    setFormDescription("");
    setEditorForm("rename-version");
  };

  const renameVersion = async (): Promise<void> => {
    if (!selectedVersion) return;
    const name = formName.trim();
    if (!name || name === selectedVersion.name) return;
    try {
      await versionMutations.update.mutateAsync(name);
      setMessage("Đã đổi tên Draft.");
      setEditorForm(null);
    } catch (error) {
      showError(error);
    }
  };

  const handleDeleteDraft = async (): Promise<void> => {
    if (!selectedVersion || selectedVersion.status !== "draft") return;
    setConfirmKind("delete-draft");
  };

  const deleteDraft = async (): Promise<void> => {
    if (!selectedVersion || selectedVersion.status !== "draft") return;
    const fallbackVersion = versions.find(
      (version) => version.id !== selectedVersion.id
    );
    try {
      await versionMutations.remove.mutateAsync();
      if (fallbackVersion) setSelectedVersionId(fallbackVersion.id);
      setMessage("Đã xóa Draft.");
      setConfirmKind(null);
    } catch (error) {
      showError(error);
    }
  };

  const handleRenameOntology = async (): Promise<void> => {
    setFormName(ontology.name);
    setFormDescription(ontology.description ?? "");
    setEditorForm("edit-ontology");
  };

  const updateOntologyDetails = async (): Promise<void> => {
    const name = formName.trim();
    if (!name) return;
    try {
      await updateOntology.mutateAsync({
        name,
        description: formDescription.trim() || undefined,
      });
      setMessage("Đã cập nhật thông tin Ontology.");
      setEditorForm(null);
    } catch (error) {
      showError(error);
    }
  };

  const handleDeleteOntology = async (): Promise<void> => {
    setConfirmKind("delete-ontology");
  };

  const deleteCurrentOntology = async (): Promise<void> => {
    try {
      await deleteOntology.mutateAsync();
      setConfirmKind(null);
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
    setPendingInput(input);
    setConfirmKind("delete-input");
    return false;
  };

  const confirmDeleteInput = async (): Promise<void> => {
    if (!pendingInput) return;
    try {
      await inputMutations.remove.mutateAsync(pendingInput.id);
      graph.removeInput(pendingInput.id);
      setPendingInput(null);
      setConfirmKind(null);
      setDialog(null);
    } catch (error) {
      showError(error);
    }
  };

  const deleteOutputNode = async (output: OntologyOutput): Promise<boolean> => {
    setPendingOutput(output);
    setConfirmKind("delete-output");
    return false;
  };

  const confirmDeleteOutput = async (): Promise<void> => {
    if (!pendingOutput) return;
    try {
      await outputMutations.remove.mutateAsync(pendingOutput.id);
      graph.removeOutput(pendingOutput.id);
      setPendingOutput(null);
      setConfirmKind(null);
      setDialog(null);
    } catch (error) {
      showError(error);
    }
  };

  const deleteCategoryNode = async (category: Category): Promise<boolean> => {
    setPendingCategory(category);
    setConfirmKind("delete-category");
    return false;
  };

  const confirmDeleteCategory = async (): Promise<void> => {
    if (!pendingCategory) return;
    try {
      await categoryMutations.remove.mutateAsync(pendingCategory.id);
      graph.removeCategory(pendingCategory.id);
      setPendingCategory(null);
      setConfirmKind(null);
      setDialog(null);
    } catch (error) {
      showError(error);
    }
  };

  const openCreateDialog = (kind: Exclude<DialogKind, null>): void => {
    setEditingInput(null);
    setEditingOutput(null);
    setEditingCategory(null);
    setDialog(kind);
  };

  const handleBack = (): void => {
    if (graph.dirty) {
      setConfirmKind("discard-back");
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

  const confirmBusy =
    versionMutations.remove.isPending ||
    deleteOntology.isPending ||
    inputMutations.remove.isPending ||
    outputMutations.remove.isPending ||
    categoryMutations.remove.isPending;

  const confirmCopy = (() => {
    switch (confirmKind) {
      case "discard-create":
        return {
          title: "Bỏ thay đổi và tạo Draft mới?",
          description:
            "Các kết nối chưa lưu trên canvas hiện tại sẽ bị bỏ. Node catalog chưa bị xoá.",
          label: "Bỏ thay đổi",
          destructive: false,
        };
      case "publish":
        return {
          title: `Publish “${selectedVersion?.name || "Draft hiện tại"}”?`,
          description:
            "Hệ thống sẽ validate, tạo schema hash và khóa version ở chế độ chỉ đọc. Published version không thể chỉnh sửa.",
          label: "Validate và Publish",
          destructive: false,
        };
      case "delete-draft":
        return {
          title: `Xoá Draft “${selectedVersion?.name || "hiện tại"}”?`,
          description:
            "Draft và composition chưa publish sẽ bị xoá. Published version không bị ảnh hưởng.",
          label: "Xoá Draft",
          destructive: true,
        };
      case "delete-ontology":
        return {
          title: `Xoá Ontology “${ontology.name}”?`,
          description:
            "Hành động này có thể ảnh hưởng toàn bộ version và annotation contract đang liên kết.",
          label: "Xoá Ontology",
          destructive: true,
        };
      case "delete-input":
        return {
          title: `Xoá Input “${pendingInput?.name || "đang chọn"}”?`,
          description:
            "Input sẽ bị gỡ khỏi catalog và các kết nối composition liên quan.",
          label: "Xoá Input",
          destructive: true,
        };
      case "delete-output":
        return {
          title: `Xoá Output “${pendingOutput?.name || "đang chọn"}”?`,
          description:
            "Output và các liên kết Category trong composition sẽ bị gỡ.",
          label: "Xoá Output",
          destructive: true,
        };
      case "delete-category":
        return {
          title: `Xoá Category “${pendingCategory?.name || "đang chọn"}”?`,
          description: "Category sẽ bị gỡ khỏi các Output đang sử dụng nó.",
          label: "Xoá Category",
          destructive: true,
        };
      case "discard-back":
        return {
          title: "Rời editor và bỏ thay đổi?",
          description:
            "Các kết nối chưa lưu trên canvas sẽ không được giữ lại.",
          label: "Rời editor",
          destructive: false,
        };
      case "discard-version":
        return {
          title: "Chuyển version và bỏ thay đổi?",
          description: "Các kết nối chưa lưu ở version hiện tại sẽ bị bỏ.",
          label: "Chuyển version",
          destructive: false,
        };
      default:
        return {
          title: "Xác nhận thao tác",
          description: "Kiểm tra tác động trước khi tiếp tục.",
          label: "Xác nhận",
          destructive: false,
        };
    }
  })();

  const handleConfirmAction = async (): Promise<void> => {
    switch (confirmKind) {
      case "discard-create":
        setConfirmKind(null);
        openCreateDraftForm();
        return;
      case "publish":
        await handlePublish();
        setConfirmKind(null);
        return;
      case "delete-draft":
        await deleteDraft();
        return;
      case "delete-ontology":
        await deleteCurrentOntology();
        return;
      case "delete-input":
        await confirmDeleteInput();
        return;
      case "delete-output":
        await confirmDeleteOutput();
        return;
      case "delete-category":
        await confirmDeleteCategory();
        return;
      case "discard-back":
        setConfirmKind(null);
        onBack();
        return;
      case "discard-version":
        if (pendingVersionId) {
          setValidation(null);
          setMessage(null);
          setPreset(null);
          setSelectedVersionId(pendingVersionId);
        }
        setPendingVersionId(null);
        setConfirmKind(null);
        return;
      default:
        return;
    }
  };

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
          if (graph.dirty) {
            setPendingVersionId(versionId);
            setConfirmKind("discard-version");
            return;
          }
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
        onPublish={() => setConfirmKind("publish")}
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

      <Dialog
        open={Boolean(editorForm)}
        onOpenChange={(open) => !open && setEditorForm(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editorForm === "create-draft"
                ? "Tạo Ontology Draft"
                : editorForm === "rename-version"
                  ? "Đổi tên Draft"
                  : "Chỉnh sửa Ontology"}
            </DialogTitle>
            <DialogDescription>
              {editorForm === "create-draft"
                ? "Draft mới có thể bắt đầu từ Published version đang chọn và vẫn chỉnh sửa được."
                : editorForm === "rename-version"
                  ? "Tên giúp phân biệt mục đích của Draft; không thay đổi schema contract."
                  : "Cập nhật tên và mô tả của Ontology project."}
            </DialogDescription>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (editorForm === "create-draft") void createDraft();
              if (editorForm === "rename-version") void renameVersion();
              if (editorForm === "edit-ontology") void updateOntologyDetails();
            }}
          >
            <div>
              <label
                htmlFor="ontology-form-name"
                className="text-sm font-medium"
              >
                Tên
              </label>
              <Input
                id="ontology-form-name"
                className="mt-1.5"
                value={formName}
                onChange={(event) => setFormName(event.target.value)}
                autoFocus
                required
              />
            </div>
            {editorForm === "edit-ontology" && (
              <div>
                <label
                  htmlFor="ontology-form-description"
                  className="text-sm font-medium"
                >
                  Mô tả
                </label>
                <textarea
                  id="ontology-form-description"
                  rows={4}
                  value={formDescription}
                  onChange={(event) => setFormDescription(event.target.value)}
                  className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-blue-500"
                />
              </div>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditorForm(null)}
              >
                Huỷ
              </Button>
              <Button
                type="submit"
                isLoading={
                  versionMutations.create.isPending ||
                  versionMutations.update.isPending ||
                  updateOntology.isPending
                }
              >
                Lưu
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(confirmKind)}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.label}
        destructive={confirmCopy.destructive}
        isLoading={confirmBusy}
        onClose={() => {
          setConfirmKind(null);
          setPendingVersionId(null);
          setPendingInput(null);
          setPendingOutput(null);
          setPendingCategory(null);
        }}
        onConfirm={handleConfirmAction}
      />
    </section>
  );
}
