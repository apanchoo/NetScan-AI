<p align="center">
  <img src="src-tauri/icons/Square310x310Logo.png" alt="NetScan-AI Logo" width="120" />
</p>

<h1 align="center">NetScan-AI</h1>

<p align="center">
  Fork of <a href="https://github.com/Sonar-team/Sonar_desktop_app">Sonar</a> — AI-powered network traffic analyzer built with Rust and Tauri.<br/>
  Captures network traffic, generates flow matrices, and lets you control the app in natural language via an integrated AI assistant.
</p>

---

## About this fork

This project is a fork of [Sonar](https://github.com/Sonar-team/Sonar_desktop_app), an open-source desktop app for network traffic capture and flow matrix generation.

The goal of NetScan-AI is to build on top of Sonar's solid capture engine and add AI capabilities:

- **Natural language control** — start/stop capture, apply BPF filters, export data, and query traffic using plain language ✅
- **Flow matrix analysis** — ask the AI to summarize hosts, protocols, and anomalies in captured traffic ✅
- **Anomaly detection** — flag unusual traffic patterns automatically *(planned)*
- **Traffic classification** — identify applications and protocols with ML models *(planned)*
- **Flow prediction** — anticipate network behaviour over time *(planned)*

---

## Features

### AI Assistant

- **Integrated chat panel** — VS Code-style sidebar (toggle with `Ctrl+I`), open by default
- **Multi-provider support** — connect to any of:
  - [Anthropic](https://www.anthropic.com/) (Claude)
  - [OpenAI](https://platform.openai.com/) (GPT-4o, etc.)
  - [Google Gemini](https://ai.google.dev/)
  - [LM Studio](https://lmstudio.ai/) — local models, no API key required
  - Any OpenAI-compatible endpoint
- **Tool calling** — the AI can directly:
  - Start / stop / reset capture
  - Apply or clear BPF filters
  - Read and summarize the current flow matrix
  - Export the flow matrix to CSV
- **CORS bypass** — HTTP requests to local servers (LM Studio) are routed through a Rust proxy, no browser CORS issues

### Network Capture Engine

- Configures the selected network interface in **promiscuous mode**
- Reconstructs packet metadata in real time and maps traffic relationships
- BPF filter builder with preset rules and live preview
- Import `.pcap` files for offline analysis
- **PCAP recording** — automatically saves a `.pcap` file to the Downloads folder whenever a capture session is started
- Supports the following protocols:

  - Ethernet (MAC), VLAN (802.1Q)
  - IPv4, IPv6, ARP
  - ICMPv4, ICMPv6
  - UDP, TCP
  - HTTP, DNS, TLS, QUIC

### Network Graph

- **Force-directed layout** with toggleable gravity
- **Device fingerprinting** — nodes are automatically identified by MAC OUI and IP heuristics and display a matching icon:
  - Router / Switch (Cisco, Ubiquiti, TP-Link, Huawei…)
  - Server
  - Desktop / PC (Dell, HP, Intel, Lenovo…)
  - Mobile / Tablet (Samsung, Huawei, Xiaomi, Google…)
  - Apple device
  - Windows PC (Microsoft OUI)
  - Linux / Raspberry Pi
  - Printer (HP, Canon, Epson, Brother…)
  - Virtual Machine (VMware, VirtualBox)
  - Internet (public IPs)
- **Colored ring** around each node indicates private (blue/green) vs public (orange) address
- **Manual override** — click a node and change its device type from the dropdown in the info panel
- Node label editing with backend persistence
- **Export graph** as PNG (2× scale, white background) or SVG via the Save dropdown in the toolbar

### Export & Rules

- **CSV export** — full flow matrix as a spreadsheet
- **Snort rules** — generate `.rules` file from captured flows
- **Suricata rules** — generate `.rules` file with metadata headers
- **iptables script** — generate a bash script with ACCEPT rules for observed traffic

### UI

- Dark theme desktop app (Tauri 2 + Vue 3)
- Real-time packet table with scroll-to-bottom and auto-pause on manual scroll
- High-performance rendering — packets are batched via `requestAnimationFrame` to avoid UI freeze during high-traffic captures
- Custom error dialogs with actionable guidance (including `CAP_NET_RAW` fix)
- VS Code-style AI sidebar that pushes content rather than overlaying it

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
