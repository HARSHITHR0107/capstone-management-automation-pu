import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Project, Team } from '@/types/user';
import { Users, BookOpen, UserCheck, TrendingUp, FileSpreadsheet, Database, Mail, Phone, Briefcase, Bell, MessageSquare, Send, Link, Plus, Trash2 } from 'lucide-react';
import { ExcelUpload } from '@/components/admin/ExcelUpload';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp, updateDoc, doc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { sendGlobalNotification, getAllSentNotifications, GlobalNotification } from '@/lib/globalNotificationService';
import { useAuth } from '@/contexts/AuthContext';

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [faculty, setFaculty] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [newProject, setNewProject] = useState({
    title: '',
    description: '',
    specialization: ''
  });

  // Global notification state
  const [notifications, setNotifications] = useState<GlobalNotification[]>([]);
  const [notificationDialogOpen, setNotificationDialogOpen] = useState(false);
  const [newNotification, setNewNotification] = useState({
    title: '',
    message: '',
    targetRoles: ['student', 'faculty'] as ('student' | 'faculty' | 'admin')[],
    attachmentLinks: [''] as string[]
  });
  const [isSendingNotification, setIsSendingNotification] = useState(false);

  useEffect(() => {
    fetchData();
    fetchNotifications();
  }, []);

  // Real-time listener for notifications
  useEffect(() => {
    const q = query(collection(db, 'globalNotifications'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const notificationsData: GlobalNotification[] = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          notificationsData.push({
            id: doc.id,
            title: data.title || '',
            message: data.message || '',
            targetRoles: data.targetRoles || [],
            sentBy: data.sentBy || '',
            sentByName: data.sentByName || 'Admin',
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            readBy: data.readBy || [],
          });
        });
        setNotifications(notificationsData.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()));
      },
      (error) => {
        console.error('Error listening to notifications:', error);
      }
    );

    return () => unsubscribe();
  }, []);

  const fetchNotifications = async () => {
    try {
      const allNotifications = await getAllSentNotifications();
      setNotifications(allNotifications);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch all users
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const usersData: User[] = [];
      const studentsData: User[] = [];
      const facultyData: User[] = [];

      usersSnapshot.forEach((doc) => {
        const data = doc.data();
        const user: User = {
          id: doc.id,
          email: data.email || '',
          rollNo: data.rollNo || '',
          name: data.name || 'Unknown',
          role: data.role || 'student',
          isVerified: data.isVerified || false,
          specialization: data.specialization,
          maxTeams: data.maxTeams,
          teamId: data.teamId,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          // Additional faculty fields
          title: data.title,
          designation: data.designation,
          contactNumber: data.contactNumber,
          employeeId: data.employeeId,
          school: data.school,
        };

        usersData.push(user);

        // Separate into students and faculty
        if (user.role === 'student') {
          studentsData.push(user);
        } else if (user.role === 'faculty') {
          facultyData.push(user);
        }
      });

      console.log('📊 Fetched users:', {
        total: usersData.length,
        students: studentsData.length,
        faculty: facultyData.length
      });

      setUsers(usersData);
      setStudents(studentsData);
      setFaculty(facultyData);

      // Fetch projects
      const projectsSnapshot = await getDocs(collection(db, 'projects'));
      const projectsData: Project[] = [];
      projectsSnapshot.forEach((doc) => {
        const data = doc.data();
        projectsData.push({
          id: doc.id,
          title: data.title || 'Untitled Project',
          description: data.description || '',
          specialization: data.specialization || 'General',
          isAssigned: data.isAssigned || false,
          guideId: data.guideId,
          reviewerId: data.reviewerId,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
        });
      });
      setProjects(projectsData);

      // Fetch teams
      const teamsSnapshot = await getDocs(collection(db, 'teams'));
      const teamsData: Team[] = [];
      teamsSnapshot.forEach((doc) => {
        const data = doc.data();
        teamsData.push({
          id: doc.id,
          name: data.name || 'Unnamed Team',
          teamNumber: data.teamNumber || '',
          members: data.members || [],
          leaderId: data.leaderId || '',
          status: data.status || 'forming',
          invites: data.invites || [],
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          projectId: data.projectId,
          guideId: data.guideId,
          reviewerId: data.reviewerId,
        });
      });
      setTeams(teamsData);
    } catch (error) {
      console.error('❌ Error fetching admin dashboard data:', error);
      setUsers([]);
      setStudents([]);
      setFaculty([]);
      setProjects([]);
      setTeams([]);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyUser = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'users', userId), { isVerified: true });

      // Update local state
      const updatedUsers = users.map(user =>
        user.id === userId ? { ...user, isVerified: true } : user
      );
      setUsers(updatedUsers);

      // Update students/faculty arrays
      setStudents(updatedUsers.filter(u => u.role === 'student'));
      setFaculty(updatedUsers.filter(u => u.role === 'faculty'));

      console.log('✅ User verified successfully:', userId);
    } catch (error) {
      console.error('❌ Error verifying user:', error);
      await fetchData();
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'users', userId));
      await fetchData();
      console.log('✅ User deleted successfully:', userId);
    } catch (error) {
      console.error('❌ Error deleting user:', error);
    }
  };

  const handleAddProject = async () => {
    if (!newProject.title || !newProject.description || !newProject.specialization) {
      console.warn('⚠️ Missing required project fields');
      return;
    }

    try {
      const projectData = {
        title: newProject.title.trim(),
        description: newProject.description.trim(),
        specialization: newProject.specialization,
        isAssigned: false,
        createdAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, 'projects'), projectData);
      const newProjectObj: Project = {
        id: docRef.id,
        title: newProject.title.trim(),
        description: newProject.description.trim(),
        specialization: newProject.specialization,
        isAssigned: false,
        createdAt: new Date()
      };

      setProjects([...projects, newProjectObj]);
      setNewProject({ title: '', description: '', specialization: '' });

      console.log('✅ Project added successfully:', docRef.id);
    } catch (error) {
      console.error('❌ Error adding project:', error);
    }
  };

  const handleDataRefresh = () => {
    fetchData();
  };

  const handleSendNotification = async () => {
    if (!newNotification.title.trim() || !newNotification.message.trim() || newNotification.targetRoles.length === 0) {
      alert('Please fill in all fields and select at least one target audience');
      return;
    }

    if (!user) {
      alert('User not found');
      return;
    }

    try {
      setIsSendingNotification(true);
      const result = await sendGlobalNotification({
        title: newNotification.title.trim(),
        message: newNotification.message.trim(),
        targetRoles: newNotification.targetRoles,
        sentBy: user.id,
        sentByName: user.name || 'Admin',
        attachmentLinks: newNotification.attachmentLinks.filter(link => link.trim() !== '')
      });

      if (result.success) {
        alert(`✅ Notification sent successfully to ${newNotification.targetRoles.join(' and ')}!`);
        setNewNotification({
          title: '',
          message: '',
          targetRoles: ['student', 'faculty'],
          attachmentLinks: ['']
        });
        setNotificationDialogOpen(false);
      } else {
        alert(`❌ Failed to send notification: ${result.error}`);
      }
    } catch (error: any) {
      console.error('Error sending notification:', error);
      alert(`❌ Error: ${error.message || 'Failed to send notification'}`);
    } finally {
      setIsSendingNotification(false);
    }
  };

  const stats = {
    totalUsers: users.length,
    totalStudents: students.length,
    totalFaculty: faculty.length,
    totalProjects: projects.length,
    totalTeams: teams.length,
    pendingVerifications: users.filter(u => !u.isVerified).length
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
        <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        <Button onClick={fetchData} variant="outline" className="w-full md:w-auto">
          Refresh Data
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalUsers}</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalStudents} students, {stats.totalFaculty} faculty
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Projects</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProjects}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Teams</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalTeams}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Verifications</CardTitle>
            <UserCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingVerifications}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap no-scrollbar">
          <TabsTrigger value="upload" className="whitespace-nowrap">Excel Upload</TabsTrigger>
          <TabsTrigger value="notifications" className="whitespace-nowrap">
            <Bell className="h-4 w-4 mr-2" />
            Notifications ({notifications.length})
          </TabsTrigger>
          <TabsTrigger value="students" className="whitespace-nowrap">Students ({stats.totalStudents})</TabsTrigger>
          <TabsTrigger value="faculty" className="whitespace-nowrap">Faculty ({stats.totalFaculty})</TabsTrigger>
          <TabsTrigger value="projects" className="whitespace-nowrap">Projects</TabsTrigger>
          <TabsTrigger value="teams" className="whitespace-nowrap">Teams</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <ExcelUpload onDataProcessed={handleDataRefresh} />
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Bell className="h-5 w-5" />
                    Global Notifications
                  </CardTitle>
                  <CardDescription>
                    Send announcements to all registered users (students and faculty)
                  </CardDescription>
                </div>
                <Dialog open={notificationDialogOpen} onOpenChange={setNotificationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full md:w-auto">
                      <Send className="h-4 w-4 mr-2" />
                      Send Notification
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>Send Global Notification</DialogTitle>
                      <DialogDescription>
                        This notification will be sent to all users with the selected roles
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div>
                        <Label htmlFor="notification-title">Title *</Label>
                        <Input
                          id="notification-title"
                          value={newNotification.title}
                          onChange={(e) => setNewNotification({ ...newNotification, title: e.target.value })}
                          placeholder="e.g., Important Announcement"
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label htmlFor="notification-message">Message *</Label>
                        <Textarea
                          id="notification-message"
                          value={newNotification.message}
                          onChange={(e) => setNewNotification({ ...newNotification, message: e.target.value })}
                          placeholder="Enter your notification message..."
                          rows={6}
                          className="mt-2"
                        />
                      </div>
                      <div>
                        <Label>Attachment Links (Optional)</Label>
                        {newNotification.attachmentLinks.map((link, index) => (
                          <div key={index} className="flex gap-2 mt-2">
                            <Input
                              value={link}
                              onChange={(e) => {
                                const newLinks = [...newNotification.attachmentLinks];
                                newLinks[index] = e.target.value;
                                setNewNotification({ ...newNotification, attachmentLinks: newLinks });
                              }}
                              placeholder="https://drive.google.com/..."
                            />
                            {index === newNotification.attachmentLinks.length - 1 ? (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => setNewNotification({ ...newNotification, attachmentLinks: [...newNotification.attachmentLinks, ''] })}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => {
                                  const newLinks = newNotification.attachmentLinks.filter((_, i) => i !== index);
                                  setNewNotification({ ...newNotification, attachmentLinks: newLinks });
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      <div>
                        <Label>Target Audience *</Label>
                        <div className="flex flex-wrap gap-3 mt-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="target-students"
                              checked={newNotification.targetRoles.includes('student')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewNotification({
                                    ...newNotification,
                                    targetRoles: [...newNotification.targetRoles, 'student'],
                                  });
                                } else {
                                  setNewNotification({
                                    ...newNotification,
                                    targetRoles: newNotification.targetRoles.filter((r) => r !== 'student'),
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <Label htmlFor="target-students" className="font-normal cursor-pointer">
                              Students ({stats.totalStudents})
                            </Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              id="target-faculty"
                              checked={newNotification.targetRoles.includes('faculty')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setNewNotification({
                                    ...newNotification,
                                    targetRoles: [...newNotification.targetRoles, 'faculty'],
                                  });
                                } else {
                                  setNewNotification({
                                    ...newNotification,
                                    targetRoles: newNotification.targetRoles.filter((r) => r !== 'faculty'),
                                  });
                                }
                              }}
                              className="rounded"
                            />
                            <Label htmlFor="target-faculty" className="font-normal cursor-pointer">
                              Faculty ({stats.totalFaculty})
                            </Label>
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          Total recipients: {
                            (newNotification.targetRoles.includes('student') ? stats.totalStudents : 0) +
                            (newNotification.targetRoles.includes('faculty') ? stats.totalFaculty : 0)
                          } users
                        </p>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setNotificationDialogOpen(false);
                          setNewNotification({
                            title: '',
                            message: '',
                            targetRoles: ['student', 'faculty'],
                            attachmentLinks: ['']
                          });
                        }}
                        disabled={isSendingNotification}
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSendNotification}
                        disabled={isSendingNotification || !newNotification.title.trim() || !newNotification.message.trim() || newNotification.targetRoles.length === 0}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        {isSendingNotification ? 'Sending...' : 'Send Notification'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {notifications.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No notifications sent yet. Click "Send Notification" to send your first announcement.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    const totalRecipients =
                      (notification.targetRoles.includes('student') ? stats.totalStudents : 0) +
                      (notification.targetRoles.includes('faculty') ? stats.totalFaculty : 0);
                    const readCount = notification.readBy.length;
                    const readPercentage = totalRecipients > 0 ? Math.round((readCount / totalRecipients) * 100) : 0;

                    return (
                      <Card key={notification.id} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-lg">{notification.title}</CardTitle>
                              <CardDescription className="mt-2 whitespace-pre-wrap">
                                {notification.message}
                              </CardDescription>
                              {notification.attachmentLinks && notification.attachmentLinks.length > 0 && (
                                <div className="mt-4 space-y-2">
                                  <p className="text-sm font-medium text-muted-foreground">Attachments:</p>
                                  <div className="flex flex-wrap gap-2">
                                    {notification.attachmentLinks.map((link, index) => (
                                      <a
                                        key={index}
                                        href={link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 text-sm text-blue-600 hover:underline bg-blue-50 px-3 py-1 rounded-md"
                                      >
                                        <Link className="h-3 w-3" />
                                        View Attachment {index + 1}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                            <Badge variant="outline">
                              {notification.targetRoles.join(', ')}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div className="flex items-center gap-4">
                              <span>Sent by: {notification.sentByName}</span>
                              <span>{notification.createdAt.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              <span>
                                {readCount}/{totalRecipients} read ({readPercentage}%)
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Student Management</CardTitle>
              <CardDescription>Manage student data. Total records: {students.length}</CardDescription>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No students found. Upload an Excel file to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Roll No</TableHead>
                        <TableHead>Specialization</TableHead>
                        <TableHead>Verified</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="font-medium">{student.name}</TableCell>
                          <TableCell>{student.email}</TableCell>
                          <TableCell>{student.rollNo}</TableCell>
                          <TableCell>{student.specialization || 'N/A'}</TableCell>
                          <TableCell>
                            {student.isVerified ? (
                              <Badge variant="default">Verified</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {!student.isVerified && (
                                <Button
                                  size="sm"
                                  onClick={() => handleVerifyUser(student.id)}
                                >
                                  Verify
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleDeleteUser(student.id)}
                              >
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="faculty" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Faculty Management</CardTitle>
              <CardDescription>Manage faculty data. Total records: {faculty.length}</CardDescription>
            </CardHeader>
            <CardContent>
              {faculty.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    No faculty found. Upload an Excel file to get started.
                  </AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  {faculty.map((member) => (
                    <Card key={member.id} className="p-4">
                      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                        <div className="space-y-2 flex-1 w-full">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold">
                              {member.title} {member.name}
                            </h3>
                            {member.isVerified ? (
                              <Badge variant="default">Verified</Badge>
                            ) : (
                              <Badge variant="secondary">Pending</Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                            <div className="flex items-center gap-2 truncate">
                              <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <span className="truncate">{member.email}</span>
                            </div>

                            {member.contactNumber && (
                              <div className="flex items-center gap-2">
                                <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span>{member.contactNumber}</span>
                              </div>
                            )}

                            {member.designation && (
                              <div className="flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span>{member.designation}</span>
                              </div>
                            )}

                            {member.school && (
                              <div className="flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <span>{member.school}</span>
                              </div>
                            )}

                            {member.employeeId && (
                              <div className="text-muted-foreground">
                                Employee ID: {member.employeeId}
                              </div>
                            )}

                            <div className="text-muted-foreground">
                              Max Teams: {member.maxTeams || 3}
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 w-full md:w-auto">
                          {!member.isVerified && (
                            <Button
                              size="sm"
                              onClick={() => handleVerifyUser(member.id)}
                              className="flex-1 md:flex-none"
                            >
                              Verify
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteUser(member.id)}
                            className="flex-1 md:flex-none"
                          >
                            Delete
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0">
                <div>
                  <CardTitle>Add New Project</CardTitle>
                  <CardDescription>Create a new capstone project manually</CardDescription>
                </div>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full md:w-auto">Add New Project</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add New Project</DialogTitle>
                      <DialogDescription>Create a new capstone project for students to select</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="title">Project Title</Label>
                        <Input
                          id="title"
                          value={newProject.title}
                          onChange={(e) => setNewProject({ ...newProject, title: e.target.value })}
                          placeholder="Enter project title"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newProject.description}
                          onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
                          placeholder="Enter project description"
                          rows={3}
                        />
                      </div>
                      <div>
                        <Label htmlFor="specialization">Specialization</Label>
                        <Select
                          value={newProject.specialization}
                          onValueChange={(value) => setNewProject({ ...newProject, specialization: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select specialization" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Computer Science">Computer Science</SelectItem>
                            <SelectItem value="Information Technology">Information Technology</SelectItem>
                            <SelectItem value="Electronics">Electronics</SelectItem>
                            <SelectItem value="Mechanical">Mechanical</SelectItem>
                            <SelectItem value="Civil">Civil</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button onClick={handleAddProject} className="w-full">
                        Add Project
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Projects List</CardTitle>
                <CardDescription>Total projects: {projects.length}</CardDescription>
              </CardHeader>
              <CardContent>
                {projects.length === 0 ? (
                  <Alert>
                    <AlertDescription>No projects found. Add a project to get started.</AlertDescription>
                  </Alert>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Specialization</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.title}</TableCell>
                          <TableCell className="max-w-md truncate">{project.description}</TableCell>
                          <TableCell>{project.specialization}</TableCell>
                          <TableCell>
                            <Badge variant={project.isAssigned ? 'default' : 'secondary'}>
                              {project.isAssigned ? 'Assigned' : 'Available'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Overview</CardTitle>
              <CardDescription>Monitor all student teams and their progress</CardDescription>
            </CardHeader>
            <CardContent>
              {teams.length === 0 ? (
                <Alert>
                  <AlertDescription>No teams created yet</AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team Name</TableHead>
                      <TableHead>Team Number</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell>{team.teamNumber || 'N/A'}</TableCell>
                        <TableCell>{team.members.length}/4 members</TableCell>
                        <TableCell>{team.projectId ? 'Assigned' : 'Not assigned'}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">{team.status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(team.createdAt).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
