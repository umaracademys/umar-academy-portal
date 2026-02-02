# Umar Academy Portal - Technical Architecture Summary

## 1. Tech Stack Summary

### Frontend
- **Framework**: React 18.3.1
- **Language**: TypeScript 5.7.3
- **Build Tool**: Vite 7.2.7
- **Styling**: Tailwind CSS 3.4.18
- **Routing**: React Router DOM 6.30.1
- **State Management**: React Context API (AuthContext, DataContext, BackendDataContext)
- **HTTP Client**: Axios 1.13.2
- **Real-time**: Socket.IO Client 4.8.3
- **PDF**: React-PDF 10.2.0, PDF.js 5.4.449
- **Database (Client-side)**: SQL.js 1.13.0, better-sqlite3 12.5.0 (optional)
- **Testing**: Vitest 1.0.4, Playwright 1.40.0
- **Package Manager**: pnpm 9.0.0

### Backend
- **Runtime**: Node.js
- **Framework**: Express 4.21.2
- **Language**: JavaScript (CommonJS)
- **Database**: MongoDB (Mongoose 8.19.3)
- **Authentication**: JWT (jsonwebtoken 9.0.3)
- **Password Hashing**: bcryptjs 3.0.2
- **Real-time**: Socket.IO 4.8.3
- **Security**: Helmet 8.1.0, express-rate-limit 8.2.1
- **Email**: Nodemailer 7.0.12
- **Compression**: compression 1.8.1
- **Validation**: express-validator 7.3.1
- **HTTP Client**: axios 1.13.1, node-fetch 2.7.0

### Development Tools
- **Type Checking**: TypeScript
- **Linting**: (Not explicitly configured in package.json)
- **Testing**: Vitest, Playwright
- **Code Splitting**: Vite with manual chunks
- **Hot Reload**: Vite HMR

---

## 2. Monorepo or Separate Repos

### Structure: **Monorepo** (pnpm workspace)

```
umar-academy-portal/
├── packages/
│   └── mushaf/          # @umar-academy/mushaf workspace package
├── backend/             # Backend API (Express server)
├── src/                 # Frontend React app
├── public/              # Static assets
├── pnpm-workspace.yaml  # Workspace configuration
└── package.json         # Root package.json
```

### Workspace Configuration
- **Package Manager**: pnpm workspaces
- **Workspace Packages**: 
  - `@umar-academy/mushaf` (packages/mushaf)
  - Root app (`.`)
- **Workspace File**: `pnpm-workspace.yaml`

### Build Strategy
- **Frontend**: Built separately with Vite
- **Backend**: Standalone Express server
- **Mushaf Package**: Built as part of frontend build process
- **Deployment**: Separate services (frontend and backend can be deployed independently)

---

## 3. Frontend Framework & Routing

### Framework: React 18.3.1

#### Key Features
- **React Hooks**: useState, useEffect, useMemo, useCallback, useContext
- **Lazy Loading**: React.lazy() for code splitting
- **Suspense**: Loading fallbacks for lazy components
- **Context API**: Multiple contexts for state management

#### Component Structure
```
src/
├── components/          # Reusable UI components
├── contexts/           # React contexts (Auth, Data, BackendData)
├── hooks/              # Custom hooks
├── modules/
│   └── student/        # Student-specific module
├── pages/              # Route components
├── types/              # TypeScript type definitions
└── App.tsx             # Main app component
```

### Routing: React Router DOM 6.30.1

#### Route Structure
```typescript
Routes:
├── /login                    # Public login page
├── /register                 # Public registration
├── /mushaf-demo              # Public demo
├── /qaidah                   # Public Qaidah viewer
├── /dashboard                # Protected - redirects by role
│   ├── superadmin → SuperAdminDashboard
│   ├── admin → AdminDashboard
│   ├── teacher → TeacherDashboard
│   └── student → /student/dashboard
├── /student/*                # Student routes
│   ├── /student/dashboard
│   ├── /student/profile
│   ├── /student/assignments
│   ├── /student/courses
│   └── /student/messages
├── /profile                  # Teacher profile
├── /assignments              # Assignment management
├── /students                 # Student management
├── /teachers                 # Teacher management
├── /teacher-student-assignment  # Assignment manager
├── /messages                 # Messaging
├── /pdf-teaching             # PDF viewer
└── /super-admin/messages     # Super admin messages
```

