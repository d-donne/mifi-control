import * as Crypto from "expo-crypto";

/**
 * hash for huawei's password_type 4 schema
 */
export async function huaweiPasswordHash(password: string): Promise<string> {
  const hex = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    password,
    { encoding: Crypto.CryptoEncoding.HEX },
  );
  return btoa(hex);
}


export async function encodePassword(username: string, password: string, token: string): Promise<string> {
  const innerHash = await huaweiPasswordHash(password);
  return await huaweiPasswordHash(`${username}${innerHash}${token}`);
}