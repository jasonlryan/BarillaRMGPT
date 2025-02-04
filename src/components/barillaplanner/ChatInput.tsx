"use client";
import { Textarea } from "@/components/ui/textarea";
import { ChangeEvent, KeyboardEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  onSubmit: (e: React.FormEvent) => void;
  placeholder?: string;
  isHeader?: boolean;
  className?: string;
  [key: string]: any;
}

export default function ChatInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  className,
  isHeader,
  ...props
}: ChatInputProps) {
  const { customProp1, customProp2, ...filteredProps } = props;

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter") {
      // Only prevent default and submit if it's a plain Enter
      // Let Shift+Enter behave naturally
      if (!e.shiftKey) {
        e.preventDefault();
        onSubmit(e);
      }
    }
  };

  return (
    <Textarea
      value={value}
      onChange={onChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      {...filteredProps}
    />
  );
}