#### Routing Features
- **Protected Routes**: `ProtectedRoute` component checks authentication
- **Role-based Redirects**: `DashboardRouter` redirects based on user role
- **Lazy Loading**: All major routes are lazy loaded
- **SPA Routing**: Client-side routing with history API
- **Nested Routes**: Student module has nested routing

#### Code Splitting Strategy
```typescript
// Manual chunks in vite.config.ts
- react-vendor: React, React-DOM, React Router
- mushaf-vendor: @umar-academy/mushaf
- sql-vendor: sql.js, sqlite3
- vendor: Other node_modules
- mushaf-components: Mushaf-related components
- attendance-components: Attendance components
- testing-components: Testing components
- assignment-components: Assignment components
- student-modules: Student-specific modules
- context-backend: BackendDataContext
```

---

## 4. Backend Framework & Modules

### Framework: Express 4.21.2

#### Server Structure
```javascript
backend/
├── server.js              # Main Express server (15,000+ lines)
├── middleware/             # Custom middleware
├── models/                 # Mongoose models (Message, Conversation)
├── routes/                 # Route handlers
├── utils/                  # Utility functions
├── shared/                 # Shared utilities
└── security.js             # Security utilities
```

### Backend Modules

#### Core Modules (in server.js)
1. **Authentication Module**
   - JWT token generation/verification
   - Password hashing/validation
   - Account lockout mechanism
   - Login history tracking

2. **User Management Module**
   - User CRUD operations
   - Role management (student, teacher, admin, superadmin)
   - Permission management
   - User settings

3. **Student Management Module**
   - Student CRUD operations
   - Student profile management
   - Teacher assignment
   - Program management (Full-Time HQ, Part-Time HQ, After School)

4. **Teacher Management Module**
   - Teacher CRUD operations
   - Permission management (50+ permissions)
   - Teacher-student assignment sync
   - Teacher attendance tracking

5. **Admin Management Module**
   - Admin CRUD operations
   - Permission management
   - System oversight

6. **Ticket System Module**
   - Ticket CRUD operations
   - Sabq/Sabqi/Manzil workflow
   - Ticket assignment and reassignment
   - Mistake marking
   - Bulk operations

7. **Assignment Module**
   - Assignment CRUD operations
   - Multi-phase classwork (Sabq/Sabqi/Manzil)
   - Homework management
   - Submission and grading
   - Mushaf mistake integration

8. **Weekly Evaluation Module**
   - Evaluation CRUD operations
   - Approval workflow
   - Homework generation from evaluations

9. **Messaging Module**
   - Teacher-student messages
   - Pair teacher messages
   - File uploads
   - Conversation threading

10. **Notification Module**
    - Admin notifications
    - Teacher notifications
    - Real-time notifications via WebSocket

11. **Attendance Module**
    - Teacher attendance tracking
    - Bulk attendance operations
    - Attendance statistics

12. **Mushaf Module**
    - Personal Mushaf management
    - Mistake tracking
    - Audio recording for mistakes

13. **PDF Module**
    - PDF upload and management
    - PDF annotation
    - PDF library

14. **Qaidah Module**
    - Qaidah book management
    - Page tracking
    - Learning objectives

15. **Recitation Review Module**
    - Legacy recitation reviews
    - Review approval workflow

16. **Activity Logging Module**
    - System activity tracking
    - User action logging
    - Audit trail

17. **AI Library Module**
    - AI phrase management
    - Phrase categories
    - OpenAI integration (optional)

18. **Listening Sessions Module**
    - Live listening sessions
    - Session streaming
    - Session history

