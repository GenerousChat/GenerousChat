import { AlertCircle, CheckCircle2, Info } from "lucide-react";

export type Message =
  | { success: string }
  | { error: string }
  | { message: string };

export function FormMessage({ message }: { message: Message }) {
  return (
    <div className="grid gap-2 w-full text-sm">
      {"success" in message && (
        <div className="flex items-start gap-2 rounded-lg border bg-background/50 p-3 text-muted-foreground">
          <CheckCircle2 size={16} className="mt-0.5 text-green-500" />
          <p>{message.success}</p>
        </div>
      )}
      {"error" in message && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-destructive">
          <AlertCircle size={16} className="mt-0.5" />
          <p>{message.error}</p>
        </div>
      )}
      {"message" in message && (
        <div className="flex items-start gap-2 rounded-lg border bg-background/50 p-3 text-muted-foreground">
          <Info size={16} className="mt-0.5" />
          <p>{message.message}</p>
        </div>
      )}
    </div>
  );
}
