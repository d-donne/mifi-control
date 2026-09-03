import { Box } from "@/components/ui/box";
import { Button, ButtonText } from "@/components/ui/button";
import { Center } from "@/components/ui/center";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import CircularProgress from "@/components/CircularProgress";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStoredCredentials } from "../../hooks/useStoredCredentials";
import { useHiLinkClient } from "../../hooks/HiLinkProvider";

/**
 * Home dashboard. Phase 1 keeps the content minimal: greeting, raw JSON dump
 * via Test, logout button. The full dashboard layout (header, hero card,
 * stat rings, devices card, quick actions) is built in Phases 3-5.
 */
export default function Home() {
  const client = useHiLinkClient();
  const { clear } = useStoredCredentials();
  const router = useRouter();

  const { data, error, isLoading } = useQuery({
    queryKey: ["status"],
    queryFn: () => client.getStatus(),
    refetchInterval: 8000,
  });

  return (
    <SafeAreaView className="flex-1" >
      <ScrollView contentContainerClassName="flex-grow" className="bg-background">
        <VStack space="md" className="p-4">
          <Text className="text-2xl font-bold text-foreground">MiFi Control</Text>

          <Center>
            <CircularProgress progress={0.65}>
              <Text className="text-lg font-semibold">65%</Text>
              <Text className="text-sm text-muted-foreground">Data Used</Text>
            </CircularProgress>
          </Center>

          <Box>
            <Text>
              {isLoading
                ? "Loading..."
                : error
                  ? `Error: ${error}`
                  : null}
            </Text>
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
                router.replace("/");
              }}
            >
              <ButtonText>Logout</ButtonText>
            </Button>
          </Box>
        </VStack>
      </ScrollView>
    </SafeAreaView>
  );
}