19. **Maintenance Module**
    - Maintenance mode toggle
    - System status

20. **Public API Module**
    - Student registration
    - Public endpoints

### API Endpoints Summary
- **99+ REST API endpoints**
- **RESTful design**: GET, POST, PUT, PATCH, DELETE
- **Authentication**: JWT token required for most endpoints
- **Authorization**: Permission-based access control
- **Rate Limiting**: express-rate-limit on sensitive endpoints
- **CORS**: Configured for frontend origins
- **Error Handling**: Consistent error responses

---

## 5. Auth Mechanism

### Authentication: JWT (JSON Web Tokens)

#### Token Structure
```javascript
{
  userId: string,
  email: string,
  role: 'student' | 'teacher' | 'admin' | 'superadmin',
  permissions: { [key: string]: boolean },
  iat: number,
  exp: number
}
```

#### Authentication Flow

1. **Login Process** (`POST /api/auth/login`)
   ```javascript
   - User submits email, password, role
   - Backend validates credentials
   - Checks account lockout status
   - Verifies password with bcrypt
   - Generates JWT token with user data + permissions
   - Returns token and user object
   - Frontend stores token in localStorage
   ```

2. **Token Storage**
   - **Frontend**: localStorage (`umar_academy_token`, `umar_academy_user`)
   - **Backend**: Not stored (stateless)
   - **Token Expiration**: Configurable (default not specified)

3. **Token Validation**
   - **Middleware**: `authenticateToken` on protected routes
   - **Socket.IO**: Token validated on WebSocket connection
   - **Frontend**: Token checked on app initialization

4. **Authorization**
   - **Permission-based**: `requirePermission(permissionKey)` middleware
   - **Role-based**: Role checks in route handlers
   - **Granular**: 50+ individual permissions

#### Security Features

1. **Password Security**
   - **Hashing**: bcryptjs (salt rounds: 10)
   - **Validation**: Password strength requirements
   - **Account Lockout**: After failed login attempts
   - **Password Reset**: Email-based reset flow

2. **Token Security**
   - **JWT Secret**: Environment variable (`JWT_SECRET`)
   - **Token Verification**: On every API request
   - **Token Expiration**: Time-based expiration

3. **Account Security**
   - **Account Lockout**: Configurable lockout after failed attempts
   - **Login History**: Tracks login attempts and IP addresses
   - **Session Management**: Token-based (stateless)

4. **API Security**
   - **Rate Limiting**: express-rate-limit on login endpoint
   - **CORS**: Configured for specific origins
   - **Helmet**: Security headers
   - **Input Validation**: express-validator
   - **Sanitization**: Custom sanitization functions

#### Permission System

- **50+ Permissions**: Granular permission keys
- **Module-based**: Permissions grouped by feature module
- **Role Defaults**: Each role has default permissions
- **JWT Integration**: Permissions stored in JWT for fast access
- **Dynamic Updates**: Permissions can be updated per user

---

## 6. Database Models

### Database: MongoDB (Mongoose ODM)

### Core Models (41+ Schemas defined in server.js)

1. **User Schema**
   ```javascript
   {
     name, email, role, password, avatar,
     loginEnabled, loginAttempts, lockoutUntil,
     permissions, settings, loginHistory,
     timestamps
   }
   ```

2. **Student Schema**
   ```javascript
   {
     studentId, userId (ref: User),
     fullName, email, contact, parentName,
     program, level, paymentStatus,
     assignedTeacher, assignedTeacherId,
     assignedTeachers[], assignedTeacherIds[],
     schedule, siblings[],
     tuitionFee, registrationAmount,
     assessments[], evaluations[],
     recitationProfile: {
       current: { sabq, sabqi, manzil },
       history[]
     },
     status, avatar, enrolledDate,
     timestamps
   }
   ```

