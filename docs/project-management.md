# Project Management Domain

Project là workspace boundary cao nhất. Module này sở hữu vòng đời Project, AI Task Catalog,
Project Template/version, provider compatibility và workspace configuration. Module không sở
hữu User, Project Member, Ontology, Dataset hay credential của provider.

## Domain model và quy tắc

- `Project` reference cố định tới `TaskDefinitionVersion` và tùy chọn `ProjectTemplateVersion`.
- Project chỉ được archive/restore, không hard-delete; hai thao tác là idempotent.
- Project archived không được sửa thông tin hoặc configuration.
- Task/Template version published là immutable và Project cũ không tự nâng version.
- `settings` có `settings_schema_version` và từ chối key chứa password/secret/token/api_key.
- Provider compatibility lưu `provider_key`; integration credentials thuộc provider layer.

## Database

Module sở hữu `projects`, `project_configurations`, `task_definitions`,
`task_definition_versions`, `project_templates`, `project_template_versions` và
`template_provider_compatibilities`. Migration: `007_project_catalog_and_lifecycle`.

Seed idempotent: `python -m apps.cli.seed_project_catalog`, gồm sáu task MVP và blank template.

## API

- Project: `/api/v1/projects`, `/{id}`, `/{id}/archive`, `/{id}/restore`, `/{id}/configuration`.
- Catalog: `/api/v1/task-categories`, `/task-definitions`, `/task-definitions/{key}/templates`.
- Template: `/api/v1/project-templates/{id}` và `/api/v1/admin/project-*`.

## Integration contracts

Các event: `ProjectCreated`, `ProjectUpdated`, `ProjectArchived`, `ProjectRestored`,
`ProjectConfigurationUpdated`, `ProjectTemplatePublished`, `TaskDefinitionVersionPublished`.
`ProjectCreated.created_by` là contract
để module Project Member thêm creator làm Owner. Audit/Outbox consumer chưa thuộc module này;
publisher in-memory hiện là port thay thế được khi platform thống nhất message broker/outbox.

`ontology_template_ref` chỉ là nullable reference. Việc kiểm tra reference thật sẽ đi qua port của
Ontology khi API đó tồn tại. Project core không chứa Label Studio XML hoặc gọi provider API.

Các endpoint quản trị catalog hiện yêu cầu user đã authenticate. Repository chưa có global-admin
role/capability nên policy `platform_admin` cần được nối vào dependency Auth khi module Auth cung cấp.
