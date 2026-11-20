import { redirect } from "next/navigation";
import { LoginForm } from "@/features/auth";
import { LOCAL_LOGIN_ENABLED, SSO_LOGIN_URL } from "@/lib/auth-urls";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  // Production signs in on the DUT AI Workspace; only local dev uses this form.
  if (!LOCAL_LOGIN_ENABLED && /^https?:\/\//.test(SSO_LOGIN_URL)) {
    redirect(SSO_LOGIN_URL);
  }
  return <LoginForm />;
}
