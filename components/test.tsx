import { Box } from "@/components/ui/box";
import { Center } from "@/components/ui/center";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useQuery } from "@tanstack/react-query";
import { useHiLinkClient } from "../src/hooks/HiLinkProvider";

export default function Test() {
  const client = useHiLinkClient();

  const { data, error, isLoading } = useQuery({
    queryKey: ["status"],
    queryFn: () => client.getStatus(),
    refetchInterval: 8000,
  });

  return (
    <Box>
      <Text>{isLoading ? "Loading..." : error && `Error: ${error}`}</Text>
      <VStack>
        <Text>Additional info here</Text>
        {data && (
          <Center>
            <Text selectable>{JSON.stringify(data, null, 2)}</Text>
          </Center>
        )}
      </VStack>
    </Box>
  );
}
