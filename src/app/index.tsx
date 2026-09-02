import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Index() {
  return (
    <SafeAreaView>
      <Box  className="bg-primary h-full w-full ">
        <Center className="size-80 border">
          <Button variant="secondary"  size="lg">
            <ButtonText>skfjssdlsdf</ButtonText>
          </Button>
        </Center>
      </Box>
    </SafeAreaView>
  );
}
