import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';
import dotenv from 'dotenv';
import fs from 'fs';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
const PORT = 3000;

// Enable large JSON bodies for base64 image uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Initialize Gemini Client safely
let ai: GoogleGenAI | null = null;
const apiKey = process.env.GEMINI_API_KEY;

if (apiKey) {
  ai = new GoogleGenAI({
    apiKey: apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      }
    }
  });
  console.log('Gemini AI Client initialized successfully.');
} else {
  console.warn('WARNING: GEMINI_API_KEY environment variable is not set. AI features will fallback to simulation.');
}

// -------------------------------------------------------------
// 🗄️ LOCAL FILE-BASED DATABASE SYSTEMS
// -------------------------------------------------------------
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const USERS_FILE = path.join(DATA_DIR, 'users.json');
const USER_FILE = path.join(DATA_DIR, 'user.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const ISSUES_FILE = path.join(DATA_DIR, 'issues.json');

// Backup file paths for ultimate resilience and recovery
const USERS_BAK = path.join(DATA_DIR, 'users.json.bak');
const USER_BAK = path.join(DATA_DIR, 'user.json.bak');
const SESSIONS_BAK = path.join(DATA_DIR, 'sessions.json.bak');
const ISSUES_BAK = path.join(DATA_DIR, 'issues.json.bak');

// Helper to safely write files and maintain active backups
function safeWriteFile(filePath: string, backupPath: string, content: string) {
  try {
    fs.writeFileSync(filePath, content, 'utf-8');
    fs.writeFileSync(backupPath, content, 'utf-8');
  } catch (err) {
    console.error(`Error writing file ${filePath}:`, err);
  }
}

// Import initial issues dynamically to seed if not already present
import { initialIssues } from './src/mockData.ts';

// Initialize and recover user databases (users.json and user.json)
let initialUsersList: any[] = [];
if (fs.existsSync(USERS_FILE)) {
  try {
    initialUsersList = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch (e) {
    if (fs.existsSync(USERS_BAK)) {
      try {
        initialUsersList = JSON.parse(fs.readFileSync(USERS_BAK, 'utf-8'));
      } catch (inner) {}
    }
  }
} else if (fs.existsSync(USER_FILE)) {
  try {
    initialUsersList = JSON.parse(fs.readFileSync(USER_FILE, 'utf-8'));
  } catch (e) {
    if (fs.existsSync(USER_BAK)) {
      try {
        initialUsersList = JSON.parse(fs.readFileSync(USER_BAK, 'utf-8'));
      } catch (inner) {}
    }
  }
}

// If user records are empty or corrupt, we restore active registered citizens from backup or default empty list
if (!Array.isArray(initialUsersList)) {
  initialUsersList = [];
}

// Ensure both database representations and their backups are synchronized
fs.writeFileSync(USERS_FILE, JSON.stringify(initialUsersList, null, 2), 'utf-8');
fs.writeFileSync(USER_FILE, JSON.stringify(initialUsersList, null, 2), 'utf-8');
fs.writeFileSync(USERS_BAK, JSON.stringify(initialUsersList, null, 2), 'utf-8');
fs.writeFileSync(USER_BAK, JSON.stringify(initialUsersList, null, 2), 'utf-8');

// Initialize and recover active sessions database
let initialSessionsObj: any = {};
if (fs.existsSync(SESSIONS_FILE)) {
  try {
    initialSessionsObj = JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  } catch (e) {
    if (fs.existsSync(SESSIONS_BAK)) {
      try {
        initialSessionsObj = JSON.parse(fs.readFileSync(SESSIONS_BAK, 'utf-8'));
      } catch (inner) {}
    }
  }
}
fs.writeFileSync(SESSIONS_FILE, JSON.stringify(initialSessionsObj, null, 2), 'utf-8');
fs.writeFileSync(SESSIONS_BAK, JSON.stringify(initialSessionsObj, null, 2), 'utf-8');

// Initialize and recover municipal issue databases
let initialIssuesList: any[] = initialIssues;
if (fs.existsSync(ISSUES_FILE)) {
  try {
    initialIssuesList = JSON.parse(fs.readFileSync(ISSUES_FILE, 'utf-8'));
  } catch (e) {
    if (fs.existsSync(ISSUES_BAK)) {
      try {
        initialIssuesList = JSON.parse(fs.readFileSync(ISSUES_BAK, 'utf-8'));
      } catch (inner) {}
    }
  }
}
fs.writeFileSync(ISSUES_FILE, JSON.stringify(initialIssuesList, null, 2), 'utf-8');
fs.writeFileSync(ISSUES_BAK, JSON.stringify(initialIssuesList, null, 2), 'utf-8');

// Helper accessors for dynamic operations
function loadUsers(): any[] {
  try {
    if (fs.existsSync(USERS_FILE)) {
      return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    } else if (fs.existsSync(USER_FILE)) {
      return JSON.parse(fs.readFileSync(USER_FILE, 'utf-8'));
    }
    return [];
  } catch (e) {
    try {
      if (fs.existsSync(USERS_BAK)) {
        return JSON.parse(fs.readFileSync(USERS_BAK, 'utf-8'));
      }
    } catch (inner) {}
    return [];
  }
}

function saveUsers(users: any[]) {
  const content = JSON.stringify(users, null, 2);
  safeWriteFile(USERS_FILE, USERS_BAK, content);
  safeWriteFile(USER_FILE, USER_BAK, content);
}

function loadSessions(): Record<string, { userId: string; expiresAt: string }> {
  try {
    return JSON.parse(fs.readFileSync(SESSIONS_FILE, 'utf-8'));
  } catch (e) {
    try {
      if (fs.existsSync(SESSIONS_BAK)) {
        return JSON.parse(fs.readFileSync(SESSIONS_BAK, 'utf-8'));
      }
    } catch (inner) {}
    return {};
  }
}

function saveSessions(sessions: any) {
  const content = JSON.stringify(sessions, null, 2);
  safeWriteFile(SESSIONS_FILE, SESSIONS_BAK, content);
}

function loadIssues(): any[] {
  try {
    return JSON.parse(fs.readFileSync(ISSUES_FILE, 'utf-8'));
  } catch (e) {
    try {
      if (fs.existsSync(ISSUES_BAK)) {
        return JSON.parse(fs.readFileSync(ISSUES_BAK, 'utf-8'));
      }
    } catch (inner) {}
    return initialIssues;
  }
}

function saveIssues(issues: any[]) {
  const content = JSON.stringify(issues, null, 2);
  safeWriteFile(ISSUES_FILE, ISSUES_BAK, content);
}

// -------------------------------------------------------------
// 🔒 AUTHENTICATION & ACCESS CONTROL MIDDLEWARE
// -------------------------------------------------------------
const authenticateUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized. Please sign in.' });
  }

  const token = authHeader.split(' ')[1];
  const sessions = loadSessions();
  const session = sessions[token];

  if (!session) {
    return res.status(401).json({ error: 'Session expired or invalid. Please sign in.' });
  }

  if (new Date(session.expiresAt) < new Date()) {
    delete sessions[token];
    saveSessions(sessions);
    return res.status(401).json({ error: 'Session expired. Please sign in.' });
  }

  const users = loadUsers();
  const user = users.find(u => u.id === session.userId);

  if (!user) {
    return res.status(401).json({ error: 'User account not found.' });
  }

  // Attach user identity to request object
  (req as any).user = user;
  (req as any).token = token;
  next();
};

