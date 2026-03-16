import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { parseString } from 'xml2js';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import http from 'http';
import os from 'os';

import { users, accounts, transactions, creditCards, addUser, addTransaction } from './data';
import { apiKeyAuth, jwtAuth, basicAuth, JWT_SECRET } from './auth';

const app = express();
const PORT = 7777;

// VULN #18: CORS misconfiguration — allow all origins with credentials
app.use(cors({ origin: '*', credentials: true }));

// VULN #19: No security headers (no helmet)
// VULN #20: X-Powered-By left enabled (Express default)

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.text({ type: 'application/xml' }));
app.use(express.text({ type: 'text/xml' }));

const upload = multer({ dest: '/tmp/uploads/' });

// ============================================================
// PUBLIC / NO AUTH ENDPOINTS
// ============================================================

// 1. GET /api/health — Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

// 2. POST /api/auth/login — Login
// VULN #22: No account lockout
// VULN #23: Username enumeration (different messages for user not found vs wrong password)
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) {
    res.status(401).json({ error: 'User not found', username });
    return;
  }
  if (user.password !== password) {
    res.status(401).json({ error: 'Incorrect password' });
    return;
  }
  // VULN #14: JWT no expiration
  // VULN #15: JWT excessive data (includes sensitive fields)
  // VULN #13: Weak secret
  const token = jwt.sign(
    {
      userId: user.id,
      username: user.username,
      role: user.role,
      email: user.email,
      ssn: user.ssn,
      apiKey: user.apiKey,
    },
    JWT_SECRET,
    { algorithm: 'HS256' },
  );
  res.json({
    token,
    apiKey: user.apiKey,
    user: { id: user.id, username: user.username, role: user.role },
  });
});

// 3. POST /api/auth/register — Register
// VULN #16: No password strength validation
app.post('/api/auth/register', (req: Request, res: Response) => {
  const { username, password, email, fullName } = req.body;
  if (!username || !password) {
    res.status(400).json({ error: 'Username and password required' });
    return;
  }
  if (users.find((u) => u.username === username)) {
    res.status(409).json({ error: 'Username already exists' });
    return;
  }
  const newUser = addUser({
    username,
    password,
    email: email || `${username}@vulnbank.com`,
    role: 'user',
    fullName: fullName || username,
    ssn: '000-00-0000',
    phone: '555-0000',
  });
  res.status(201).json({
    id: newUser.id,
    username: newUser.username,
    apiKey: newUser.apiKey,
    message: 'User registered successfully',
  });
});

// 4. GET /api/accounts — List all accounts
// VULN #1: Missing auth — anonymous access to accounts
app.get('/api/accounts', (_req: Request, res: Response) => {
  res.json({ accounts });
});

// VULN #32: Anonymous resource modification
app.post('/api/accounts', (req: Request, res: Response) => {
  const { userId, type } = req.body;
  const newAccount = {
    id: accounts.length + 1,
    userId: userId || 1,
    accountNumber: `${Date.now()}`,
    balance: 0,
    type: type || 'checking',
    createdAt: new Date().toISOString(),
  };
  accounts.push(newAccount);
  res.status(201).json(newAccount);
});

// 5. GET /api/admin/users — Admin endpoint with no auth
// VULN #2: Admin API unauthenticated
app.get('/api/admin/users', (_req: Request, res: Response) => {
  res.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      fullName: u.fullName,
      ssn: u.ssn,
      phone: u.phone,
      apiKey: u.apiKey,
      createdAt: u.createdAt,
    })),
  });
});

// 6. GET /api/docs — OpenAPI spec exposed
// VULN #3: OpenAPI spec exposed publicly
app.get('/api/docs', (_req: Request, res: Response) => {
  const specPath = path.join(__dirname, 'openapi.json');
  const spec = JSON.parse(fs.readFileSync(specPath, 'utf-8'));
  res.json(spec);
});

// ============================================================
// API KEY AUTH ENDPOINTS
// ============================================================

