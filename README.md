### GlueChat: Modern & Secure Communication

**GlueChat** is a cutting-edge desktop messaging application built with a "Privacy-First" philosophy. It is designed to protect your conversations not only from today's threats but also from future challenges posed by quantum computing.

---

### 🛡️ Security Architecture & Roadmap

GlueChat implements a multi-layered security model to ensure that your data remains yours alone.

#### 1. Hybrid Post-Quantum Cryptography (X-Wing)
We utilize the **X-Wing** hybrid Key Encapsulation Mechanism (KEM).
- **Hybrid Approach:** It combines the classic **X25519** (Elliptic Curve) with **ML-KEM-768** (Kyber), a NIST-standardized post-quantum algorithm.
- **Why it matters:** This protects against "Harvest Now, Decrypt Later" attacks, where encrypted data intercepted today could be decrypted by a powerful quantum computer in the future.

#### 2. Double Ratchet Protocol (Upcoming)
To provide the highest level of session security, we are integrating the **Double Ratchet** protocol (pioneered by Signal).
- **Forward Secrecy:** Every message is encrypted with a unique, one-time key. If a key is ever compromised, only that single message is at risk—past conversations remain secure.
- **Break-in Recovery:** The system automatically "heals" by generating new independent keys with every message exchange, preventing an attacker from eavesdropping on future messages even after a temporary breach.

#### 3. Secure Local Storage
Your private keys never leave your machine. GlueChat leverages **Keytar** to store sensitive cryptographic material in your operating system's native secure vault:
- **macOS:** Keychain Access
- **Windows:** Credentials Manager
- **Linux:** Secret Service / libsecret

---

### 🚀 Technical Stack

- **Frontend:** [React](https://reactjs.org/) + [Vite](https://vitejs.dev/) + [TailwindCSS](https://tailwindcss.com/)
- **Desktop Shell:** [Electron](https://www.electronjs.org/)
- **Backend:** [Bun](https://bun.sh/) + [Elysia](https://elysiajs.com/)
- **Database:** [Prisma](https://www.prisma.io/) + MySQL/MariaDB
- **Crypto:** [@noble/post-quantum](https://github.com/paulmillr/noble-post-quantum)

---

### 🛠️ Prisma Setup Guide

To prepare the database for GlueChat's encryption features (storing public keys and long encrypted blobs), follow these steps:

#### 1. Initialize Prisma
If you haven't already, install the dependencies and initialize Prisma in the server directory:
```bash
cd server
bun add prisma -d
bun add @prisma/client
bunx prisma init
```

#### 2. Define the Schema
Ensure your `server/src/prisma/schema.prisma` includes the necessary fields for E2EE:

```prisma
// User model with Public Key support
model User {
  id        String   @id @default(cuid())
  nickname  String   @unique
  password  String
  publicKey String   @db.Text // Required for E2EE exchange
  // ... other fields
}

// Message model with LongText for encrypted payloads
model Message {
  id            String      @id @default(cuid())
  content       String      @db.LongText // Encrypted strings are much longer
  // ... relations
}
```

#### 3. Database Migration
Apply the changes to your database and regenerate the client:
```bash
# Generate migrations and update database
bunx prisma migrate dev --name init_e2ee_schema

# Generate Prisma Client
bunx prisma generate
```

#### 4. Usage in Code
Access the prisma client in your services:
```typescript
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

// Example: Saving a user with their X-Wing Public Key
await prisma.user.create({
  data: {
    nickname: "Alice",
    password: hashedPassword,
    publicKey: xwingPublicKeyBase64
  }
})
```

---

### 📝 Project Status
GlueChat is currently in **Alpha**. The foundations for hybrid key generation and secure local storage are implemented. Our next milestone is the full implementation of the Double Ratchet session management for real-time chats.