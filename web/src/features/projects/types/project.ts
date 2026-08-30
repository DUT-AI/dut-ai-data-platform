export type ProjectStatus = "active" | "archived";
export type ProjectMemberRole = "owner" | "admin" | "annotator" | "reviewer";

export interface TaskDefinitionVersion {
  id: string;
  task_definition_id: string;
  version: string;
  input_schema: Record<string, unknown>;
  capability_schema: Record<string, unknown>;
  status: string;
}
export interface ProjectTemplateVersion {
  id: string;
  project_template_id: string;
  version: string;
  default_project_configuration: Record<string, unknown>;
  status: string;
  providers: string[];
}
export interface ProjectTemplate {
  id: string;
  key: string;
  name: string;
  description: string | null;
  task_definition_id: string;
  versions: ProjectTemplateVersion[];
}
export interface TaskDefinition {
  id: string;
  key: string;
  name: string;
  description: string | null;
  category: string;
  modality: string;
  versions: TaskDefinitionVersion[];
  templates: ProjectTemplate[];
}

export interface Project {
  id: string;
  name: string;
  description: string | null;
  task_definition_version_id: string | null;
  project_template_version_id: string | null;
  created_by: string;
  status: ProjectStatus;
  created_at: string | null;
  updated_at: string | null;
  archived_at: string | null;
  /** Legacy fields kept while the old member/project UI is being split out. */
  project_type?: string;
  owner_id?: string;
}

export interface ProjectCreatePayload {
  name: string;
  description?: string;
  task_definition_version_id: string;
  project_template_version_id?: string;
  annotation_provider_key: string;
  storage_provider_key: string;
}
export interface ProjectUpdatePayload {
  name?: string;
  description?: string;
}
export interface ProjectMember {
  id: string;
  project_id: string;
  user_id: string;
  role: ProjectMemberRole;
  status: string;
  joined_at: string | null;
}
export interface ProjectMemberAddPayload {
  user_id: string;
  role: Exclude<ProjectMemberRole, "owner">;
}
export interface ProjectConfig {
  project_id: string;
  annotation_provider_key: string;
  storage_provider_key: string;
  default_workflow_ref: string | null;
  settings: Record<string, unknown>;
  settings_schema_version: string;
}

export const PROJECT_TYPE_OPTIONS = [
  {
    value: "detection",
    label: "Object Detection",
    description: "Bounding box",
    badgeColor: "border-amber-200 bg-amber-50 text-amber-700",
  },
  {
    value: "ocr",
    label: "OCR",
    description: "Region and text",
    badgeColor: "border-blue-200 bg-blue-50 text-blue-700",
  },
  {
    value: "nlp",
    label: "NLP",
    description: "Text processing",
    badgeColor: "border-purple-200 bg-purple-50 text-purple-700",
  },
  {
    value: "classification",
    label: "Classification",
    description: "Single or multiple choice",
    badgeColor: "border-emerald-200 bg-emerald-50 text-emerald-700",
  },
  {
    value: "segmentation",
    label: "Segmentation",
    description: "Polygon or mask",
    badgeColor: "border-rose-200 bg-rose-50 text-rose-700",
  },
] as const;
