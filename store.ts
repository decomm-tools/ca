import {
  certPem,
  createRoot,
  exportKeyPem,
  generateKey,
  importKeyPem,
  issueLeaf,
  parseCert,
} from "./cert.ts";

const join = (root: string, ...parts: string[]): string => [root, ...parts].join("/");

export const CA_CERT = "ca.pem";
export const CA_KEY = "ca.key.pem";

export type IssuedMeta = {
  cn: string;
  dns: string[];
  ips: string[];
  notAfter: string;
  serial: string;
};

export const ensureDir = async (path: string): Promise<void> => {
  await Deno.mkdir(path, { recursive: true });
};

export const initCa = async (
  dir: string,
  options: { name: string; years: number },
): Promise<void> => {
  await ensureDir(dir);
  const certPath = join(dir, CA_CERT);
  try {
    await Deno.stat(certPath);
    throw new Error(`CA already exists in ${dir}`);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("CA already exists")) throw error;
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  }
  const keys = await generateKey();
  const cert = await createRoot(keys, options);
  await Deno.writeTextFile(certPath, certPem(cert));
  await Deno.writeTextFile(join(dir, CA_KEY), await exportKeyPem(keys.privateKey));
  await ensureDir(join(dir, "issued"));
};

const loadCa = async (dir: string) => {
  const pem = await Deno.readTextFile(join(dir, CA_CERT));
  const keyPem = await Deno.readTextFile(join(dir, CA_KEY));
  return {
    cert: parseCert(pem),
    key: await importKeyPem(keyPem),
    pem,
  };
};

const slug = (cn: string): string =>
  cn.replaceAll(/[^a-zA-Z0-9._-]+/g, "-").replaceAll(/^-+|-+$/g, "") || "host";

export const issueCert = async (
  dir: string,
  options: { cn: string; dns: string[]; ips: string[]; days: number },
): Promise<{ slug: string; certPem: string }> => {
  const ca = await loadCa(dir);
  const keys = await generateKey();
  const dns = options.dns.length > 0 ? options.dns : [options.cn];
  const cert = await issueLeaf(ca.cert, ca.key, keys, {
    cn: options.cn,
    dns,
    ips: options.ips,
    days: options.days,
  });
  const name = slug(options.cn);
  const issued = join(dir, "issued");
  await ensureDir(issued);
  const pem = certPem(cert);
  await Deno.writeTextFile(join(issued, `${name}.pem`), pem);
  await Deno.writeTextFile(join(issued, `${name}.key.pem`), await exportKeyPem(keys.privateKey));
  const meta: IssuedMeta = {
    cn: options.cn,
    dns,
    ips: options.ips,
    notAfter: cert.notAfter.toISOString(),
    serial: cert.serialNumber,
  };
  await Deno.writeTextFile(join(issued, `${name}.json`), JSON.stringify(meta, null, 2) + "\n");
  return { slug: name, certPem: pem };
};

export const listIssued = async (dir: string): Promise<IssuedMeta[]> => {
  const issued = join(dir, "issued");
  const out: IssuedMeta[] = [];
  try {
    for await (const entry of Deno.readDir(issued)) {
      if (!entry.isFile || !entry.name.endsWith(".json")) continue;
      const raw = await Deno.readTextFile(join(issued, entry.name));
      out.push(JSON.parse(raw) as IssuedMeta);
    }
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return [];
    throw error;
  }
  return out.sort((a, b) => a.cn.localeCompare(b.cn));
};

export const showCa = async (
  dir: string,
): Promise<{ subject: string; notAfter: string; pem: string }> => {
  const ca = await loadCa(dir);
  return {
    subject: ca.cert.subject,
    notAfter: ca.cert.notAfter.toISOString(),
    pem: ca.pem,
  };
};

export const trustPem = async (dir: string): Promise<string> =>
  await Deno.readTextFile(join(dir, CA_CERT));
