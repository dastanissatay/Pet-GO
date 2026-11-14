import { MessageCircleQuestion } from "lucide-react";
import { Card } from "@/components/Card";

export function QuestionCard({ description, question }: { description: string; question: string }) {
  return (
    <Card as="article" variant="flat" tone="butter" padding="md" className="flex gap-3">
      <MessageCircleQuestion aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
      <div>
        <p className="text-sm font-bold">{description}</p>
        <p className="mt-1 text-sm">{question}</p>
      </div>
    </Card>
  );
}
