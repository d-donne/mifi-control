import PulsingDot from "@/components/common/PulsingDot";
import { Box } from "@/components/ui/box";
import { Button, ButtonSpinner, ButtonText } from "@/components/ui/button";
import {
  FormControl,
  FormControlError,
  FormControlErrorText,
  FormControlHelper,
  FormControlHelperText,
  FormControlLabel,
  FormControlLabelText,
} from "@/components/ui/form-control";
import { Heading } from "@/components/ui/heading";
import { HStack } from "@/components/ui/hstack";
import { Input, InputField, InputSlot } from "@/components/ui/input";
import { Pressable } from "@/components/ui/pressable";
import { Text } from "@/components/ui/text";
import { VStack } from "@/components/ui/vstack";
import { HiLinkClient } from "@/src/api/main";
import { useAppColors } from "@/src/hooks/useAppColors";
import { sameCredentials, useSession } from "@/src/hooks/useSession";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Router,
  ShieldAlert,
  WifiOff,
} from "@/components/icons";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const DEFAULT_URL = "http://192.168.8.1";
const DEFAULT_USERNAME = "admin";
const VALID_URL = /^https?:\/\/\S+$/;

interface FieldError {
  field: "url" | "username" | "password";
  message: string;
}

function hostOf(baseUrl: string): string {
  return baseUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

function openWifiSettings(): void {
  const opened =
    Platform.OS === "android"
      ? Linking.sendIntent("android.settings.WIFI_SETTINGS")
      : Linking.openSettings();
  opened.catch(() => undefined);
}

function DeviceCard({
  reachable,
  baseUrl,
  deviceName,
}: {
  reachable: boolean | undefined;
  baseUrl: string;
  deviceName: string | null;
}) {
  const colors = useAppColors();
  const name = `HUAWEI ${deviceName ?? "MiFi"}`;

  if (reachable === undefined) {
    return (
      <HStack space="md" className="items-center rounded-3xl bg-card p-4">
        <ActivityIndicator color={colors.mutedForeground} />
        <Text className="text-sm text-muted-foreground">
          Looking for your MiFi at {hostOf(baseUrl)}…
        </Text>
      </HStack>
    );
  }

  if (!reachable) {
    return (
      <VStack space="md" className="rounded-3xl bg-card p-4">
        <HStack space="md" className="items-center">
          <WifiOff size={20} color={colors.destructive} />
          <VStack className="flex-1">
            <Text className="font-semibold text-foreground">
              MiFi not found
            </Text>
            <Text className="text-sm text-muted-foreground">
              Connect this phone to the MiFi&apos;s Wi-Fi network, then come
              back here.
            </Text>
          </VStack>
        </HStack>
        <Button variant="outline" size="sm" onPress={openWifiSettings}>
          <ButtonText>Open Wi-Fi settings</ButtonText>
        </Button>
      </VStack>
    );
  }

  return (
    <HStack space="md" className="items-center rounded-3xl bg-card p-4">
      <PulsingDot isOnline colorClass="bg-online-dot" />
      <VStack className="flex-1">
        <Text className="font-semibold text-foreground">{name}</Text>
        <Text className="text-sm text-muted-foreground">
          {hostOf(baseUrl)} · Ready to sign in
        </Text>
      </VStack>
    </HStack>
  );
}

export default function SignInScreen() {
  const colors = useAppColors();
  const initial = useSession((s) => s.draft ?? s.credentials);
  const knownGood = useSession((s) => s.credentials);
  const error = useSession((s) => s.error);
  const deviceName = useSession((s) => s.deviceName);
  const busy = useSession((s) => s.status === "connecting");
  const signIn = useSession((s) => s.signIn);
  const retry = useSession((s) => s.retry);

  const [baseUrl, setBaseUrl] = useState(initial?.baseUrl ?? DEFAULT_URL);
  const [username, setUsername] = useState(
    initial?.username ?? DEFAULT_USERNAME,
  );
  const [password, setPassword] = useState(initial?.password ?? "");
  const [seePassword, setSeePassword] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(
    initial !== null &&
      (initial.baseUrl !== DEFAULT_URL ||
        initial.username !== DEFAULT_USERNAME),
  );
  const [fieldError, setFieldError] = useState<FieldError | null>(null);

  const probeUrl = baseUrl.trim();
  const probe = useQuery({
    queryKey: ["probe", probeUrl],
    queryFn: () => HiLinkClient.loginGate(probeUrl),
    enabled: !busy && VALID_URL.test(probeUrl),
    // The web UI re-checks a lockout every 6 s.
    refetchInterval: (query) => {
      const gate = query.state.data;
      if (gate?.lockedMinutes || error?.kind === "blocked") return 6_000;
      return gate?.reachable ? false : 3_000;
    },
    retry: false,
  });
  const reachable = probe.data?.reachable;
  const lockedMinutes = probe.data?.lockedMinutes ?? null;

  // Only credentials that already worked are retried automatically: an
  // unverified password would spend one of the device's login attempts.
  const canAutoRetry =
    error?.kind === "network" && sameCredentials(initial, knownGood);
  const wasReachable = useRef(reachable);
  useEffect(() => {
    const before = wasReachable.current;
    wasReachable.current = reachable;
    if (before === false && reachable === true && canAutoRetry) {
      void retry();
    }
  }, [reachable, canAutoRetry, retry]);

  function submit() {
    const url = baseUrl.trim();
    const user = username.trim();
    if (!VALID_URL.test(url)) {
      setShowAdvanced(true);
      setFieldError({
        field: "url",
        message: "Use an address like http://192.168.8.1",
      });
      return;
    }
    if (!user) {
      setShowAdvanced(true);
      setFieldError({ field: "username", message: "Enter a username" });
      return;
    }
    if (!password) {
      setFieldError({ field: "password", message: "Enter the password" });
      return;
    }
    setFieldError(null);
    void signIn({ baseUrl: url, username: user, password });
  }

  const errorFor = (field: FieldError["field"]) =>
    fieldError?.field === field ? fieldError.message : null;
  const passwordError =
    errorFor("password") ??
    (!fieldError && error?.kind === "credentials" ? error.message : null);
  const banner = lockedMinutes
    ? {
        message: `Sign-in is locked after too many attempts. Try again in about ${lockedMinutes} ${lockedMinutes === 1 ? "minute" : "minutes"}.`,
      }
    : error &&
        error.kind !== "credentials" &&
        !(error.kind === "network" && reachable === false)
      ? error
      : null;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView behavior="padding" style={{ flex: 1 }}>
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-5 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <VStack space="xl">
            <VStack space="sm">
              <Box className="mb-2 h-14 w-14 items-center justify-center rounded-2xl bg-card">
                <Router size={28} color={colors.accent} />
              </Box>
              <Heading size="2xl">Sign in to your MiFi</Heading>
            </VStack>

            <DeviceCard
              reachable={reachable}
              baseUrl={probeUrl}
              deviceName={deviceName}
            />

            {banner && (
              <HStack
                space="md"
                className="items-start rounded-3xl bg-destructive/10 p-4"
              >
                <ShieldAlert size={20} color={colors.destructive} />
                <Text className="flex-1 text-sm text-foreground">
                  {banner.message}
                </Text>
              </HStack>
            )}

            <VStack space="lg" className="rounded-3xl bg-card p-5">
              <FormControl isInvalid={passwordError !== null}>
                <FormControlLabel>
                  <FormControlLabelText>Password</FormControlLabelText>
                </FormControlLabel>
                <Input>
                  <InputField
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!seePassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="current-password"
                    textContentType="password"
                    returnKeyType="go"
                    onSubmitEditing={submit}
                    editable={!busy}
                    placeholder="••••••••"
                  />
                  <InputSlot
                    onPress={() => setSeePassword((v) => !v)}
                    accessibilityLabel={
                      seePassword ? "Hide password" : "Show password"
                    }
                    className="pr-1"
                  >
                    {seePassword ? (
                      <EyeOff size={18} color={colors.mutedForeground} />
                    ) : (
                      <Eye size={18} color={colors.mutedForeground} />
                    )}
                  </InputSlot>
                </Input>
                {passwordError && (
                  <FormControlError>
                    <FormControlErrorText>{passwordError}</FormControlErrorText>
                  </FormControlError>
                )}
                {error?.kind === "credentials" && !fieldError && (
                  <FormControlHelper>
                    <FormControlHelperText>
                      Each failed attempt counts toward the MiFi&apos;s sign-in
                      lockout.
                    </FormControlHelperText>
                  </FormControlHelper>
                )}
              </FormControl>

              <Pressable
                onPress={() => setShowAdvanced((v) => !v)}
                accessibilityRole="button"
                className="flex-row items-center justify-between"
              >
                <Text className="text-sm text-muted-foreground">
                  Username and device address
                </Text>
                {showAdvanced ? (
                  <ChevronUp size={18} color={colors.mutedForeground} />
                ) : (
                  <ChevronDown size={18} color={colors.mutedForeground} />
                )}
              </Pressable>

              {showAdvanced && (
                <VStack space="lg">
                  <FormControl isInvalid={errorFor("username") !== null}>
                    <FormControlLabel>
                      <FormControlLabelText>Username</FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
                        value={username}
                        onChangeText={setUsername}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="username"
                        editable={!busy}
                        placeholder={DEFAULT_USERNAME}
                      />
                    </Input>
                    {errorFor("username") && (
                      <FormControlError>
                        <FormControlErrorText>
                          {errorFor("username")}
                        </FormControlErrorText>
                      </FormControlError>
                    )}
                  </FormControl>

                  <FormControl isInvalid={errorFor("url") !== null}>
                    <FormControlLabel>
                      <FormControlLabelText>
                        Device address
                      </FormControlLabelText>
                    </FormControlLabel>
                    <Input>
                      <InputField
                        value={baseUrl}
                        onChangeText={setBaseUrl}
                        autoCapitalize="none"
                        autoCorrect={false}
                        keyboardType="url"
                        editable={!busy}
                        placeholder={DEFAULT_URL}
                      />
                    </Input>
                    {errorFor("url") && (
                      <FormControlError>
                        <FormControlErrorText>
                          {errorFor("url")}
                        </FormControlErrorText>
                      </FormControlError>
                    )}
                  </FormControl>
                </VStack>
              )}

              <Button
                size="lg"
                className="rounded-full"
                onPress={submit}
                isDisabled={busy || lockedMinutes !== null}
              >
                {busy && <ButtonSpinner color={colors.primaryForeground} />}
                <ButtonText>
                  {busy
                    ? "Signing in…"
                    : lockedMinutes
                      ? "Locked for now"
                      : "Sign in"}
                </ButtonText>
              </Button>
            </VStack>
          </VStack>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
