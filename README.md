# luci-app-engsel

OpenWrt LuCI app for MyXL account, quota, store, checkout, and transaction status.

Native C backend. No Python runtime on router.

Upstream reference:

```text
https://github.com/purplemashu/me-cli-sunset.git
```

## Packages

```text
engsel            1.0.0-r1
luci-app-engsel  1.0.0-r1
```

## LuCI

```text
Modem > Engsel
```

## CLI

```sh
engsel --help
```

## Config

```text
/etc/engsel/.env
/etc/config/engsel
/root/.engsel/
```

API keys are managed from:

```text
Modem > Engsel > Settings > Environment
```

## Build

```sh
make
make clean
```

GitHub Actions builds IPK and APK packages for the OpenWrt SDK matrix.

## Notes

```text
OpenWrt 24.10.x  -> IPK
OpenWrt 25.x     -> APK
```