const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const user = (req as any).user;
  if (!user || user.role?.toLowerCase() !== 'admin') {
    return res.status(403).json({ error: 'Forbidden. Administrative clearance required.' });
  }
  next();
};

// -------------------------------------------------------------
// 🔑 AUTHENTICATION & PROFILE ENDPOINTS
// -------------------------------------------------------------

// Sign Up / Registration
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full Name is required.' });
    }
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email Address is required.' });
    }
    // Basic format check
    if (!email.includes('@')) {
      return res.status(400).json({ error: 'Please enter a valid email address.' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const normalizedRole = role === 'Admin' ? 'Admin' : 'Citizen';
    const normalizedEmail = email.trim().toLowerCase();

    const users = loadUsers();
    if (users.some(u => u.email.toLowerCase() === normalizedEmail)) {
      return res.status(400).json({ error: 'Email already registered. Please sign in.' });
    }

    // Secure password hashing
    const passwordHash = await bcrypt.hash(password, 10);

    const newUser = {
      id: 'user_' + crypto.randomUUID(),
      name: name.trim(),
      email: normalizedEmail,
      passwordHash,
      role: normalizedRole,
      xp: normalizedRole === 'Citizen' ? 320 : 0,
      badges: normalizedRole === 'Citizen' ? ['Active Citizen', 'Local Observer'] : ['Municipal Dispatch', 'Command Center Access'],
      reportedCount: normalizedRole === 'Citizen' ? 2 : 0,
      verifiedCount: normalizedRole === 'Citizen' ? 5 : 0,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveUsers(users);

    res.status(201).json({
      message: 'Account successfully registered! You can now log in.',
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Failed to create account.' });
  }
});

// Sign In / Authentication
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Please enter Email and Password.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = loadUsers();
    const user = users.find(u => u.email.toLowerCase() === normalizedEmail);

    if (!user) {
      return res.status(401).json({ error: 'Access Denied. Invalid Email or Password.' });
    }

    // Match hashed credentials
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Access Denied. Invalid Email or Password.' });
    }

    // Generate session token
    const token = 'tok_' + crypto.randomBytes(32).toString('hex');
    const sessions = loadSessions();
    
    // Set 7 days lifetime
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    sessions[token] = {
      userId: user.id,
      expiresAt: expiresAt.toISOString()
    };
    saveSessions(sessions);

    const { passwordHash, ...safeUser } = user;
    res.json({
      message: 'Logged in successfully.',
      token,
      user: safeUser
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login authentication failed.' });
  }
});

// Terminate Session
app.post('/api/auth/logout', authenticateUser, (req, res) => {
  const token = (req as any).token;
  const sessions = loadSessions();

  if (token && sessions[token]) {
    delete sessions[token];
    saveSessions(sessions);
  }

  res.json({ message: 'Logged out successfully.' });
});

// Get Current User Profile
app.get('/api/auth/me', authenticateUser, (req, res) => {
  const user = (req as any).user;
  const { passwordHash, ...safeUser } = user;
  res.json(safeUser);
});

// Edit Profile (Citizen or Admin)
app.put('/api/auth/profile', authenticateUser, (req, res) => {
  try {
    const { name, email } = req.body;
    const user = (req as any).user;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Full Name cannot be empty.' });
    }

    const users = loadUsers();
    const userIdx = users.findIndex(u => u.id === user.id);

    if (userIdx === -1) {
      return res.status(404).json({ error: 'User account not found.' });
    }

    users[userIdx].name = name.trim();

    if (email && email.trim().toLowerCase() !== user.email) {
      const normalizedEmail = email.trim().toLowerCase();
      if (users.some(u => u.id !== user.id && u.email.toLowerCase() === normalizedEmail)) {
        return res.status(400).json({ error: 'Email is already registered by another account.' });
      }
      users[userIdx].email = normalizedEmail;
    }

    saveUsers(users);

    const { passwordHash, ...safeUser } = users[userIdx];
    res.json({
      message: 'Profile updated successfully!',
      user: safeUser
    });
  } catch (error) {
    console.error('Profile edit error:', error);
    res.status(500).json({ error: 'Failed to update profile details.' });
  }
});

