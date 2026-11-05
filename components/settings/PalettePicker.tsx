import { Box } from "@/components/ui/box";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { CircleCheck } from "@/components/icons";
import { paletteColors, useAppColors } from "@/src/hooks/useAppColors";
import { usePalette } from "@/src/hooks/usePalette";
import { PALETTE_IDS, PALETTES, type PaletteId } from "@/src/theme/palettes";

function Swatch({ id }: { id: PaletteId }) {
  const colors = useAppColors();
  const selected = usePalette((s) => s.palette === id);
  const setPalette = usePalette((s) => s.setPalette);
  const own = paletteColors(id, "dark");

  return (
    <Pressable
      onPress={() => setPalette(id)}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={PALETTES[id].name}
      className="w-1/2 p-1.5"
    >
      <Box
        className="rounded-2xl border-2 p-1.5"
        style={{ borderColor: selected ? colors.accent : "transparent" }}
      >
        <Box
          className="h-16 justify-between overflow-hidden rounded-xl p-2.5"
          style={{ backgroundColor: own.hero }}
        >
          <Box className="flex-row items-center justify-between">
            <Box
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: own.batteryRing }}
            />
            {selected && <CircleCheck size={16} color={own.heroForeground} />}
          </Box>
          <Box className="flex-row gap-1">
            <Box
              className="h-2.5 w-8 rounded-full"
              style={{ backgroundColor: own.primary }}
            />
            <Box
              className="h-2.5 w-3 rounded-full"
              style={{ backgroundColor: own.dataRingUpload }}
            />
          </Box>
        </Box>
        <Text
          className="px-1 pt-2 pb-0.5 text-sm"
          style={{
            color: selected ? colors.foreground : colors.mutedForeground,
            fontWeight: selected ? "600" : "400",
          }}
          numberOfLines={1}
        >
          {PALETTES[id].name}
        </Text>
      </Box>
    </Pressable>
  );
}

export default function PalettePicker() {
  return (
    <Box
      className="-mx-1.5 flex-row flex-wrap pb-1"
      accessibilityRole="radiogroup"
    >
      {PALETTE_IDS.map((id) => (
        <Swatch key={id} id={id} />
      ))}
    </Box>
  );
}
