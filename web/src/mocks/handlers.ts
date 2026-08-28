import { http, HttpResponse, delay } from "msw";
import type {
  Project,
  ProjectMember,
  ProjectConfig,
} from "@/features/projects/types/project";

const BASE = "http://localhost:8000/api/v1";

// ─── Test Accounts ───────────────────────────────────────────────────────────
// Token đơn giản dạng "mock-token-<userId>" để getMe tra ngược lại user
const TEST_USERS = [
  {
    email: "owner@dutai.dev",
    password: "dutai123",
    userId: "101",
    user: {
      id: 101,
      name: "Nguyễn Văn An (Owner)",
      email: "owner@dutai.dev",
      status: "ACTIVE",
      avatar_url: null,
      role_names: ["USER"],
    },
  },
  {
    email: "admin@dutai.dev",
    password: "dutai123",
    userId: "102",
    user: {
      id: 102,
      name: "Trần Thị Bình (Admin)",
      email: "admin@dutai.dev",
      status: "ACTIVE",
      avatar_url: null,
      role_names: ["USER"],
    },
  },
  {
    email: "annotator@dutai.dev",
    password: "dutai123",
    userId: "103",
    user: {
      id: 103,
      name: "Lê Văn Cường (Annotator)",
      email: "annotator@dutai.dev",
      status: "ACTIVE",
      avatar_url: null,
      role_names: ["USER"],
    },
  },
  {
    email: "reviewer@dutai.dev",
    password: "dutai123",
    userId: "104",
    user: {
      id: 104,
      name: "Phạm Thị Dung (Reviewer)",
      email: "reviewer@dutai.dev",
      status: "ACTIVE",
      avatar_url: null,
      role_names: ["USER"],
    },
  },
];

// ─── Seed data ──────────────────────────────────────────────────────────────
let projects: Project[] = [
  {
    id: "proj-001",
    name: "Nhận diện biển số xe",
    description: "Dataset gán nhãn bounding box biển số xe tại Việt Nam",
    project_type: "detection",
    owner_id: "101",
    status: "active",
    created_at: "2026-07-01T08:00:00Z",
    updated_at: "2026-08-20T14:30:00Z",
  },
  {
    id: "proj-002",
    name: "OCR hóa đơn tài chính",
    description: "Trích xuất thông tin từ hóa đơn, phiếu thu, phiếu chi",
    project_type: "ocr",
    owner_id: "101",
    status: "active",
    created_at: "2026-07-15T09:00:00Z",
    updated_at: "2026-08-25T10:00:00Z",
  },
  {
    id: "proj-003",
    name: "Phân loại cảm xúc review sản phẩm",
    description: "NLP phân tích cảm xúc người dùng từ review thương mại điện tử",
    project_type: "nlp",
    owner_id: "102",
    status: "active",
    created_at: "2026-08-01T10:00:00Z",
    updated_at: "2026-08-28T08:00:00Z",
  },
  {
    id: "proj-004",
    name: "Phân loại ảnh y tế (X-quang)",
    description: "Phân loại ảnh X-quang phổi: bình thường, viêm phổi, COVID",
    project_type: "classification",
    owner_id: "101",
    status: "archived",
    created_at: "2026-06-01T07:00:00Z",
    updated_at: "2026-07-30T12:00:00Z",
  },
  {
    id: "proj-005",
    name: "Phân vùng tế bào ung thư",
    description: "Pixel-level segmentation tế bào ung thư trong ảnh hiển vi",
    project_type: "segmentation",
    owner_id: "103",
    status: "active",
    created_at: "2026-08-10T08:00:00Z",
    updated_at: "2026-08-27T16:00:00Z",
  },
  {
    id: "proj-006",
    name: "Mô tả cảnh quan du lịch",
    description: "Image captioning tự động cho ảnh du lịch Đà Nẵng",
    project_type: "captioning",
    owner_id: "101",
    status: "active",
    created_at: "2026-08-15T08:00:00Z",
    updated_at: "2026-08-28T10:00:00Z",
  },
];