// 7. GET /api/transactions — List transactions
// VULN #26: Sensitive data in URL (ssn query param)
// VULN #30: No content-type validation
app.get('/api/transactions', apiKeyAuth, (req: Request, res: Response) => {
  const { ssn, status } = req.query;
  let result = transactions;
  if (ssn) {
    const user = users.find((u) => u.ssn === ssn);
    if (user) {
      const userAccountIds = accounts.filter((a) => a.userId === user.id).map((a) => a.id);
      result = result.filter((t) => userAccountIds.includes(t.fromAccountId) || userAccountIds.includes(t.toAccountId));
    }
  }
  if (status) {
    result = result.filter((t) => t.status === status);
  }
  res.json({ transactions: result });
});

// 8. POST /api/transactions — Create transaction
app.post('/api/transactions', apiKeyAuth, (req: Request, res: Response) => {
  const { fromAccountId, toAccountId, amount, description } = req.body;
  if (!fromAccountId || !toAccountId || !amount) {
    res.status(400).json({ error: 'fromAccountId, toAccountId, and amount required' });
    return;
  }
  const tx = addTransaction({
    fromAccountId,
    toAccountId,
    amount,
    description: description || '',
    status: 'completed',
  });
  res.status(201).json(tx);
});

// 9. GET /api/transactions/:id — Get transaction by ID
// VULN #4: BOLA/IDOR — any user can access any transaction
// VULN #31: Resource accessible across users
// VULN #33: Weak resource identifier (sequential)
app.get('/api/transactions/:id', apiKeyAuth, (req: Request, res: Response) => {
  const tx = transactions.find((t) => t.id === parseInt(req.params.id));
  if (!tx) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  res.json(tx);
});

// 10. DELETE /api/transactions/:id — Delete transaction
app.delete('/api/transactions/:id', apiKeyAuth, (req: Request, res: Response) => {
  const idx = transactions.findIndex((t) => t.id === parseInt(req.params.id));
  if (idx === -1) {
    res.status(404).json({ error: 'Transaction not found' });
    return;
  }
  const deleted = transactions.splice(idx, 1)[0];
  res.json({ message: 'Transaction deleted', transaction: deleted });
});

// 11. GET /api/balance — Get account balance
// VULN #27: Auth details exposed in URL (api_key query param accepted)
app.get('/api/balance', apiKeyAuth, (req: Request, res: Response) => {
  const userAccounts = accounts.filter((a) => a.userId === req.user!.id);
  res.json({
    userId: req.user!.id,
    accounts: userAccounts.map((a) => ({
      id: a.id,
      accountNumber: a.accountNumber,
      balance: a.balance,
      type: a.type,
    })),
    totalBalance: userAccounts.reduce((sum, a) => sum + a.balance, 0),
  });
});

// 12. POST /api/transfer — Transfer funds
// VULN #6: No rate limiting
app.post('/api/transfer', apiKeyAuth, (req: Request, res: Response) => {
  const { fromAccountId, toAccountId, amount } = req.body;
  const fromAccount = accounts.find((a) => a.id === fromAccountId);
  const toAccount = accounts.find((a) => a.id === toAccountId);
  if (!fromAccount || !toAccount) {
    res.status(404).json({ error: 'Account not found' });
    return;
  }
  if (fromAccount.balance < amount) {
    res.status(400).json({ error: 'Insufficient funds' });
    return;
  }
  fromAccount.balance -= amount;
  toAccount.balance += amount;
  const tx = addTransaction({
    fromAccountId,
    toAccountId,
    amount,
    description: 'Fund transfer',
    status: 'completed',
  });
  res.json({ message: 'Transfer successful', transaction: tx });
});

// ============================================================
// JWT BEARER AUTH ENDPOINTS
// ============================================================

// 13. GET /api/users/me — Get current user profile
app.get('/api/users/me', jwtAuth, (req: Request, res: Response) => {
  const user = req.user!;
  res.json({
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    fullName: user.fullName,
    phone: user.phone,
  });
});

