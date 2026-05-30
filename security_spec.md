# Falcon AI Zero-Trust Firestore Security Specification
## Phase 0: Payload-First Security TDD & Invariants

This specification outlines the Attribute-Based Access Control (ABAC) and security invariants designed to protect Falcon AI's persistent entities (`users` and `chats`) against unauthorized credential compromise, Update-Gaps, or ID poisoning threats.

---

### Part 1: Data Invariants
1. **User Profiles Integrity**:
   - A user profile block contains highly critical SaaS configurations (such as role privileges, subscriber plan limits, and usage counts).
   - Only the system administrative deck or the specific owner account can inspect or modify private coordinates.
   - Self-assigned roles or plan elevations are strictly prohibited during user profile registration.
   - Critical audit logs like `createdAt` must be immutable.

2. **Chat Persistence Safety**:
   - Every chat thread document must reference the actual owner's ID (`userId`).
   - Standard read, update, or deletion operations can only be executed by the verified owner.
   - The thread owner ID (`userId`) and session creation audit keys are immutable.
   - The message history list length and string sizes must be strictly bounded to prevent Denial-of-Wallet attacks.

---

### Part 2: The "Dirty Dozen" Penetration Attack Payloads
The following payloads simulate aggressive exploits targetting Falcon Core's firewalls. They are mathematically guaranteed to be rejected with `PERMISSION_DENIED`:

1. **Privilege Escalation (Self-Admin Role)**
   - *Attack*: Create `/users/attacker_uid` setting `"role": "admin"`.
   - *Result*: `PERMISSION_DENIED` (Strict schema and creator constraints).

2. **Usage Counter Bypass (Self-Quota Reset)**
   - *Attack*: Update `/users/operator_uid` setting `"aiMessageCount": 0` and `"maxAiMessages": 999999`.
   - *Result*: `PERMISSION_DENIED` (Only allowed fields change filters apply during partial updates).

3. **ID Poisoning Attack (Resource Exhaustion)**
   - *Attack*: Create `/users/A_VERY_LARGE_AND_MALICIOUS_ID_CONTAINING_10K_CHARS_TO_EXHAUST_RESOURCES`.
   - *Result*: `PERMISSION_DENIED` (Locked down by ID length checks).

4. **Spoofed Ownership Access (Identity Theft)**
   - *Attack*: Get `/chats/private_chat_1` as `attacker_uid` where `userId` is `owner_uid`.
   - *Result*: `PERMISSION_DENIED` (Evaluates request.auth.uid matches ownerId).

5. **Blanket Query List Scraping (Data Leak)**
   - *Attack*: List `/chats` without filtration where `resource.data.userId` matches attacker.
   - *Result*: `PERMISSION_DENIED` (Rule enforces list filters).

6. **Immutable Key Modification (Audit Corruption)**
   - *Attack*: Update `/users/operator_uid` changing `createdAt` is new epoch timestamp.
   - *Result*: `PERMISSION_DENIED` (Immutable key audit check).

7. **Invalid Type Value Poisoning**
   - *Attack*: Update `/users/operator_uid` setting `"maxAiMessages": "unlimited"`.
   - *Result*: `PERMISSION_DENIED` (Strict type definitions).

8. **Unverified Email Signup**
   - *Attack*: Create `/users/unverified_uid` where `request.auth.token.email_verified == false`.
   - *Result*: `PERMISSION_DENIED` (Verification tokens required).

9. **Terminal State Locking Override**
   - *Attack*: Update banned operator user changing username after being banned.
   - *Result*: `PERMISSION_DENIED` (Blocked user state locked).

10. **Shadow Field Injection**
    - *Attack*: Create `/users/new_uid` with properties like `"shadow_prop": "infiltrated"`.
    - *Result*: `PERMISSION_DENIED` (Strict key matching on size).

11. **Chat Session Orphan Creation**
    - *Attack*: Create `/chats/chat_1` referencing nonexistent `userId`.
    - *Result*: `PERMISSION_DENIED` (Relational exists verification).

12. **Out of Bound Array Poisoning**
    - *Attack*: Write chat session messages list containing 500,000 array indices to crash parser.
    - *Result*: `PERMISSION_DENIED` (Size constraints constraints).

---

### Part 3: Test Suite Runner Blueprint
```ts
// firestore.rules.test.ts
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { assertFails, assertSucceeds } from '@firebase/rules-unit-testing';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: 'seventh-alpha-2cf5x',
    firestore: {
      rules: require('fs').readFileSync('firestore.rules', 'utf8')
    }
  });
});

test('Dirty Dozen #1: Refuse self-admin promotion', async () => {
  const context = testEnv.authenticatedContext('attacker_uid');
  await assertFails(
    context.firestore().doc('users/attacker_uid').set({
      id: 'attacker_uid',
      name: 'Malicious',
      username: 'attacker',
      email: 'attacker@gmail.com',
      avatar: 'avatar_url',
      plan: 'free',
      role: 'admin',
      createdAt: new Date().toISOString()
    })
  );
});
```