let members: Record<string, ProjectMember[]> = {
  "proj-001": [
    {
      id: "mem-001-1",
      project_id: "proj-001",
      user_id: "101",
      role: "owner",
      status: "active",
      joined_at: "2026-07-01T08:00:00Z",
    },
    {
      id: "mem-001-2",
      project_id: "proj-001",
      user_id: "102",
      role: "admin",
      status: "active",
      joined_at: "2026-07-05T09:00:00Z",
    },
    {
      id: "mem-001-3",
      project_id: "proj-001",
      user_id: "103",
      role: "annotator",
      status: "active",
      joined_at: "2026-07-10T10:00:00Z",
    },
    {
      id: "mem-001-4",
      project_id: "proj-001",
      user_id: "104",
      role: "reviewer",
      status: "active",
      joined_at: "2026-07-12T10:00:00Z",
    },
  ],
  "proj-002": [
    {
      id: "mem-002-1",
      project_id: "proj-002",
      user_id: "101",
      role: "owner",
      status: "active",
      joined_at: "2026-07-15T09:00:00Z",
    },
    {
      id: "mem-002-2",
      project_id: "proj-002",
      user_id: "105",
      role: "annotator",
      status: "active",
      joined_at: "2026-07-20T09:00:00Z",
    },
  ],
  "proj-003": [
    {
      id: "mem-003-1",
      project_id: "proj-003",
      user_id: "102",
      role: "owner",
      status: "active",
      joined_at: "2026-08-01T10:00:00Z",
    },
    {
      id: "mem-003-2",
      project_id: "proj-003",
      user_id: "106",
      role: "reviewer",
      status: "active",
      joined_at: "2026-08-05T10:00:00Z",
    },
  ],
  "proj-005": [
    {
      id: "mem-005-1",
      project_id: "proj-005",
      user_id: "103",
      role: "owner",
      status: "active",
      joined_at: "2026-08-10T08:00:00Z",
    },
  ],
  "proj-006": [
    {
      id: "mem-006-1",
      project_id: "proj-006",
      user_id: "101",
      role: "owner",
      status: "active",
      joined_at: "2026-08-15T08:00:00Z",
    },
    {
      id: "mem-006-2",
      project_id: "proj-006",
      user_id: "107",
      role: "annotator",
      status: "active",
      joined_at: "2026-08-18T08:00:00Z",
    },
    {
      id: "mem-006-3",
      project_id: "proj-006",
      user_id: "108",
      role: "reviewer",
      status: "active",
      joined_at: "2026-08-19T08:00:00Z",
    },
  ],
};

