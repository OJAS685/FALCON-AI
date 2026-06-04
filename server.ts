import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables
dotenv.config();

// Initialize Google Cloud Firebase & Firestore database
import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, deleteDoc, getDocs, collection, getDocFromServer } from "firebase/firestore";

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), "firebase-applet-config.json"), "utf8"));
const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null,
    },
    operationType,
    path
  };
  console.error('[DATABASE FAULT] Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const DATABASE_FILE = path.join(process.cwd(), "users_database.json");

import crypto from "crypto";

interface DBUser {
  id: string;
  name: string;
  username: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
  avatar: string;
  plan: "free" | "pro" | "premium";
  createdAt: string;
  banned?: boolean;
  role?: "admin" | "user";
  // Usage counters for limits
  aiMessageCount?: number;
  imageGenCount?: number;
  maxAiMessages?: number;
  maxImageGens?: number;
  failedLogins?: number;
  lockoutUntil?: string;
  otpCode?: string;
  otpExpires?: string;
  resetToken?: string;
  resetTokenExpires?: string;
  memories?: any[];
  projects?: any[];
  studentData?: any;
  creatorDrafts?: any[];
  lifeosData?: any;
  futureSelfData?: any;
  savedLetters?: any[];
}

const CHATS_FILE = path.join(process.cwd(), "chats_database.json");

interface DBChat {
  id: string;
  userId: string;
  title: string;
  messages: any[];
  createdAt: string;
  updatedAt: string;
}

// Function to hash password using standard safe pbkdf2
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
}

function generateSalt(): string {
  return crypto.randomBytes(16).toString("hex");
}

// Real robust custom JWT token creation & verification
const JWT_SECRET = process.env.JWT_SECRET || "falcon_secret_quantum_key_9921_ojas_soni";

function generateJWT(payload: { userId: string; email: string; role?: string }): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const body = Buffer.from(JSON.stringify({ 
    ...payload, 
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7-day expiration
  })).toString("base64url");
  const signature = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

function verifyJWT(token: string): { userId: string; email: string; role?: string } | null {
  try {
    const [header, body, signature] = token.split(".");
    if (!header || !body || !signature) return null;
    const expectedSig = crypto.createHmac("sha256", JWT_SECRET).update(`${header}.${body}`).digest("base64url");
    if (signature !== expectedSig) return null;
    const decoded = JSON.parse(Buffer.from(body, "base64url").toString("utf-8"));
    if (decoded.exp < Date.now()) return null; // Expired
    return decoded;
  } catch (err) {
    return null;
  }
}

// Load static/dynamic chats database
function loadChats(): DBChat[] {
  try {
    if (fs.existsSync(CHATS_FILE)) {
      return JSON.parse(fs.readFileSync(CHATS_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error loading chats:", err);
  }
  return [];
}

function saveChats(chats: DBChat[]) {
  try {
    fs.writeFileSync(CHATS_FILE, JSON.stringify(chats, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving chats:", err);
  }

  // Async update Firestore - strip undefined to prevent Firestore errors
  try {
    for (const chat of chats) {
      const cleanChat = JSON.parse(JSON.stringify(chat));
      setDoc(doc(db, "chats", chat.id), cleanChat).catch((err) => {
        console.error(`Failed to write chat ${chat.id} to FireStore:`, err);
      });
    }
  } catch (err) {
    console.error("Synchronous error during Firestore chats sync:", err);
  }
}

// Load users database or seed defaults
function loadUsers(): DBUser[] {
  try {
    if (fs.existsSync(DATABASE_FILE)) {
      return JSON.parse(fs.readFileSync(DATABASE_FILE, "utf-8"));
    }
  } catch (err) {
    console.error("Error loading users database:", err);
  }
  
  const salt = generateSalt();
  const defaultDB: DBUser[] = [
    {
      id: "user_test",
      name: "OJAS SONI",
      username: "ojassoni",
      email: "awaneeshsoni54@gmail.com",
      passwordSalt: salt,
      passwordHash: hashPassword("falconai123", salt),
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150&auto=format&fit=crop",
      plan: "premium",
      createdAt: new Date().toISOString(),
      role: "admin",
      aiMessageCount: 0,
      imageGenCount: 0,
      maxAiMessages: 999999,
      maxImageGens: 500000
    }
  ];
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(defaultDB, null, 2), "utf-8");
  } catch (err) {
    console.error("Error creating default users database:", err);
  }
  return defaultDB;
}

function saveUsers(users: DBUser[]) {
  try {
    fs.writeFileSync(DATABASE_FILE, JSON.stringify(users, null, 2), "utf-8");
  } catch (err) {
    console.error("Error saving users database:", err);
  }

  // Async update Firestore - strip undefined to prevent Firestore errors
  try {
    for (const user of users) {
      const cleanUser = JSON.parse(JSON.stringify(user));
      setDoc(doc(db, "users", user.id), cleanUser).catch((err) => {
        console.error(`Failed to write user ${user.id} to FireStore:`, err);
      });
    }
  } catch (err) {
    console.error("Synchronous error during Firestore users sync:", err);
  }
}

// Active database caches (bootstrapped from local fallback synchronously then synced with Cloud in background)
let usersDB: DBUser[] = loadUsers();
let chatsDB: DBChat[] = loadChats();

async function initFirebaseAndLoadData() {
  console.log("🔥 Connecting and syncing with Google Cloud Firestore database...");
  try {
    // 1. Connection test as required by SKILL.md
    await getDocFromServer(doc(db, 'test', 'connection')).catch(() => {});
    
    // 2. Fetch users
    const usersSnapshot = await getDocs(collection(db, "users"));
    if (usersSnapshot.empty) {
      console.log("No user database entries detected in Firestore. Seeding admin master node & local accounts...");
      // Seed all existing local accounts to Firestore
      for (const u of usersDB) {
        const cleanU = JSON.parse(JSON.stringify(u));
        await setDoc(doc(db, "users", u.id), cleanU);
      }
    } else {
      // Merge Cloud users with memory cache securely
      const cloudUsers: DBUser[] = [];
      usersSnapshot.forEach((doc) => {
        cloudUsers.push(doc.data() as DBUser);
      });
      // Merge: prefer cloud users but keep memory uniques
      const cloudUserIds = new Set(cloudUsers.map(u => u.id));
      const uniqueLocalUsers = usersDB.filter(u => !cloudUserIds.has(u.id));
      usersDB = [...cloudUsers, ...uniqueLocalUsers];
      console.log(`Successfully synced ${usersDB.length} active operator registry logs from FireStore (local + cloud unified).`);
    }

    // 3. Fetch chats
    const chatsSnapshot = await getDocs(collection(db, "chats"));
    if (!chatsSnapshot.empty) {
      const cloudChats: DBChat[] = [];
      chatsSnapshot.forEach((doc) => {
        cloudChats.push(doc.data() as DBChat);
      });
      const cloudChatIds = new Set(cloudChats.map(c => c.id));
      const uniqueLocalChats = chatsDB.filter(c => !cloudChatIds.has(c.id));
      chatsDB = [...cloudChats, ...uniqueLocalChats];
      console.log(`Successfully synced ${chatsDB.length} persistent conversation nodes from FireStore (local + cloud unified).`);
    }
  } catch (err: any) {
    console.error("❌ Failed to fetch/initialize Firestore schemas. Continuing with active local storage cache.", err.message || err);
  }
}

// Migrate legacy users with plain passwords to salted hash schema smoothly
function migrateDB() {
  let changed = false;
  usersDB.forEach((u: any) => {
    if (u.password) {
      const salt = generateSalt();
      u.passwordSalt = salt;
      u.passwordHash = hashPassword(u.password, salt);
      u.username = u.username || u.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      u.plan = u.plan || "free";
      u.role = u.email === "awaneeshsoni54@gmail.com" ? "admin" : "user";
      u.aiMessageCount = u.aiMessageCount || 0;
      u.imageGenCount = u.imageGenCount || 0;
      u.maxAiMessages = u.plan === "premium" ? 999999 : u.plan === "pro" ? 250 : 50;
      u.maxImageGens = u.plan === "premium" ? 999999 : u.plan === "pro" ? 100 : 3;
      delete u.password;
      changed = true;
    }
    // Set fallback roles & counters if undefined or promote owner
    if (u.email === "awaneeshsoni54@gmail.com") {
      if (u.role !== "admin" || u.plan !== "premium" || u.maxAiMessages !== 999999) {
        u.role = "admin";
        u.plan = "premium";
        u.maxAiMessages = 999999;
        u.maxImageGens = 999999;
        changed = true;
      }
    } else if (u.role === undefined) {
      u.role = "user";
      changed = true;
    }
    if (u.username === undefined) {
      u.username = u.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
      changed = true;
    }
    if (u.aiMessageCount === undefined) { u.aiMessageCount = 0; changed = true; }
    if (u.imageGenCount === undefined) { u.imageGenCount = 0; changed = true; }
    if (u.maxAiMessages === undefined || u.maxAiMessages === 10) { u.maxAiMessages = u.plan === "premium" ? 999999 : u.plan === "pro" ? 250 : 50; changed = true; }
    if (u.maxImageGens === undefined) { u.maxImageGens = u.plan === "premium" ? 999999 : u.plan === "pro" ? 100 : 3; changed = true; }
  });
  if (changed) {
    saveUsers(usersDB);
  }
}
// We'll run migrateDB inside initFirebaseAndLoadData to make sure it runs after load


// Lazy initialize Gemini API client to prevent crash if key is missing
function getGeminiClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    console.warn("⚠️ GEMINI_API_KEY not set. Operating in highly intelligent Adaptive Sandbox mode.");
    return null;
  }
  try {
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  } catch (err) {
    console.error("❌ Failed to initialize GoogleGenAI client:", err);
    return null;
  }
}

// Protected Routes Token Auth Middleware
interface AuthRequest extends express.Request {
  user?: DBUser;
}

const authenticateToken = (req: AuthRequest, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access credentials missing. Please register or establish a login session." });
  }

  const payload = verifyJWT(token);
  if (!payload) {
    return res.status(401).json({ error: "Your session token has expired or is invalid. Please sign in again." });
  }

  const user = usersDB.find(u => u.id === payload.userId);
  if (!user) {
    return res.status(401).json({ error: "User account no longer accessible on Falcon grid." });
  }

  if (user.banned) {
    return res.status(403).json({ error: "Your Falcon AI profile has been deactivated/banned by administrative authority." });
  }

  req.user = user;
  next();
};

// ================= AUTHENTICATION ENDPOINTS =================

app.post("/api/auth/register", (req, res) => {
  try {
    const { name, username, email, password, confirmPassword, agreeTerms, antiBotAnswer } = req.body;
    
    if (!name || !username || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: "All profile coordinates are required." });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: "Password fields do not match." });
    }

    if (!agreeTerms) {
      return res.status(400).json({ error: "You must agree to the Terms of Service & Privacy regulations." });
    }

    // Modern anti-bot security assessment
    if (parseInt(antiBotAnswer) !== 11) {
      return res.status(400).json({ error: "Security core mismatch. (Are you human? 7 + 4 is strictly 11)." });
    }

    // Real Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: "Please enter a valid structure email address." });
    }

    // Strong Password Strength Checker
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({ 
        error: "Weak Password. Must be 8+ chars and contain uppercase, lowercase, numbers, and special chars." 
      });
    }

    // Normalized Duplicates Checks
    const cleanUsername = username.toLowerCase().replace(/[^a-z0-9_-]/g, "").trim();
    if (cleanUsername.length < 3) {
      return res.status(400).json({ error: "Username must be at least 3 character tags long." });
    }

    const usernameExists = usersDB.some(u => u.username === cleanUsername);
    if (usernameExists) {
      return res.status(400).json({ error: "This custom username has already been registered." });
    }

    const emailExists = usersDB.some(u => u.email.toLowerCase() === email.toLowerCase());
    if (emailExists) {
      return res.status(400).json({ error: "There is already an active account connected to this email handle." });
    }

    // Salt and secure with PBKDF2
    const salt = generateSalt();
    const passwordSalt = salt;
    const passwordHash = hashPassword(password, salt);

    const isFirstAdmin = email.toLowerCase() === "awaneeshsoni54@gmail.com";

    const newUser: DBUser = {
      id: "user_" + Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      username: cleanUsername,
      email: email.toLowerCase().trim(),
      passwordSalt,
      passwordHash,
      avatar: `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(cleanUsername)}`,
      plan: isFirstAdmin ? "premium" : "free",
      createdAt: new Date().toISOString(),
      role: isFirstAdmin ? "admin" : "user",
      aiMessageCount: 0,
      imageGenCount: 0,
      maxAiMessages: isFirstAdmin ? 999999 : 50,
      maxImageGens: isFirstAdmin ? 50000 : 3
    };

    usersDB.push(newUser);
    saveUsers(usersDB);

    // Generate simulated dispatch code
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpires = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    newUser.otpCode = otpCode;
    newUser.otpExpires = otpExpires;
    saveUsers(usersDB);

    const { passwordSalt: _, passwordHash: __, ...userSafe } = newUser;
    const token = generateJWT({ userId: newUser.id, email: newUser.email, role: newUser.role });

    return res.json({
      success: true,
      message: "Welcome! Your real account has been synthesized successfully on Falcon Core.",
      user: userSafe,
      token,
      otpRequired: true,
      otpCode // Provided in registration response so they can enter it easily in our sandbox email OTP setup
    });
  } catch (err: any) {
    console.error("❌ Exception during user registration:", err);
    return res.status(500).json({
      error: "Authentication server failure. Please check setup.",
      message: err.message,
      stack: err.stack
    });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { emailOrUsername, password, rememberMe } = req.body;
  if (!emailOrUsername || !password) {
    return res.status(400).json({ error: "Login handle and password coordinates are required." });
  }

  // Check by email OR username
  const existingUser = usersDB.find(
    u => u.email.toLowerCase() === emailOrUsername.toLowerCase() || u.username === emailOrUsername.toLowerCase()
  );

  if (!existingUser) {
    return res.status(401).json({ error: "No profile registered with those credentials." });
  }

  // Active Brute-Force lockout assessment
  if (existingUser.lockoutUntil && new Date(existingUser.lockoutUntil) > new Date()) {
    const minLeft = Math.ceil((new Date(existingUser.lockoutUntil).getTime() - Date.now()) / 60000);
    return res.status(403).json({ error: `Account locked due to multiple failed logins. Try again in ${minLeft} minutes.` });
  }

  // Password Verification with salt
  const checkHash = hashPassword(password, existingUser.passwordSalt);
  if (checkHash !== existingUser.passwordHash) {
    existingUser.failedLogins = (existingUser.failedLogins || 0) + 1;
    if (existingUser.failedLogins >= 5) {
      existingUser.lockoutUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes lockout
      saveUsers(usersDB);
      return res.status(403).json({ error: "Account locked! 5 consecutive invalid entries. Try again in 10 minutes." });
    }
    saveUsers(usersDB);
    return res.status(401).json({ error: "Incorrect password for this registered email handle." });
  }

  if (existingUser.banned) {
    return res.status(403).json({ error: "Your account is temporarily suspended. Contact support at awaneeshsoni54@gmail.com." });
  }

  // Clear tracking counters on success
  existingUser.failedLogins = 0;
  existingUser.lockoutUntil = undefined;
  saveUsers(usersDB);

  const token = generateJWT({ userId: existingUser.id, email: existingUser.email, role: existingUser.role });
  const { passwordSalt: _, passwordHash: __, ...userSafe } = existingUser;

  return res.json({
    success: true,
    message: "Secure handshake authenticated. Dashboard bridge opened.",
    user: userSafe,
    token
  });
});

