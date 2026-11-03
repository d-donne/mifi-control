import {
  AlertDialog,
  AlertDialogBackdrop,
  AlertDialogBody,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
} from "@/components/ui/alert-dialog";
import { Button, ButtonText } from "@/components/ui/button";
import { Text } from "@/components/ui/text";

export default function ConfirmDialog({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel,
  onConfirm,
  destructive = true,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => void;
  destructive?: boolean;
}) {
  return (
    <AlertDialog isOpen={isOpen} onClose={onClose} size="md">
      <AlertDialogBackdrop />
      <AlertDialogContent className="rounded-3xl border-0 bg-card p-6">
        <AlertDialogHeader>
          <Text className="text-lg font-semibold text-foreground">{title}</Text>
        </AlertDialogHeader>
        <AlertDialogBody className="mt-2 mb-6">
          <Text className="text-sm text-muted-foreground">{message}</Text>
        </AlertDialogBody>
        <AlertDialogFooter>
          <Button
            variant="ghost"
            className="flex-1 rounded-full"
            onPress={onClose}
          >
            <ButtonText>Cancel</ButtonText>
          </Button>
          <Button
            variant={destructive ? "destructive" : "default"}
            className="flex-1 rounded-full"
            onPress={() => {
              onClose();
              onConfirm();
            }}
          >
            <ButtonText>{confirmLabel}</ButtonText>
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
