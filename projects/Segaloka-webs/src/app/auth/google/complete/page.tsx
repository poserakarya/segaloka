import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{
    code?: string | string[];
  }>;
};

export default async function GoogleCompletePage({
  searchParams,
}: Props) {
  const params = await searchParams;
  const code = params.code;

  if (
    typeof code !== "string" ||
    !/^[0-9a-f]{64}$/.test(code)
  ) {
    redirect("/masuk?error=google_invalid_code");
  }

  redirect(`/api/auth/google/exchange?code=${encodeURIComponent(code)}`);
}
