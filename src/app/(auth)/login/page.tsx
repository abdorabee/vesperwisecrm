import { signIn, signUp } from "@/lib/actions/auth";
import { VesperWiseLogo } from "@/components/vesper-wise-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldGroup,
  FieldLabel,
  FieldDescription,
} from "@/components/ui/field";

interface LoginPageProps {
  searchParams: Promise<{ error?: string; message?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-4 flex justify-center">
          <VesperWiseLogo size="md" />
        </div>
        <p className="mb-6 text-center text-sm text-muted-foreground">
          Sign in to your account, or sign up if this is your first visit.
        </p>

        <form className="space-y-4">
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="email">Email</FieldLabel>
              <Input id="email" name="email" type="email" required autoComplete="email" />
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Password</FieldLabel>
              <Input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="current-password"
              />
              <FieldDescription>At least 6 characters.</FieldDescription>
            </Field>
          </FieldGroup>

          {params.error && (
            <p className="text-sm text-destructive">{params.error}</p>
          )}
          {params.message && (
            <p className="text-sm text-muted-foreground">{params.message}</p>
          )}

          <div className="flex gap-2">
            <Button formAction={signIn} type="submit" className="flex-1">
              Sign in
            </Button>
            <Button
              formAction={signUp}
              type="submit"
              variant="outline"
              className="flex-1"
            >
              Sign up
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