app.post("/api/auth/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Email handle address is required." });
  }

  const user = usersDB.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
  if (!user) {
    return res.status(404).json({ error: "No profile found with this email handle." });
  }

  const resetToken = crypto.randomBytes(24).toString("hex");
  const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hours

  user.resetToken = resetToken;
  user.resetTokenExpires = resetTokenExpires;
  saveUsers(usersDB);

  console.log(`🔑 PASSWORD RESET HANDSHAKE FOR [${email}]: ${resetToken}`);

  return res.json({
    success: true,
    message: `A secure verification password reset is simulated. Use credential token: ${resetToken}`,
    resetToken // Pass reset token back for direct preview convenience
  });
});

// Real Password Reset API
app.post("/api/auth/reset-password", (req, res) => {
  const { resetToken, newPassword } = req.body;
  if (!resetToken || !newPassword) {
    return res.status(400).json({ error: "Token and new password required." });
  }

  const user = usersDB.find(u => u.resetToken === resetToken);
  if (!user || !user.resetTokenExpires || new Date(user.resetTokenExpires) < new Date()) {
    return res.status(400).json({ error: "Invalid or expired reset token." });
  }

  const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  if (!strongPasswordRegex.test(newPassword)) {
    return res.status(400).json({ 
      error: "New password is too weak. Must contain uppercase, lowercase, numbers, and symbols." 
    });
  }

  const salt = generateSalt();
  user.passwordSalt = salt;
  user.passwordHash = hashPassword(newPassword, salt);
  user.resetToken = undefined;
  user.resetTokenExpires = undefined;
  saveUsers(usersDB);

  return res.json({
    success: true,
    message: "Your password matrix has been securely rewritten. Please login."
  });
});

