***

# GlueChat

<p align="center">
    <img src="./client/gluechat/resources/icon.jpg" alt="GlueChat Logo" width="250">
</p>
<h1 align="center"> Post-quantum end-to-end encrypted messenger </h1>

<p align="center">
  <img src="https://img.shields.io/badge/Version-0.2 Seleant-blue?style=for-the-badge" alt="Version">
  <img src="https://img.shields.io/badge/License-AGPLv3-red?style=for-the-badge" alt="License">
  <img src="https://img.shields.io/badge/Post--Quantum-Ready-8A2BE2?style=for-the-badge" alt="Post-Quantum Ready">
  <img src="https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white" alt="Typescript">
  <img src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React">
  <img src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white" alt="Electron">
  <img src="https://img.shields.io/badge/Bun-000000?style=for-the-badge&logo=bun&logoColor=white" alt="Bun">
</p>

> **"Security is not a feature. It's the architecture."**

GlueChat is a desktop messaging app built around a “Privacy-First” philosophy. It is designed to protect your conversations not only from today's threats, but also from the challenges posed by the development of quantum computers.

___

## 🏴‍☠️ Core Philosophy: Strong Anonymity

1. **Minimal PII:** We do not store phone numbers, IP addresses, and plaintext emails.
2. **Local-First:** Your chat history lives exclusively on your device's SQLite. We never sync plaintext history to the cloud. 
3. **Strict Ephemeral Messages:** The server stores messages only temporarily for offline users. Once a message has been delivered and read by the recipient, it is immediately deleted from the server.

**Note:** Email addresses are used exclusively for optional account recovery and password reset. They are stored in hashed form only and never in plaintext.

---

## 🛡️ Security Architecture

GlueChat implements a multi-layered security model, ensuring that your data remains yours alone.

### 1. Hybrid Post-Quantum Cryptography (X-Wing)
*   **Hybrid approach:** We combine classical **X25519** (elliptic curves) with **ML-KEM-768** (Kyber), the NIST standard for quantum-resistant algorithms.
* **Cipher:** XChaCha20-Poly1305
* **KEM:** ML-KEM-768 (via X-Wing construct)
* **Hashing:** SHA256 & Argon2id
* **Signatures:** ML-DSA87

### 2. Secure Local Storage
Your private keys never leave your device. GlueChat uses **SQLite** to store sensitive cryptographic material, which is encrypted at the application level.

---

## ⚡ Technical Stack

We use a modern technology stack that ensures performance and security.

### Client (Desktop)
*   **Framework:** React + Vite
*   **Desktop Shell:** Electron
*   **Styling:** TailwindCSS

### Backend
*   **Runtime:** Bun
*   **Framework:** Elysia
*   **Database:** MySQL (via Prisma ORM)
*   **Crypto:** [@noble/post-quantum](https://github.com/paulmillr/noble-post-quantum) , [@noble/ciphers](https://github.com/paulmillr/noble-ciphers)

---

## 🚀 Deployment & Infrastructure

### Local Development Quick Start

*Prerequisites: Node.js, Bun, MySQL/MariaDB.*

#### 1. Setup Client
```bash
cd client/gluechat
npm install
npm run dev
```
create the .env and config.ts file with your server URL:
```env

// client/gluechat/.env

VITE_API_URL="https://glueeed.dev:2115" # change this to your server URL
VITE_APP_VERSION="0.2"
VITE_APP_VERSION_NAME="beta v0.2"

// client/gluechat/src/main/config.ts

export const API_BASE_URL = 'https://glueeed.dev:2115'; #  change this to your server URL


```


#### 2. Setup Backend
Update a `.env` file in the `server` directory based on `.env.example`:
```env
DATABASE_URL="mysql://user:password@host:3306/database"
DATABASE_USER="user"
DATABASE_PASSWORD="password"
DATABASE_NAME="database"
DATABASE_HOST="localhost"
DATABASE_PORT=3306
JWT_SECRET="your_super_secret_key"
RECOVER_SECRET="your_super_secret_key"
ADMIN_API_KEY="secret"
VERSION=" app version"
ENCRYPT_KEY_2FA="secret"
MAIL_HOST="YOURHOST" # ex. smtp.gmail.com
MAIL_USER="USER"
MAIL_PASSWORD="PASSWORD"
HMAC_KEY="your_very_strong_key"
BASE_URL="your doman"
```

Run the server:
```bash
cd server
bun install
bun run dev
```

#### 3. Prisma Schema
To prepare the database:
```bash
cd server
bunx prisma migrate dev --name init_e2ee_schema
bunx prisma generate
```

*(Tip: the full Prisma schema is located in `server/prisma/schema.prisma`)*

---

## 📝 Project Status

GlueChat is currently in the **Beta** phase.

**Completed milestones:**
- [x] Security foundations: implementation of hybrid key generation (X-Wing).
- [x] Secure local storage using SQLite.
- [x] Real-time communication: WebSockets with E2EE.
- [x] Relationship management: friend invitation system.
- [x] Saving decrypted messages to local history.
- [x] Support for synchronization between multiple devices.

**Next steps:**
- [ ] Full implementation of the Double Ratchet protocol.
- [ ] Send files and images with E2EE.
- [ ] Group chat functionality with end-to-end encryption.
- [ ] Voice and video calls with end-to-end encryption.
---


## 👨‍💻 Author

**Glueeed**
*Creator & Lead Architect of GlueChat*

- 🐙 GitHub: [@Glueeed](https://github.com/glueeeeed)
- 🌐 Website: [portfolio](https://glueeed.dev)
- 👨‍💻 Contact: [official Gluechat Discord](https://discord.gg/5HZVxES5b)

---

## ⚖️ License & Commercial Use

GlueChat is distributed under the **[AGPL-3.0 License](LICENSE)**.

This guarantees that GlueChat remains free and open-source for the community. However, network use (SaaS) of this software requires you to open-source your entire project.

**What this means:** You are free to use, modify, and distribute this software. However, if you modify GlueChat and run it as a public service (SaaS), you **must** release your modified source code to your users under the same AGPLv3 license.

---

<pre>
 ██████╗ ██╗     ██╗   ██╗███████╗ ██████╗██╗  ██╗ █████╗ ████████╗
██╔════╝ ██║     ██║   ██║██╔════╝██╔════╝██║  ██║██╔══██╗╚══██╔══╝
██║  ███╗██║     ██║   ██║█████╗  ██║     ███████║███████║   ██║   
██║   ██║██║     ██║   ██║██╔══╝  ██║     ██╔══██║██╔══██║   ██║   
╚██████╔╝███████╗╚██████╔╝███████╗╚██████╗██║  ██║██║  ██║   ██║   
 ╚═════╝ ╚══════╝ ╚═════╝ ╚══════╝ ╚═════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   
</pre>

<div align="center">
  <p>GlueChat &copy; 2026</p>
</div>
