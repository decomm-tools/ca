const wrap = (label: string, der: ArrayBuffer): string => {
  const b64 = btoa(String.fromCharCode(...new Uint8Array(der)));
  const lines = b64.match(/.{1,64}/g) ?? [b64];
  return `-----BEGIN ${label}-----\n${lines.join("\n")}\n-----END ${label}-----\n`;
};

export const toPem = (label: string, der: ArrayBuffer): string => wrap(label, der);

export const fromPem = (pem: string): ArrayBuffer => {
  const body = pem.replace(/-----BEGIN [^-]+-----/, "").replace(
    /-----END [^-]+-----/,
    "",
  ).replaceAll(/\s/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
};

export const pemLabel = (pem: string): string => {
  const match = pem.match(/-----BEGIN ([^-]+)-----/);
  return match?.[1] ?? "";
};