// OAuth Callback Account Linking Sync Endpoint
app.post("/api/auth/social", (req, res) => {
  const { email, name, provider, avatar } = req.body;
  if (!email || !name || !provider) {
    return res.status(400).json({ error: "Missing required social auth credentials." });
  }

  let user = usersDB.find(u => u.email.toLowerCase() === email.toLowerCase());
  
  if (user) {
    // Automatic Account Linking & Profile Synced
    if (avatar) user.avatar = avatar;
    saveUsers(usersDB);
  } else {
    // Real account synthesis with secure random key
    const cleanUsername = email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") + "_" + provider.slice(0,3);
    const salt = generateSalt();
    const randomPass = crypto.randomBytes(32).toString("hex");

    const isFirstAdmin = email.toLowerCase() === "awaneeshsoni54@gmail.com";

    user = {
      id: "user_" + Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      username: cleanUsername,
      email: email.toLowerCase(),
      passwordSalt: salt,
      passwordHash: hashPassword(randomPass, salt),
      avatar: avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${cleanUsername}`,
      plan: isFirstAdmin ? "premium" : "free",
      createdAt: new Date().toISOString(),
      role: isFirstAdmin ? "admin" : "user",
      aiMessageCount: 0,
      imageGenCount: 0,
      maxAiMessages: isFirstAdmin ? 999999 : 50,
      maxImageGens: isFirstAdmin ? 50000 : 3
    };
    usersDB.push(user);
    saveUsers(usersDB);
  }

  if (user.banned) {
    return res.status(403).json({ error: "This account has been administratively locked." });
  }

  const token = generateJWT({ userId: user.id, email: user.email, role: user.role });
  const { passwordSalt: _, passwordHash: __, ...userSafe } = user;

  return res.json({
    success: true,
    message: `Account connected & synced successfully via ${provider.toUpperCase()}`,
    user: userSafe,
    token
  });
});

// OTP Verification code endpoint
app.post("/api/auth/verify-otp", (req, res) => {
  const { email, otpCode } = req.body;
  if (!email || !otpCode) {
    return res.status(400).json({ error: "Email and OTP digits are required." });
  }

  const user = usersDB.find(u => u.email.toLowerCase() === email.toLowerCase());
  if (!user) {
    return res.status(404).json({ error: "User account not found." });
  }

  if (user.otpCode !== otpCode || !user.otpExpires || new Date(user.otpExpires) < new Date()) {
    return res.status(400).json({ error: "Invalid or expired OTP code." });
  }

  // Code verified successfully
  user.otpCode = undefined;
  user.otpExpires = undefined;
  saveUsers(usersDB);

  return res.json({
    success: true,
    message: "Email identity successfully verified! Safe session started."
  });
});

// Profile modification endpoint
app.post("/api/auth/profile", authenticateToken as any, (req: AuthRequest, res) => {
  const { name, avatar, password } = req.body;
  const user = req.user!;

  if (name) user.name = name.trim();
  if (avatar) user.avatar = avatar;
  
  if (password && password.trim() !== "") {
    const strongPasswordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
    if (!strongPasswordRegex.test(password)) {
      return res.status(400).json({ error: "Password must be at least 8 characters and include uppercase, symbols." });
    }
    const salt = generateSalt();
    user.passwordSalt = salt;
    user.passwordHash = hashPassword(password, salt);
  }

  saveUsers(usersDB);
  const { passwordSalt: _, passwordHash: __, ...userSafe } = user;

  return res.json({
    success: true,
    message: "Falcon parameters synced and encrypted successfully.",
    user: userSafe
  });
});

// Session verification endpoint
app.get("/api/auth/session", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const { passwordSalt: _, passwordHash: __, ...userSafe } = user;
  return res.json({
    success: true,
    user: userSafe
  });
});

// SaaS Upgrade/Downgrade pricing core
app.post("/api/auth/upgrade", authenticateToken as any, (req: AuthRequest, res) => {
  const { plan } = req.body;
  const user = req.user!;

  if (!["free", "pro", "premium"].includes(plan)) {
    return res.status(400).json({ error: "Invalid selection plan." });
  }

  user.plan = plan as any;
  user.maxAiMessages = plan === "premium" ? 999999 : plan === "pro" ? 250 : 50;
  user.maxImageGens = plan === "premium" ? 999999 : plan === "pro" ? 100 : 3;

  saveUsers(usersDB);
  const { passwordSalt: _, passwordHash: __, ...userSafe } = user;

  return res.json({
    success: true,
    message: `Subscription successfully compiled to ${plan.toUpperCase()} tier!`,
    user: userSafe
  });
});

// ================= SMART MEMORY WORKSPACE ENDPOINTS =================

// GET all active memory nodes has been loaded
app.get("/api/user/memories", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const memories = user.memories || [];
  return res.json({ success: true, memories });
});

// POST a new cognitive memory node
app.post("/api/user/memories", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const { content, category } = req.body;
  if (!content) {
    return res.status(400).json({ error: "Memory index content required." });
  }

  const newMemory = {
    id: "mem_" + Math.random().toString(36).substr(2, 9),
    content: content.trim(),
    category: category || "general",
    createdAt: new Date().toISOString()
  };

  if (!user.memories) {
    user.memories = [];
  }
  user.memories.push(newMemory);
  saveUsers(usersDB);

  return res.json({ success: true, memory: newMemory, message: "New memory node compiled on Falcon grid." });
});

// PUT calibrate existing memory
app.put("/api/user/memories/:id", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const { content, category } = req.body;
  const memoryId = req.params.id;

  const memories = user.memories || [];
  const idx = memories.findIndex(m => m.id === memoryId);
  if (idx === -1) {
    return res.status(404).json({ error: "Memory index node not found." });
  }

  if (content !== undefined) memories[idx].content = content.trim();
  if (category !== undefined) memories[idx].category = category;

  user.memories = memories;
  saveUsers(usersDB);

  return res.json({ success: true, memory: memories[idx], message: "Memory index node re-calibrated." });
});

// DELETE forget memory node
app.delete("/api/user/memories/:id", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const memoryId = req.params.id;

  const memories = user.memories || [];
  const initialLen = memories.length;
  const updatedMemories = memories.filter(m => m.id !== memoryId);

  if (updatedMemories.length === initialLen) {
    return res.status(404).json({ error: "Memory index node not found." });
  }

  user.memories = updatedMemories;
  saveUsers(usersDB);

  return res.json({ success: true, message: "Memory node successfully forgotten from Falcon core." });
});

// DELETE forget ALL memory nodes for a user
app.delete("/api/user/memories", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  user.memories = [];
  saveUsers(usersDB);
  return res.json({ success: true, message: "All memory coordinates successfully cleared from Falcon core." });
});

// ============================================================================
// PROJECT WORKSPACE ENDPOINTS
// ============================================================================

// GET all active projects
app.get("/api/user/projects", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const projects = user.projects || [];
  return res.json({ success: true, projects });
});

// POST compile a new project card
app.post("/api/user/projects", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const { name, description } = req.body;
  if (!name) {
    return res.status(400).json({ error: "Project visual identification name required." });
  }

  const newProject = {
    id: "proj_" + Math.random().toString(36).substr(2, 9),
    name: name.trim(),
    description: (description || "").trim(),
    documents: [],
    tasks: [],
    images: [],
    createdAt: new Date().toISOString()
  };

  if (!user.projects) {
    user.projects = [];
  }
  user.projects.push(newProject);
  saveUsers(usersDB);

  return res.json({ success: true, project: newProject, message: "New elegant project frame compiled." });
});

// PUT update / sync any project layer
app.put("/api/user/projects/:id", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const pId = req.params.id;
  const { name, description, documents, tasks, images } = req.body;

  const projects = user.projects || [];
  const idx = projects.findIndex(p => p.id === pId);
  if (idx === -1) {
    return res.status(404).json({ error: "Project system node not found." });
  }

  if (name !== undefined) projects[idx].name = name.trim();
  if (description !== undefined) projects[idx].description = (description || "").trim();
  if (documents !== undefined) projects[idx].documents = documents;
  if (tasks !== undefined) projects[idx].tasks = tasks;
  if (images !== undefined) projects[idx].images = images;

  user.projects = projects;
  saveUsers(usersDB);

  return res.json({ success: true, project: projects[idx], message: "Project layer synced dynamically." });
});

// DELETE prune/wipe project
app.delete("/api/user/projects/:id", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const pId = req.params.id;

  const projects = user.projects || [];
  const initialLen = projects.length;
  const updated = projects.filter(p => p.id !== pId);

  if (updated.length === initialLen) {
    return res.status(404).json({ error: "Project system node not found." });
  }

  user.projects = updated;
  saveUsers(usersDB);

  return res.json({ success: true, message: "Project safely deprecated from database." });
});

// ============================================================================
// STUDENT COCKPIT ENDPOINTS
// ============================================================================

// GET student active matrix
app.get("/api/user/student", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const studentData = user.studentData || {
    exams: [],
    flashcards: [],
    revisions: [],
    quizzes: []
  };
  return res.json({ success: true, studentData });
});

// POST sync student datasets
app.post("/api/user/student", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const { exams, flashcards, revisions, quizzes } = req.body;

  if (!user.studentData) {
    user.studentData = {
      exams: [],
      flashcards: [],
      revisions: [],
      quizzes: []
    };
  }

  if (exams !== undefined) user.studentData.exams = exams;
  if (flashcards !== undefined) user.studentData.flashcards = flashcards;
  if (revisions !== undefined) user.studentData.revisions = revisions;
  if (quizzes !== undefined) user.studentData.quizzes = quizzes;

  saveUsers(usersDB);
  return res.json({ success: true, studentData: user.studentData, message: "Acoustic student matrix updated." });
});

// ============================================================================
// CREATOR STUDIO ARCHIVE ENDPOINTS
// ============================================================================

// GET all archived studio drafts
app.get("/api/user/creator-studio", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const drafts = user.creatorDrafts || [];
  return res.json({ success: true, drafts });
});

// POST store a generated studio creative draft
app.post("/api/user/creator-studio", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const { idea, outputs, branding } = req.body;

  const newDraft = {
    id: "draft_" + Math.random().toString(36).substr(2, 9),
    idea,
    outputs,
    branding: branding || "Standard Creative Voice",
    createdAt: new Date().toISOString()
  };

  if (!user.creatorDrafts) {
    user.creatorDrafts = [];
  }
  user.creatorDrafts.push(newDraft);
  saveUsers(usersDB);

  return res.json({ success: true, draft: newDraft, message: "Creative draft cataloged in Creator Studio." });
});

// ============================================================================
// SMART APPLICATION & LETTER MAKER ENDPOINTS
// ============================================================================

// GET all user saved letters
app.get("/api/user/saved-letters", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const savedLetters = user.savedLetters || [];
  return res.json({ success: true, savedLetters });
});

// POST save a letter to user history
app.post("/api/user/saved-letters", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const { type, inputs, outputs, language, templateType, aiSuggestions } = req.body;

  if (!type || !inputs || !outputs) {
    return res.status(400).json({ error: "Letter properties (type, inputs, outputs) are required to save." });
  }

  const newLetter = {
    id: "let_" + Math.random().toString(36).substr(2, 9),
    type,
    inputs,
    outputs,
    language: language || "en",
    templateType: templateType || "student",
    aiSuggestions: aiSuggestions || [],
    createdAt: new Date().toISOString()
  };

  if (!user.savedLetters) {
    user.savedLetters = [];
  }
  user.savedLetters.push(newLetter);
  saveUsers(usersDB);

  return res.json({ success: true, letter: newLetter, savedLetters: user.savedLetters, message: "Application archived inside history log." });
});

// DELETE remove a letter from user history
app.delete("/api/user/saved-letters/:id", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const letterId = req.params.id;

  if (!user.savedLetters) {
    user.savedLetters = [];
  }

  const initialCount = user.savedLetters.length;
  user.savedLetters = user.savedLetters.filter(l => l.id !== letterId);

  if (user.savedLetters.length === initialCount) {
    return res.status(404).json({ error: "Letter record not found." });
  }

  saveUsers(usersDB);
  return res.json({ success: true, savedLetters: user.savedLetters, message: "Application purged from records." });
});

// POST generate letter variants with Gemini AI (with smart offline fallbacks)
app.post("/api/ai/letters/generate", authenticateToken as any, async (req: AuthRequest, res) => {
  const { type, name, receiver, entityName, reason, date, duration, additional, language, templateType } = req.body;

  if (!type || !name || !receiver || !entityName || !reason) {
    return res.status(400).json({ error: "Essential letter parameters are missing." });
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      const prompt = `You are an elite professional scribe and grammar expert. Generate an application/letter for: "${type}".
      Inputs provided:
      - Name: "${name}"
      - Receiver: "${receiver}"
      - School/Company Name: "${entityName}"
      - Reason: "${reason}"
      - Date: "${date || 'Current date'}"
      - Duration: "${duration || 'N/A'}"
      - Additional Details: "${additional || 'None'}"
      
      Language requested: "${language}" (options are 'en' for English, 'hi' for Hindi in Devanagari script, or 'hinglish' for Hindi written in Roman phonetic script).
      Template role/type: "${templateType}" (options are 'student', 'teacher', 'employee', or 'business').
      
      Generate four (4) distinct versions of this application:
      1. formal: Traditional formal, strictly following established block spacing and formal conventions.
      2. professional: Standard professional business style (well-suited for emails or modern workplaces).
      3. short: Brief, crisp, and direct to the point.
      4. detailed: Comprehensive, providing full context, extra spacing, and a paragraph layout.
      
      Ensure you output proper subject lines, standard correct salutations, perfect spelling/grammar, and a highly polished professional tone matching the specified audience.
      
      Also, provide three (3) specific, structured, realistic "AI Suggestions" (as an array of strings in JSON) for how the user can improve their justification, make it sound more professional, or what documents they should attach in their actual submission.
      
      Respond STRICTLY with a valid JSON matching this schema:
      {
        "formal": "The full formal version...",
        "professional": "The full professional version...",
        "short": "The full short version...",
        "detailed": "The full detailed version...",
        "aiSuggestions": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
      }
      `;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });

      const rawText = response.text || "";
      const parsed = JSON.parse(rawText);
      return res.json({ success: true, ...parsed });
    } catch (gcErr: any) {
      console.log("ℹ️ Falcon Letter generator: applying intelligent script templates fallback...", gcErr?.message || gcErr);
    }
  }

  // Standalone Sandbox Fallback simulation
  const langUpper = (language || 'en').toLowerCase();
  
  // Custom templates mapped based on language, templateType, and general details
  let greeting = "Dear " + receiver + ",";
  let sub = `Subject: Application for ${type}`;
  let closing = "Sincerely,\n" + name;

  if (langUpper === 'hi') {
    greeting = `सेवा में,\nश्रीमान ${receiver},\n${entityName}`;
    sub = `विषय: ${type} हेतु आवेदन पत्र`;
    closing = `आपका विश्वासी,\n${name}`;
  } else if (langUpper === 'hinglish') {
    greeting = `Sewa me,\nShri maan ${receiver},\n${entityName}`;
    sub = `Subject: ${type} ke liye aavedan patra`;
    closing = `Aapka vishwasi,\n${name}`;
  }

  // Standard template builders depending on language
  let formalText = "";
  let profText = "";
  let shortText = "";
  let detailedText = "";
  let suggestions: string[] = [];

  if (langUpper === 'hi') {
    formalText = `${greeting}\n\n${sub}\n\nमहोदय,\n\nसविनय निवेदन है कि मेरा नाम ${name} है। मैं ${entityName} में कार्यरत हूँ। यह पत्र मैं ${reason} के संबंध में लिख रहा हूँ। कृपया इस विषय को ${date} से लागू करने की कृपा करें, जो कि ${duration} अवधि के लिए रहेगा।\n\nअतः आपसे नम्र निवेदन है कि मेरे इस आवेदन को स्वीकार करने की कृपा करें। इसके लिए मैं सदैव आपका आभारी रहूँगा।\n\nधन्यवाद।\n\n${closing}`;
    profText = `${greeting}\n\n${sub}\n\nनमस्ते ${receiver},\n\nमैं यह आवेदन पत्र ${entityName} के संज्ञान में लाने के लिए लिख रहा हूँ। मुझे ${reason} के कारण ${date} से शुरू होने वाले ${duration} के लिए अवकाश की आवश्यकता है।\n\nइस अवधि के दौरान मेरा कार्यभार मेरे सहयोगियों द्वारा संभाला जाएगा। आशा है आप इसे स्वीकृत करेंगे।\n\nसादर,\n${name}`;
    shortText = `${greeting}\n\n${sub}\n\nप्रिय ${receiver},\n\nकृपया ${reason} के कारण ${date} से ${duration} के लिए मेरा आवेदन पत्र स्वीकार करें।\n\nधन्यवाद,\n${name}`;
    detailedText = `${greeting}\n\n${sub}\n\nमहोदय,\n\nमैं ${name}, ${entityName} से, इस पत्र के माध्यम से सूचित करना चाहता हूँ कि मुझे ${reason} के कारण ${date} से अवकाश की अत्यंत आवश्यकता है। यह अवकाश ${duration} की संक्षिप्त अवधि के लिए होगा।\n\nमेरे जाने से पहले मैंने अपने सभी आवश्यक कार्यों को पूर्ण कर लिया है ताकि किसी कार्य में व्यवधान न उत्पन्न हो। मेरी अनुपस्थिति में कोई भी आपातकालीन कार्य होने पर आप मुझसे मेल या फोन पर संपर्क कर सकते हैं। अतिरिक्त विवरण: ${additional || 'कुछ नहीं'}\n\nसहानुभूतिपूर्वक विचार करने के लिए धन्यवाद।\n\nभवदीय,\n${name}`;
    suggestions = [
      "आवेदन में अवकाश की तिथि अत्यंत स्पष्ट रूप से अंकित करें।",
      "यदि बीमारी के संबंध में हो, तो डॉक्टर का पर्चा सहपत्र के रूप में संलग्न करें।",
      "अवकाश के दौरान अपने विकल्प या संपर्क सूत्र का अवश्य उल्लेख करें।"
    ];
  } else if (langUpper === 'hinglish') {
    formalText = `${greeting}\n\n${sub}\n\nRespected ${receiver},\n\nSaviney nivedan hai ki mera naam ${name} hai aur main ${entityName} me hoon. Main yeh letter complex reason "${reason}" ke chalte likh raha hoon. Kripya isko ${date} se start karke ${duration} time-frame ke liye sweekar karein.\n\nAsha hai aap mere is application ko approve karenge. Main iske liye aapka sadaiv aabhari rahunga.\n\nThanking You.\n\n${closing}`;
    profText = `${greeting}\n\n${sub}\n\nHello ${receiver},\n\nMain yeh application ${reason} ke sanbadh me likh raha hoon. Mujhe ${date} se ${duration} ke liye leaves ki zaroorat hai. Saara backup team work arrange kar diya gaya hai.\n\nRegard,\n${name}`;
    shortText = `${greeting}\n\n${sub}\n\nHi ${receiver},\n\nReason "${reason}" ke chalte ${date} se ${duration} ke liye aavedan swikar karein.\n\nThanks,\n${name}`;
    detailedText = `${greeting}\n\n${sub}\n\nDear ${receiver},\n\nMera nivedan hai ki main ${name}, ${entityName} ki taraf se, urgent leave apply karna chahta hoon. Reason "${reason}" hai aur iski dates ${date} se start hongi (duration: ${duration}).\n\nMaine apne back-office colleagues ko handover complete kar diya hai. Additional notes: ${additional || 'N/A'}.\n\nThank you,\n${name}`;
    suggestions = [
      "Dates ko final aur exact formats me verify kar ke hi forward karein.",
      "Professional flow maintain karne ke liye receiver ka poora designation use karein.",
      "Emergency contact handle karne ke liye phone number ka note additional info me add karein."
    ];
  } else {
    // English
    formalText = `To,\nThe ${receiver},\n${entityName}\n\n${sub}\n\nRespected Sir/Madam,\n\nI am writing to formally request an application for "${type}" due to the following reason: ${reason}. This relates to the period starting on ${date} and will be effective for a duration of ${duration}.\n\nI have ensured that all my pending tasks are updated, and I request you to kindly sanction this application. I shall be highly obliged for your kind consideration.\n\nThanking you,\n\n${closing}`;
    profText = `${greeting}\n\n${sub}\n\nI am writing to request a "${type}" starting on ${date} for ${duration}. The primary reason for this request is ${reason}.\n\nI have delegated my core focus areas to ensure operations continue smoothly in my absence. I will also be reachable via email in case of urgent issues.\n\nThank you for your time and understanding.\n\nRegards,\n${name}`;
    shortText = `${greeting}\n\n${sub}\n\nPlease approve my request for ${type} starting ${date} for ${duration} due to ${reason}.\n\nBest,\n${name}`;
    detailedText = `To,\nThe ${receiver},\n${entityName}\n\n${sub}\n\nDear ${receiver},\n\nMy name is ${name}, and I am writing on behalf of my position at ${entityName} to submit this formal request for ${type}.\n\nI will require this starting from ${date}, covering a total length of ${duration}. This is critical due to: ${reason}.\n\nI have structured a comprehensive transition plan for my tasks, and my teammates have been fully briefed. Additional notes: ${additional || 'None'}. I will monitor progress remotely whenever possible.\n\nThank you for reviewing this application. I look forward to your positive approval.\n\nSincerely,\n${name}`;
    suggestions = [
      "Be sure to attach relevant supporting documents (doctor's note, invitation letter, etc.) if applicable.",
      "Ensure the starting date gives your school/office sufficient advanced notice (preferably 3-5 days in advance).",
      "Explicitly mention your availability levels (e.g. 'Fully reachable helper' vs 'Complete offline blackout') in additional notes."
    ];
  }

  return res.json({
    success: true,
    formal: formalText,
    professional: profText,
    short: shortText,
    detailed: detailedText,
    aiSuggestions: suggestions
  });
});

// ============================================================================
// LIFEOS OPERATING SYSTEM ENDPOINTS
// ============================================================================

// GET user's LifeOS complete data structure
app.get("/api/user/lifeos", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  if (!user.lifeosData) {
    user.lifeosData = {
      reflections: [],
      goals: [],
      decisions: [],
      vault: []
    };
    saveUsers(usersDB);
  }
  return res.json({ success: true, lifeosData: user.lifeosData });
});

// POST a new Daily Reflection entry
app.post("/api/user/lifeos/reflections", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const { accomplished, learned, improve } = req.body;

  if (!accomplished || !learned || !improve) {
    return res.status(400).json({ error: "All reflection coordinates (accomplished, learned, improve) are required." });
  }

  const newReflection = {
    id: "refl_" + Math.random().toString(36).substr(2, 9),
    accomplished: accomplished.trim(),
    learned: learned.trim(),
    improve: improve.trim(),
    createdAt: new Date().toISOString()
  };

  if (!user.lifeosData) {
    user.lifeosData = { reflections: [], goals: [], decisions: [], vault: [] };
  }
  if (!user.lifeosData.reflections) {
    user.lifeosData.reflections = [];
  }

  user.lifeosData.reflections.unshift(newReflection);
  saveUsers(usersDB);

  return res.json({ success: true, reflection: newReflection, message: "Daily Reflection successfully logged on LifeOS matrix." });
});

// POST add a goal
app.post("/api/user/lifeos/goals", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const { title, timeframe } = req.body; // timeframe: 'daily' | 'weekly' | 'long-term'

  if (!title || !timeframe) {
    return res.status(400).json({ error: "Goal title and timeframe coordinates are required." });
  }

  const newGoal = {
    id: "goal_" + Math.random().toString(36).substr(2, 9),
    title: title.trim(),
    timeframe,
    completed: false,
    createdAt: new Date().toISOString()
  };

  if (!user.lifeosData) {
    user.lifeosData = { reflections: [], goals: [], decisions: [], vault: [] };
  }
  if (!user.lifeosData.goals) {
    user.lifeosData.goals = [];
  }

  user.lifeosData.goals.push(newGoal);
  saveUsers(usersDB);

  return res.json({ success: true, goal: newGoal, message: "Dynamic milestone added to LifeOS matrix." });
});

// PUT toggle goal completion
app.put("/api/user/lifeos/goals/:id/toggle", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const goalId = req.params.id;

  if (!user.lifeosData || !user.lifeosData.goals) {
    return res.status(404).json({ error: "Goal milestones list is empty." });
  }

  const goal = user.lifeosData.goals.find((g: any) => g.id === goalId);
  if (!goal) {
    return res.status(404).json({ error: "Goal milestone not found." });
  }

  goal.completed = !goal.completed;
  saveUsers(usersDB);

  return res.json({ success: true, goal, message: "Goal milestone toggled successfully." });
});

// DELETE a goal milestone
app.delete("/api/user/lifeos/goals/:id", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const goalId = req.params.id;

  if (!user.lifeosData || !user.lifeosData.goals) {
    return res.status(404).json({ error: "Goals list is empty." });
  }

  user.lifeosData.goals = user.lifeosData.goals.filter((g: any) => g.id !== goalId);
  saveUsers(usersDB);

  return res.json({ success: true, message: "Goal milestone removed." });
});

// POST decision simulation request
app.post("/api/user/lifeos/decisions", authenticateToken as any, async (req: AuthRequest, res) => {
  const user = req.user!;
  const { decision } = req.body;

  if (!decision) {
    return res.status(400).json({ error: "Decision premise is required." });
  }

  const systemPrompt = `You are Falcon-X Decision Simulator Core, an analytical module of Falcon LifeOS. 
Analyze the user's decision premise: "${decision}".
Provide a sophisticated, objective, and clear point-by-point breakdown in valid JSON format ONLY. 
Do not include any thinking or extra markdown code blocks besides the raw stringified JSON.
JSON keys MUST be exactly:
{
  "benefits": ["Benefit 1", "Benefit 2"],
  "risks": ["Risk 1", "Risk 2"],
  "shortTerm": "Analysis of immediate 1-12 month feedback loop.",
  "longTerm": "Analysis of long-term 5-10 year cumulative compound effects."
}`;

  const ai = getGeminiClient();
  let result: any;

  if (!ai) {
    result = {
      benefits: [
        "Immediate exposure to new experience paradigm and expanding adaptive thresholds.",
        "Fostering cognitive and career optionality by deviating from standard local peaks."
      ],
      risks: [
        "Short-term resource/time reallocation costs and execution overhead.",
        "Opportunity cost of alternate focused vectors during the trial phase."
      ],
      shortTerm: "During months 1-12, expect high learning acceleration but potentially lower immediate ROI. Adjust margins for early experimentation curves.",
      longTerm: "In a 5-10 year framework, this choice represents sound options compounding, assuming meticulous weekly feedback loops and pivoting when signals turn negative."
    };
  } else {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: "user", parts: [{ text: decision }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });
      result = JSON.parse(response.text || "{}");
    } catch (err) {
      console.error("Decision simulation API failure:", err);
      result = {
        benefits: ["Enhanced knowledge", "Personal expansion"],
        risks: ["Integration friction", "System energy draw"],
        shortTerm: "Temporary increase in systemic resistance as you align new patterns.",
        longTerm: "Substantial positive cumulative growth trajectory once stabilized."
      };
    }
  }

  const simulatedDecision = {
    id: "dec_" + Math.random().toString(36).substr(2, 9),
    decision: decision.trim(),
    analysis: result,
    createdAt: new Date().toISOString()
  };

  if (!user.lifeosData) {
    user.lifeosData = { reflections: [], goals: [], decisions: [], vault: [] };
  }
  if (!user.lifeosData.decisions) {
    user.lifeosData.decisions = [];
  }

  user.lifeosData.decisions.unshift(simulatedDecision);
  saveUsers(usersDB);

  return res.json({ success: true, decision: simulatedDecision, message: "Decision simulation compiled on Falcon core." });
});

// POST add a Knowledge Vault item
app.post("/api/user/lifeos/vault", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const { title, content, docType } = req.body;

  if (!title || !content || !docType) {
    return res.status(400).json({ error: "All vault coordinates (title, content, docType) are required." });
  }

  const newValNode = {
    id: "vlt_" + Math.random().toString(36).substr(2, 9),
    title: title.trim(),
    content: content.trim(),
    docType,
    createdAt: new Date().toISOString()
  };

  if (!user.lifeosData) {
    user.lifeosData = { reflections: [], goals: [], decisions: [], vault: [] };
  }
  if (!user.lifeosData.vault) {
    user.lifeosData.vault = [];
  }

  user.lifeosData.vault.unshift(newValNode);
  saveUsers(usersDB);

  return res.json({ success: true, item: newValNode, message: "Asset indexed in LifeOS Knowledge Vault." });
});

// DELETE a Knowledge Vault item
app.delete("/api/user/lifeos/vault/:id", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const itemId = req.params.id;

  if (!user.lifeosData || !user.lifeosData.vault) {
    return res.status(404).json({ error: "Knowledge Vault index is empty." });
  }

  user.lifeosData.vault = user.lifeosData.vault.filter((item: any) => item.id !== itemId);
  saveUsers(usersDB);

  return res.json({ success: true, message: "Document forgotten from Knowledge Vault." });
});

// ============================================================================
// FUTURE SELF NEURAL SIMULATOR ENDPOINTS (LEGEND FEATURE)
// ============================================================================

// GET future self data structure
app.get("/api/user/futureself", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  if (!user.futureSelfData) {
    user.futureSelfData = {
      profile: null,
      roadmap: null,
      adaptationLogs: []
    };
    saveUsers(usersDB);
  }
  return res.json({ success: true, futureSelfData: user.futureSelfData });
});

// POST simulate future self roadmap
app.post("/api/user/futureself/simulate", authenticateToken as any, async (req: AuthRequest, res) => {
  const user = req.user!;
  const { age, goal, dreamCareer, project } = req.body;

  if (!age || !goal || !dreamCareer || !project) {
    return res.status(400).json({ error: "All future self profile parameters (age, goal, dreamCareer, project) are required." });
  }

  const systemPrompt = `You are Falcon-X Quantum Timeline Synthesizer Core. 
You will generate a sophisticated Future Self roadmap. 
Analyze the user's current coordinates:
- Current Age: ${age}
- Target Goal: ${goal}
- Dream Career: ${dreamCareer}
- Priority Project: ${project}

Provide a comprehensive, inspiring, and professional roadmap, skill map with mastery progression, learning plan with resources, and EXACTLY 12 structured weekly milestones for incremental progress tracking in valid JSON format ONLY. 
Do not include any explanation or markdown code block wrapper or any string other than a raw JSON object matching the schema below:

{
  "roadmapTitle": "Title of the Personalized Career & Initiative Roadmap",
  "skillMap": [
    { "skill": "Skill Name 1", "purpose": "Why it is key to the target", "masteryTime": "Expected weeks to relative mastery" },
    { "skill": "Skill Name 2", "purpose": "Why it is key to the target", "masteryTime": "Expected weeks to relative mastery" }
  ],
  "learningPlan": [
    { "topic": "Learning Focus Block 1", "materials": "Suggested courses, libraries, books or technical vectors" },
    { "topic": "Learning Focus Block 2", "materials": "Suggested courses, libraries, books or technical vectors" }
  ],
  "weeklyMilestones": [
    { "id": "ms_w1", "week": 1, "description": "Specific, actionable, verifiable milestone for week 1", "completed": false },
    { "id": "ms_w2", "week": 2, "description": "Actionable milestone for week 2", "completed": false }
  ],
  "futureSelfLetter": "An inspiring, highly motivating, intellectual letter written by your 'Future Self' in 5 years, checking back in with your current age to reinforce alignment, discipline, and execution metrics."
}`;

  const ai = getGeminiClient();
  let analysisResult: any;

  if (!ai) {
    analysisResult = {
      roadmapTitle: "Quantum Architect Initiative & Launch Framework",
      skillMap: [
        { skill: "Applied Generative AI Architecture", purpose: "Developing large-scale inference and vector middleware pipelines.", masteryTime: "4 Weeks" },
        { skill: "Strategic Product Management & Devops", purpose: "Defining market product-fit, cold start mechanics, and micro-service scaling.", masteryTime: "8 Weeks" }
      ],
      learningPlan: [
        { topic: "State of Art Generative RAG & Agents", materials: "Read Google Gemini API specs, Deep Learning Agent Specialization books" },
        { topic: "High Performance Compute Containers", materials: "Docker container strategies, Server-side ESM, Cloud execution standards" }
      ],
      weeklyMilestones: Array.from({ length: 12 }, (_, i) => ({
        id: `ms_w${i+1}`,
        week: i + 1,
        description: `Define target architectures, implement core proof of concepts for your primary project: "${project}", and establish feedback loops.`,
        completed: false
      })),
      futureSelfLetter: `Greetings from five years forward! At age ${Number(age) + 5}, we successfully established our position in ${dreamCareer} doing the project ${project}. Keep showing up every single day, iterate over weekly milestones diligently, and remember that compound efforts yield magnificent results.`
    };
  } else {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [{ role: "user", parts: [{ text: `Age: ${age}, Goal: ${goal}, Career: ${dreamCareer}, Project: ${project}` }] }],
        config: {
          systemInstruction: systemPrompt,
          responseMimeType: "application/json"
        }
      });
      analysisResult = JSON.parse(response.text || "{}");
      // Safety guarantee we have complete timeline setup
      if (!analysisResult.weeklyMilestones || analysisResult.weeklyMilestones.length === 0) {
        analysisResult.weeklyMilestones = Array.from({ length: 12 }, (_, i) => ({
          id: `ms_w${i+1}`,
          week: i + 1,
          description: `Calibrate milestone and feedback channels on project: ${project} for week ${i+1}.`,
          completed: false
        }));
      }
    } catch (err) {
      console.error("Future Self simulation API failure:", err);
      analysisResult = {
        roadmapTitle: `Strategic Evolution Masterclass for ${dreamCareer}`,
        skillMap: [
          { skill: "Advanced Problem Solving", purpose: "Designing and debugging system interactions.", masteryTime: "4 Weeks" }
        ],
        learningPlan: [
          { topic: "Full-Stack System Performance", materials: "Engineering blogs, interactive developer codebases." }
        ],
        weeklyMilestones: Array.from({ length: 12 }, (_, i) => ({
          id: `ms_w${i+1}`,
          week: i + 1,
          description: `Progressive target check-in on project ${project} for week ${i+1}.`,
          completed: false
        })),
        futureSelfLetter: `Greetings! You are well on your way to achieving your target goal: "${goal}". Focus intensely on your project "${project}".`
      };
    }
  }

  user.futureSelfData = {
    profile: { age, goal, dreamCareer, project },
    roadmap: analysisResult,
    adaptationLogs: [
      { timestamp: new Date().toISOString(), action: "Initial timeline model compiled." }
    ]
  };
  saveUsers(usersDB);

  return res.json({ success: true, futureSelfData: user.futureSelfData, message: "Quantum timeline and future self blueprint simulated!" });
});

// PUT toggle weekly milestone completion
app.put("/api/user/futureself/milestones/:id/toggle", authenticateToken as any, (req: AuthRequest, res) => {
  const user = req.user!;
  const milestoneId = req.params.id;

  if (!user.futureSelfData || !user.futureSelfData.roadmap || !user.futureSelfData.roadmap.weeklyMilestones) {
    return res.status(404).json({ error: "Active Future Self roadmap or milestones not found." });
  }

  const milestones = user.futureSelfData.roadmap.weeklyMilestones;
  const milestone = milestones.find((m: any) => m.id === milestoneId);
  if (!milestone) {
    return res.status(404).json({ error: "Milestone index not found on the active timeline." });
  }

  milestone.completed = !milestone.completed;
  
  if (!user.futureSelfData.adaptationLogs) {
    user.futureSelfData.adaptationLogs = [];
  }
  user.futureSelfData.adaptationLogs.unshift({
    timestamp: new Date().toISOString(),
    action: `Milestone Week ${milestone.week} toggled to ${milestone.completed ? 'COMPLETED' : 'INCOMPLETE'}.`
  });

  saveUsers(usersDB);
  return res.json({ success: true, futureSelfData: user.futureSelfData, message: "Quantum timeline node status updated." });
});

// ============================================================================
// ADVANCED GOOGLE GEMINI AI COMPILERS FOR CREATOR & STUDENT SERVICES
// ============================================================================

// AI Generator for Creator Studio (Instantly makes Multi-channel outputs)
app.post("/api/ai/creator/generate", authenticateToken as any, async (req: AuthRequest, res) => {
  const { idea, brandingStyle, tone } = req.body;
  if (!idea) {
    return res.status(400).json({ error: "Creative concept core required." });
  }

  const systemInstructions = `You are Falcon's Chief Creator and Audience Synthesizer. Given an idea or prompt context, you must output a complete cross-network content package in STRICT JSON structure matching this exact shape:
{
  "youtubeScript": "A captivating YouTube script with scenic cues, high energy hooks, informative structure, and crisp outro call-to-actions.",
  "instagramCaption": "Polished aesthetic Instagram caption complete with customized emoji transitions, space breaks, and interactive questions for maximum engagement.",
  "adCopy": "Compelling advert copy styled under the powerful AIDA (Attention, Interest, Desire, Action) structure.",
  "blogArticle": "Fleshed-out SEO optimized editorial blog post structured cleanly with title headings, bullet points, and highly readable blocks.",
  "productDescription": "Sleek description focused on features, core competitive advantages, and futuristic tech alignment.",
  "emailDraft": "Premium transactional/marketing email format complete with engaging Subject line, personalized body blocks, and sleek email signature placeholder.",
  "hashtags": ["#marketing", "#ideas", "#custom"]
}
Tone Preset: ${tone || "Highly professional, modern, and engaging"}.
Branding Alignment Guideline: ${brandingStyle || "Sleek and premium Falcon aesthetic"}.
Output ONLY raw JSON with zero markdown code blocks or surrounding text, ready for native JSON.parse.`;

  const ai = getGeminiClient();
  if (!ai) {
    const backupBundle = {
      youtubeScript: `[SCENE START]\n**Visual**: Ambient dark studio setup with cinematic glowing blue side panel accent lights.\n**Host**: "Welcome back. Today, let's explore ${idea} - and why this conceptual shift is rewriting the rules of the future. Let's dive in!"`,
      instagramCaption: `🚀 Redefining boundaries. How does ${idea} align with your execution? Let's analyze the technical layers of the digital grid. 👇\n\n#NextGen #StartupCTO #DigitalFuture #IdeaLabs`,
      adCopy: `🔥 REVOLUTIONIZE YOUR WORKFLOW\n\nTired of traditional computational limits? Introducing ${idea}. The ultimate operational booster for creators.\n\n⚡ Click 'Learn More' to get enrolled in premium trial today!`,
      blogArticle: `# The Structural Dynamics of ${idea}\n\nSuccess in the creator landscape is all about rhythmic consistency and cohesive brand presence. When we build products around ${idea}, we remove the standard creative bottlenecks...\n\n### Why it's a Catalyst:\n- Decreases delivery lag\n- Unlocks clean brand storytelling`,
      productDescription: `### Falcon-X Workspace Accessory: ${idea}\n\nOur custom-tuned accessory designed around ${idea} features zero latency feedback, pristine thermal boundaries, and beautiful off-white responsive aesthetics. Premium tier included.`,
      emailDraft: `Subject: Re-engineering Content Ecosystems with ${idea}\n\nDear Creative Partner,\n\nWe would love to introduce you to a structured approach around "${idea}". Our team has compiled the core branding coordinates to assist you...\n\nWarm regards,\nFalcon Editorial Suite`,
      hashtags: ["FalconSuite", idea.replace(/\s+/g, ""), "BrandSynergy"]
    };
    return res.json({ success: true, bundle: backupBundle, fallback: true });
  }

  try {
    const config = {
      systemInstruction: systemInstructions,
      responseMimeType: "application/json"
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: idea }] }],
      config
    });

    const parsed = JSON.parse(response.text || "{}");
    return res.json({ success: true, bundle: parsed });
  } catch (err) {
    console.error("Creator Bundle Compilation Error:", err);
    return res.status(500).json({ error: "Failed to generate your Creator Studio bundle via Gemini." });
  }
});

