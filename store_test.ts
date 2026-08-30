import { assert, assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { initCa, issueCert, listIssued, showCa, trustPem } from "./store.ts";

const tmp = async (): Promise<string> => await Deno.makeTempDir({ prefix: "decomm-ca-" });

Deno.test("init, issue, list, trust", async () => {
  const dir = await tmp();
  try {
    await initCa(dir, { name: "sandbox CA", years: 10 });
    const shown = await showCa(dir);
    assertStringIncludes(shown.subject, "sandbox CA");
    assertStringIncludes(shown.pem, "BEGIN CERTIFICATE");

    const issued = await issueCert(dir, {
      cn: "box.local",
      dns: ["box.local"],
      ips: ["10.0.0.5"],
      days: 30,
    });
    assertEquals(issued.slug, "box.local");
    assertStringIncludes(issued.certPem, "BEGIN CERTIFICATE");

    const rows = await listIssued(dir);
    assertEquals(rows.length, 1);
    assertEquals(rows[0]?.cn, "box.local");
    assertEquals(rows[0]?.ips, ["10.0.0.5"]);

    const trust = await trustPem(dir);
    assertEquals(trust, shown.pem);

    await assertRejects(() => initCa(dir, { name: "x", years: 1 }), Error, "already exists");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("same folder layout after issue", async () => {
  const dir = await tmp();
  try {
    await initCa(dir, { name: "ca", years: 2 });
    await issueCert(dir, { cn: "a.local", dns: [], ips: [], days: 7 });
    const names = [];
    for await (const entry of Deno.readDir(`${dir}/issued`)) names.push(entry.name);
    names.sort();
    assert(names.includes("a.local.pem"));
    assert(names.includes("a.local.key.pem"));
    assert(names.includes("a.local.json"));
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});
