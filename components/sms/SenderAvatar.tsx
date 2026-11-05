import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useAppColors } from "@/src/hooks/useAppColors";
import { User } from "@/components/icons";

/**
 * Initial for named senders ("MTN", "ABSA"); a person icon for phone
 * numbers and short codes, where a digit would mean nothing.
 */
export default function SenderAvatar({
  name,
  size = 44,
}: {
  name: string;
  size?: number;
}) {
  const colors = useAppColors();
  const letter = /[a-z]/i.exec(name)?.[0]?.toUpperCase();

  return (
    <VStack
      className="items-center justify-center rounded-full bg-accent/15"
      style={{ width: size, height: size }}
    >
      {letter ? (
        <Text
          className="font-semibold text-accent"
          style={{ fontSize: size * 0.4 }}
        >
          {letter}
        </Text>
      ) : (
        <User size={size * 0.45} color={colors.accent} />
      )}
    </VStack>
  );
}
