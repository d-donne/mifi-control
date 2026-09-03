import { Button, ButtonText } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Center } from "@/components/ui/center";
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Heading } from "@/components/ui/heading";
import { Input, InputField } from "@/components/ui/input";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { useRouter } from "expo-router";
import { useState } from "react";
import { SafeAreaView } from "react-native-safe-area-context";
import { useStoredCredentials } from "../../hooks/useStoredCredentials";

const DEFAULT_URL = "http://192.168.8.1";
const DEFAULT_USERNAME = "admin";

export default function Settings() {
  const router = useRouter();
  const { credentials, save } = useStoredCredentials();

  const [baseUrl, setBaseUrl] = useState(credentials?.baseUrl ?? DEFAULT_URL);
  const [username, setUsername] = useState(
    credentials?.username ?? DEFAULT_USERNAME,
  );
  const [password, setPassword] = useState(credentials?.password ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const urlInvalid = error === "Device URL must start with http:// or https://";
  const credsInvalid = error === "Username and password are required";

  async function onSave() {
    setError(null);
    if (!baseUrl.startsWith("http://") && !baseUrl.startsWith("https://")) {
      setError("Device URL must start with http:// or https://");
      return;
    }
    if (!username.trim() || !password) {
      setError("Username and password are required");
      return;
    }
    setSaving(true);
    try {
      await save({ baseUrl, username, password });
      router.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSaving(false);
    }
  }

  const isTopLevelError = error && !urlInvalid && !credsInvalid;

  return (
    <SafeAreaView className="flex-1">
      <Center className="h-screen bg-background p-4">
        <Card className="w-full">
          <VStack space="md">
            <Heading size="lg">MiFi Settings</Heading>

            <FormControl isInvalid={urlInvalid}>
              <FormControlLabel>
                <FormControlLabelText>Device URL</FormControlLabelText>
              </FormControlLabel>
              <Input>
                <InputField
                  value={baseUrl}
                  onChangeText={setBaseUrl}
                  autoCapitalize="none"
                  autoCorrect={false}
                  keyboardType="url"
                  placeholder="http://192.168.8.1"
                />
              </Input>
              {urlInvalid && (
                <FormControlError>
                  <FormControlErrorText>{error}</FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            <FormControl isInvalid={credsInvalid}>
              <FormControlLabel>
                <FormControlLabelText>Username</FormControlLabelText>
              </FormControlLabel>
              <Input>
                <InputField
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
                  autoCorrect={false}
                  placeholder="admin"
                />
              </Input>
            </FormControl>

            <FormControl isInvalid={credsInvalid}>
              <FormControlLabel>
                <FormControlLabelText>Password</FormControlLabelText>
              </FormControlLabel>
              <Input>
                <InputField
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="password"
                  placeholder="••••••••"
                />
              </Input>
              {credsInvalid && (
                <FormControlError>
                  <FormControlErrorText>{error}</FormControlErrorText>
                </FormControlError>
              )}
            </FormControl>

            {isTopLevelError && (
              <Text className="text-sm text-destructive">{error}</Text>
            )}

            <Button onPress={onSave} isDisabled={saving}>
              <ButtonText>{saving ? "Saving…" : "Save"}</ButtonText>
            </Button>
          </VStack>
        </Card>
      </Center>
    </SafeAreaView>
  );
}