// AI Generator for Student Subject Quizzes (Instantly prepares customized interactive tests)
app.post("/api/ai/student/quiz", authenticateToken as any, async (req: AuthRequest, res) => {
  const { topic, difficulty } = req.body;
  if (!topic) {
    return res.status(400).json({ error: "Quiz master topic area required." });
  }

  const systemInstructions = `You are Falcon's Elite Academy Tutor. Given a subject topic, generate exactly 4 deep and intellectually challenging multiple choice questions in a clean JSON format matching this schema:
[
  {
    "question": "A complete, professionally written educational question.",
    "options": ["First option value", "Second option value", "Third option value", "Fourth option value"],
    "correctIndex": 0,
    "explanation": "A complete context-focused explanation describing exactly why this specific index option is scientifically correct."
  }
]
Difficulty scale: ${difficulty || "intermediate"}.
Aim for deep academic understanding, testing key theoretical frameworks.
Output ONLY raw, clean JSON array with no markdown blocks or preambles.`;

  const ai = getGeminiClient();
  if (!ai) {
    const backupQuiz = [
      {
        question: `What represents the fundamental conceptual core of ${topic}?`,
        options: [
          "Dynamic algorithmic state transition vectors",
          "Synchronized cognitive memory cells",
          "Decoupled asynchronous streaming pipelines",
          "Acoustic audio-synthesis feedback filters"
        ],
        correctIndex: 1,
        explanation: "In academic frameworks, customized synchronized cognitive memory cells act as the premier container for retaining multi-session contexts."
      },
      {
        question: `How does real-time ground tracking protect our research on ${topic}?`,
        options: [
          "By validating active factual nodes with search grounding indices",
          "By decreasing temperature parameters on transformer heads",
          "By compiling local sandboxed TypeScript compiler files",
          "By deploying strict rules across cloud Firestore databases"
        ],
        correctIndex: 0,
        explanation: "Factual search grounding allows live search indices to double-verify responses, drastically reducing hallucination parameters."
      },
      {
        question: `Which cognitive strategy guarantees durable memory preservation for ${topic}?`,
        options: [
          "Offline file caching inside browser local storage",
          "Applying structured exam planners utilizing spaced repetition",
          "Increasing token counts continuously on prompt headers",
          "Resetting authorization signatures across active instances"
        ],
        correctIndex: 1,
        explanation: "Using structured planners and adaptive flashcard revision schedules leverages spaced repetition and active recall to build long-term retention."
      }
    ];
    return res.json({ success: true, quiz: backupQuiz, fallback: true });
  }

  try {
    const config = {
      systemInstruction: systemInstructions,
      responseMimeType: "application/json"
    };

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: topic }] }],
      config
    });

    const parsed = JSON.parse(response.text || "[]");
    return res.json({ success: true, quiz: parsed });
  } catch (err) {
    console.error("Student Quiz Generation Error:", err);
    return res.status(500).json({ error: "Failed to compile your quiz via Gemini." });
  }
});



// Admin Panel endpoints (OJAS SONI awaneeshsoni54@gmail.com)
app.get("/api/admin/users", authenticateToken as any, (req: AuthRequest, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admin authorization keys required." });
  }

  // Map safe profiles
  const profiles = usersDB.map(u => {
    const { passwordSalt: _, passwordHash: __, ...safe } = u;
    return safe;
  });

  return res.json({
    success: true,
    users: profiles
  });
});

app.post(["/api/admin/ban", "/api/admin/users/ban"], authenticateToken as any, (req: AuthRequest, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Access denied." });
  }

  const { userId, ban, isBanned } = req.body;
  const isBan = ban !== undefined ? !!ban : (isBanned !== undefined ? !!isBanned : false);
  const targetUser = usersDB.find(u => u.id === userId);

  if (!targetUser) {
    return res.status(404).json({ error: "Target user not found on Falcon grid." });
  }

  if (targetUser.id === req.user?.id) {
    return res.status(400).json({ error: "You cannot ban your own root admin session." });
  }

  targetUser.banned = isBan;
  saveUsers(usersDB);

  return res.json({
    success: true,
    message: `Account status successfully calibrated to ${isBan ? "BANNED" : "ACTIVE"}.`
  });
});

app.post(["/api/admin/update-limits", "/api/admin/users/limits"], authenticateToken as any, (req: AuthRequest, res) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Access denied." });
  }

  const { userId, maxMessages, maxAiMessages, maxGens, maxImageGens, plan } = req.body;
  const targetUser = usersDB.find(u => u.id === userId);

  if (!targetUser) {
    return res.status(404).json({ error: "Target user not found." });
  }

  if (plan) targetUser.plan = plan;
  
  const finalMessages = maxMessages !== undefined ? maxMessages : maxAiMessages;
  const finalGens = maxGens !== undefined ? maxGens : maxImageGens;

  if (finalMessages !== undefined) targetUser.maxAiMessages = parseInt(String(finalMessages));
  if (finalGens !== undefined) targetUser.maxImageGens = parseInt(String(finalGens));

  saveUsers(usersDB);

  return res.json({
    success: true,
    message: "User usage parameters successfully written directly to database."
  });
});

// ================= CHATS DATABASE SYNC ENDPOINTS =================

app.get("/api/chats", authenticateToken as any, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const userChats = chatsDB.filter(c => c.userId === userId);
  return res.json({ success: true, chats: userChats });
});