// -------------------------------------------------------------
// 📋 CIVIC ISSUE COMPLAINTS ENDPOINTS
// -------------------------------------------------------------

// Fetch Issues (Role-Based Filtering)
app.get('/api/issues', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const issues = loadIssues();

    if (user.role?.toLowerCase() === 'admin') {
      // Admin accesses all complaints
      res.json(issues);
    } else {
      // Citizen accesses ONLY their own reported complaints
      const filtered = issues.filter(issue => issue.reporterEmail?.toLowerCase() === user.email.toLowerCase());
      res.json(filtered);
    }
  } catch (error) {
    console.error('Fetch issues error:', error);
    res.status(500).json({ error: 'Failed to fetch complaints list.' });
  }
});

// Create New Issue Report
app.post('/api/issues', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const isDuplicate = req.body.isDuplicate || false;
    const duplicateOfId = req.body.duplicateOfId;
    const issueData = req.body.newIssue || req.body;

    const issues = loadIssues();

    if (isDuplicate && duplicateOfId) {
      const existingIdx = issues.findIndex(i => i.id === duplicateOfId);
      if (existingIdx !== -1) {
        issues[existingIdx].upvotes = (issues[existingIdx].upvotes || 0) + 1;
        if (!issues[existingIdx].timeline) {
          issues[existingIdx].timeline = [];
        }
        issues[existingIdx].timeline.push({
          status: issues[existingIdx].status,
          timestamp: new Date().toISOString(),
          note: `Duplicate reported near coordinates. Additional citizen details merged to accelerate priority levels.`,
          actor: user.name
        });
        saveIssues(issues);

        // Reward Citizen XP points
        if (user.role?.toLowerCase() === 'citizen') {
          const users = loadUsers();
          const userIdx = users.findIndex(u => u.id === user.id);
          if (userIdx !== -1) {
            users[userIdx].xp = (users[userIdx].xp || 0) + 100;
            users[userIdx].reportedCount = (users[userIdx].reportedCount || 0) + 1;
            if (users[userIdx].reportedCount >= 3 && !users[userIdx].badges.includes('Civic Hero')) {
              users[userIdx].badges.push('Civic Hero');
            }
            saveUsers(users);
          }
        }

        return res.status(200).json(issues[existingIdx]);
      }
    }

    if (!issueData.title || !issueData.type) {
      return res.status(400).json({ error: 'Title and issue type are required.' });
    }

    const enrichedIssue = {
      ...issueData,
      id: 'issue_' + crypto.randomUUID(),
      reporterName: user.name,
      reporterEmail: user.email,
      reportedAt: new Date().toISOString(),
      upvotes: issueData.upvotes || 1,
      verifiedBy: issueData.verifiedBy || [user.email],
      timeline: issueData.timeline || [
        {
          status: 'reported',
          timestamp: new Date().toISOString(),
          note: 'Incident registered in smart municipal feed with active AI vision scan and coordinate mapping.',
          actor: 'System Core'
        }
      ]
    };

    issues.unshift(enrichedIssue);
    saveIssues(issues);

    // Reward Citizen XP points
    if (user.role?.toLowerCase() === 'citizen') {
      const users = loadUsers();
      const userIdx = users.findIndex(u => u.id === user.id);
      if (userIdx !== -1) {
        users[userIdx].xp = (users[userIdx].xp || 0) + 100;
        users[userIdx].reportedCount = (users[userIdx].reportedCount || 0) + 1;
        if (users[userIdx].reportedCount >= 3 && !users[userIdx].badges.includes('Civic Hero')) {
          users[userIdx].badges.push('Civic Hero');
        }
        saveUsers(users);
      }
    }

    res.status(201).json(enrichedIssue);
  } catch (error) {
    console.error('Create issue error:', error);
    res.status(500).json({ error: 'Failed to register civic report.' });
  }
});

