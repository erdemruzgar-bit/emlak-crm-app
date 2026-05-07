import { redirect } from "next/navigation";

export default async function ProjectDetailIndex({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/projects/${id}/units`);
}
