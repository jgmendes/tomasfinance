import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  title,
  value,
  icon: Icon,
  hint,
  accent = "text-primary",
  iconBg = "bg-primary/10",
}: {
  title: string;
  value: string;
  icon: LucideIcon;
  hint?: string;
  accent?: string;
  iconBg?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("grid h-11 w-11 place-items-center rounded-xl", iconBg)}>
          <Icon className={cn("h-5 w-5", accent)} />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{title}</p>
          <p className="text-xl font-bold tracking-tight">{value}</p>
          {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  );
}
