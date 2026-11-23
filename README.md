# decomm ca

A local certificate authority for a LAN that will never see Let's Encrypt. Keys stay in `--dir`.
Nothing phones home.

## Commands

| Command              | What                              |
| -------------------- | --------------------------------- |
| `init`               | Create the root CA in `--dir`     |
| `issue --cn host`    | Host cert + key in `--dir/issued` |
| `list`               | Issued certs                      |
| `show`               | Root subject and PEM              |
| `trust --out ca.pem` | Trust bundle                      |

`--dir` defaults to `./ca-data`, or `CA_DIR`. Repeat `--dns` / `--ip` as needed.

## Folder layout

```
ca-data/
  ca.pem                  root certificate
  ca.key.pem              root key (keep it on the box)
  issued/
    box.local.pem         host certificate
    box.local.key.pem     host key
    box.local.json        serial, names, expiry
```

## Carry-in

Init on a connected machine. Compile. Copy the folder. Run dark.

### Init

```sh
deno run -A jsr:@decomm/ca/init ./ca
cd ca
```

### Compile

```sh
deno task compile
```

That leaves `bin/ca`. Or from this repo: `deno task compile`.

### Copy

Carry the whole `ca/` folder onto the isolated box — USB, sneakernet,
[ferry](https://github.com/decomm-tools/ferry). Include `bin/`.

### Run dark

No network. The box never needs to come back online.

```sh
./ca.sh --dir ./ca-data init --name "sandbox CA"
./ca.sh --dir ./ca-data issue --cn box.local --dns box.local --ip 10.0.0.5
./ca.sh --dir ./ca-data list
./ca.sh --dir ./ca-data trust --out ./ca.pem
```

Install `ca.pem` as a trusted root on each client.

`ca.sh` uses the compiled binary if present, otherwise `deno run`. The isolated box does not need
Deno if you compiled first.
