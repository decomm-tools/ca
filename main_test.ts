import { assertEquals, assertStringIncludes } from "@std/assert";
import { run } from "./main.ts";

Deno.test("help", async () => {
  const text = await run(["--help"]);
  assertStringIncludes(text, "decomm ca");
  assertStringIncludes(text, "compile");
});

Deno.test("cli init and issue", async () => {
  const dir = await Deno.makeTempDir({ prefix: "decomm-ca-cli-" });
  try {
    assertStringIncludes(await run(["init", "--dir", dir, "--name", "cli CA"]), "created");
    assertStringIncludes(
      await run(["issue", "--dir", dir, "--cn", "host.local", "--ip", "127.0.0.1"]),
      "Issued host.local",
    );
    const list = await run(["list", "--dir", dir]);
    assertStringIncludes(list, "host.local");
    const trust = await run(["trust", "--dir", dir]);
    assertStringIncludes(trust, "BEGIN CERTIFICATE");
  } finally {
    await Deno.remove(dir, { recursive: true });
  }
});

Deno.test("unknown command", async () => {
  try {
    await run(["nope"]);
    throw new Error("expected throw");
  } catch (error) {
    assertEquals(error instanceof Error, true);
    assertStringIncludes((error as Error).message, "Unknown command");
  }
});