3. **Teacher Schema**
   ```javascript
   {
     teacherId, userId (ref: User),
     fullName, email, contact,
     department, specialization[],
     location, employmentType, status,
     assignedStudents[],
     payroll: { monthlySalary, currency, ... },
     schedule: { workingDays[], workingHours, timezone },
     qualifications[], experience,
     performance: { rating, totalStudents, ... },
     permissions: { [key: string]: boolean },
     pairTeacherId, pairTeacherName,
     avatar, courses[],
     timestamps
   }
   ```

4. **Admin Schema**
   ```javascript
   {
     adminId, userId (ref: User),
     fullName, email, contact,
     permissions: { [key: string]: boolean },
     timestamps
   }
   ```

5. **Ticket Schema**
   ```javascript
   {
     studentId, studentName,
     type: 'sabq' | 'sabqi' | 'manzil',
     status: 'pending' | 'in_progress' | 'submitted' | 'approved' | 'reassigned' | 'sent_to_assignment',
     createdBy, createdByName,
     assignedTeacherId, assignedTeacherName,
     teacherComment, adminComment,
     mistakes: [{
       id, type, page, surah, ayah, wordIndex,
       position: { x, y }, note, audioUrl, timestamp
     }],
     recordingUrl, sentToAssignmentId,
     reassignment fields,
     timestamps
   }
   ```

6. **Assignment Schema**
   ```javascript
   {
     studentId, studentName,
     assignedBy, assignedByName, assignedByRole,
     weeklyEvaluationId, fromTicketId, fromRecitationReviewId,
     classwork: {
       sabq: [{ type, assignmentRange, details, fromPage, toPage, ... }],
       sabqi: [],
       manzil: []
     },
     homework: {
       enabled, content, link, pdfId, pdfAnnotations,
       items: [{ type, range, source, content, attachments }],
       qaidahHomework: { book, page, letters, rules, ... },
       submission: { submitted, content, attachments, audioUrl, grade, feedback, ... }
     },
     comment, mushafMistakes[],
     status, completedAt,
     timestamps
   }
   ```

7. **WeeklyEvaluation Schema**
   ```javascript
   {
     studentId, studentName,
     teacherId, teacherName,
     weekStartDate, weekEndDate,
     evaluationCriteria: { ... },
     teacherComments, adminComments,
     status: 'draft' | 'submitted' | 'approved',
     approvedBy, approvedAt,
     timestamps
   }
   ```

8. **Message Schema** (models/Message.js)
   ```javascript
   {
     conversationId (ref: Conversation),
     senderId, senderName, senderRole,
     recipientId, recipientName, recipientRole,
     content, attachments[],
     read, readAt,
     timestamps
   }
   ```

9. **Conversation Schema** (models/Conversation.js)
   ```javascript
   {
     participants: [{ userId, role, name }],
     type: 'teacher-student' | 'pair-teacher' | 'admin',
     lastMessage, lastMessageAt,
     unreadCount: { [userId]: number },
     timestamps
   }
   ```

10. **TeacherAttendance Schema**
    ```javascript
    {
      teacherId, teacherName,
      date, checkIn, checkOut,
      status: 'present' | 'absent' | 'late' | 'half-day',
      notes,
      timestamps
    }
    ```

11. **RecitationReview Schema**
    ```javascript
    {
      studentId, studentName,
      teacherId, teacherName,
      recitationType: 'sabq' | 'sabqi' | 'manzil',
      program, notes, audioLink,
      status: 'pending_review' | 'approved' | 'rejected' | 'converted_to_assignment',
      reviewedBy, reviewedAt,
      convertedToAssignmentId,
      timestamps
    }
    ```

12. **AdminNotification Schema**
    ```javascript
    {
      title, message, type,
      targetRole, targetUserId,
      read, readAt,
      actionUrl, metadata,
      timestamps
    }
    ```

13. **TeacherNotification Schema**
    ```javascript
    {
      teacherId,
      title, message, type,
      read, readAt,
      actionUrl, metadata,
      timestamps
    }
    ```

