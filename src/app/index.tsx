import { Box } from "@/components/ui/box";
import { Button } from "@/components/ui/button";
import { Text, View, StyleSheet } from "react-native";

export default function Index() {
  return (
    <Box className="bg-black" style={styles.container}>
      <Button>skfjsl</Button>
    </Box>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