// 14. PUT /api/users/:id — Update user
// VULN #5: BOLA — any authenticated user can update any user
app.put('/api/users/:id', jwtAuth, (req: Request, res: Response) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const { email, fullName, phone } = req.body;
  if (email) user.email = email;
  if (fullName) user.fullName = fullName;
  if (phone) user.phone = phone;
  res.json({
    message: 'User updated',
    user: { id: user.id, username: user.username, email: user.email, fullName: user.fullName },
  });
});

// 15. GET /api/users/:id/cards — Get credit cards
// VULN #12: Sensitive data exposure (full PAN, CVV)
app.get('/api/users/:id/cards', jwtAuth, (req: Request, res: Response) => {
  const userCards = creditCards.filter((c) => c.userId === parseInt(req.params.id));
  res.json({
    cards: userCards.map((c) => ({
      id: c.id,
      cardNumber: c.cardNumber,
      cvv: c.cvv,
      expiryDate: c.expiryDate,
      cardholderName: c.cardholderName,
      billingAddress: c.billingAddress,
    })),
  });
});

// 16. POST /api/users/search — Search users
// VULN #7: SQL injection (simulated — reflects input unsanitized)
// VULN #24: XSS in search response (reflects input)
app.post('/api/users/search', jwtAuth, (req: Request, res: Response) => {
  const { query } = req.body;
  if (!query) {
    res.status(400).json({ error: 'Search query required' });
    return;
  }
  // Simulated SQL injection: reflect the query to show it would be interpolated
  const simulatedSql = `SELECT * FROM users WHERE username LIKE '%${query}%' OR email LIKE '%${query}%'`;
  const results = users.filter(
    (u) => u.username.includes(query) || u.email.includes(query) || u.fullName.includes(query),
  );
  res.json({
    query,
    sql: simulatedSql,
    results: results.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      fullName: u.fullName,
      // VULN #24: XSS — reflecting unsanitized search term
      matchedQuery: `<span class="highlight">${query}</span>`,
    })),
  });
});

// 17. POST /api/upload/avatar — Upload file
// VULN #11: No file type validation (malicious file upload)
// VULN #25: Path traversal in filename
app.post('/api/upload/avatar', jwtAuth, upload.single('avatar'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No file uploaded' });
    return;
  }
  // VULN #25: Path traversal — using original filename without sanitization
  const savePath = `/tmp/uploads/${req.file.originalname}`;
  res.json({
    message: 'File uploaded successfully',
    filename: req.file.originalname,
    path: savePath,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

// 18. GET /api/users/export — Export user data
// VULN #8: SSRF via url param
app.get('/api/users/export', jwtAuth, (req: Request, res: Response) => {
  const { url, format } = req.query;
  if (url) {
    // VULN #8: SSRF — fetches arbitrary URL without validation
    http
      .get(url as string, (proxyRes) => {
        let data = '';
        proxyRes.on('data', (chunk: Buffer) => {
          data += chunk.toString();
        });
        proxyRes.on('end', () => {
          res.json({ source: url, data });
        });
      })
      .on('error', (err) => {
        res.status(500).json({ error: 'Failed to fetch URL', details: err.message });
      });
    return;
  }
  const exportData = users.map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    fullName: u.fullName,
  }));
  if (format === 'csv') {
    const csv =
      'id,username,email,fullName\n' +
      exportData.map((u) => `${u.id},${u.username},${u.email},${u.fullName}`).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.send(csv);
    return;
  }
  res.json({ users: exportData });
});

// 19. PUT /api/users/:id/role — Change user role
// VULN #9: Mass assignment — accepts any body fields including role
app.put('/api/users/:id/role', jwtAuth, (req: Request, res: Response) => {
  const user = users.find((u) => u.id === parseInt(req.params.id));
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  // VULN #9: Mass assignment — applies all body fields directly
  Object.assign(user, req.body);
  res.json({ message: 'User role updated', user: { id: user.id, username: user.username, role: user.role } });
});

