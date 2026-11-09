import type { ReactNode } from "react";
import { PageHeader } from "@/components/app/page-header";

export function Page({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <PageHeader title={title} description={description} actions={actions} />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-6xl px-8 py-6">{children}</div>
      </div>
    </div>
  );
}
