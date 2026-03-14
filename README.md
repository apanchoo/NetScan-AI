<p align="center">
  <img src="src-tauri/icons/Square310x310Logo.png" alt="NetScan-AI Logo" width="120" />
</p>

<h1 align="center">NetScan-AI</h1>

<p align="center">
  Fork of <a href="https://github.com/Sonar-team/Sonar_desktop_app">Sonar</a> — AI-powered network traffic analyzer built with Rust and Tauri.<br/>
  Captures network traffic, generates flow matrices, and lays the groundwork for AI-driven anomaly detection.
</p>

---

## About this fork

This project is a fork of [Sonar](https://github.com/Sonar-team/Sonar_desktop_app), an open-source desktop app for network traffic capture and flow matrix generation.

The goal of NetScan-AI is to build on top of Sonar's solid capture engine and add AI capabilities:

- **Anomaly detection** — flag unusual traffic patterns automatically
- **Traffic classification** — identify applications and protocols with ML models
- **Flow prediction** — anticipate network behaviour over time
- **Natural language queries** — filter and explore captures using plain language

This is a work in progress. Contributions and ideas are welcome.

---

## Features

### Network Capture Engine

- Configures the selected network interface in **promiscuous mode**
- Reconstructs packet metadata in real time and maps traffic relationships
- BPF filter builder with preset rules and live preview
- Import `.pcap` files for offline analysis
- Supports the following protocols:

  - Ethernet (MAC), VLAN (802.1Q)
  - IPv4, IPv6, ARP
  - ICMPv4, ICMPv6
  - UDP, TCP
  - HTTP, DNS, TLS, QUIC

### UI

- Dark theme desktop app (Tauri 2 + Vue 3)
- Network graph visualisation with node inspection
- Real-time packet table
- Custom error dialogs with actionable guidance (including CAP\_NET\_RAW fix)

---

## System Dependencies

### Linux

- **libpcap-dev** — packet capture library:

  ```bash
  sudo apt install libpcap-dev
  ```

- **Non-root capture** — grant network capabilities to the binary:

  ```bash
  sudo setcap cap_net_raw,cap_net_admin=eip src-tauri/target/debug/netscan-ai
  ```

  > Re-run after each recompile.

### NixOS

A `shell.nix` is provided at the root. It includes `libpcap` and `libcap`.

```bash
nix-shell
sudo setcap cap_net_raw,cap_net_admin=eip src-tauri/target/debug/netscan-ai
```

### Windows

- **NPcap** — required for packet capture. Also install the **WinPcap Developer Pack**.
- Add the `/Lib` or `/Lib/x64` folder to the `LIB` environment variable.

### macOS

- **libpcap** is included by default. No additional setup required.

---

## Development

```bash
# Install frontend deps
npm install

# Run in dev mode
npm run tauri dev
```

---

## License

AGPL-3.0 — see [LICENSE.md](LICENSE.md).

This project is a fork of [Sonar](https://github.com/Sonar-team/Sonar_desktop_app) by the Sonar team.
