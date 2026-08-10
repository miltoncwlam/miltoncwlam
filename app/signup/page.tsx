import { AuthForm } from "@/app/components/auth-form";
import { signUp } from "@/app/actions/auth";

export default function SignUpPage() {
  return (
    <AuthForm
      title="Sign up"
      description="Create an account with a username and password."
      submitLabel="Create account"
      passwordAutoComplete="new-password"
      action={signUp}
      alternateHref="/login"
      alternateLabel="Already have an account?"
    />
  );
}
