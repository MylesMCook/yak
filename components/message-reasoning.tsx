"use client";

import { useRef } from "react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "./elements/reasoning";

type MessageReasoningProps = {
  isLoading: boolean;
  reasoning: string;
};

export function MessageReasoning({
  isLoading,
  reasoning,
}: MessageReasoningProps) {
  const hasBeenStreamingRef = useRef(isLoading);
  if (isLoading) {
    hasBeenStreamingRef.current = true;
  }

  return (
    <Reasoning
      data-testid="message-reasoning"
      defaultOpen={hasBeenStreamingRef.current}
      isStreaming={isLoading}
    >
      <ReasoningTrigger />
      <ReasoningContent>{reasoning}</ReasoningContent>
    </Reasoning>
  );
}
