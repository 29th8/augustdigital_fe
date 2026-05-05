import React from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

interface ConfirmDialogProps {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Renders the confirm button in red. Defaults to true. */
  destructive?: boolean;
}

export function ConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmLabel = "Xác nhận",
  cancelLabel = "Hủy",
  destructive = true,
}: ConfirmDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent className="bg-white border-gray-200">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-gray-900">{title}</AlertDialogTitle>
          <AlertDialogDescription className="text-gray-500" asChild>
            <div>{description}</div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="border-gray-200 text-gray-700 hover:bg-gray-50">
            {cancelLabel}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={cn(
              destructive
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-cyan-600 hover:bg-cyan-500 text-white"
            )}
          >
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