14. **ActivityLog Schema**
    ```javascript
    {
      userId, userRole, userName,
      action, resourceType, resourceId,
      details: Mixed,
      ipAddress, userAgent,
      timestamps
    }
    ```

15. **MistakeLibrary Schema**
    ```javascript
    {
      type, description, category,
      examples[], commonContexts[],
      timestamps
    }
    ```

16. **AiPhrase Schema**
    ```javascript
    {
      phrase, categoryId (ref: AiPhraseCategory),
      usageCount, lastUsed,
      timestamps
    }
    ```

17. **AiPhraseCategory Schema**
    ```javascript
    {
      name, description,
      timestamps
    }
    ```

### Database Indexes
- **Student**: `userId`, `email`, `assignedTeacherId`
- **Assignment**: `studentId + createdAt`, `assignedBy + createdAt`
- **Ticket**: `studentId`, `assignedTeacherId`
- **User**: `email` (unique)

### Database Connection
- **MongoDB URI**: Environment variable (`MONGODB_URI`)
- **Connection**: Mongoose connection pooling
- **Database Name**: `umar-academy-portal` (default)

---

## 7. WebSocket Usage

### WebSocket Library: Socket.IO 4.8.3

### Server Setup (backend/server.js)

```javascript
const io = new Server(server, {
  cors: {
    origin: [frontend URLs],
    credentials: true,
    methods: ['GET', 'POST']
  }
});
```

### Authentication
- **Token-based**: JWT token validated on connection
- **Middleware**: `io.use()` validates token before connection
- **User Data**: Extracted from token and attached to socket

### Room Structure
```javascript
// Role-based rooms
- student:{userId}      // Individual student room
- teacher:{userId}      // Individual teacher room
- admins                // All admins and superadmins
```

### Connection Handler
```javascript
io.on('connection', (socket) => {
  // Join room based on role
  if (role === 'student') socket.join(`student:${userId}`);
  if (role === 'teacher') socket.join(`teacher:${userId}`);
  if (role === 'admin' || 'superadmin') socket.join('admins');
});
```

### Events Emitted

1. **Assignment Events**
   - `assignment:created` - New assignment created
   - `assignment:updated` - Assignment updated
   - `assignment:deleted` - Assignment deleted
   - **Target**: Specific student rooms or all admins

2. **Ticket Events**
   - `ticket:created` - New ticket created
   - `ticket:updated` - Ticket updated
   - `ticket:deleted` - Ticket deleted
   - **Target**: Student, teacher, and admin rooms

3. **Notification Events**
   - `notification:new` - New notification
   - `notification:read` - Notification read
   - **Target**: Role-based rooms

4. **Teacher Events**
   - `teacher:students:synced` - Student assignment synced
   - `teacher:students:updated` - Student assignment updated
   - **Target**: Specific teacher room

5. **Maintenance Events**
   - `maintenance_mode_changed` - Maintenance mode toggled
   - **Target**: All connected clients

### Client Usage (Frontend)

```typescript
// src/hooks/useSocket.ts
import { io, Socket } from 'socket.io-client';

// Connect with JWT token
const socket = io(API_BASE_URL, {
  auth: { token: jwtToken }
});

// Listen to events
socket.on('assignment:created', (data) => { ... });
socket.on('ticket:updated', (data) => { ... });
```

### Real-time Features Enabled
- **Instant Notifications**: New assignments, tickets, messages
- **Live Updates**: Assignment status, ticket status
- **Real-time Messaging**: Message delivery
- **Status Changes**: Immediate UI updates

---

## 8. Environment Variables Used

### Backend Environment Variables

1. **MONGODB_URI**
   - **Purpose**: MongoDB connection string
   - **Default**: `mongodb://localhost:27017/umar-academy-portal`
   - **Required**: Yes (production)
   - **Example**: `mongodb+srv://user:pass@cluster.mongodb.net/db`

2. **JWT_SECRET**
   - **Purpose**: Secret key for JWT token signing
   - **Default**: `'your-super-secret-jwt-key-change-this-in-production'`
   - **Required**: Yes (production)
   - **Security**: Must be at least 32 characters in production