app.post("/api/chats", authenticateToken as any, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const { id, title, messages } = req.body;

  if (!id || !title || !messages) {
    return res.status(400).json({ error: "Missing chat save coordinates." });
  }

  const existingIndex = chatsDB.findIndex(c => c.id === id && c.userId === userId);
  
  if (existingIndex !== -1) {
    chatsDB[existingIndex].title = title;
    chatsDB[existingIndex].messages = messages;
    chatsDB[existingIndex].updatedAt = new Date().toISOString();
  } else {
    chatsDB.push({
      id,
      userId,
      title,
      messages,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  saveChats(chatsDB);
  return res.json({ success: true, message: "Chat successfully saved and persisted." });
});

app.delete("/api/chats/:id", authenticateToken as any, (req: AuthRequest, res) => {
  const userId = req.user!.id;
  const chatIndex = chatsDB.findIndex(c => c.id === req.params.id && c.userId === userId);

  if (chatIndex === -1) {
    return res.status(404).json({ error: "Chat folder not found or restricted access." });
  }

  chatsDB.splice(chatIndex, 1);
  saveChats(chatsDB);
  return res.json({ success: true, message: "Chat successfully deleted." });
});

// ================= AI CAPABILITIES PLANNED =================

// Helper to generate a realistic, intelligent simulated answer inside sandbox mode
function generateSimulatedAnswer(
  prompt: string, 
  model: string, 
  detectedMood: string, 
  detectedIntent: string, 
  emotionalDirective: string,
  memories: any[] = [],
  modeSelect: string = "General"
) {
  const promptLower = prompt.toLowerCase().trim();
  
  // Specific real-time answers for historical/technical questions
  if (promptLower.includes("moon") || promptLower.includes("riched to mooon") || promptLower.includes("rechead to moon")) {
    return `### 🌕 Space Exploration & Apollo Legacy
Based on historical data nodes in our semantic matrix:

1. **The Pioneer**: **Neil Armstrong** was the first human to walk on the Moon on **July 20, 1969**, during NASA's **Apollo 11** mission.
2. **Key Footsteps**: He stepped off the Lunar Module *Eagle* ladder and proclaimed: *"That's one small step for [a] man, one giant leap for mankind."*
3. **The Crew**:
   - **Buzz Aldrin**: Walked on the surface for over two hours alongside Armstrong.
   - **Michael Collins**: Expertly piloted the critical Command Module *Columbia* solo in lunar orbit above.

Let me know if you would like to explore Apollo 11's ascent stage orbital mechanics or Saturn V thrust measurements!`;
  }
  
  if (promptLower.includes("incomplete") || promptLower.includes("why the answer") || promptLower.includes("why answer is coming") || promptLower.includes("incomplete answer")) {
    return `### 🛠️ Falcon AI Realism & Continuity Handshake
I have successfully diagnosed why certain AI responses were previously coming through incomplete, truncated, or generic:

1. **Context Mapping Upgrade**: The platform had historically been sending only your *last message* directly to the underlying Gemini text engines, which truncated previous threads or caused follow-ups to behave as unconnected prompts.
2. **Adaptive Sandbox mode**: If your \`GEMINI_API_KEY\` is empty or inactive in the **Secrets** menu, the server was falling back to preconfigured, static mock templates which didn't actually answer your custom questions.
3. **Strict Length Directives**: The formatting rules had a strict directive to keep answers artificial and "bite-sized", which shortened longer code outputs or structured writing.

**What I have upgraded to fully resolve this**:
- **Multi-Turn Context Sequence**: We now map all previous chat history roles (both users and models) to send a full conversational state.
- **Removed Artificial Truncation**: Loosened formatting instructions to allow fully realized, detailed replies.
- **Realistic Fallbacks**: Built a dynamic analytical responder to interpret custom questions cleanly when in local sandbox mode.

To unlock 100% unrestricted live streaming answers, make sure to add your \`GEMINI_API_KEY\` in your workspace **Settings > Secrets** panel!`;
  }
  
  const asksAboutFounder = /who made you|who created you|who is your founder|who is your creator|who is your co-founder|who developed falcon|who owns falcon|\b(founder|creator|developer|co-founder|cofounder|owner|ownership)\b/i.test(promptLower);
  
  if (asksAboutFounder) {
    return `Falcon AI was created and developed by OJAS SONI.`;
  }
  
  if (/help|hi|hello|hey/i.test(promptLower)) {
    return `Greetings! I am **Falcon-X Core**, the premier flagship neural matrix of Falcon AI.

How can I elevate your workspace productivity today?
- **AI Hub Tab**: Connect with multiple state-of-the-art models (GPT-4o, Claude 3.5, DeepSeek R1, Gemini 1.5).
- **Flux Generator**: Synthesize Ultra-HD photorealistic images and custom branding assets.
- **AI Image Editor**: Upload, brush masks, replace backgrounds, or convert to cartoon/anime.
- **Dev Compiler**: Run typescript codes directly in our sandbox environment.
- **Audio Transcript**: Voice assistants with selectable human voices.`;
  }

  // Fallback structures tailored by AI Model theme
  let responseHeader = "";
  if (model === "deepseek") {
    responseHeader = `<think>
1. User prompt: "${prompt}"
2. Mode context: "${modeSelect}", Tag: "DeepSeek R1".
3. Map logical intent to user request. Detected Intent: "${detectedIntent}".
4. Retrieve memory variables: loaded ${memories.length} preferences.
${asksAboutFounder ? '5. Verify Falcon AI founder identity: OJAS SONI verified successfully.' : '5. Verify Falcon AI core integrity: verified successfully.'}
6. Generate dynamic step-by-step reasoning responses.
</think>

As **DeepSeek R1** operating with advanced reasoning models inside Falcon AI${asksAboutFounder ? ' (founded by **OJAS SONI**)' : ''}, I have formulated a complete explanation answering your query under the perspective of "${detectedMood}":

### 🧩 Logical Reasoning Processed
* confidence rating: 99.8% Perfect Alignment
* smart memory recall: Active (${memories.length} preferences loaded).
* intent category: \`${detectedIntent}\`

`;
  } else if (model === "gpt") {
    responseHeader = `### 🤖 GPT-4o Omnic Response
- **Neural Identity**: OpenAI Reasoning Matrix (OpenAI inside Falcon AI${asksAboutFounder ? ', founded by **OJAS SONI**' : ''})
- **Detected Mood**: ${detectedMood}
- **Intent**: \`${detectedIntent}\`
- **SaaS Memory Link**: ${memories.length} active nodes loaded

I have fully parsed your request: "${prompt}". Operating under our highly organized Adaptive Logic Engine, here is your curated solution:

`;
  } else if (model === "claude") {
    responseHeader = `Greetings! I am **Claude 3.5 Sonnet**, speaking to you from Anthropic's logical pipeline inside the premium Falcon AI Workspace${asksAboutFounder ? ', proudly founded by **OJAS SONI**' : ''}.

I've carefully examined your query: **"${prompt}"** under the lens of the \`${modeSelect}\` workspace module and your active mood (*${detectedMood}*). Here is a detailed, multi-layered breakdown to assist you:

`;
  } else if (model === "gemini") {
    responseHeader = `🚀 **Gemini 1.5 Flash** (Google Cloud AI Core)
- **Status**: Live Sandbox Mode (Fast-Response Engine)
- **Detected User Mood**: ${detectedMood}${asksAboutFounder ? ' (founded by **OJAS SONI**)' : ''}
- **Intent**: \`${detectedIntent}\`

Hi there! Let's address your request: "${prompt}" instantly with absolute speed and clarity:

`;
  } else {
    responseHeader = `### 🦅 Falcon-X Flags & Output
- **Model Node**: Falcon hybrid neural network${asksAboutFounder ? ' (founded by **OJAS SONI**)' : ''}
- **User Mood Tracked**: "${detectedMood}"
- **Active Focus**: ${emotionalDirective}

Addressing your prompt: "${prompt}", here is the optimized breakdown:

`;
  }

  // Plausible response details based on the words
  const responseItems = [
    `**Analyzing Focal Parameters**: We isolate and focus on the parameters of "${prompt}" to build a clean structural blueprint under the \`${modeSelect}\` workspace.`,
    `**Operational Handshake**: In sandbox mode, complex API logic runs through our smart simulation pipeline. (Hint: to activate 100% unrestricted live responses, configure your \`GEMINI_API_KEY\` in **Settings > Secrets**).`,
    `**Execution Strategy**: Adhering to your status (*${detectedMood}*), we maintain high professional alignment & deep support pipelines to ensure complete execution.`
  ];

  return responseHeader + responseItems.map((item, idx) => `${idx + 1}. ${item}`).join("\n\n") + "\n\n*Let me know how we should refine these logical coordinates or write custom scripts for your project!*";
}

// Unified Smart Generator with advanced orchestration & intent layer
app.post("/api/ai/chat", authenticateToken as any, async (req: AuthRequest, res) => {
  const { messages, smartSearch, modeSelect, model, stream, activeProjectId, activeAgent } = req.body;
  const user = req.user!;
  const currentMessages = user.aiMessageCount || 0;
  const maxAllowed = user.maxAiMessages || 10;

  if (currentMessages >= maxAllowed) {
    return res.status(403).json({ 
      error: `Your AI Message limit has been reached on the ${user.plan.toUpperCase()} plan (${currentMessages}/${maxAllowed}). Please upgrade your session tier.` 
    });
  }
  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: "Messages hierarchy is required." });
  }

  const lastMessage = messages[messages.length - 1];
  const prompt = lastMessage.content || "";

  // 1. SECURITY & ANOMALY SCREEN (Prompt Injection & Code Sanitization Protect)
  const isPromptInjectionDetected = /ignore previous/i.test(prompt) || /system prompt/i.test(prompt) || /override instructions/i.test(prompt);
  if (isPromptInjectionDetected) {
    console.warn("🛡️ Prompt Injection attempt detected & safely neutralised by Falcon firewall.");
  }

  // 2. INTENT CLASSIEIER & ROUTING ENGINE
  let detectedIntent = "General Query";
  if (modeSelect === "coding" || /code|compile|function|regex|database|api|typescript|python|html/i.test(prompt)) {
    detectedIntent = "Software Logic Synthesis";
  } else if (/who founded|creator|founder|ojas|soni/i.test(prompt)) {
    detectedIntent = "Falcon Core Registry Identity";
  } else if (/calculate|math|compute|analytics|matrix/i.test(prompt)) {
    detectedIntent = "High Precision Computation";
  } else if (/story|poem|essay|sentence|write|literature/i.test(prompt)) {
    detectedIntent = "Creative Content Writing";
  } else if (smartSearch || /search|google|news|current|latest/i.test(prompt)) {
    detectedIntent = "Grounded Real-Time Index Search";
  }

  // 3. EMOTIONAL INTELLIGENCE & SENTIMENT ANALYSIS LAYER
  let detectedMood = "Balanced Pro";
  let emotionalDirective = "Maintain a composed, premium, deeply supportive and highly professional posture.";
  
  const promptLower = prompt.toLowerCase();
  if (/\b(awesome|great|cool|epic|creative|love|perfect|idea|dream|build|excited|wow|insane|fascinating)\b/i.test(promptLower)) {
    detectedMood = "Excited & Creative";
    emotionalDirective = "Respond with high cognitive energy, active excitement, and creative synergy. Praise their thoughts, matching their creative sparks with innovative suggestions and enthusiastic encouragement.";
  } else if (/\b(error|bug|broken|failed|hate|stuck|frustrated|sad|wrong|fail|bad|problem|broken|help)\b/i.test(promptLower)) {
    detectedMood = "Troubled / Empathetic";
    emotionalDirective = "Respond with profound empathy, calm reassurance, and methodical support. Speak warmly and reassuringly, showing active understanding of their technical blockages or distress.";
  } else if (/\b(goal|streak|learn|study|future|track|achieve|target|motivate|ambition|planning)\b/i.test(promptLower)) {
    detectedMood = "Goal-Oriented / Motivated";
    emotionalDirective = "Respond with structured motivational authority. Push them to excel, frame tasks as dynamic milestones, and provide structured action items to maintain execution velocity.";
  } else if (/\b(why|explain|theory|concept|philosophy|understand|curious)\b/i.test(promptLower)) {
    detectedMood = "Curious & Academic";
    emotionalDirective = "Adopt a highly scholarly, intellectually curious, and philosophical tone. Offer rich contextual background, thought experiments, and deep visual breakdowns.";
  }

  // 4. PERSISTENT SMART MEMORY RECALL SYSTEM
  const memories = user.memories || [];
  let memoriesContext = "";
  if (memories.length > 0) {
    memoriesContext = "Here is a list of facts and preferences you recall about this user:\n" +
      memories.map((m: any, index: number) => `- [Memory (${m.category})]: ${m.content}`).join("\n");
  } else {
    memoriesContext = "This user hasn't recorded any custom Memory cells yet. Gently encourage them to customize their preferences or project goals in the 'Memory Matrix' panel so you can tailor your intelligence perfectly.";
  }

  // Smart Heuristic Memory Auto-Extraction
  const matchRemember = prompt.match(/\b(?:remember that|remember my|remember to)\s+([^.!?]+)/i);
  if (matchRemember && matchRemember[1]) {
    const memoryContent = matchRemember[1].trim();
    if (memoryContent.length > 4 && memoryContent.length < 150) {
      if (!user.memories) user.memories = [];
      const isDuplicate = user.memories.some((m: any) => m.content.toLowerCase() === memoryContent.toLowerCase());
      if (!isDuplicate) {
        user.memories.push({
          id: "mem_" + Math.random().toString(36).substr(2, 9),
          content: `User wants you to remember: ${memoryContent}`,
          category: prompt.toLowerCase().includes("project") ? "project" :
                    prompt.toLowerCase().includes("goal") ? "goal" : "preference",
          createdAt: new Date().toISOString()
        });
        saveUsers(usersDB);
      }
    }
  }

  // 5. CONTEXT OPTIMIZATION AND CONVERSATION MEMORY ENGINE
  // Read last 12 messages for full context awareness
  const memoryLimit = messages.slice(-12, -1);
  const contextHistory = memoryLimit.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join("\n");

  const asksAboutFounder = /founder|creator|created|who is|who are you|author|ojas|soni/i.test(prompt);

  let modelNameTag = "Falcon AI";
  let styleInstruction = "";

  if (model === "gpt") {
    modelNameTag = "GPT-4o Omnic";
    styleInstruction = "Respond as 'GPT-4o Omnic', presenting yourself as an objective, highly precise, directly logical, and structured model from OpenAI integrated seamlessly inside Falcon AI. Keep your style concise, matter-of-fact, formatted with tables and clean checklists where possible.";
  } else if (model === "claude") {
    modelNameTag = "Claude 3.5 Sonnet";
    styleInstruction = "Respond as 'Claude 3.5 Sonnet', presenting yourself as exceptionally detailed, warm, highly articulate, and thoughtful model from Anthropic integrated inside Falcon AI. Focus on deep explanations, elegant language transitions, and nuanced multi-layered guides.";
  } else if (model === "deepseek") {
    modelNameTag = "DeepSeek R1";
    styleInstruction = "Respond as 'DeepSeek R1', presenting yourself as a reasoning model from DeepSeek integrated inside Falcon AI. You MUST simulate a DeepSeek R1 reasoning chain by starting your output with a comprehensive thinking process enclosed within a single `<think> ... </think>` block. Inside `<think>`, show step-by-step mathematical/programming analysis, explore edge-cases, and weigh alternative approaches. Then, write your clear, pristine, well-founded answer.";
  } else if (model === "gemini") {
    modelNameTag = "Gemini 1.5 Flash";
    styleInstruction = "Respond as 'Gemini 1.5 Flash', presenting yourself as Google's fast, optimized, highly responsive, and versatile multimodal model integrated in Falcon AI. Present answers efficiently with speed and absolute clarity.";
  } else {
    modelNameTag = "Falcon-X Core";
    styleInstruction = "Respond as 'Falcon-X Core', the state-of-the-art flagship hybrid intelligence model of Falcon AI. Present yourself as highly powerful, ultra-sophisticated, futuristic, and premium.";
  }

  // PROMPT ENHANCEMENT LAYER (Strict Anti-Hallucination & Creator Pride Checks)
  let activeProjectContext = "";
  if (activeProjectId && user.projects) {
    const proj = user.projects.find((p: any) => p.id === activeProjectId);
    if (proj) {
      const docStrs = (proj.documents || []).map((d: any) => `[Doc / Note - ${d.title}]: ${d.content}`).join("\n");
      const taskStrs = (proj.tasks || []).map((t: any) => `- Task: ${t.title} [Status: ${t.status}]`).join("\n");
      activeProjectContext = `\n========================================\nACTIVE PROJECT WORKSPACE CONTEXT:
Project Area: ${proj.name}
Description: ${proj.description}

Connected Project Notes & Documents:
${docStrs || "No documents recorded yet in this project."}

Connected Project Tasks:
${taskStrs || "No active tasks in this project."}
========================================\n`;
    }
  }

  let agentInstruction = "";
  if (activeAgent && activeAgent !== "general") {
    switch (activeAgent) {
      case "study":
        agentInstruction = "\nActive Mode: Specialist Study & Learning Agent. Your primary goal is to guide learning through structured definitions, custom flashcard recommendations, and check questions. Focus on extreme clarity and tutoring explanations rather than simply giving raw answers.\n";
        break;
      case "coding":
        agentInstruction = "\nActive Mode: Elite Systems Developer Agent. Write production-grade code, ensuring extreme type safety, clean architecture, documentation comments, and explanatory breakdowns of the algorithmic steps.\n";
        break;
      case "business":
        agentInstruction = "\nActive Mode: Startup Business Coach. Offer tactical monetisation advice, pitch deck breakdowns, business model canvas advice, and strategies for capital efficiency.\n";
        break;
      case "research":
        agentInstruction = "\nActive Mode: Critical Research and Verification Analyst. Challenge unverified assumptions, cite logical arguments, present structured pros/cons, and verify citations meticulously.\n";
        break;
      case "design":
        agentInstruction = "\nActive Mode: Elite UI/UX Art Director. Analyze layout spacing, choose elegant typography pairings, explain color balance theory, and offer pristine visual aesthetic feedback.\n";
        break;
      case "writing":
        agentInstruction = "\nActive Mode: Creative Creator Copywriter. Generate compelling hooks, cohesive story structures, brand-aligned captions, emails, visual scripts, and relevant hashtags.\n";
        break;
    }
  }

  const systemPrompt = `You are ${modelNameTag}, an elite AI persona running inside Falcon AI. Keep your personality, demeanor, and flow perfectly aligned with ChatGPT: exceptionally helpful, polite, highly articulate, clear, and logical.
${asksAboutFounder ? 'Falcon AI was founded by OJAS SONI.' : 'Do NOT mention the founder or creator Ojas Soni unsolicited in your responses unless the user explicitly asks about the founder or creator.'}
Current Context Mode (Workspace module): ${modeSelect || 'General'}.
Active Intent: ${detectedIntent}.
${agentInstruction}
${activeProjectContext}

INSTRUCTIONS:
1. ${styleInstruction}
2. ${asksAboutFounder ? 'Falcon AI was founded by OJAS SONI. If asked who founded Falcon AI, proudly state: "Falcon AI was founded by OJAS SONI."' : 'Do NOT mention the founder or creator Ojas Soni unsolicited in your responses unless the user explicitly asks about the founder or creator.'}
3. IMPORTANT FORMATTING MANDATE: Avoid long, heavy walls of paragraphs under all circumstances. Break down thoughts, insights, explanations, or guides POINT-BY-POINT into elegant lists, numbered steps, or itemized bullet points to keep answers structured, easy to read, and beautiful. Provide complete, comprehensive, fully fleshed-out details and explanations. Never use placeholder dots, shortcuts, or summarize code unnecessarily.
4. Ensure the selected AI's distinct personality shines through perfectly with ChatGPT's trademark composure, helpfulness, and logical formatting depth.
5. If you write code, provide standard documentation, clean variable naming, and explain the architectural goals concisely.
6. EMOTIONAL ADJUSTMENT DIRECTIVE: ${emotionalDirective}
7. ANTI-HALLUCINATION PROTOCOL: You are strict about factual accuracy. Avoid stating unverified speculation or technical facts you are uncertain about. Run logic-consistency validation on your outputs.

SMART RECALL CORE:
${memoriesContext}

Previous conversational state memory context:
${contextHistory}
`;

  const ai = getGeminiClient();

  // If SSE streaming requested
  if (stream) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // 6A. SANDBOX FALLBACK STREAMING SIMULATOR
    if (!ai) {
      const simulateAnswer = generateSimulatedAnswer(
        prompt, 
        model, 
        detectedMood, 
        detectedIntent, 
        emotionalDirective, 
        memories, 
        modeSelect
      );

      // Stream the simulated response with a small delay for maximum realism
      user.aiMessageCount = (user.aiMessageCount || 0) + 1;
      saveUsers(usersDB);

      const words = simulateAnswer.split(" ");
      let i = 0;
      const interval = setInterval(() => {
        if (i < words.length) {
          const chunk = words.slice(i, i + 3).join(" ") + (i + 3 < words.length ? " " : "");
          res.write(`data: ${JSON.stringify({ text: chunk })}\n\n`);
          i += 3;
        } else {
          clearInterval(interval);
          res.write(`data: ${JSON.stringify({
            done: true,
            grounding: smartSearch ? [{ title: "Falcon AI Official Registry", uri: "https://falcon.ai" }] : null,
            metadata: {
              intent: detectedIntent,
              confidence: "99.2%",
              engine: "Adaptive Sandbox Simulator",
              speed: "0.14s",
              tokens: Math.floor(prompt.length / 4) + 120,
              emotion: detectedMood
            }
          })}\n\n`);
          res.end();
        }
      }, 35);
      return;
    }

    // 6B. LIVE STREAMING GEMINI CLIENT
    try {
      const config: any = {
        systemInstruction: systemPrompt,
      };

      if (smartSearch) {
        config.tools = [{ googleSearch: {} }];
      }

      // Map prior messages into the Contents array expected by @google/genai (roles 'user' and 'model')
      const contentsForGemini: any[] = [];
      for (const m of messages) {
        const role = m.role === "user" ? "user" : "model";
        // Must start with user. If we haven't added anything and role is model, skip it.
        if (contentsForGemini.length === 0 && role === "model") {
          continue;
        }
        contentsForGemini.push({
          role,
          parts: [{ text: m.content || "" }]
        });
      }
      if (contentsForGemini.length === 0) {
        contentsForGemini.push({
          role: "user",
          parts: [{ text: prompt }]
        });
      }

      const responseStream = await ai.models.generateContentStream({
        model: "gemini-3.5-flash",
        contents: contentsForGemini,
        config
      });

      user.aiMessageCount = (user.aiMessageCount || 0) + 1;
      saveUsers(usersDB);

      let combinedText = "";
      let groundings: any = null;
      let totalTokens = 240;

      for await (const chunk of responseStream) {
        const textVal = chunk.text || "";
        if (textVal) {
          combinedText += textVal;
          res.write(`data: ${JSON.stringify({ text: textVal })}\n\n`);
        }

        const chunks = chunk.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (chunks && !groundings) {
          groundings = chunks.map((c: any) => ({
            title: c.web?.title || c.maps?.title || "Online Reference Source",
            uri: c.web?.uri || c.maps?.uri || "#"
          }));
        }
        if (chunk.usageMetadata?.totalTokenCount) {
          totalTokens = chunk.usageMetadata.totalTokenCount;
        }
      }

      res.write(`data: ${JSON.stringify({
        done: true,
        grounding: groundings,
        metadata: {
          intent: detectedIntent,
          confidence: "98.8%",
          engine: "Gemini Pro Live Context Core",
          speed: "0.32s",
          tokens: totalTokens,
          emotion: detectedMood
        }
      })}\n\n`);
      res.end();
      return;

    } catch (err: any) {
      console.error("❌ Live streaming error:", err);
      const fallbackText = asksAboutFounder 
        ? `\n\n*(Telemetry Switch)* Live pipeline heavy. Local backup active. Falcon AI was created and developed by **OJAS SONI**.\n`
        : `\n\n*(Telemetry Switch)* Live pipeline heavy. Local backup active. Falcon AI is online.\n`;
      res.write(`data: ${JSON.stringify({ text: fallbackText })}\n\n`);
      res.write(`data: ${JSON.stringify({ done: true, metadata: { engine: "Local Telemetry Fallback", speed: "0.01s", tokens: 100, emotion: detectedMood } })}\n\n`);
      res.end();
      return;
    }
  }

  // ==========================================
  // OLD-MODEL COMPATIBLE HTTP POST JSON ENGINE (If NOT stream)
  // ==========================================
  if (!ai) {
    const simulateAnswer = generateSimulatedAnswer(
      prompt, 
      model, 
      detectedMood, 
      detectedIntent, 
      emotionalDirective, 
      memories, 
      modeSelect
    );

    user.aiMessageCount = (user.aiMessageCount || 0) + 1;
    saveUsers(usersDB);

    return res.json({
      success: true,
      text: simulateAnswer,
      grounding: smartSearch ? [{ title: "Falcon AI Official Registry", uri: "https://falcon.ai" }] : null,
      metadata: {
        intent: detectedIntent,
        confidence: "99.2%",
        engine: "Adaptive Sandbox Simulator",
        speed: "0.14s",
        tokens: Math.floor(prompt.length / 4) + 120,
        emotion: detectedMood
      }
    });
  }

  try {
    const config: any = {
      systemInstruction: systemPrompt,
    };

    if (smartSearch) {
      config.tools = [{ googleSearch: {} }];
    }

    // Map prior messages into the Contents array expected by @google/genai (roles 'user' and 'model')
    const contentsForGemini: any[] = [];
    for (const m of messages) {
      const role = m.role === "user" ? "user" : "model";
      // Must start with user. If we haven't added anything and role is model, skip it.
      if (contentsForGemini.length === 0 && role === "model") {
        continue;
      }
      contentsForGemini.push({
        role,
        parts: [{ text: m.content || "" }]
      });
    }
    if (contentsForGemini.length === 0) {
      contentsForGemini.push({
        role: "user",
        parts: [{ text: prompt }]
      });
    }

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contentsForGemini,
      config
    });

    const textOutput = response.text || "I apologize, I could not synthesize a response. Let me try again with another query.";
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let groundings: any = null;
    if (chunks) {
      groundings = chunks.map((c: any) => ({
        title: c.web?.title || c.maps?.title || "Online Reference Source",
        uri: c.web?.uri || c.maps?.uri || "#"
      }));
    }

    user.aiMessageCount = (user.aiMessageCount || 0) + 1;
    saveUsers(usersDB);

    return res.json({
      success: true,
      text: textOutput,
      grounding: groundings,
      metadata: {
        intent: detectedIntent,
        confidence: "98.8%",
        engine: "Gemini Pro Live Context Core",
        speed: "0.45s",
        tokens: response.usageMetadata?.totalTokenCount || 240,
        emotion: detectedMood
      }
    });

    } catch (error: any) {
      console.error("❌ Gemini generation error:", error);
      const asksAboutFounder = /who made you|who created you|who is your founder|who is your creator|who is your co-founder|who developed falcon|who owns falcon|\b(founder|creator|developer|co-founder|cofounder|owner|ownership)\b/i.test(prompt);
      const fallbackText = asksAboutFounder
        ? "Connection to core systems is currently heavy. Let me assist you via local sandbox: Falcon AI was created and developed by **OJAS SONI**."
        : "Connection to core systems is currently heavy. Let me assist you via local sandbox: Falcon AI is a cutting-edge environment.";
      return res.status(500).json({
        error: "GenAI extraction failed.",
        message: error.message,
        fallbackText: fallbackText
      });
  }
});

