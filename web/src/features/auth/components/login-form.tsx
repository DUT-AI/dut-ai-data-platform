"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  Database,
  Eye,
  EyeOff,
  GitBranch,
  Lock,
  Mail,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Notice } from "@/components/ui";
import { loginSchema, type LoginInput } from "../types";
import { useLoginMutation } from "../hooks";

export function LoginForm() {
  const loginMutation = useLoginMutation();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  function onSubmit(data: LoginInput) {
    loginMutation.mutate(data);
  }

  const errorMessage =
    loginMutation.error &&
    typeof loginMutation.error === "object" &&
    "response" in loginMutation.error
      ? (loginMutation.error as { response?: { data?: { detail?: string } } })
          .response?.data?.detail || "Đăng nhập thất bại. Vui lòng thử lại."
      : loginMutation.error
        ? "Đã xảy ra lỗi hệ thống khi kết nối tới Auth Server."
        : null;

  return (
    <main className="grid min-h-dvh bg-slate-50 lg:grid-cols-[minmax(0,1fr)_minmax(420px,0.72fr)]">
      <section className="data-grid-pattern relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-14">
        <div className="relative z-10 flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
          </span>
          <div>
            <p className="text-sm font-bold">DUT AI Data Platform</p>
            <p className="text-xs text-slate-400">Data &amp; Labeling Studio</p>
          </div>
        </div>

        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold text-blue-300">
            Nền tảng dữ liệu AI có truy vết
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
            Từ dữ liệu thô đến annotation có phiên bản.
          </h1>
          <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
            Quản lý dataset, ontology contract và revision gán nhãn trong một
            quy trình thống nhất cho đội ngũ nghiên cứu tại DUT.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {[
              [Database, "Dataset có phiên bản"],
              [GitBranch, "Ontology contract"],
              [ShieldCheck, "Phân quyền theo dự án"],
            ].map(([Icon, label]) => {
              const FeatureIcon = Icon as typeof Database;
              return (
                <div
                  key={label as string}
                  className="rounded-xl border border-white/10 bg-white/5 p-4"
                >
                  <FeatureIcon className="h-5 w-5 text-blue-300" />
                  <p className="mt-3 text-xs font-semibold text-slate-200">
                    {label as string}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        <p className="relative z-10 text-xs text-slate-500">
          Đại học Bách khoa · Đại học Đà Nẵng
        </p>
      </section>

      <section className="flex min-h-dvh items-center justify-center p-4 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          <header className="mb-7 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-600 text-white">
              <Sparkles className="h-5 w-5" aria-hidden="true" />
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
              DUT AI Data Platform
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              Quản trị và gán nhãn dữ liệu huấn luyện AI.
            </p>
          </header>

          <div className="data-panel p-5 sm:p-7">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-5">
              <div>
                <h2 className="text-xl font-bold text-slate-950">Đăng nhập</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Dùng tài khoản DUT để tiếp tục.
                </p>
              </div>
              <span className="flex shrink-0 items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800">
                <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
                DUT SSO
              </span>
            </div>

            {errorMessage && (
              <Notice
                tone="danger"
                title="Không thể đăng nhập"
                className="mt-5"
              >
                {errorMessage}
              </Notice>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-5 space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Email DUT
                </label>
                <div className="relative mt-1.5">
                  <Mail className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? "email-error" : undefined}
                    {...register("email")}
                    placeholder="name@dut.example"
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-sm text-slate-950 placeholder:text-slate-400 focus:border-blue-500"
                  />
                </div>
                {errors.email && (
                  <p
                    id="email-error"
                    role="alert"
                    className="mt-1.5 text-xs text-rose-600"
                  >
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Mật khẩu
                </label>
                <div className="relative mt-1.5">
                  <Lock className="pointer-events-none absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    aria-invalid={Boolean(errors.password)}
                    aria-describedby={
                      errors.password ? "password-error" : undefined
                    }
                    {...register("password")}
                    className="min-h-11 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-12 text-sm text-slate-950 focus:border-blue-500"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                    className="absolute right-0 top-0 inline-flex h-11 w-11 items-center justify-center rounded-lg text-slate-400 hover:text-slate-700"
                    onClick={() => setShowPassword((visible) => !visible)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p
                    id="password-error"
                    role="alert"
                    className="mt-1.5 text-xs text-rose-600"
                  >
                    {errors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loginMutation.isPending}
                className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loginMutation.isPending
                  ? "Đang kết nối…"
                  : "Đăng nhập hệ thống"}
                {!loginMutation.isPending && <ArrowRight className="h-4 w-4" />}
              </button>
            </form>
          </div>

          <p className="mt-5 text-center text-xs text-slate-400">
            Phiên đăng nhập được bảo vệ bởi DUT SSO.
          </p>
        </div>
      </section>
    </main>
  );
}
