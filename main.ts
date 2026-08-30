import { parseArgs } from "./args.ts";
import { initCa, issueCert, listIssued, showCa, trustPem } from "./store.ts";

const HELP = `decomm ca

A local certificate authority for a LAN that will never see Let's Encrypt.

Commands:
  init    Create a root CA in --dir
  issue   Issue a host certificate
  list    List issued certs
  show    Print the root CA
  trust   Write the trust bundle (ca.pem)

Examples:
  ./ca.sh init --dir ./ca-data --name "sandbox CA"
  ./ca.sh issue --dir ./ca-data --cn box.local --dns box.local --ip 10.0.0.5
  ./ca.sh list --dir ./ca-data
  ./ca.sh trust --dir ./ca-data --out ./ca.pem

Env: CA_DIR

Compile on a connected machine (no Deno needed on the far side):
  deno task compile
`;

const run = async (argv: string[]): Promise<string> => {
  const args = parseArgs(argv);
  if (args.help || args.command === "" || args.command === "help") return HELP;

  switch (args.command) {
    case "init": {
      await initCa(args.dir, { name: args.name, years: args.years });
      return `CA created in ${args.dir}\n`;
    }
    case "issue": {
      const cn = args.cn;
      if (!cn) throw new Error("issue needs --cn (or a hostname argument)");
      const result = await issueCert(args.dir, {
        cn,
        dns: args.dns,
        ips: args.ips,
        days: args.days,
      });
      return `Issued ${result.slug} in ${args.dir}/issued\n`;
    }
    case "list": {
      const rows = await listIssued(args.dir);
      if (rows.length === 0) return "No issued certificates.\n";
      return rows.map((row) =>
        `${row.cn}  serial=${row.serial}  until=${row.notAfter}` +
        (row.dns.length ? `  dns=${row.dns.join(",")}` : "") +
        (row.ips.length ? `  ip=${row.ips.join(",")}` : "")
      ).join("\n") + "\n";
    }
    case "show": {
      const ca = await showCa(args.dir);
      return `${ca.subject}\nnotAfter ${ca.notAfter}\n\n${ca.pem}`;
    }
    case "trust": {
      const pem = await trustPem(args.dir);
      if (args.out) {
        await Deno.writeTextFile(args.out, pem);
        return `Wrote ${args.out}\n`;
      }
      return pem;
    }
    default:
      throw new Error(`Unknown command: ${args.command}`);
  }
};

export { HELP, run };

if (import.meta.main) {
  try {
    const out = await run(Deno.args);
    console.log(out.endsWith("\n") ? out.slice(0, -1) : out);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    Deno.exit(1);
  }
}
