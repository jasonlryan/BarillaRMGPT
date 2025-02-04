"use client";
import { Input } from "@/components/ui/input";
import { ChangeEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  isHeader?: boolean; // Explicitly declare it to document its existence
  className?: string;
  // Allow additional standard HTML input props
  [key: string]: any;
}

export default function ChatInput({
  value,
  onChange,
  placeholder,
  className,
  isHeader, // Destructure but don't use it
  ...props
}: ChatInputProps) {
  // Filter out any other potential custom props that shouldn't reach DOM
  const { customProp1, customProp2, ...filteredProps } = props;

  return (
    <Input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      {...filteredProps}
    />
  );
}