// Update Issue Details (Admin controls, Citizen secure updates)
app.put('/api/issues/:id', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const issueId = req.params.id;
    const updatedData = req.body;

    const issues = loadIssues();
    const issueIdx = issues.findIndex(i => i.id === issueId);

    if (issueIdx === -1) {
      return res.status(404).json({ error: 'Issue record not found.' });
    }

    const currentIssue = issues[issueIdx];
    
    if (user.role?.toLowerCase() !== 'admin') {
      // Citizens cannot update admin-only fields like assignment, status, SLA
      const isOwner = currentIssue.reporterEmail?.toLowerCase() === user.email.toLowerCase();
      if (!isOwner) {
        return res.status(403).json({ error: 'Forbidden. You do not own this complaint record.' });
      }

      // Merge only allowed self-reported fields
      issues[issueIdx] = {
        ...currentIssue,
        title: updatedData.title ?? currentIssue.title,
        description: updatedData.description ?? currentIssue.description,
        image: updatedData.image ?? currentIssue.image,
      };
    } else {
      // Admins have full structural control
      issues[issueIdx] = {
        ...currentIssue,
        ...updatedData,
        id: currentIssue.id // Prevent ID spoofing
      };
    }

    saveIssues(issues);
    res.json(issues[issueIdx]);
  } catch (error) {
    console.error('Update issue error:', error);
    res.status(500).json({ error: 'Failed to update complaint details.' });
  }
});