3. **PORT**
   - **Purpose**: Backend server port
   - **Default**: `3001`
   - **Required**: No
   - **Production**: `10000` (Render.com)

4. **NODE_ENV**
   - **Purpose**: Environment mode
   - **Values**: `development` | `production`
   - **Default**: Not set (development)
   - **Required**: No

5. **FRONTEND_URL**
   - **Purpose**: Frontend URL for CORS and redirects
   - **Default**: Not set
   - **Required**: Yes (production)
   - **Example**: `https://umar-academy-frontend.onrender.com`

6. **ADDITIONAL_FRONTEND_URLS**
   - **Purpose**: Additional frontend URLs for CORS (comma-separated)
   - **Default**: Not set
   - **Required**: No

7. **EMAIL_FROM**
   - **Purpose**: Email sender address
   - **Default**: `office@umaracademy.org`
   - **Required**: No

8. **EMAIL_HOST**
   - **Purpose**: SMTP server host
   - **Default**: `smtp.gmail.com`
   - **Required**: No

9. **EMAIL_PORT**
   - **Purpose**: SMTP server port
   - **Default**: `587`
   - **Required**: No

10. **EMAIL_SECURE**
    - **Purpose**: Use SSL/TLS for email
    - **Default**: `false`
    - **Values**: `true` | `false`
    - **Required**: No

11. **EMAIL_USER**
    - **Purpose**: SMTP username
    - **Default**: `office@umaracademy.org`
    - **Required**: No

12. **EMAIL_PASSWORD**
    - **Purpose**: SMTP password
    - **Default**: Empty string
    - **Required**: Yes (for email functionality)

13. **OPENAI_API_KEY**
    - **Purpose**: OpenAI API key for AI features
    - **Default**: Not set
    - **Required**: No (optional feature)

14. **BACKEND_URL** / **BACKEND_BASE_URL**
    - **Purpose**: Backend URL for internal requests
    - **Default**: Not set
    - **Required**: No

15. **RENDER_EXTERNAL_URL**
    - **Purpose**: Render.com external URL (auto-set by Render)
    - **Default**: Not set
    - **Required**: No

16. **HOST**
    - **Purpose**: Server host binding
    - **Default**: `0.0.0.0`
    - **Required**: No

### Frontend Environment Variables

1. **VITE_API_BASE_URL**
   - **Purpose**: Backend API base URL
   - **Default**: `http://localhost:3001/api`
   - **Required**: Yes (production)
   - **Example**: `https://umar-academy-backend.onrender.com/api`

2. **NODE_ENV**
   - **Purpose**: Environment mode
   - **Values**: `development` | `production`
   - **Default**: Not set (development)
   - **Required**: No

3. **PORT**
   - **Purpose**: Frontend server port
   - **Default**: `10000`
   - **Required**: No

4. **HOST**
   - **Purpose**: Frontend server host
   - **Default**: `0.0.0.0`
   - **Required**: No

### Environment File Locations
- **Backend**: `.env` in root or `backend/.env`
- **Frontend**: `.env` in root (Vite automatically loads `.env` files)
- **Production**: Set via Render.com dashboard or `render.yaml`

---

## 9. Build & Deploy Method

### Build Process

#### Frontend Build
```bash
# Development
pnpm dev                    # Vite dev server

# Production Build
pnpm build                  # TypeScript check + Vite build
pnpm build:fast            # Vite build only (skip TypeScript)
pnpm build:mushaf          # Build mushaf package only
pnpm build:all             # Build all workspace packages
pnpm build:render         # Render.com optimized build
```

#### Build Steps (Vite)
1. **Type Checking**: `tsc --noEmit --incremental`
2. **Code Splitting**: Manual chunks configuration
3. **Minification**: esbuild (faster than terser)
4. **Asset Optimization**: Public assets copied to dist
5. **Output**: `dist/` directory with static files