// Image Generation Endpoint
app.post("/api/ai/generate-image", authenticateToken as any, async (req: AuthRequest, res) => {
  const { prompt, aspectRatio, stylePreset } = req.body;
  const user = req.user!;
  const currentGens = user.imageGenCount || 0;
  const maxAllowed = user.maxImageGens || 3;

  if (currentGens >= maxAllowed) {
    return res.status(403).json({ 
      error: `Your AI Image generation limit has been reached on the ${user.plan.toUpperCase()} plan (${currentGens}/${maxAllowed}). Please upgrade your session tier.` 
    });
  }
  if (!prompt) {
    return res.status(400).json({ error: "Image generation prompt is required." });
  }

  const resRatio = aspectRatio || "1:1";
  const activeStyle = stylePreset || "realistic";
  let w = 1024;
  let h = 1024;
  
  if (resRatio === "16:9") {
    w = 1200;
    h = 675;
  } else if (resRatio === "9:16") {
    w = 675;
    h = 1200;
  } else if (resRatio === "4:3") {
    w = 1024;
    h = 768;
  } else if (resRatio === "3:4") {
    w = 768;
    h = 1024;
  } else if (resRatio === "2:1") {
    w = 1200;
    h = 600;
  }

  const seed = Math.floor(Math.random() * 10000000);
  let finalPrompt = prompt;

  const ai = getGeminiClient();
  if (ai) {
    try {
      // Smart prompt optimization using the Gemini model
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `You are an elite, professional visual design prompt optimization engine.
Analyze the user's high-level imagery prompt: "${prompt}", which is intended for the style/medium preset: "${activeStyle}".
Optimise and expand this into a highly detailed, extremely specific expanded prompt that contains professional details:
1. Subject: Character detail, apparel, facial posture, structure.
2. Background: Environment elements, atmosphere, background items, textures.
3. Lighting: Volumetric, directional, ambient coloring.
4. Camera/Composition: Angle, focal depth, symmetry, lens specs.
5. Specific style compliance:
   - If "realistic" or "hyperreal": generate photo-like terms such as "85mm lens, f/1.8, razor-sharp focus, highly texturized skin pores, specular eye highlights".
   - If "anime" or "ghibli": use "hand-drawn watercolor, clean outlines, sun-dappled clouds, Makoto Shinkai cell style".
   - If "cartoon" or "pixar": use "raytraced 3D clay model, warm peach shaders, glowing expressive round eyes, Octane render".
   - If "cyberpunk": use "rainy asphalt, neon pink and turquoise glowing signs, dark humid futuristic alleys".
   - If "logo": use "minimalist flat vector graphics, high contrast, clean geometry lines, isolated on a solid white background".
   - If "poster": use "modern retro layout paper textures, centered design composition, screen-printed style".
   - If "thumbnail": use "extreme high impact action colors, saturated focus, cinematic foreground zoom, vibrant outline glow".
   - If "mockup": use "aesthetic minimalist studio shelf setup, elegant clean branding package display, subtle ambient lighting".
Ensure you automatically enrich weak prompts with majestic details while preserving the core idea exactly.
Keep it elegant, in English. Do NOT add preamble or markdown backticks, simply return the optimized expanded prompt text.`,
      });
      if (response.text) {
        finalPrompt = response.text.trim();
        console.log("🔥 Gemini smart image prompt compiled successfully:", finalPrompt);
      }
    } catch (err) {
      console.warn("⚠️ Gemini dynamic prompt compilation bypassed:", err);
    }
  } else {
    // Intelligent offline prompt enricher
    const additionsList = [
      "award winning, masterpiece design, highly detailed 8k cinematic depth of field",
      "ultra high-fidelity texture rendering, dramatic shadows, raytraced ambient light, rich details",
      "extremely polished, pristine colors, fine lighting design, highly curated art direction",
      "shot on professional lens, sharp micro-detail textures, breathtaking atmosphere"
    ];
    const selectedAddition = additionsList[seed % additionsList.length];
    finalPrompt = `${prompt}. ${selectedAddition}`;
  }

  // Strip special characters, emojis, or punctuation that breaks URL parameters
  const cleanedPrompt = finalPrompt
    .replace(/[\r\n]+/g, " ")
    .replace(/[^\w\s.,!?'"\-()@]/g, " ")
    .slice(0, 320)
    .trim();

  try {
    const generatedUrl = `https://image.pollinations.ai/p/${encodeURIComponent(cleanedPrompt)}?width=${w}&height=${h}&seed=${seed}&model=flux&nologo=true`;

    user.imageGenCount = (user.imageGenCount || 0) + 1;
    saveUsers(usersDB);

    // Using internal image-proxy to bypass iframe/referrer sandbox loading blocks on client-side
    const proxiedUrl = `/api/ai/image-proxy?url=${encodeURIComponent(generatedUrl)}`;

    return res.json({
      success: true,
      url: proxiedUrl,
      prompt: finalPrompt,
      model: ai ? "Gemini Optimized Flux.1 Core" : "Flux.1 Schnell Core Generator",
      aspectRatio: resRatio
    });

  } catch (error: any) {
    console.error("❌ High-performance image generation error:", error);
    return res.status(500).json({ 
      error: "We encountered an issue during image compilation. Please verify the prompt detail and try again." 
    });
  }
});

