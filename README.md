### GlueChat: Modern & Secure Communication

**GlueChat** is a cutting-edge desktop messaging application built with a "Privacy-First" philosophy. It is designed to protect your conversations not only from today's threats but also from future challenges posed by quantum computing.

---

### 🛡️ Security Architecture & Roadmap

GlueChat implements a multi-layered security model to ensure that your data remains yours alone.

#### 1. Hybrid Post-Quantum Cryptography (X-Wing)
We utilize the **X-Wing** hybrid Key Encapsulation Mechanism (KEM).
- **Hybrid Approach:** It combines the classic **X25519** (Elliptic Curve) with **ML-KEM-768** (Kyber), a NIST-standardized post-quantum algorithm.
- **Why it matters:** This protects against "Harvest Now, Decrypt Later" attacks, where encrypted data intercepted today could be decrypted by a powerful quantum computer in the future.

#### 2. Double Ratchet Protocol
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

### 🖥️ Client Setup (Electron + React) 

#### 1. Install Dependencies
Navigate to the client directory and install the necessary packages:
```bash
cd client/gluechat
npm install
```

#### 2. Run in Development Mode
Start the Vite development server and launch the Electron window:
```bash
npm run dev
```

---


### ⚙️ Backend Setup (Bun + Elysia)

#### 1. Environment Variables
Create a `.env` file in the `server` directory and configure your database connection string (required by Prisma) and any necessary secrets:
```env
DATABASE_URL="mysql://user:password@localhost:3306/gluechat"
DATABASE_USER="username"
DATABASE_PASSWORD="password"
DATABASE_NAME="gluechat"
DATABASE_HOST="localhost"
DATABASE_PORT=3306
JWT_SECRET="your_super_secret_key"
```

#### 2. Install Dependencies
Use **Bun** to install the server-side packages:
```bash
cd server
bun install
```

#### 3. Start the Server
Run the server in watch mode for development:
```bash
bun run dev
```


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

#### 2. Database Migration
Apply the changes to your database and regenerate the client:
```bash
# Generate migrations and update database
bunx prisma migrate dev --name init_e2ee_schema

# Generate Prisma Client
bunx prisma generate
```
---

#### 3. Prisma Schema


```prisma
// server/prisma/schema.prisma


model User {
  id        String   @id @default(cuid())
  nickname  String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  lastSeen  DateTime @default(now())

  oneTimePreKeys       OneTimePreKeys[] @relation("SignedToUser")
  signedPreKeys        SignedPreKeys[]  @relation("SignedToUser")
  identityKeys         IdentityKeys[]   @relation("SignedToUser")
  sentMessages         Message[]
  privateRoomsAsFirst  PrivateRoom[]    @relation("PrivateRoomUser1")
  privateRoomsAsSecond PrivateRoom[]    @relation("PrivateRoomUser2")
  sentRequests         Friendship[]     @relation("SentRequests")
  receivedRequests     Friendship[]     @relation("ReceivedRequests")
  sessions             Sessions[]
}

model PrivateRoom {
  id        String   @id @default(cuid())
  userId    String
  userId2   String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  messages Message[]

  user1 User @relation("PrivateRoomUser1", fields: [userId], references: [id], onDelete: Cascade)
  user2 User @relation("PrivateRoomUser2", fields: [userId2], references: [id], onDelete: Cascade)

  @@unique([userId, userId2])
  @@index([userId])
  @@index([userId2])
}

model Message {
  id              String   @id @default(cuid())
  roomID          String
  senderId        String
  capsule         String?  @db.LongText
  ephemeralPubKey String?  @db.LongText
  salt            String?
  content         String   @db.LongText
  nonce           String
  createdAt       DateTime @default(now())
  isDeleted       Boolean
  isSeen          Boolean

  privateRoom PrivateRoom @relation(fields: [roomID], references: [id], onDelete: Cascade)
  sender      User        @relation(fields: [senderId], references: [id])

  @@index([roomID])
}

model Sessions {
  sessionID String @id
  userID    String

  loggedUser User @relation(fields: [userID], references: [id])
}

enum FriendshipStatus {
  PENDING
  ACCEPTED
  REJECTED
}

model Friendship {
  id         String           @id @default(cuid())
  senderId   String
  receiverId String
  status     FriendshipStatus @default(PENDING)
  createdAt  DateTime         @default(now())
  updatedAt  DateTime         @updatedAt

  sender   User @relation("SentRequests", fields: [senderId], references: [id], onDelete: Cascade)
  receiver User @relation("ReceivedRequests", fields: [receiverId], references: [id], onDelete: Cascade)

  @@unique([senderId, receiverId])
  @@index([senderId])
  @@index([receiverId])
}

model IdentityKeys {
  id          Int    @id @default(autoincrement())
  userID      String
  identityKey String @db.LongText // base64(ML-DSA public key)

  user User @relation("SignedToUser", fields: [userID], references: [id], onDelete: Cascade)

  @@unique([userID])
  @@index([userID])
}

model SignedPreKeys {
  id           Int    @id @default(autoincrement())
  userID       String
  signedPubKey String @db.LongText
  signature    String @db.LongText

  user User @relation("SignedToUser", fields: [userID], references: [id], onDelete: Cascade)

  @@unique([userID])
  @@index([userID])
}

model OneTimePreKeys {
  id     Int    @id @default(autoincrement())
  userId String
  keyId  String

  publicKey String @db.LongText // base64(X-Wing public key)

  isUsed    Boolean   @default(false)
  usedAt    DateTime?
  createdAt DateTime  @default(now())

  user User @relation("SignedToUser", fields: [userId], references: [id], onDelete: Cascade)

  @@unique([userId, keyId])
  @@index([userId, isUsed])
  @@index([userId])
}
```


### 📝 Project Status
GlueChat is currently in **Beta**. 

**Completed Milestones:**
- **Security Foundations:** Implemented hybrid key generation (X-Wing) and secure local storage using OS-native vaults.
- **Advanced Encryption:** Full implementation of the **Double Ratchet** protocol, providing Perfect Forward Secrecy and break-in recovery for all conversations.
- **Real-Time Messaging:** Secure message delivery system built on WebSockets with integrated end-to-end encryption (E2EE).
- **Relationship Management:** Fully functional friend request system (send/accept/reject) and chat list management.

**Next Steps:**
- Save decrypted messages to local history. 
- Multi-device synchronization support.
- Group chat functionality with shared ratchet trees.
- Enhanced user profiles and notification history.
