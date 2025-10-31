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

## License

MIT License - Feel free to use this project for educational purposes.

## Support

For questions or issues, please contact: support@umaracademy.com

---

Built with ❤️ for Umar Academy
