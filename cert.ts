import * as x509 from "@peculiar/x509";
import { fromPem, toPem } from "./pem.ts";

x509.cryptoProvider.set(crypto);

const EC: EcKeyGenParams = { name: "ECDSA", namedCurve: "P-256" };
const SIGN: EcdsaParams = { name: "ECDSA", hash: "SHA-256" };

export type KeyPair = CryptoKeyPair;

export const generateKey = (): Promise<KeyPair> =>
  crypto.subtle.generateKey(EC, true, ["sign", "verify"]);

export const exportKeyPem = async (key: CryptoKey): Promise<string> => {
  const der = await crypto.subtle.exportKey("pkcs8", key);
  return toPem("PRIVATE KEY", der);
};

export const importKeyPem = async (pem: string): Promise<CryptoKey> => {
  const der = fromPem(pem);
  return await crypto.subtle.importKey("pkcs8", der, EC, true, ["sign"]);
};

export const randomSerial = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[0] = bytes[0]! & 0x7f;
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const yearsFromNow = (years: number): Date => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + years);
  return d;
};

const daysFromNow = (days: number): Date => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

export type CaOptions = {
  name: string;
  years: number;
};

export const createRoot = async (
  keys: KeyPair,
  options: CaOptions,
): Promise<x509.X509Certificate> => {
  const name = `CN=${options.name},O=decomm`;
  return await x509.X509CertificateGenerator.createSelfSigned({
    serialNumber: randomSerial(),
    name,
    notBefore: new Date(),
    notAfter: yearsFromNow(options.years),
    signingAlgorithm: SIGN,
    keys,
    extensions: [
      new x509.BasicConstraintsExtension(true, undefined, true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.keyCertSign | x509.KeyUsageFlags.cRLSign,
        true,
      ),
      await x509.SubjectKeyIdentifierExtension.create(keys.publicKey),
    ],
  });
};

export type IssueOptions = {
  cn: string;
  dns: string[];
  ips: string[];
  days: number;
};

export const issueLeaf = async (
  ca: x509.X509Certificate,
  caKey: CryptoKey,
  leafKeys: KeyPair,
  options: IssueOptions,
): Promise<x509.X509Certificate> => {
  const names: string[] = [];
  for (const dns of options.dns) names.push(`DNS:${dns}`);
  for (const ip of options.ips) names.push(`IP:${ip}`);
  if (!options.dns.includes(options.cn) && !options.ips.includes(options.cn)) {
    names.unshift(`DNS:${options.cn}`);
  }
  const alt = names.length > 0
    ? new x509.SubjectAlternativeNameExtension(
      [
        ...options.dns.map((value) => ({ type: "dns" as const, value })),
        ...options.ips.map((value) => ({ type: "ip" as const, value })),
      ],
      false,
    )
    : undefined;

  return await x509.X509CertificateGenerator.create({
    serialNumber: randomSerial(),
    subject: `CN=${options.cn},O=decomm`,
    issuer: ca.subject,
    notBefore: new Date(),
    notAfter: daysFromNow(options.days),
    signingAlgorithm: SIGN,
    publicKey: leafKeys.publicKey,
    signingKey: caKey,
    extensions: [
      new x509.BasicConstraintsExtension(false, undefined, true),
      new x509.KeyUsagesExtension(
        x509.KeyUsageFlags.digitalSignature | x509.KeyUsageFlags.keyEncipherment,
        true,
      ),
      new x509.ExtendedKeyUsageExtension([x509.ExtendedKeyUsage.serverAuth], false),
      await x509.AuthorityKeyIdentifierExtension.create(ca),
      await x509.SubjectKeyIdentifierExtension.create(leafKeys.publicKey),
      ...(alt ? [alt] : []),
    ],
  });
};

export const certPem = (cert: x509.X509Certificate): string => cert.toString("pem") + "\n";

export const parseCert = (pem: string): x509.X509Certificate =>
  new x509.X509Certificate(fromPem(pem));