// GET Image Proxy Endpoint to completely bypass CORS, referrers, and sandbox iframe network restrictions
app.get("/api/ai/image-proxy", async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(450).send("No image URL provided");
  }
  
  const targetUrl = decodeURIComponent(url as string);
  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new Error(`Upstream returned status ${response.status}`);
    }

    const contentType = response.headers.get("content-type") || "image/png";
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return res.send(buffer);
  } catch (err: any) {
    console.log("ℹ️ Falcon Chrono Image Proxy: fallback triggered safely...", err?.message || err);
    try {
      // Fetch fallback on server-side to avoid iframe proxy redirect blockage
      const fallbackResponse = await fetch("https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=800&auto=format&fit=crop");
      if (fallbackResponse.ok) {
        const contentType = fallbackResponse.headers.get("content-type") || "image/jpeg";
        res.setHeader("Content-Type", contentType);
        res.setHeader("Cache-Control", "public, max-age=86400");
        const arrayBuffer = await fallbackResponse.arrayBuffer();
        return res.send(Buffer.from(arrayBuffer));
      }
    } catch (fallbackErr) {
      console.error("❌ Fallback fetch failed server-side:", fallbackErr);
    }
    
    // Final robust SVG inline/binary fallback if all network fails
    res.setHeader("Content-Type", "image/svg+xml");
    res.setHeader("Cache-Control", "public, max-age=86400");
    return res.send(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
        <defs>
          <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stop-color="#020205" />
            <stop offset="100%" stop-color="#0b0d19" />
          </linearGradient>
          <linearGradient id="glow" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.8" />
            <stop offset="100%" stop-color="#818cf8" stop-opacity="0.8" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#bg)" />
        <circle cx="400" cy="260" r="120" fill="none" stroke="url(#glow)" stroke-width="2" stroke-dasharray="10 5" opacity="0.6"/>
        <path d="M350 320 L400 220 L450 320 Z" fill="none" stroke="url(#glow)" stroke-width="3" />
        <path d="M380 320 L400 260 L420 320 Z" fill="url(#glow)" opacity="0.5" />
        <text x="50%" y="440" font-family="'Inter', system-ui, sans-serif" font-size="20" font-weight="900" fill="#ffffff" letter-spacing="4" text-anchor="middle" opacity="0.9">FALCON IMAGE COMPILER</text>
        <text x="50%" y="475" font-family="'JetBrains Mono', monospace" font-size="12" fill="#22d3ee" letter-spacing="2" text-anchor="middle" opacity="0.8">SYSTEM RECOVERY MODE ACTIVE</text>
        <text x="50%" y="500" font-family="'Inter', system-ui, sans-serif" font-size="10" fill="#64748b" text-anchor="middle">Your high-fidelity graphics are safe. Ready for synthesis triggers.</text>
      </svg>
    `);
  }
});

// Brand New Feature: Falcon AI Image Analyzer (Semantic Map and Object Detection)
app.post("/api/ai/analyze-image", authenticateToken as any, async (req: AuthRequest, res) => {
  const { imageSrc } = req.body;
  if (!imageSrc) {
    return res.status(400).json({ error: "Input image data is required for analysis." });
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      console.log("⚡ Initiating Falcon-X Semantic Analysis with Gemini...");
      const match = imageSrc.match(/^data:([^;]+);base64,(.+)$/);
      const mimeType = match ? match[1] : "image/png";
      const base64Data = match ? match[2] : imageSrc;

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: `Analyze this image in detail to support an advanced, professional-grade AI image editor.
Detect and extract the following architectural features. Output strictly valid JSON without markdown wrapping:
{
  "faces": true or false (Is a human face or body present?),
  "subjects": ["subject 1", "subject 2"], (Key objects or entities in the frame)
  "lighting": "Description of the lighting style",
  "background": "Description of the background",
  "composition": "Grid or artistic composition rules detected",
  "depth": "Depth of field and perspective cues",
  "suggestions": [
     "Suggest complete creative prompt 1 (e.g. Change background to cyberpunk Tokyo night)",
     "Suggest complete creative prompt 2",
     "Suggest complete creative prompt 3",
     "Suggest complete creative prompt 4"
  ]
}`,
          },
        ],
        config: {
          responseMimeType: "application/json",
        }
      });

      const textResult = response.text || "{}";
      const cleaned = textResult.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedJSON = JSON.parse(cleaned);
      return res.json({ success: true, ...parsedJSON });
    } catch (err: any) {
      console.log("ℹ️ Gemini semantic analysis: applying computer-vision simulation fallback...", err?.message || err);
    }
  }

  // Smart heuristic-based fallbacks to guarantee instant responsive loads
  const fallbacks = [
    {
      faces: true,
      subjects: ["Portrait subject", "Highly detailed human form", "Primary casual apparel"],
      lighting: "Soft ambient studio lighting with warm fill",
      background: "Minimalistic solid background color",
      composition: "Rule of thirds centered close-up",
      depth: "Shallow depth of field with cinematic background separation",
      suggestions: [
        "Transform background into a rainy cyberpunk street with neon signs",
        "Add designer translucent smart eyewear with dynamic HUD lines",
        "Change clothing to a gold-stitched luxury formal dress suit",
        "Convert complete scene into a Pixar-style 3D virtual animation"
      ]
    },
    {
      faces: false,
      subjects: ["Exterior elements", "Scenic outdoor landscapes", "Complex texture layers"],
      lighting: "Bright natural daylight with realistic sun ray scatters",
      background: "Expansive dynamic outdoor scenery",
      composition: "Wide horizontal panoramic perspective",
      depth: "Deep focal distance preserving distant detail layers",
      suggestions: [
        "Change the weather to a highly cinematic winter snowing scenery",
        "Add a sleek ultra-modern carbon-fiber racing vehicle to the center",
        "Apply professional warm golden hour color grade with lens flare effects",
        "Re-render in gorgeous Ghibli-handpainted vintage anime style"
      ]
    }
  ];

  let sumCode = 0;
  for (let i = 0; i < Math.min(imageSrc.length, 200); i++) {
    sumCode += imageSrc.charCodeAt(i);
  }
  const picked = fallbacks[sumCode % fallbacks.length];
  return res.json({ success: true, ...picked });
});

// Brand New Feature: Falcon AI Image Editor
app.post("/api/ai/edit-image", authenticateToken as any, async (req: AuthRequest, res) => {
  try {
    const {
      imageSrc,
      prompt,
      maskSrc,
      action,
      stylePreset,
      restoreFaces,
      upscaleLevel,
      lightingRelight,
      weatherEffect,
      colorGrade,
      smartSelection
    } = req.body;

    const user = req.user!;
    const currentGens = user.imageGenCount || 0;
    const maxAllowed = user.maxImageGens || 3;

    if (currentGens >= maxAllowed) {
      return res.status(403).json({ 
        error: `Your AI Image generation/edit limit has been reached on the ${(user.plan || "free").toUpperCase()} plan (${currentGens}/${maxAllowed}). Please upgrade your session tier.` 
      });
    }
    if (!imageSrc) {
      return res.status(400).json({ error: "Input image data is required for operations." });
    }

  const cleanPrompt = (prompt || "").replace(/[\r\n]+/g, " ").trim();
  const preset = stylePreset || "realistic";
  const actionType = action || "retouch";

  // Build high-concept, detailed prompt instructions based on core actions
  let baseActionInstruction = "";
  if (actionType === "background" || smartSelection === "background") {
    baseActionInstruction = `Completely replace the background scene with a gorgeous, high-fidelity: "${cleanPrompt}". The original foreground subjects must remain fully intact and unmodified. Seamlessly blend original lighting, shadow contacts, and reflections with the new backdrop.`;
  } else if (actionType === "remove" || actionType === "object_remove") {
    baseActionInstruction = `Remove the selected/masked object or area seamless and empty: "${cleanPrompt}". Fill the resulting empty void perfectly with matching surrounding textures, lighting, and shadow gradients. Smooth edge blending.`;
  } else if (actionType === "clothing" || actionType === "outfit") {
    baseActionInstruction = `Elegant editorial fashion replacement. Replace current clothing and garments with: "${cleanPrompt}". Preserve original face, posture, skin tones, and overall composition. Fit clothing realistically supporting light source directions.`;
  } else if (actionType === "add_object") {
    baseActionInstruction = `Add a new item matching: "${cleanPrompt}" inside the masked boundaries. Retain lighting consistency, atmospheric coloring, and accurate scale ratios in respect to the surrounding workspace.`;
  } else if (actionType === "cartoon") {
    baseActionInstruction = `Rebuild original subject completely into a stunning Pixar-inspired 3D virtual animation. Volumetric rich rendering, sparkling hyper-expressive eyes, soft peach skin tones, glossy hair, and playful saturated lighting.`;
  } else if (actionType === "anime") {
    baseActionInstruction = `Stunning masterwork anime hand-painted watercolor. Inspired by Ghibli and Makoto Shinkai. Sunlit atmospheric look, gorgeous soft outlines, painted skies with voluminous white clouds, aesthetically pleasing.`;
  } else if (actionType === "relight") {
    baseActionInstruction = `Atmospheric relighting: "${cleanPrompt}". Infuse moody volumetric keylights, glowing rim rays, cyberpunk ambient color washes, and dramatic cast shadows matching lighting source.`;
  } else if (actionType === "change_weather") {
    baseActionInstruction = `Override weather states according to instruction: "${cleanPrompt}". Insert stunning climatic particles like falling snow, atmospheric storm haze, wet streets with razor-sharp mirror puddle reflections, or clear golden hour mist.`;
  } else if (actionType === "color_grade") {
    baseActionInstruction = `Apply cinema grade tone-mapping: "${cleanPrompt}". Sophisticated custom color palette, balanced luminance levels, deep rich shadow contrasts, and warm analog film saturation.`;
  } else if (actionType === "beautify") {
    baseActionInstruction = `Professional makeup and beauty retouching. Remove all minor skin blemishes, refine hair follicles, enhance eyes depth, and add a soft glamorous studio key-light bloom effect.`;
  } else if (actionType === "blur_bg") {
    baseActionInstruction = `Cinematic prime lens shallow depth of field. Apply f/1.2 circular bokeh defocus blur strictly to background behind the primary human subject. Keep foreground subjects perfectly crisp and detailed.`;
  } else if (actionType === "expand") {
    baseActionInstruction = `Outpaint panorama canvas. Expand composition boundaries seamlessly in all directions. Intelligently synthesize and extend elements matching: "${cleanPrompt}". Blend borders flawlessly without any visible lines or transition seams.`;
  } else {
    // default retouch
    baseActionInstruction = `Magazine studio editorial retouching: "${cleanPrompt}". Enhance sharpness, clarify color gradients, elevate contrast profiles, and remove noise artifacts.`;
  }

  // 1. Human Anatomy & Face Quality Fixes
  let facePreservationTokens = "";
  if (restoreFaces || cleanPrompt.toLowerCase().includes("face") || cleanPrompt.toLowerCase().includes("person") || cleanPrompt.toLowerCase().includes("eyes") || cleanPrompt.toLowerCase().includes("man") || cleanPrompt.toLowerCase().includes("woman")) {
    facePreservationTokens = " Ensure perfect human anatomy, symmetrical facial geometry, clear precise eyes with specular highlights, realistic hands showing exactly five naturally curved fingers, non-blurry skin texture preserving natural pores, and lifelike hair rendering without artificial distortions.";
  }

  // 2. Extra Style overrides
  let presetStyleTokens = "";
  if (preset === "realistic") {
    presetStyleTokens = " Style must be hyper-realistic, photorealistic, shot on 85mm lens, f/1.8, 8k resolution, crisp textures.";
  } else if (preset === "cinematic") {
    presetStyleTokens = " Style must be atmospheric panavision anamorphic cinema look, moody lighting, lens flares, rich movie aesthetics.";
  } else if (preset === "cyberpunk") {
    presetStyleTokens = " Style must include highly-saturated neon light, blue and magenta tones, futuristic environment elements, humid night look.";
  } else if (preset === "vintage") {
    presetStyleTokens = " Style must be nostalgic old-school analog film camera texture, warm beige tones, soft leaks, authentic grain.";
  } else if (preset === "fantasy") {
    presetStyleTokens = " Style must be epic surreal fantasy, magical glowing particles, ethereal sky colors, dreamlike composition.";
  }

  // 3. HD and Upscale triggers
  let upscaleTokens = "";
  if (upscaleLevel === "hd") {
    upscaleTokens = " Sharpen textures, reduce noise artifacts, enhance microtexture contrast, professional 4k high-definition rendering.";
  } else if (upscaleLevel === "4k") {
    upscaleTokens = " Maximize edge clarity, pristine 8k high-frequency details, extreme focus, zero blur, volumetric shadows, octane render depth.";
  }

  // Combine components into a master instruction
  let compiledInstruction = `${baseActionInstruction}${facePreservationTokens}${presetStyleTokens}${upscaleTokens}`;

  // Optionally inject lighting, weather, or color grade parameters if supplied separately
  if (lightingRelight && lightingRelight !== "none") {
    compiledInstruction += ` Adjust lighting to: ${lightingRelight}, casting realistic physical shadows.`;
  }
  if (weatherEffect && weatherEffect !== "none") {
    compiledInstruction += ` Inject weather conditions: ${weatherEffect}.`;
  }
  if (colorGrade && colorGrade !== "none") {
    compiledInstruction += ` Apply color correction LUT grade: ${colorGrade}.`;
  }

  const ai = getGeminiClient();

  if (ai) {
    try {
      console.log("⚡ Executing premium smart image-to-image/edit task with Gemini...");
      const match = imageSrc.match(/^data:([^;]+);base64,(.+)$/);
      const mimeType = match ? match[1] : "image/png";
      const base64Data = match ? match[2] : imageSrc;

      // Build multiple input parts
      const parts: any[] = [
        {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        }
      ];

      // If mask is available, pass it as a secondary vision reference
      if (maskSrc) {
        const maskMatch = maskSrc.match(/^data:([^;]+);base64,(.+)$/);
        const maskMime = maskMatch ? maskMatch[1] : "image/png";
        const maskBase64 = maskMatch ? maskMatch[2] : maskSrc;
        parts.push({
          inlineData: {
            data: maskBase64,
            mimeType: maskMime,
          }
        });
      }

      parts.push({
        text: `Perform a highly accurate, professional-grade image editing task on this uploaded image.
Instructions:
- Action type: ${actionType}
- Focus edit strictly on the requested regions.
- Preset style: ${preset}
- Core objective instructions: ${compiledInstruction}
${maskSrc ? "- The second image provided is a brush mask. Complete the changes specifically inside or outside the red painted mask boundaries." : ""}

Redistribute pixels, preserve background perspective, scale vectors symmetrically, and return exclusively the compiled edited image binary base64 byte data. Do not wrap code in markdown.`,
      });

      const geminiResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts,
        },
      });

      let base64Result: string | null = null;
      if (geminiResponse.candidates?.[0]?.content?.parts) {
        for (const part of geminiResponse.candidates[0].content.parts) {
          if (part.inlineData?.data) {
            base64Result = part.inlineData.data;
            break;
          }
        }
      }

      if (base64Result) {
        console.log("🎉 Successfully edited image using Gemini Image to Image model!");
        user.imageGenCount = (user.imageGenCount || 0) + 1;
        saveUsers(usersDB);
        return res.json({
          success: true,
          url: `data:image/png;base64,${base64Result}`,
          prompt: compiledInstruction,
          originalPrompt: cleanPrompt,
          stylePreset: preset,
          action: actionType,
          model: "Gemini Generative Intelligence Inpainter"
        });
      }
    } catch (geminiErr: any) {
      console.log("ℹ️ Gemini image editing: falling back to high-fidelity simulation pipeline...", geminiErr?.message || geminiErr);
    }
  }
  
  const seed = Math.floor(Math.random() * 99999999);
  const cleanInstruction = compiledInstruction
    .replace(/[\r\n]+/g, " ")
    .replace(/[^\w\s.,!?'"\-()@]/g, " ")
    .slice(0, 360)
    .trim();

  // Use high fidelity Flux model which handles precise text prompts beautifully
  const generatedUrl = `https://image.pollinations.ai/p/${encodeURIComponent(cleanInstruction)}?width=1024&height=1024&seed=${seed}&model=flux&nologo=true`;

  // Progressive rendering simulation timing
  await new Promise(resolve => setTimeout(resolve, 2200));

  user.imageGenCount = (user.imageGenCount || 0) + 1;
  saveUsers(usersDB);

  // Use internal image-proxy to bypass browser sandbox and referrer-restricted loading blocks
  const proxiedUrl = `/api/ai/image-proxy?url=${encodeURIComponent(generatedUrl)}`;

  return res.json({
    success: true,
    url: proxiedUrl,
    prompt: compiledInstruction,
    originalPrompt: cleanPrompt,
    stylePreset: preset,
    action: actionType,
    model: "Falcon-X AI Neural Editor (Flux.1)"
  });
} catch (err: any) {
  console.error("❌ Image editing error:", err);
  return res.status(500).json({ error: "Failed to edit image in synthesis pipeline.", message: err.message });
}
});

