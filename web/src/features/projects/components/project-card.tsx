"use client";

import Link from "next/link";
import { Folder, ArrowRight, Calendar, User } from "lucide-react";
import { Project, PROJECT_TYPE_OPTIONS } from "../types/project";
import {
  Badge,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  Button,
} from "@/components/ui";

interface ProjectCardProps {
  project: Project;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const typeOption = PROJECT_TYPE_OPTIONS.find(
    (opt) => opt.value === project.project_type
  );

  const formattedDate = project.created_at
    ? new Date(project.created_at).toLocaleDateString("vi-VN", {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Vừa tạo";

  return (
    <Card className="flex flex-col justify-between border-slate-200 bg-white transition-all hover:border-slate-300 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700">
      <div>
        <CardHeader className="space-y-3 pb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                <Folder className="h-5 w-5" />
              </div>
              <div>
                <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {project.name}
                </CardTitle>
              </div>
            </div>
            <Badge
              variant="outline"
              className={
                typeOption?.badgeColor ??
                "border-slate-200 bg-slate-100 text-slate-700"
              }
            >
              {typeOption?.label ??
                (project.task_definition_version_id
                  ? `Task ${project.task_definition_version_id.slice(0, 8)}`
                  : "Legacy project")}
            </Badge>
          </div>

          <CardDescription className="line-clamp-2 min-h-[2.5rem] text-xs text-slate-500 dark:text-slate-400">
            {project.description || "Chưa có mô tả cho dự án này."}
          </CardDescription>
        </CardHeader>

        <CardContent className="py-2 text-xs text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span>{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {project.status === "active" ? "Hoạt động" : "Lưu trữ"}
              </span>
            </div>
          </div>
        </CardContent>
      </div>

      <CardFooter className="border-t border-slate-100 pt-4 dark:border-slate-800/80">
        <Link href={`/projects/${project.id}`} className="w-full">
          <Button
            variant="outline"
            className="w-full justify-between text-xs font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <span>Vào không gian làm việc</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </CardFooter>
    </Card>
  );
}
