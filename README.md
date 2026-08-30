# decomm ca

A local certificate authority for a LAN that will never see Let's Encrypt. Keys stay in `--dir`.
Nothing phones home.

## Carry-in

On a connected machine, from this repo:

```sh
deno task compile
```

Copy this folder (including `bin/ca`) onto the isolated box.

```sh
./ca.sh init --dir ./ca-data --name "sandbox CA"
./ca.sh issue --dir ./ca-data --cn box.local --dns box.local --ip 10.0.0.5
./ca.sh trust --dir ./ca-data --out ./ca.pem
```

`ca.sh` uses the compiled binary if present, otherwise `deno run`.

## Commands

| Command              | What                              |
| -------------------- | --------------------------------- |
| `init`               | Create the root CA in `--dir`     |
| `issue --cn host`    | Host cert + key in `--dir/issued` |
| `list`               | Issued certs                      |
| `show`               | Root subject and PEM              |
| `trust --out ca.pem` | Trust bundle                      |

Env: `CA_DIR`. Repeat `--dns` / `--ip` as needed.

If Deno is on the box you can skip compile:

```sh
deno task ca -- init --dir ./ca-data
```
