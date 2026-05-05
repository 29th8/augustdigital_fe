import React from "react";
import { Label } from "@/components/ui/label";

interface FormFieldProps {
  htmlFor?: string;
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}

/**
 * Consistent form field wrapper: label → input → error message.
 * Use inside any <form> alongside react-hook-form.
 */
export function FormField({ htmlFor, label, required, error, children }: FormFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
