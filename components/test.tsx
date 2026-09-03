import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useStoredCredentials } from "../src/hooks/useStoredCredentials";
import { useHiLinkClient } from "../src/hooks/HiLinkProvider";

export default function Test() {
  const client = useHiLinkClient();
  const { clear } = useStoredCredentials();
  const router = useRouter();

  const { data, error, isLoading } = useQuery({
    queryKey: ["status"],
    queryFn: () => client.getStatus(),
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
