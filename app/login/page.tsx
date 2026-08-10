import { AuthForm } from "@/app/components/auth-form";
import { signIn } from "@/app/actions/auth";

export default function LoginPage() {
  return (
    <AuthForm
      title="Sign in"
      description="Use your username and password to continue."
      submitLabel="Sign in"
      passwordAutoComplete="current-password"
      action={signIn}
      alternateHref="/signup"
      alternateLabel="Need an account?"
    />
  );
}