// 20. DELETE /api/users/:id — Delete user
app.delete('/api/users/:id', jwtAuth, (req: Request, res: Response) => {
  const idx = users.findIndex((u) => u.id === parseInt(req.params.id));
  if (idx === -1) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  const deleted = users.splice(idx, 1)[0];
  res.json({ message: 'User deleted', userId: deleted.id });
});

// ============================================================
// BASIC AUTH ENDPOINTS
// ============================================================

// 21. GET /api/reports/annual — Annual report
// VULN #17: Weak authentication method (Basic auth)
app.get('/api/reports/annual', basicAuth, (req: Request, res: Response) => {
  res.json({
    report: 'Annual Financial Report 2024',
    totalAccounts: accounts.length,
    totalTransactions: transactions.length,
    totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
    generatedBy: req.user!.username,
    generatedAt: new Date().toISOString(),
  });
});

// 22. GET /api/reports/transactions — Transaction report
// VULN #29: Session ID in URL
app.get('/api/reports/transactions', basicAuth, (req: Request, res: Response) => {
  const { sid } = req.query;
  res.json({
    sessionId: sid || 'none',
    report: 'Transaction Report',
    transactions: transactions.map((t) => ({
      id: t.id,
      amount: t.amount,
      status: t.status,
      date: t.createdAt,
    })),
    generatedAt: new Date().toISOString(),
  });
});

// 23. POST /api/reports/generate — Generate report
// VULN #10: Command injection via format param
// VULN #35: XXE in XML body
app.post('/api/reports/generate', basicAuth, (req: Request, res: Response) => {
  const contentType = req.headers['content-type'] || '';

  // VULN #35: XXE — parse XML input without disabling external entities
  if (contentType.includes('xml')) {
    const xmlBody = req.body;
    parseString(xmlBody, { explicitArray: false }, (err: Error | null, result: any) => {
      if (err) {
        res.status(400).json({ error: 'Invalid XML', details: err.message });
        return;
      }
      res.json({ message: 'Report generated from XML', data: result });
    });
    return;
  }

  const { format, reportType } = req.body;
  // VULN #10: OS command injection
  if (format) {
    exec(`echo "Generating ${reportType || 'default'} report in ${format} format"`, (error, stdout, stderr) => {
      if (error) {
        res.status(500).json({ error: 'Report generation failed', details: stderr });
        return;
      }
      res.json({ message: stdout.trim(), format, reportType: reportType || 'default' });
    });
    return;
  }
  res.json({
    message: 'Report generated',
    reportType: reportType || 'default',
    format: 'json',
    data: {
      accounts: accounts.length,
      transactions: transactions.length,
      totalBalance: accounts.reduce((sum, a) => sum + a.balance, 0),
    },
  });
});

// 24. GET /api/config — System config
// VULN #20: Server information disclosure
app.get('/api/config', basicAuth, (req: Request, res: Response) => {
  res.json({
    server: {
      hostname: os.hostname(),
      platform: process.platform,
      arch: process.arch,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      env: {
        NODE_ENV: process.env.NODE_ENV || 'development',
        PORT: PORT,
      },
    },
    database: {
      type: 'in-memory',
      users: users.length,
      accounts: accounts.length,
      transactions: transactions.length,
    },
    version: '1.0.0',
    framework: 'Express',
    expressVersion: '4.x',
  });
});

// ============================================================
// HIDDEN / UNDOCUMENTED ENDPOINT
// ============================================================

// VULN #28: Undocumented API
app.get('/api/debug', (_req: Request, res: Response) => {
  res.json({
    debug: true,
    users: users.map((u) => ({ id: u.id, username: u.username, password: u.password, apiKey: u.apiKey })),
    environment: process.env,
    memoryUsage: process.memoryUsage(),
  });
});

// ============================================================
// ERROR HANDLER
// ============================================================

// VULN #21: Improper error handling — exposes stack traces
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message,
    stack: err.stack,
    name: err.name,
  });
});

// ============================================================
// START SERVER
// ============================================================

// VULN #34: HTTP sensitive API (no TLS)
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`VulnBank API running on http://localhost:${PORT} | Docs: http://localhost:${PORT}/api/docs`);
});

export default app;
