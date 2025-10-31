import User, { IUser } from '../models/User';
import Student, { IStudent } from '../models/Student';
import Teacher, { ITeacher } from '../models/Teacher';
import Course, { ICourse } from '../models/Course';
import Assignment, { IAssignment } from '../models/Assignment';
import Payment, { IPayment } from '../models/Payment';
import Attendance, { IAttendance } from '../models/Attendance';

export class DatabaseService {
  // User operations
  static async createUser(userData: Partial<IUser>): Promise<IUser> {
    const user = new User(userData);
    return await user.save();
  }

  static async getUserById(id: string): Promise<IUser | null> {
    return await User.findById(id);
  }

  static async getUserByEmail(email: string): Promise<IUser | null> {
    return await User.findOne({ email });
  }

  static async updateUser(id: string, updateData: Partial<IUser>): Promise<IUser | null> {
    return await User.findByIdAndUpdate(id, updateData, { new: true });
  }

  static async deleteUser(id: string): Promise<boolean> {
    const result = await User.findByIdAndDelete(id);
    return !!result;
  }

  // Student operations
  static async createStudent(studentData: Partial<IStudent>): Promise<IStudent> {
    const student = new Student(studentData);
    return await student.save();
  }

  static async getStudentById(id: string): Promise<IStudent | null> {
    return await Student.findById(id).populate('userId');
  }

  static async getStudentByEmail(email: string): Promise<IStudent | null> {
    return await Student.findOne({ email }).populate('userId');
  }

  static async getAllStudents(): Promise<IStudent[]> {
    return await Student.find().populate('userId');
  }

  static async updateStudent(id: string, updateData: Partial<IStudent>): Promise<IStudent | null> {
    return await Student.findByIdAndUpdate(id, updateData, { new: true }).populate('userId');
  }

  static async deleteStudent(id: string): Promise<boolean> {
    const result = await Student.findByIdAndDelete(id);
    return !!result;
  }

  // Teacher operations
  static async createTeacher(teacherData: Partial<ITeacher>): Promise<ITeacher> {
    const teacher = new Teacher(teacherData);
    return await teacher.save();
  }

  static async getTeacherById(id: string): Promise<ITeacher | null> {
    return await Teacher.findById(id).populate('userId');
  }

  static async getTeacherByEmail(email: string): Promise<ITeacher | null> {
    return await Teacher.findOne({ email }).populate('userId');
  }

  static async getAllTeachers(): Promise<ITeacher[]> {
    return await Teacher.find().populate('userId');
  }

  static async updateTeacher(id: string, updateData: Partial<ITeacher>): Promise<ITeacher | null> {
    return await Teacher.findByIdAndUpdate(id, updateData, { new: true }).populate('userId');
  }

  static async deleteTeacher(id: string): Promise<boolean> {
    const result = await Teacher.findByIdAndDelete(id);
    return !!result;
  }

  // Course operations
  static async createCourse(courseData: Partial<ICourse>): Promise<ICourse> {
    const course = new Course(courseData);
    return await course.save();
  }

  static async getCourseById(id: string): Promise<ICourse | null> {
    return await Course.findById(id)
      .populate('instructor')
      .populate('enrolledStudents');
  }

  static async getAllCourses(): Promise<ICourse[]> {
    return await Course.find()
      .populate('instructor')
      .populate('enrolledStudents');
  }

  static async updateCourse(id: string, updateData: Partial<ICourse>): Promise<ICourse | null> {
    return await Course.findByIdAndUpdate(id, updateData, { new: true })
      .populate('instructor')
      .populate('enrolledStudents');
  }

  static async deleteCourse(id: string): Promise<boolean> {
    const result = await Course.findByIdAndDelete(id);
    return !!result;
  }

  // Assignment operations
  static async createAssignment(assignmentData: Partial<IAssignment>): Promise<IAssignment> {
    const assignment = new Assignment(assignmentData);
    return await assignment.save();
  }

  static async getAssignmentById(id: string): Promise<IAssignment | null> {
    return await Assignment.findById(id)
      .populate('course')
      .populate('instructor')
      .populate('submissions.student');
  }

  static async getAllAssignments(): Promise<IAssignment[]> {
    return await Assignment.find()
      .populate('course')
      .populate('instructor')
      .populate('submissions.student');
  }

  static async updateAssignment(id: string, updateData: Partial<IAssignment>): Promise<IAssignment | null> {
    return await Assignment.findByIdAndUpdate(id, updateData, { new: true })
      .populate('course')
      .populate('instructor')
      .populate('submissions.student');
  }

  static async deleteAssignment(id: string): Promise<boolean> {
    const result = await Assignment.findByIdAndDelete(id);
    return !!result;
  }

  // Payment operations
  static async createPayment(paymentData: Partial<IPayment>): Promise<IPayment> {
    const payment = new Payment(paymentData);
    return await payment.save();
  }

  static async getPaymentById(id: string): Promise<IPayment | null> {
    return await Payment.findById(id).populate('student');
  }

  static async getPaymentsByStudent(studentId: string): Promise<IPayment[]> {
    return await Payment.find({ student: studentId }).populate('student');
  }

  static async getAllPayments(): Promise<IPayment[]> {
    return await Payment.find().populate('student');
  }

  static async updatePayment(id: string, updateData: Partial<IPayment>): Promise<IPayment | null> {
    return await Payment.findByIdAndUpdate(id, updateData, { new: true }).populate('student');
  }

  static async deletePayment(id: string): Promise<boolean> {
    const result = await Payment.findByIdAndDelete(id);
    return !!result;
  }

  // Attendance operations
  static async createAttendance(attendanceData: Partial<IAttendance>): Promise<IAttendance> {
    const attendance = new Attendance(attendanceData);
    return await attendance.save();
  }

  static async getAttendanceById(id: string): Promise<IAttendance | null> {
    return await Attendance.findById(id)
      .populate('student')
      .populate('course')
      .populate('markedBy');
  }

  static async getAttendanceByStudent(studentId: string): Promise<IAttendance[]> {
    return await Attendance.find({ student: studentId })
      .populate('student')
      .populate('course')
      .populate('markedBy');
  }

  static async getAttendanceByCourse(courseId: string): Promise<IAttendance[]> {
    return await Attendance.find({ course: courseId })
      .populate('student')
      .populate('course')
      .populate('markedBy');
  }

  static async getAllAttendance(): Promise<IAttendance[]> {
    return await Attendance.find()
      .populate('student')
      .populate('course')
      .populate('markedBy');
  }

  static async updateAttendance(id: string, updateData: Partial<IAttendance>): Promise<IAttendance | null> {
    return await Attendance.findByIdAndUpdate(id, updateData, { new: true })
      .populate('student')
      .populate('course')
      .populate('markedBy');
  }

  static async deleteAttendance(id: string): Promise<boolean> {
    const result = await Attendance.findByIdAndDelete(id);
    return !!result;
  }

  // Analytics and reporting
  static async getDashboardStats() {
    const [
      totalStudents,
      totalTeachers,
      totalCourses,
      totalAssignments,
      totalPayments,
      activeStudents,
      activeTeachers
    ] = await Promise.all([
      Student.countDocuments(),
      Teacher.countDocuments(),
      Course.countDocuments(),
      Assignment.countDocuments(),
      Payment.countDocuments(),
      Student.countDocuments({ status: 'active' }),
      Teacher.countDocuments({ status: 'active' })
    ]);

    return {
      totalStudents,
      totalTeachers,
      totalCourses,
      totalAssignments,
      totalPayments,
      activeStudents,
      activeTeachers
    };
  }
}









