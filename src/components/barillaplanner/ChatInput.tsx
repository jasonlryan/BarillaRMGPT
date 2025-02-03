"use client";
import { Input } from "../ui/input";
import { ChangeEvent } from "react";

interface ChatInputProps {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  [key: string]: any;
}

export default function ChatInput({
  value,
  onChange,
  ...props
}: ChatInputProps) {
  return <Input value={value} onChange={onChange} {...props} />;
}
