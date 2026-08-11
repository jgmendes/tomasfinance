"use client";

import { Suspense } from "react";
import { PageHeader } from "@/components/app/page-header";
import { RemindersChat } from "@/components/modules/reminders-chat";

export default function LembretesPage() {
  return (
    <div>
      <PageHeader
        title="Lembretes"
        description="Converse com o chat para lembrar de algo — inclusive pelo atalho do app no celular"
      />
      <Suspense fallback={null}>
        <RemindersChat />
      </Suspense>
    </div>
  );
}
