# MongoDB Database Setup for Umar Academy Portal

## Prerequisites

1. **Install MongoDB**
   - **macOS**: `brew install mongodb-community`
   - **Windows**: Download from [MongoDB Community Server](https://www.mongodb.com/try/download/community)
   - **Linux**: Follow [MongoDB Installation Guide](https://docs.mongodb.com/manual/installation/)

2. **Start MongoDB Service**
   ```bash
   # macOS (with Homebrew)
   brew services start mongodb-community
   
   # Windows
   net start MongoDB
   
   # Linux
   sudo systemctl start mongod
   ```

## Database Configuration

### 1. Environment Variables
Create a `.env` file in your project root:

```env
# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/umar-academy-portal

# JWT Secret (for authentication)
JWT_SECRET=your-super-secret-jwt-key-here

# Application Configuration
NODE_ENV=development
PORT=3000
```

### 2. Database Models Created

The following MongoDB models have been created:

- **User**: Authentication and user management
- **Student**: Student profiles and information
- **Teacher**: Teacher profiles and payroll
- **Course**: Course information and enrollment
- **Assignment**: Assignments and submissions
- **Payment**: Payment tracking and history
- **Attendance**: Attendance records and tracking

### 3. Database Service

A comprehensive `DatabaseService` class provides methods for:
- CRUD operations for all models
- Data relationships and population
- Analytics and reporting
- Dashboard statistics

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Start MongoDB
Make sure MongoDB is running on your system:
```bash
# Check if MongoDB is running
mongosh --eval "db.runCommand('ping')"
```

### 3. Seed the Database
Run the seed script to populate the database with initial data:
```bash
npm run seed
```

This will create:
- 2 Users (1 Super Admin, 1 Admin)
- 2 Teachers with complete profiles
- 2 Students with enrollment information
- 2 Courses with schedules and materials
- 2 Assignments with instructions
- 2 Payment records
- 2 Attendance records

### 4. Start the Application
```bash
npm run dev
```

## Database Schema

### User Model
```typescript
{
  fullName: string;
  email: string;
  password: string;
  role: 'student' | 'teacher' | 'admin' | 'superadmin';
  avatar: string;
  isActive: boolean;
  lastLogin?: Date;
}
```

### Student Model
```typescript
{
  userId: ObjectId;
  studentId: string;
  fullName: string;
  email: string;
  contact: string;
  program: string;
  level: string;
  assignedTeacher: string;
  enrolledDate: Date;
  tuitionFee: number;
  paymentStatus: 'current' | 'pending' | 'overdue';
  status: 'active' | 'inactive' | 'suspended';
  parentInfo?: {
    name: string;
    contact: string;
    relationship: string;
  };
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}
```

### Teacher Model
```typescript
{
  userId: ObjectId;
  teacherId: string;
  fullName: string;
  email: string;
  contact: string;
  department: string;
  specialization: string[];
  location: string;
  employmentType: 'full-time' | 'part-time' | 'contract';
  status: 'active' | 'inactive' | 'on-leave' | 'probation' | 'suspended';
  assignedStudents: string[];
  payroll: {
    monthlySalary: number;
    currency: 'USD' | 'PKR';
    paymentType: 'monthly' | 'weekly' | 'hourly' | 'per-student';
    bankAccount?: string;
  };
  schedule: {
    workingDays: string[];
    workingHours: { start: string; end: string };
    timezone: string;
  };
  qualifications: Array<{
    degree: string;
    institution: string;
    year: number;
    certifications?: string[];
  }>;
  experience: {
    years: number;
    previousInstitutions?: string[];
  };
  performance: {
    rating: number;
    totalStudents: number;
    completionRate: number;
    attendanceRate: number;
  };
}
```

## API Endpoints (Future Implementation)

The database service provides methods for:

### User Management
- `createUser(userData)`
- `getUserById(id)`
- `getUserByEmail(email)`
- `updateUser(id, updateData)`
- `deleteUser(id)`

### Student Management
- `createStudent(studentData)`
- `getStudentById(id)`
- `getAllStudents()`
- `updateStudent(id, updateData)`
- `deleteStudent(id)`

### Teacher Management
- `createTeacher(teacherData)`
- `getTeacherById(id)`
- `getAllTeachers()`
- `updateTeacher(id, updateData)`
- `deleteTeacher(id)`

### Course Management
- `createCourse(courseData)`
- `getCourseById(id)`
- `getAllCourses()`
- `updateCourse(id, updateData)`
- `deleteCourse(id)`

### Assignment Management
- `createAssignment(assignmentData)`
- `getAssignmentById(id)`
- `getAllAssignments()`
- `updateAssignment(id, updateData)`
- `deleteAssignment(id)`

### Payment Management
- `createPayment(paymentData)`
- `getPaymentById(id)`
- `getPaymentsByStudent(studentId)`
- `getAllPayments()`
- `updatePayment(id, updateData)`
- `deletePayment(id)`

### Attendance Management
- `createAttendance(attendanceData)`
- `getAttendanceById(id)`
- `getAttendanceByStudent(studentId)`
- `getAttendanceByCourse(courseId)`
- `getAllAttendance()`
- `updateAttendance(id, updateData)`
- `deleteAttendance(id)`

### Analytics
- `getDashboardStats()` - Returns comprehensive dashboard statistics

## Troubleshooting

### MongoDB Connection Issues
1. Ensure MongoDB is running: `mongosh --eval "db.runCommand('ping')"`
2. Check connection string in `.env` file
3. Verify MongoDB port (default: 27017)

### Seed Data Issues
1. Clear existing data: `mongosh umar-academy-portal --eval "db.dropDatabase()"`
2. Run seed script again: `npm run seed`

### Performance Optimization
1. Create indexes for frequently queried fields
2. Use pagination for large datasets
3. Implement caching for frequently accessed data

## Next Steps

1. **API Development**: Create REST API endpoints using Express.js
2. **Authentication**: Implement JWT-based authentication
3. **File Upload**: Add file upload capabilities for assignments and materials
4. **Email Integration**: Set up email notifications
5. **Payment Integration**: Connect with payment gateways
6. **Real-time Features**: Add WebSocket support for live updates
7. **Backup Strategy**: Implement database backup and recovery
8. **Monitoring**: Add database monitoring and logging

## Support

For database-related issues:
1. Check MongoDB logs
2. Verify connection string
3. Ensure all required fields are provided
4. Check for data type mismatches
5. Verify relationships between models










