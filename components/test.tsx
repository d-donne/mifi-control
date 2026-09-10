import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { getMonitoring } from "@/src/api/routes";
import { useRouter } from "expo-router";
import { useStoredCredentials } from "../src/hooks/useStoredCredentials";
import { useHiLinkQuery } from "../src/hooks/useHiLinkQuery";

export default function Test() {
  const { clear } = useStoredCredentials();
  const router = useRouter();

  const { data, error, isLoading } = useHiLinkQuery({
    queryKey: ["status"],
    queryFn: (client) => getMonitoring(client, "status"),
    refetchInterval: 8000,
  });

  return (
    <VStack space="md">
      <Text>{isLoading ? "Loading..." : error && `Error: ${error}`}</Text>
      <VStack>
        <Text>Additional info here</Text>
        {data && (
          <Center>
            <Text selectable>{JSON.stringify(data, null, 2)}</Text>
          </Center>
        )}
      </VStack>
      <Button
        variant="outline"
        onPress={async () => {
          await clear();
          router.replace("/settings");
        }}
      >
        <ButtonText>Logout</ButtonText>
      </Button>
    </VStack>
  );
}