#### Build Configuration (vite.config.ts)
- **Target**: `esnext` (modern JavaScript)
- **Minify**: `esbuild`
- **Sourcemaps**: Disabled in production
- **Chunking**: Manual chunks for vendors and large components
- **Public Dir**: `public/` served as static assets

#### Backend Build
```bash
# No build step required (JavaScript)
# Just install dependencies
cd backend && npm install
```

### Deployment: Render.com

#### Deployment Configuration (render.yaml)

**Backend Service**
```yaml
type: web
name: umar-academy-backend
env: node
buildCommand: cd backend && npm install
startCommand: cd backend && npm start
port: 10000
healthCheckPath: /api/health
```

**Frontend Service**
```yaml
type: web
name: umar-academy-frontend
env: node
buildCommand: corepack enable && corepack prepare pnpm@latest --activate && pnpm install --frozen-lockfile --no-optional --prefer-offline && pnpm --filter @umar-academy/mushaf build && pnpm run build:fast
startCommand: npm start
port: 10000
healthCheckPath: /health
```

#### Frontend Server (frontend-server.js)
- **Purpose**: Serves built static files from `dist/`
- **Framework**: Express
- **Features**:
  - Serves static files from `dist/`
  - Proxies Qaidah/Quran images to backend
  - SPA routing (all routes serve `index.html`)
  - Health check endpoint
  - Proper MIME types and caching headers

#### Deployment Flow

1. **Backend Deployment**
   ```
   Git Push → Render detects changes
   → Runs: cd backend && npm install
   → Starts: cd backend && npm start
   → Server runs on port 10000
   ```

2. **Frontend Deployment**
   ```
   Git Push → Render detects changes
   → Runs: pnpm install + mushaf build + vite build
   → Starts: npm start (frontend-server.js)
   → Serves dist/ directory on port 10000
   ```

#### Production URLs
- **Backend**: `https://umar-academy-backend.onrender.com`
- **Frontend**: `https://umar-academy-frontend.onrender.com` (or similar)

#### Health Checks
- **Backend**: `GET /api/health`
- **Frontend**: `GET /health`

### Build Optimization

#### Code Splitting
- **Vendor Chunks**: React, Mushaf, SQL.js separated
- **Component Chunks**: Large components split into separate chunks
- **Lazy Loading**: Route-based code splitting

#### Performance
- **Minification**: esbuild (fast)
- **Tree Shaking**: Automatic dead code elimination
- **Asset Optimization**: Public assets optimized
- **Caching**: Long-term caching for versioned assets

### Local Development

#### Frontend
```bash
pnpm dev              # Vite dev server (port 5173)
```

#### Backend
```bash
cd backend
npm start            # Express server (port 3001)
# or
npm run dev          # With nodemon (auto-restart)
```

### Testing

#### Unit Tests
```bash
pnpm test            # Vitest
pnpm test:watch      # Watch mode
```

#### E2E Tests
```bash
pnpm test:e2e        # Playwright tests
pnpm test:e2e:ui     # Playwright UI mode
```

---

## Summary

### Architecture Type
- **Monorepo**: Yes (pnpm workspace)
- **Frontend**: React SPA with Vite
- **Backend**: Express REST API
- **Database**: MongoDB (Mongoose)
- **Real-time**: Socket.IO WebSocket

### Key Technologies
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js, Express, MongoDB, Socket.IO
- **Auth**: JWT tokens
- **Deployment**: Render.com
- **Package Manager**: pnpm

### Scalability
- **Stateless Backend**: JWT-based (horizontally scalable)
- **Database**: MongoDB (scalable)
- **Code Splitting**: Optimized for performance
- **Caching**: Asset caching, data caching in frontend

### Security
- **Authentication**: JWT with secure secret
- **Authorization**: Granular permissions (50+)
- **Password**: bcrypt hashing
- **API**: Rate limiting, CORS, Helmet
- **Input**: Validation and sanitization

---

*Last Updated: [Current Date]*
*Document Version: 1.0*