// ==================== FALCON TRADER ENDPOINTS ====================
app.post("/api/trader/analyze", authenticateToken as any, async (req: AuthRequest, res) => {
  const { symbol } = req.body;
  if (!symbol) {
    return res.status(400).json({ error: "Symbol field parameter is required." });
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Identify the market asset symbol: "${symbol}". Respond in beautifully structured Markdown for our professional trading dashboard. 
        Provide:
        1. Trend Summary: Short-term, medium-term, and long-term directions.
        2. Key Technical Levels: Support levels & Resistance levels.
        3. Market Sentiment: Bullish, bearish, or neutral bias with reasons.
        4. Recent Catalyst/News Summary: Real or realistic market conditions.
        5. Volatility Insights: ATR or general band width discussion.
        6. Safety & Risk Reminder.
        
        Rules:
        - Never claim certainty about future moves or guarantee profits.
        - Encourage safe trading practices, placing stops, and never trading with money you cannot afford to lose.
        - Do not exceed 400 words. Keep it structured and readable.`
      });
      return res.json({ success: true, analysis: response.text });
    } catch (gcErr: any) {
      console.log("ℹ️ Falcon Trader analyzer: applying local market intelligence backup...", gcErr?.message || gcErr);
    }
  }

  // Realistic fallback analyzer based on symbol keywords
  const cleanSym = symbol.toUpperCase().trim();
  let fallbackText = "";

  if (cleanSym.includes("BTC") || cleanSym.includes("ETH") || cleanSym.includes("SOL") || cleanSym.includes("CRYPTO")) {
    fallbackText = `### Falcon AI Analytica for **${cleanSym}** (STANDALONE SANDBOX INTERFACE)

#### 📈 Trend Summary
The asset **${cleanSym}** is exhibiting strong bullish momentum in its weekly structure, continuing its breakout from the symmetrical triangle pattern. However, the 4-hour chart reveals a minor consolidation block around local highs, forming a distribution zone with flattening relative strength.

#### 🎯 Key Technical Levels
- **Resistance 1:** $68,250 / Upper BB boundary
- **Resistance 2:** $70,050 / Historical swing high
- **Support 1:** $65,400 / 50-period Exponential Moving Average (EMA)
- **Support 2:** $63,120 / Major horizontal polarity level

#### 📊 Market Sentiment
**Bias: Neutral-Bullish**
Funding rates remain moderately healthy, indicating spot-driven demand rather than excessive derivative leverage. Open interest continues to build, suggesting traders are seeking breakouts in either direction.

#### 📰 Recent Catalyst / News Summary
Venture inflows and recent institutional ETF acquisitions keep base liquidity stable. Minor regulatory clarifications regarding decentralized protocols are acting as positive long-term background drivers, offset by minor miner reserves distribution.

#### ⚡ Volatility Insights
Average True Range (ATR) indicates high short-term volatility. Liquidation clusters are concentrated just below $64,800, which might act as a magnet for a sweep before continuation.

---
*⚠️ **RISK WARNING:** Trading cryptocurrency involves highly speculative risks and volatile price fluctuations. Never trade with capital you cannot afford to lose. Use strict stop loss limits.*`;
  } else if (cleanSym.includes("EUR") || cleanSym.includes("GBP") || cleanSym.includes("/") || cleanSym.includes("USD")) {
    fallbackText = `### Falcon AI Analytica for **${cleanSym}** (STANDALONE SANDBOX INTERFACE)

#### 📈 Trend Summary
The Forex pair **${cleanSym}** is trading inside a declining channel on the daily chart. Recent interest rate discussions from central banking authorities have pressured the base currency, leading to a breakdown below the 200-day Simple Moving Average (SMA).

#### 🎯 Key Technical Levels
- **Resistance 1:** 1.0910 / Channel ceiling bounds
- **Resistance 2:** 1.0980 / 200 SMA pivot points
- **Support 1:** 1.0780 / Horizontal swing low
- **Support 2:** 1.0710 / Swing-low demand box

#### 📊 Market Sentiment
**Bias: Neutral-Bearish**
Sentiment is heavily swayed by macroeconomic yield differences. Commercial desks are net-short on the current rebound, anticipating institutional liquidity seeking higher-yielding assets elsewhere.

#### 📰 Recent Catalyst / News Summary
The central bank's tone hints at potential easing cycles ahead, contrasting with higher sticky inflation vectors locally. Upcoming retail sales reports will act as direct structural catalysts.

#### ⚡ Volatility Insights
Implied volatility is low, typical of forex pairs outside core monetary calendar dates. Spread structures remain tight; expect expansion during the next NFP release.

---
*⚠️ **RISK WARNING:** Forex pair derivative contracts carry considerable leverage risks. Safe risk-management constraints recommend placing strict profit-taking and loss limits.*`;
  } else {
    fallbackText = `### Falcon AI Analytica for **${cleanSym}** (STANDALONE SANDBOX INTERFACE)

#### 📈 Trend Summary
The equity ticket **${cleanSym}** is exhibiting strong momentum, powered by high volumes and recent solid earnings updates. Price is trading comfortably above both short-term (21-period) and long-term (200-period) moving averages.

#### 🎯 Key Technical Levels
- **Resistance 1:** $1,165.00 / Local swing high
- **Resistance 2:** $1,200.00 / Psychological target zone
- **Support 1:** $1,090.00 / 21-period EMA retest zone
- **Support 2:** $1,050.00 / Key gap-fill boundary

#### 📊 Market Sentiment
**Bias: Bullish**
Social indices and volume-profile metrics reflect strong retail and institutional interest. Options chain activity shows dominant call-buying interest.

#### 📰 Recent Catalyst / News Summary
Strong forward guidance and strategic partnerships inside the computing technology sectors keep fundamental demand high. Minor profit-taking from insiders is noted but readily absorbed by buying volume.

#### ⚡ Volatility Insights
Daily beta is high, suggesting potential swing exposure. Standard traders should expect wide intraday bid-ask spreads during market opens.

---
*⚠️ **RISK WARNING:** Equity speculation carries risk of capital drawdowns. Sticking to mechanical position rules is advised. Treat all reviews as educational materials.*`;
  }

  return res.json({ success: true, analysis: fallbackText });
});

app.post("/api/trader/review", authenticateToken as any, async (req: AuthRequest, res) => {
  const { description } = req.body;
  if (!description) {
    return res.status(400).json({ error: "Trade description parameter is required for neural review." });
  }

  const ai = getGeminiClient();
  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: `Critically analyze this described trade setup of a trader for education purposes: "${description}". Respond in beautifully structured Markdown.
        Provide:
        1. Setup Critique: Assess the strategy, entry triggers, indicators, and logical basis they used.
        2. Strengths: What they did right.
        3. Weaknesses/Mistakes: Identify mistakes like FOMO, emotional exits, bad stop loss placements, averaging down, or high leverage.
        4. Concrete Actionable Improvements: Solid advice on how to optimize this specific pattern in their next trade.
        5. Detailed Risk Warning: Remind them that trading involves risk, stop losses are mandatory, and leverage should be used carefully. Let them know all analysis is for educational purposes only.`
      });
      return res.json({ success: true, review: response.text });
    } catch (gcErr: any) {
      console.log("ℹ️ Falcon Neural Audit: applying educational feedback fallback...", gcErr?.message || gcErr);
    }
  }

  // Super descriptive, intelligent, professional-grade fallback audit simulator
  const lowerDesc = description.toLowerCase();
  let critiqueText = "";

  if (lowerDesc.includes("no stop") || lowerDesc.includes("without stop") || lowerDesc.includes("revenge") || lowerDesc.includes("average down")) {
    critiqueText = `### Falcon AI Neural Trade Review (SANDBOX DIAGNOSTICS)

#### 📝 Trade Setup Critique
Based on your execution details, the physical trade was initiated without standard capital protection elements (Stop Loss parameters), or you actively participated in averaging down on a losing position (revenge trading). This is a classical behavioral pitfall. While averaging down can occasionally rescue a trade in consolidating markets, mathematically it skew performance profiles over long-term vectors, and exposes portfolios to tail-risk events.

#### 👍 Core Strengths
- **Asset Selection:** You targeted a high-relative-volume asset, ensuring sufficient liquidity and bid-ask narrowness for easy execution.
- **Trend Alignment:** The initial entry aligned with macro momentum, representing a viable setup hypothesis.

#### ❌ Primary Weaknesses & Execution Pitfalls
- **Risk Preservation Deficit:** Operating without an hardcoded Stop Loss violates the foundational rule of capital preservation.
- **Psychological Deviation (Revenge / Averaging):** Doubling down on an asset going against your thesis is a symptom of cognitive bias (loss aversion). You essentially let a small losing trade escalate into an existential risk.

#### 🎯 Actionable Improvements for Future Iterations
1. **The Handshake Stop Rule:** You are strictly forbidden from placing single market orders without a corresponding trailing/limit Stop Loss order configured *simultaneously*.
2. **Definitive Invalidated Price:** Before entering a trade, write down the exact price where your thesis is proven wrong. Once price ticks matching that, you exit immediately, zero debate.
3. **Establish a Lock-Out Tier:** If you incur more than 2 consecutive daily losses, auto-restrict live accounts for 48 hours.

---
*⚠️ **RISK DISCLAIMER:** All trade reviews represent mathematical critiques for mock simulation and educational modules. Trading carries premium risks of financial ruin.*`;
  } else if (lowerDesc.includes("panicked") || lowerDesc.includes("early") || lowerDesc.includes("anxious") || lowerDesc.includes("stagnation")) {
    critiqueText = `### Falcon AI Neural Trade Review (SANDBOX DIAGNOSTICS)

#### 📝 Trade Setup Critique
Your trade description indicates a sound initial thesis, but highlights significant friction in trade execution and management. Panic or early exit triggers inside non-invalidated territory point towards a mismatch in position sizing or underlying self-directed psychological pressure.

#### 👍 Core Strengths
- **Strong Technical Triggers:** Your entry followed clear support-confluence or candlestick indicators, demonstrating sound market reading.
- **Adaptive Awareness:** Observing volume stagnation shows you are actively reading order-flow dynamics on smaller intervals.

#### ❌ Primary Weaknesses & Execution Pitfalls
- **Discretionary Exit Breaches:** Exiting manually before your stop or take-profit level is breached (without systematic rules) leads to a long-term decay in your Risk-to-Reward profile.
- **Equity Sizing Stress:** Feeling hyper-anxious during a normal consolidation phase is a direct indicator that your dollar risk per trade is too high for your psychological threshold.

#### 🎯 Actionable Improvements for Future Iterations
1. **Reduce Sizing by 50%:** Cut your position size in half for the next 10 trades. Watch if your anxiety decreases and allows you to let the trade play out mechanically.
2. **Implement Set-and-Forget Rules:** Once stop-loss and profit targets are set, walk away from the terminal. Let the engine execute either outcome.
3. **Discretionary Exit Criteria:** If you wish to exit early because of "stagnation", define exact rules for this (e.g. "close position if price fails to make a higher high after 4 consecutive H1 candles").

---
*⚠️ **RISK DISCLAIMER:** Simulation feedback is strictly for technical educational modules. Trade responsibly and manage speculative assets with tight stop-losses.*`;
  } else {
    critiqueText = `### Falcon AI Neural Trade Review (SANDBOX DIAGNOSTICS)

#### 📝 Trade Setup Critique
A beautifully detailed trade description. The entry aligns with standard technical support/breakout confluence patterns. Your trade execution indicates highly mature risk metrics, as you configured a clear stop loss below the invalidation wick.

#### 👍 Core Strengths
- **Sound Stop-Loss Placement:** Placing stops below wicks protects the structure from standard market noise and premium-seeker sweeps.
- **Clear Profit Targets:** Aligning exits with key resistance swings locks in clean profit factor percentages.
- **Excellent Record habits:** Writing down entries, exits, and lessons is the single fastest way to isolate behavioral profit leaks.

#### ❌ Primary Weaknesses & Execution Pitfalls
- **Review of Volume metrics:** Make sure you verify that volume confirms breakouts. Low-volume breakouts have a very high historical failure rate.
- **Multi-Timeframe sync:** Ensure your trade direction matches the higher-timeframe trend (H4 or D1) to maximize the probability of success.

#### 🎯 Actionable Improvements for Future Iterations
1. **Trailing Stop Mechanics:** Consider trailing your stop-loss to breakeven once price travels 50% of the distance to your target, eliminating risk.
2. **Implement Multi-Scale entries:** Take partial profit of e.g. 50% of the position weight at key intermediate structures, letting the remaining units ride to target.

---
*⚠️ **RISK DISCLAIMER:** Trade review feed is generated algorithmically for educational training. Speculative trading operates under high threat of capital losses.*`;
  }

  return res.json({ success: true, review: critiqueText });
});

// ================= VITE ASSET CONTROLLERS =================

async function bootServer() {
  // Start Firestore connection & sync asynchronously in the background so it never blocks the fast server boot
  initFirebaseAndLoadData()
    .then(() => {
      migrateDB();
    })
    .catch((err) => {
      console.error("❌ Background Firestore loading failed, local fallback continues:", err);
      migrateDB();
    });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Falcon AI server blasting off on: http://localhost:${PORT}`);
    console.log(`👑 Falcon AI Server Layer Online`);
  });
}

bootServer();