// Upvote Issue
app.post('/api/issues/:id/upvote', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const issueId = req.params.id;
    const issues = loadIssues();
    const issueIdx = issues.findIndex(i => i.id === issueId);

    if (issueIdx === -1) {
      return res.status(404).json({ error: 'Issue record not found.' });
    }

    const issue = issues[issueIdx];
    issue.upvotes = (issue.upvotes || 0) + 1;
    issue.timeline.push({
      status: issue.status,
      timestamp: new Date().toISOString(),
      note: `Citizen upvoted this incident. Current community validation count: ${issue.upvotes}.`,
      actor: user.name
    });

    saveIssues(issues);
    res.json(issue);
  } catch (error) {
    console.error('Upvote error:', error);
    res.status(500).json({ error: 'Failed to upvote complaint.' });
  }
});

// Citizen On-site Verification
app.post('/api/issues/:id/verify', authenticateUser, (req, res) => {
  try {
    const user = (req as any).user;
    const issueId = req.params.id;
    const issues = loadIssues();
    const issueIdx = issues.findIndex(i => i.id === issueId);

    if (issueIdx === -1) {
      return res.status(404).json({ error: 'Issue record not found.' });
    }

    const issue = issues[issueIdx];
    if (issue.verifiedBy.includes(user.email)) {
      return res.status(400).json({ error: 'You have already verified this complaint.' });
    }

    issue.upvotes = (issue.upvotes || 0) + 2;
    issue.verifiedBy.push(user.email);
    issue.timeline.push({
      status: 'verified',
      timestamp: new Date().toISOString(),
      note: `Verified on-site coordinates confirmed by observer. Added to structural engineering dispatch queue.`,
      actor: user.name
    });

    saveIssues(issues);

    // Reward Citizen XP and Verification statistics
    const users = loadUsers();
    const userIdx = users.findIndex(u => u.id === user.id);
    if (userIdx !== -1) {
      users[userIdx].xp += 50;
      users[userIdx].verifiedCount += 1;
      saveUsers(users);
    }

    res.json({
      issue,
      userXp: userIdx !== -1 ? users[userIdx].xp : user.xp,
      userVerifiedCount: userIdx !== -1 ? users[userIdx].verifiedCount : user.verifiedCount
    });
  } catch (error) {
    console.error('Verify error:', error);
    res.status(500).json({ error: 'Failed to verify complaint.' });
  }
});

// -------------------------------------------------------------
// 🛠️ ADMIN-ONLY REGISTRY MANAGEMENT ENDPOINTS
// -------------------------------------------------------------

// List all registered users
app.get('/api/admin/users', authenticateUser, requireAdmin, (req, res) => {
  try {
    const users = loadUsers();
    const safeUsers = users.map(({ passwordHash, ...safe }) => safe);
    res.json(safeUsers);
  } catch (error) {
    console.error('Admin list users error:', error);
    res.status(500).json({ error: 'Failed to retrieve user registry.' });
  }
});

// Delete a user from the registry
app.delete('/api/admin/users/:id', authenticateUser, requireAdmin, (req, res) => {
  try {
    const targetId = req.params.id;
    let users = loadUsers();

    if (!users.some(u => u.id === targetId)) {
      return res.status(404).json({ error: 'User record not found.' });
    }

    const activeUser = (req as any).user;
    if (activeUser.id === targetId) {
      return res.status(400).json({ error: 'You cannot remove your own administrative account.' });
    }

    users = users.filter(u => u.id !== targetId);
    saveUsers(users);

    res.json({ message: 'User successfully removed from system registry.' });
  } catch (error) {
    console.error('Admin delete user error:', error);
    res.status(500).json({ error: 'Failed to remove user from registry.' });
  }
});


