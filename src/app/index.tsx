import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useState } from "react";
import Test from "../../components/test";

export default function Index() {
  const [result, setResult] = useState("Not tested");
  const [loading, setLoading] = useState(false);



  return (
    <Box className="flex-1 bg-background">
      <Center className="flex-1 px-6">
        <VStack space="lg" className="w-full">
          <Text className="text-2xl font-bold text-foreground">
            MiFi Control
          </Text>

          <Test />
        </VStack>
      </Center>
    </Box>
  );
}
