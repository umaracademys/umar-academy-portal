# Umar Academy Portal

A modern, full-featured educational portal with separate dashboards for administrators, teachers, and students.

## Features

### 🎓 Student Dashboard
- View enrolled courses with schedules
- Track assignments and due dates
- Monitor grades and academic progress
- View upcoming classes
- Check attendance statistics

### 👨‍🏫 Teacher Dashboard
- Manage multiple courses
- Track student submissions
- Grade assignments
- View class schedules
- Monitor pending reviews

### 👨‍💼 Admin Dashboard
- Oversee all students and teachers
- View system-wide statistics
- Track recent activities
- Manage courses and enrollment
- Monitor revenue and analytics

### 👑 Super Admin Dashboard
- Full system control and oversight
- Manage all administrators
- System health monitoring
- Approve/reject requests
- View system alerts and logs
- Financial reports and analytics
- Complete user management

## Tech Stack

- **React** - Modern UI library
- **TypeScript** - Type-safe code
- **Tailwind CSS** - Beautiful, responsive styling
- **React Router** - Seamless navigation
- **Vite** - Fast development and building

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Login Instructions

The portal uses authentication system with a registered Super Admin account. To access different dashboards:

1. Select your role (Student, Teacher, Admin, or Super Admin)
2. Enter email and password
3. Click "Sign In"

**Super Admin Credentials (Required):**
- Email: `sadmin@umaracademy.org`
- Password: `Admin123!`
- Name: Muhammad Umar

**Demo Credentials (Any email/password works):**
- Student: Any email / any password
- Teacher: Any email / any password
- Admin: Any email / any password

## Project Structure

```
umar-academy-portal/
├── src/
│   ├── components/         # Reusable UI components
│   │   ├── Card.tsx
│   │   ├── Header.tsx
│   │   └── StatCard.tsx
│   ├── contexts/          # React contexts
│   │   └── AuthContext.tsx
│   ├── pages/             # Dashboard pages
│   │   ├── AdminDashboard.tsx
│   │   ├── TeacherDashboard.tsx
│   │   ├── StudentDashboard.tsx
│   │   └── Login.tsx
│   ├── types/             # TypeScript type definitions
│   │   └── index.ts
│   ├── App.tsx            # Main app component
│   ├── main.tsx           # Entry point
│   └── index.css          # Global styles
├── package.json
└── README.md
```

## Features Highlights

- ✅ Role-based authentication
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Modern, clean UI with Tailwind CSS
- ✅ Type-safe with TypeScript
- ✅ Fast development with Vite
- ✅ Component-based architecture
- ✅ Protected routes
- ✅ Real-time statistics and metrics

## Customization

### Colors
Edit `tailwind.config.js` to customize the color scheme:

```javascript
colors: {
  primary: {
    // Modify these values
  }
}
```

### Data
The dashboards currently use mock data. To integrate with a real backend:

1. Create API service files in `src/services/`
2. Replace mock data with API calls
3. Add loading states and error handling

## CLEANUP & LEGACY NOTES

### Phase A (Deletions)
- **Root:** Unused test scripts removed: `test-all-phases.js`, `test-phase3.js`, `test-script-complete.js`, `test-script-simple.js`, `test-error-endpoint.js`, `test-homework-fields.js`, `test-api-validation.js`. Not in `package.json`; not imported anywhere.
- **Frontend:** `src/components/WeeklyEvaluationForm.tsx` removed (unused; `TeacherDashboard` uses `EnhancedWeeklyEvaluationForm` only).
- Details: `docs/audits/PHASE_A_DELETION_REPORT.md`.

### Phase B (Moves)
- **Backend one-off scripts** moved to `backend/scripts/`. Run from repo root: `node backend/scripts/<scriptName>.js [args]`. Scripts used by npm (e.g. `createDeveloper.js`, `seedDatabase.js`, `createTestUsers.js`) remain in `backend/` root.
- **Documentation** consolidated: root `.md` (except README) → `docs/audits/`; `backend/docs/*.md` and backend `.md` → `docs/backend/`; `src/docs/*.md` → `docs/frontend/`.
- Details: `PHASE_B_REPORT.md` (repo root).

### Build
- **Mushaf + app:** Run `pnpm run build:mushaf` then `pnpm run build:fast` (or full `pnpm run build` if TypeScript check passes).
- Full `pnpm run build` may fail on strict TypeScript until types are fixed; `build:fast` after mushaf build produces the production bundle.

### Safe to remove vs legacy
- **Safe to remove:** Only files that are not imported, not in `package.json`, and not required for production or dev (see Phase A report).
- **Legacy / manual:** `backend/scripts/*.js` are ops/diagnostic scripts; run only when instructed. `src/components/permission-manager-v2/` is an alternate UI not wired in; do not remove without product decision.
- **References:** `docs/audits/DEVELOPER_ACCESS_GUIDE.md`, `docs/backend/`, `docs/audits/PHASE_A_DELETION_REPORT.md`, `CLEANUP_INVENTORY_AND_PLAN.md` (in `docs/audits/`).

---

## License

MIT License - Feel free to use this project for educational purposes.

## Support

For questions or issues, please contact: support@umaracademy.com

---

Built with ❤️ for Umar Academy
