export type CaArgs = {
  command: string;
  dir: string;
  name: string;
  cn: string;
  dns: string[];
  ips: string[];
  years: number;
  days: number;
  out?: string;
  help: boolean;
};

const take = (args: string[], i: number, flag: string): string => {
  const value = args[i];
  if (!value || value.startsWith("-")) throw new Error(`${flag} needs a value`);
  return value;
};

export const parseArgs = (argv: string[]): CaArgs => {
  const parsed: CaArgs = {
    command: "",
    dir: Deno.env.get("CA_DIR") ?? "./ca-data",
    name: "decomm CA",
    cn: "",
    dns: [],
    ips: [],
    years: 10,
    days: 365,
    help: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]!;
    if (arg === "--help" || arg === "-h") parsed.help = true;
    else if (arg === "--dir") parsed.dir = take(argv, ++i, "--dir");
    else if (arg === "--name") parsed.name = take(argv, ++i, "--name");
    else if (arg === "--cn") parsed.cn = take(argv, ++i, "--cn");
    else if (arg === "--dns") parsed.dns.push(take(argv, ++i, "--dns"));
    else if (arg === "--ip") parsed.ips.push(take(argv, ++i, "--ip"));
    else if (arg === "--years") parsed.years = Number(take(argv, ++i, "--years"));
    else if (arg === "--days") parsed.days = Number(take(argv, ++i, "--days"));
    else if (arg === "--out") parsed.out = take(argv, ++i, "--out");
    else if (!arg.startsWith("-") && parsed.command === "") parsed.command = arg;
    else if (!arg.startsWith("-") && parsed.cn === "") parsed.cn = arg;
    else throw new Error(`Unknown argument: ${arg}`);
  }
  return parsed;
};