const configs: Record<string, ProjectConfig> = {
  "proj-001": { project_id: "proj-001", settings: { label_count: 5, auto_assign: true } },
  "proj-002": { project_id: "proj-002", settings: { label_count: 3, auto_assign: false } },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getMembersFor(projectId: string): ProjectMember[] {
  return members[projectId] ?? [];
}

// ─── Auth Handlers ───────────────────────────────────────────────────────────
// ─── Project Handlers ────────────────────────────────────────────────────────
export const handlers = [
  // POST /auth/login
  http.post(`${BASE}/auth/login`, async ({ request }) => {
    await delay(500);
    const body = (await request.json()) as { email: string; password: string };
    const account = TEST_USERS.find(
      (u) => u.email === body.email && u.password === body.password
    );
    if (!account) {
      return HttpResponse.json(
        { detail: "Email hoặc mật khẩu không đúng." },
        { status: 401 }
      );
    }
    return HttpResponse.json({
      access_token: `mock-token-${account.userId}`,
      refresh_token: `mock-refresh-${account.userId}`,
      token_type: "bearer",
    });
  }),

  // GET /auth/me
  http.get(`${BASE}/auth/me`, async ({ request }) => {
    await delay(200);
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer mock-token-")) {
      return new HttpResponse(null, { status: 401 });
    }
    const userId = authHeader.replace("Bearer mock-token-", "");
    const account = TEST_USERS.find((u) => u.userId === userId);
    if (!account) return new HttpResponse(null, { status: 401 });
    return HttpResponse.json(account.user);
  }),

  // POST /auth/logout
  http.post(`${BASE}/auth/logout`, async () => {
    await delay(200);
    return new HttpResponse(null, { status: 204 });
  }),

  // GET /projects
  http.get(`${BASE}/projects`, async () => {
    await delay(300);
    return HttpResponse.json(projects);
  }),

  // GET /projects/:id
  http.get(`${BASE}/projects/:id`, async ({ params }) => {
    await delay(200);
    const project = projects.find((p) => p.id === params.id);
    if (!project) return new HttpResponse(null, { status: 404 });
    return HttpResponse.json(project);
  }),

  // POST /projects
  http.post(`${BASE}/projects`, async ({ request }) => {
    await delay(400);
    const body = (await request.json()) as {
      name: string;
      description?: string;
      project_type: string;
    };
    const newProject: Project = {
      id: `proj-${Date.now()}`,
      name: body.name,
      description: body.description ?? null,
      project_type: body.project_type as Project["project_type"],
      owner_id: "101",
      status: "active",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    projects = [newProject, ...projects];
    members[newProject.id] = [
      {
        id: `mem-${newProject.id}-1`,
        project_id: newProject.id,
        user_id: "101",
        role: "owner",
        status: "active",
        joined_at: new Date().toISOString(),
      },
    ];
    return HttpResponse.json(newProject, { status: 201 });
  }),

  // PUT /projects/:id
  http.put(`${BASE}/projects/:id`, async ({ params, request }) => {
    await delay(300);
    const body = (await request.json()) as Partial<Project>;
    const idx = projects.findIndex((p) => p.id === params.id);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    projects[idx] = {
      ...projects[idx],
      ...body,
      updated_at: new Date().toISOString(),
    };
    return HttpResponse.json(projects[idx]);
  }),

  // DELETE /projects/:id  (archive)
  http.delete(`${BASE}/projects/:id`, async ({ params }) => {
    await delay(300);
    const idx = projects.findIndex((p) => p.id === params.id);
    if (idx === -1) return new HttpResponse(null, { status: 404 });
    projects[idx].status = "archived";
    return HttpResponse.json(projects[idx]);
  }),

  // ─── Member Handlers ──────────────────────────────────────────────────────

  // GET /projects/:id/members
  http.get(`${BASE}/projects/:id/members`, async ({ params }) => {
    await delay(250);
    return HttpResponse.json(getMembersFor(params.id as string));
  }),

  // POST /projects/:id/members  (invite)
  http.post(`${BASE}/projects/:id/members`, async ({ params, request }) => {
    await delay(400);
    const body = (await request.json()) as { user_id: string; role: string };
    const projectId = params.id as string;
    const existing = getMembersFor(projectId);

    // 409 nếu đã là thành viên
    if (existing.some((m) => m.user_id === body.user_id)) {
      return HttpResponse.json(
        { detail: `User ${body.user_id} đã là thành viên của dự án này.` },
        { status: 409 }
      );
    }

    const newMember: ProjectMember = {
      id: `mem-${projectId}-${Date.now()}`,
      project_id: projectId,
      user_id: body.user_id,
      role: body.role as ProjectMember["role"],
      status: "active",
      joined_at: new Date().toISOString(),
    };

    if (!members[projectId]) members[projectId] = [];
    members[projectId].push(newMember);
    return HttpResponse.json(newMember, { status: 201 });
  }),

  // PUT /projects/:id/members/:memberId  (update role)
  http.put(
    `${BASE}/projects/:id/members/:memberId`,
    async ({ params, request }) => {
      await delay(300);
      const body = (await request.json()) as { role: string };
      const projectId = params.id as string;
      const memberList = getMembersFor(projectId);
      const idx = memberList.findIndex((m) => m.id === params.memberId);
      if (idx === -1) return new HttpResponse(null, { status: 404 });

      // Không cho đổi role Owner
      if (memberList[idx].role === "owner") {
        return HttpResponse.json(
          { detail: "Không thể thay đổi vai trò của Owner." },
          { status: 400 }
        );
      }

      members[projectId][idx] = {
        ...members[projectId][idx],
        role: body.role as ProjectMember["role"],
      };
      return HttpResponse.json(members[projectId][idx]);
    }
  ),

  // DELETE /projects/:id/members/:memberId  (remove)
  http.delete(
    `${BASE}/projects/:id/members/:memberId`,
    async ({ params }) => {
      await delay(350);
      const projectId = params.id as string;
      const memberList = getMembersFor(projectId);
      const member = memberList.find((m) => m.id === params.memberId);

      if (!member) return new HttpResponse(null, { status: 404 });

      // 400 nếu cố xóa Owner
      if (member.role === "owner") {
        return HttpResponse.json(
          { detail: "Không thể xóa Owner khỏi dự án." },
          { status: 400 }
        );
      }

      members[projectId] = memberList.filter((m) => m.id !== params.memberId);
      return new HttpResponse(null, { status: 204 });
    }
  ),

  // ─── Config Handlers ──────────────────────────────────────────────────────

  // GET /projects/:id/config
  http.get(`${BASE}/projects/:id/config`, async ({ params }) => {
    await delay(200);
    const cfg = configs[params.id as string] ?? {
      project_id: params.id,
      settings: {},
    };
    return HttpResponse.json(cfg);
  }),

  // PUT /projects/:id/config
  http.put(`${BASE}/projects/:id/config`, async ({ params, request }) => {
    await delay(300);
    const body = (await request.json()) as Record<string, unknown>;
    configs[params.id as string] = {
      project_id: params.id as string,
      settings: body,
    };
    return HttpResponse.json(configs[params.id as string]);
  }),
];