// -------------------------------------------------------------
// 🧠 API ROUTE: AI VISION ANALYSIS FOR CIVIC ISSUES
// -------------------------------------------------------------
app.post('/api/analyze-issue', async (req, res) => {
  try {
    const imageInput = req.body.imageBase64 || req.body.image;
    const fileName = req.body.fileName || '';
    const mimeType = req.body.mimeType || 'image/jpeg';

    if (!imageInput) {
      return res.status(400).json({ error: 'Image base64 data is required' });
    }

    // Clean up base64 string if it contains the data:image prefix
    const cleanBase64 = imageInput.replace(/^data:image\/\w+;base64,/, '');
    const actualMimeType = mimeType || 'image/jpeg';

    if (!ai) {
      // Return beautiful mock analysis if API key is not yet set
      console.log('Using simulated Vision API response because GEMINI_API_KEY is missing.');
      const text = (fileName + ' ' + cleanBase64.slice(0, 500)).toLowerCase();
      
      let issueType = 'pothole';
      let title = 'Asphalt Pavement Cracking';
      let severity = 'medium';
      let riskScore = 62;
      let department = 'Road & Highway Maintenance Dept';
      let repairTime = '36 Hours';
      let description = 'Moderate structural degradation of asphalt pavement. Immediate sealant application suggested to prevent deep pothole formation.';
      let isEmergency = false;
      let requiredOfficerType = 'Civil / Highway Engineer';
      let budgetSuggestion = '₹90,000';
      let equipmentSuggestion = ['Asphalt sealant spray', 'Warning beacons', 'Road repair truck'];

      if (text.includes('garbage') || text.includes('waste') || text.includes('bin') || text.includes('trash') || text.includes('refuse') || text.includes('dump')) {
        issueType = 'garbage';
        title = 'Overflowing Public Waste Bin';
        severity = 'medium';
        riskScore = 45;
        department = 'Waste & Sanitation Dept';
        description = 'Public refuse bin is overflowing with waste scattering onto the roadside, attracting stray animals and blocking pedestrians.';
        repairTime = '24 Hours';
        requiredOfficerType = 'Sanitation Inspector';
        budgetSuggestion = '₹25,000';
        equipmentSuggestion = ['Garbage truck', 'Disinfectant spray', 'Industrial brooms'];
      } else if (text.includes('electric') || text.includes('wire') || text.includes('cable') || text.includes('voltage') || text.includes('spark') || text.includes('conduit')) {
        issueType = 'electricity';
        title = 'Exposed High Voltage Wire Cluster';
        severity = 'urgent';
        riskScore = 95;
        department = 'Electrical Grid & Power Authority';
        description = 'Exposed, messy high voltage electrical cables hanging dangerously near public pathways, posing high electrocution risk.';
        repairTime = '12 Hours';
        isEmergency = true;
        requiredOfficerType = 'Emergency Electrician';
        budgetSuggestion = '₹2,10,000';
        equipmentSuggestion = ['Insulated crane', 'Conduit tubing', 'Circuit breaker testers'];
      } else if (text.includes('water') || text.includes('leak') || text.includes('burst') || text.includes('pipe') || text.includes('flood') || text.includes('sewage')) {
        issueType = 'water_leak';
        title = 'Major Water Supply Main Burst';
        severity = 'high';
        riskScore = 82;
        department = 'Water & Sanitation Dept';
        description = 'Clean drinking water is bursting at high pressure from a cracked main supply pipe, heavily flooding the street.';
        repairTime = '12 Hours';
        requiredOfficerType = 'Hydraulics Engineer';
        budgetSuggestion = '₹1,50,000';
        equipmentSuggestion = ['Excavator', 'Pipe clamps', 'Water pumps'];
      } else if (text.includes('light') || text.includes('lamp') || text.includes('dark')) {
        issueType = 'street_light';
        title = 'Street Light Outage';
        severity = 'medium';
        riskScore = 40;
        department = 'City Lighting & Power Dept';
        description = 'Street lights are inactive, causing dark pathways and reduced security for pedestrians.';
        repairTime = '24 Hours';
        requiredOfficerType = 'Lighting Tech';
        budgetSuggestion = '₹25,000';
        equipmentSuggestion = ['Hydraulic lift truck', 'Replacement bulbs', 'Wiring loom'];
      }

      return res.json({
        issueType,
        title,
        severity,
        riskScore,
        confidence: 94,
        department,
        repairTime,
        description,
        isEmergency,
        requiredOfficerType,
        budgetSuggestion,
        equipmentSuggestion
      });
    }

    const prompt = `
      You are the Civic Taskforce AI Vision System. Your task is to analyze the uploaded image of a hyperlocal civic issue or structural damage.
      Identify the type of civic problem, estimate its severity (urgent, high, medium, low), calculate a public risk score from 1 to 100, estimate the confidence in your assessment, suggest the appropriate municipal department, estimate repair time, and write a simple, friendly explanation of the problem for citizens.
      
      Determine if this is an extreme immediate hazard (e.g. active fires, live sparking electricity wires, severe active flooding, major active car crashes). If so, mark isEmergency as true.
      
      You must respond in structured JSON matching this schema:
      {
        "issueType": string (e.g., "pothole", "garbage", "street_light", "water_leak", "electrical_hazard", "sidewalk_damage", "signage_issue", "flooding"),
        "title": string (short, neat title, e.g. "Sidewalk Concrete Crack"),
        "severity": "urgent" | "high" | "medium" | "low",
        "riskScore": number (1-100),
        "confidence": number (80-100),
        "department": string (e.g. "Waste & Sanitation Dept", "Roads & Highways Department", "Public Utilities & Power Division"),
        "repairTime": string (e.g. "12 Hours", "24 Hours", "48 Hours", "3 Days"),
        "description": string (clear description in very simple, easy language for non-technical citizens),
        "isEmergency": boolean,
        "requiredOfficerType": string (e.g. "Civil Engineer", "Emergency Electrician", "Sanitation Inspector"),
        "budgetSuggestion": string (estimated repair cost, e.g. "$600"),
        "equipmentSuggestion": array of strings (e.g. ["safety tape", "protective barriers"])
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: actualMimeType,
                data: cleanBase64
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const textResult = response.text;
    if (!textResult) {
      throw new Error('No content returned from Gemini');
    }

    const parsedResult = JSON.parse(textResult);
    res.json(parsedResult);

  } catch (error: any) {
    console.error('Error analyzing issue with Gemini:', error);
    res.status(500).json({ 
      error: 'AI analysis failed', 
      details: error.message || error 
    });
  }
});

// -------------------------------------------------------------
// 🧠 API ROUTE: AI COPILOT CHAT & PREDICTIVE AI
// -------------------------------------------------------------
app.post('/api/copilot', async (req, res) => {
  try {
    const { messages, currentIssues, currentMetrics } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages list is required' });
    }

    if (!ai) {
      // Simulate Copilot responses based on key terms
      const lastMessage = messages[messages.length - 1]?.text?.toLowerCase() || '';
      let reply = "Hello! I am your Civic Taskforce Copilot. How can I assist you with civic monitoring today?";
      let suggestions: string[] = [];

      if (lastMessage.includes('unsafe') || lastMessage.includes('risk') || lastMessage.includes('hazard')) {
        reply = "Looking at the live map, the most critical risk area is **near Times Square (40.7565, -73.9840)** due to an **Exposed High Voltage Wire** reported with a Risk Score of **95/100**. Emergency services have been alerted and the power grid crew is actively isolating the line. Pedestrians should avoid the eastern walkway.";
        suggestions = ["Check electrical hazard status", "View high risk zones on Map"];
      } else if (lastMessage.includes('pothole') || lastMessage.includes('road') || lastMessage.includes('prediction')) {
        reply = "Our Predictive AI models analyze vehicle vibration logs and weather patterns to forecast road deterioration. Currently, we predict with **91% confidence** that a new pothole will develop on **9th Avenue & 42nd St** within the next 7 days due to high transit volume and water pooling. Prevention Advice: Apply microfilm bitumen sealant before the forecasted rains on Thursday to save up to 80% on reconstruction costs.";
        suggestions = ["Schedule preemptive sealant", "View city health road score"];
      } else if (lastMessage.includes('garbage') || lastMessage.includes('trash') || lastMessage.includes('waste')) {
        reply = "Garbage overflow prediction is active. Based on historical subway entrance traffic and weekend events, we forecast a **garbage overflow spike at the Broadway-45th St transit terminal** on Saturday afternoon (85% confidence). Prevention Advice: Double the collection frequency of bins in sector 3B between 2:00 PM and 6:00 PM.";
        suggestions = ["Optimize sanitation routes", "Check waste health score"];
      } else if (lastMessage.includes('flood') || lastMessage.includes('rain') || lastMessage.includes('water')) {
        reply = "Flood Zone Warning: In the event of rains exceeding 1.5 inches, low-lying storm drains at **5th Ave & 34th St** are at **high risk of overflow** (risk index: 82/100) due to minor silt blockages. Prevention Advice: Deploy sanitation clean-out teams to clear catch basins on Wednesday morning.";
        suggestions = ["Inspect silt blockages", "Check drainage capacity"];
      }

      return res.json({ text: reply, suggestions });
    }

    // Prepare system context for Gemini
    const systemPrompt = `
      You are the Civic Taskforce AI Copilot, an expert advisor for city governance, smart planning, and citizen assistance.
      You have access to the city's live issues list and municipal health metrics.
      
      Live City Issues:
      ${JSON.stringify(currentIssues || [])}
      
      City Health Metrics:
      ${JSON.stringify(currentMetrics || { healthScore: 84 })}
      
      When citizens or municipal administrators ask questions, provide clear, intelligent, and human-friendly answers. Use formatting like bullet points or bold text to highlight critical risk areas, suggested prevention advice, confidence estimates, and actionable routing suggestions.
      
      Support two main modes based on user queries:
      1. Citizen Safety Advisories (e.g. "Which areas are unsafe?"): Reference high risk/urgent/emergency issues currently in the database. Warn citizens of nearby dangers clearly.
      2. Predictive Infrastructure and Planning (e.g. "Predict future potholes, flood zones, garbage accumulation"): Simulate highly realistic, predictive analysis based on traffic patterns, current issues, and meteorological estimates. Give:
         - The Prediction (e.g. predicting heavy garbage buildup, stormwater overflow, or roadway cracking)
         - Confidence rating (e.g. "88% confidence")
         - Actionable Prevention Advice to save cost or avoid crisis.
         
      Keep your response friendly, clear, concise, and professional. Do not refer to database internals or technical JSON syntax.
    `;

    // Convert messages format for Gemini
    const geminiContents = messages.map((m: any) => ({
      role: m.sender === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }]
    }));

    // Insert system instructions first as a developer message if supported, or prepended to the user query
    const apiResponse = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `System Context: ${systemPrompt}\n\nNow respond to the user query.` }] },
        ...geminiContents
      ],
    });

    const replyText = apiResponse.text || "I apologize, I wasn't able to process that request.";
    
    // Generate simple dynamic follow-up suggestions using a lightweight prompt
    let suggestions: string[] = [];
    try {
      const suggestResponse = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: [
          {
            role: 'user',
            parts: [{ text: `Based on this assistant reply: "${replyText}", provide exactly 2 short, clickable user question follow-ups as a simple JSON array of strings. Maximum 4-5 words per suggestion. Example output format: ["View high risk map", "Predict road baches"]` }]
          }
        ],
        config: { responseMimeType: 'application/json' }
      });
      if (suggestResponse.text) {
        suggestions = JSON.parse(suggestResponse.text);
      }
    } catch (e) {
      // Fallback
      suggestions = ["Check safety map", "View predictive baches"];
    }

    res.json({ text: replyText, suggestions });

  } catch (error: any) {
    console.error('Error in AI Copilot API:', error);
    res.status(500).json({ 
      error: 'AI Copilot failed', 
      details: error.message || error 
    });
  }
});


// -------------------------------------------------------------
// VITE DEV / PRODUCTION MIDDLEWARE IMPLEMENTATION
// -------------------------------------------------------------
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Running in DEVELOPMENT mode with Vite Middleware.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Running in PRODUCTION mode.');
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running at http://localhost:${PORT}`);
  });
}

startServer();
