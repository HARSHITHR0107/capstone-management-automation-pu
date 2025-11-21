import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers } from '@/lib/mockData';
import { collection, onSnapshot, doc, getDoc, updateDoc, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'sonner';
import { Users, BookOpen, MessageSquare, Star, Mail, GraduationCap, Calendar, CheckCircle2, ExternalLink, Github, FileText, Link as LinkIcon, Clock, MapPin, Send, Download, Bell } from 'lucide-react';
import { NotificationDisplay } from '@/components/notifications/NotificationDisplay';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';

// Mock interfaces (replace with actual imports)
interface User {
  id: string;
  email: string;
  rollNo?: string;
  name: string;
  role: string;
  isVerified: boolean;
  specialization?: string;
  maxTeams?: number;
  teamId?: string;
  title?: string;
  designation?: string;
  contactNumber?: string;
  employeeId?: string;
  school?: string;
  createdAt: Date;
}

interface Project {
  id: string;
  title: string;
  description: string;
  specialization: string;
  isAssigned: boolean;
  guideId?: string;
  reviewerId?: string;
  createdAt: Date;
}

interface Team {
  id: string;
  name: string;
  teamNumber?: string;
  members: string[];
  leaderId: string;
  status: string;
  invites: any[];
  projectId?: string;
  guideId?: string;
  reviewerId?: string;
  createdAt: Date;
}

interface ExtendedTeam extends Team {
  projectMaterials?: Array<{
    addedAt: Date;
    addedBy: string;
    addedByName: string;
    id: string;
    title: string;
    type: string;
    url: string;
  }>;
  feedback?: Array<{
    id: string;
    content: string;
    addedBy: string;
    addedByName: string;
    addedAt: Date;
    type: 'guide' | 'reviewer';
  }>;
  reviewSchedules?: Array<{
    id: string;
    title: string;
    description?: string;
    date: Date;
    time?: string;
    location?: string;
    addedBy: string;
    addedByName: string;
    status: 'scheduled' | 'completed' | 'cancelled';
    addedAt: Date;
  }>;
}

export const FacultyDashboard: React.FC = () => {
  const { user } = useAuth();
  const { unreadCount } = useUnreadNotifications();

  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<ExtendedTeam[]>([]);
  const [assignedTeams, setAssignedTeams] = useState<ExtendedTeam[]>([]);

  // Feedback state
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedTeamForFeedback, setSelectedTeamForFeedback] = useState<string | null>(null);
  const [feedbackContent, setFeedbackContent] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);

  // Schedule state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedTeamForSchedule, setSelectedTeamForSchedule] = useState<string | null>(null);
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleDescription, setScheduleDescription] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [scheduleLocation, setScheduleLocation] = useState('');
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);

  // Evaluation state
  const [evaluationDialogOpen, setEvaluationDialogOpen] = useState(false);
  const [selectedTeamForEvaluation, setSelectedTeamForEvaluation] = useState<ExtendedTeam | null>(null);
  const [selectedReviewPhase, setSelectedReviewPhase] = useState<number>(1);
  const [memberMarks, setMemberMarks] = useState<{ [memberId: string]: string }>({});
  const [evaluationComments, setEvaluationComments] = useState<{ [memberId: string]: string }>({});
  const [isSubmittingEvaluation, setIsSubmittingEvaluation] = useState(false);

  // Review phases configuration
  const reviewPhases = [
    { phase: 1, name: 'Review 1', maxMarks: 20 },
    { phase: 2, name: 'Review 2', maxMarks: 20 },
    { phase: 3, name: 'Review 3', maxMarks: 20 },
    { phase: 4, name: 'Final Review', maxMarks: 40 }
  ];

  // Real-time listener for users
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        const firebaseUsers: User[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          firebaseUsers.push({
            id: doc.id,
            email: data.email || '',
            rollNo: data.rollNo || '',
            name: data.name || 'Unknown',
            role: data.role || 'student',
            isVerified: data.isVerified || false,
            specialization: data.specialization,
            maxTeams: data.maxTeams,
            teamId: data.teamId,
            title: data.title,
            designation: data.designation,
            contactNumber: data.contactNumber,
            employeeId: data.employeeId,
            school: data.school,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          });
        });

        const localUsers = getUsers();
        const userMap = new Map<string, User>();
        localUsers.forEach(u => userMap.set(u.id, u));
        firebaseUsers.forEach(u => userMap.set(u.id, u));
        setUsers(Array.from(userMap.values()));
      },
      (error) => {
        console.error('❌ Error listening to users:', error);
        setUsers(getUsers());
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time listener for projects
  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        const updatedProjects: Project[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          updatedProjects.push({
            id: doc.id,
            title: data.title || '',
            description: data.description || '',
            specialization: data.specialization || '',
            isAssigned: data.isAssigned || false,
            guideId: data.guideId,
            reviewerId: data.reviewerId,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          });
        });

        setProjects(updatedProjects);
      },
      (error) => {
        console.error('❌ Error listening to projects:', error);
        setProjects([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // Real-time listener for teams
  useEffect(() => {
    if (!user?.id || !user?.email) return;

    const unsubscribe = onSnapshot(
      collection(db, 'teams'),
      (snapshot) => {
        const updatedTeams: ExtendedTeam[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();

          const projectMaterials = data.projectMaterials?.map((material: any) => ({
            addedAt: material.addedAt?.toDate ? material.addedAt.toDate() : new Date(),
            addedBy: material.addedBy || '',
            addedByName: material.addedByName || 'Unknown',
            id: material.id || '',
            title: material.title || 'Untitled',
            type: material.type || 'link',
            url: material.url || ''
          })) || [];

          const feedback = data.feedback?.map((fb: any) => ({
            id: fb.id || '',
            content: fb.content || '',
            addedBy: fb.addedBy || '',
            addedByName: fb.addedByName || '',
            addedAt: fb.addedAt?.toDate ? fb.addedAt.toDate() : new Date(),
            type: fb.type || 'guide'
          })) || [];

          const reviewSchedules = data.reviewSchedules?.map((schedule: any) => ({
            id: schedule.id || '',
            title: schedule.title || '',
            description: schedule.description,
            date: schedule.date?.toDate ? schedule.date.toDate() : new Date(),
            time: schedule.time,
            location: schedule.location,
            addedBy: schedule.addedBy || '',
            addedByName: schedule.addedByName || '',
            status: schedule.status || 'scheduled',
            addedAt: schedule.addedAt?.toDate ? schedule.addedAt.toDate() : new Date()
          })) || [];

          updatedTeams.push({
            id: doc.id,
            name: data.name || '',
            teamNumber: data.teamNumber || '',
            members: data.members || [],
            leaderId: data.leaderId || '',
            status: data.status || 'forming',
            invites: data.invites || [],
            projectId: data.projectId,
            guideId: data.guideId,
            reviewerId: data.reviewerId,
            projectMaterials,
            feedback,
            reviewSchedules,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          });
        });

        setTeams(updatedTeams);

        const myAssignedTeams = updatedTeams.filter(team => {
          const directIdMatch = team.guideId === user.id || team.reviewerId === user.id;
          if (directIdMatch) return true;

          const guideUser = users.find(u => u.id === team.guideId);
          const reviewerUser = users.find(u => u.id === team.reviewerId);

          return (guideUser?.email === user.email || reviewerUser?.email === user.email) && user.role === 'faculty';
        });

        setAssignedTeams(myAssignedTeams);
      },
      (error) => {
        console.error('❌ Error listening to teams:', error);
        setTeams([]);
        setAssignedTeams([]);
      }
    );

    return () => unsubscribe();
  }, [user?.id, user?.email, users]);

  const getTeamMembers = (team: ExtendedTeam) => {
    return team.members
      .map(memberId => users.find(u => u.id === memberId))
      .filter(Boolean) as User[];
  };

  // Fetch missing team members
  useEffect(() => {
    const fetchMissingMembers = async () => {
      if (assignedTeams.length === 0) return;

      const missingMemberIds: string[] = [];

      assignedTeams.forEach(team => {
        team.members.forEach(memberId => {
          if (!users.find(u => u.id === memberId) && !missingMemberIds.includes(memberId)) {
            missingMemberIds.push(memberId);
          }
        });
      });

      if (missingMemberIds.length === 0) return;

      const memberPromises = missingMemberIds.map(async (memberId) => {
        try {
          const memberDoc = await getDoc(doc(db, 'users', memberId));
          if (memberDoc.exists()) {
            const data = memberDoc.data();
            return {
              id: memberDoc.id,
              email: data.email || '',
              rollNo: data.rollNo || '',
              name: data.name || 'Unknown',
              role: data.role || 'student',
              isVerified: data.isVerified || false,
              specialization: data.specialization,
              maxTeams: data.maxTeams,
              teamId: data.teamId,
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
            } as User;
          }
        } catch (error) {
          console.error(`❌ Error fetching member ${memberId}:`, error);
        }
        return null;
      });

      const fetchedMembers = (await Promise.all(memberPromises)).filter(Boolean) as User[];

      if (fetchedMembers.length > 0) {
        setUsers(prev => {
          const userMap = new Map(prev.map(u => [u.id, u]));
          fetchedMembers.forEach(m => userMap.set(m.id, m));
          return Array.from(userMap.values());
        });
      }
    };

    fetchMissingMembers();
  }, [assignedTeams]);

  const handleSubmitFeedback = async () => {
    if (!selectedTeamForFeedback || !feedbackContent.trim() || !user) {
      console.error('❌ Missing required fields for feedback');
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setIsSubmittingFeedback(true);

      const feedbackItem = {
        id: `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        content: feedbackContent.trim(),
        addedBy: user.id,
        addedByName: user.name,
        addedAt: Timestamp.fromDate(new Date()),
        type: user.role === 'faculty' ? 'guide' : 'reviewer'
      };

      console.log('💬 Creating feedback:', feedbackItem);

      const teamRef = doc(db, 'teams', selectedTeamForFeedback);
      await updateDoc(teamRef, {
        feedback: arrayUnion(feedbackItem)
      });

      console.log('✅ Feedback saved to Firestore');

      const team = assignedTeams.find(t => t.id === selectedTeamForFeedback);
      if (team) {
        const teamMembers = getTeamMembers(team);
        console.log(`📧 Sending feedback notification emails to ${teamMembers.length} team members`);
        toast.success(`Feedback submitted! Email notifications sent to ${teamMembers.length} team members.`);
      } else {
        toast.success('Feedback submitted successfully!');
      }

      setFeedbackContent('');
      setFeedbackDialogOpen(false);
      setSelectedTeamForFeedback(null);
    } catch (error: any) {
      console.error('❌ Failed to submit feedback:', error);
      toast.error(`Failed to submit feedback: ${error.message || 'Unknown error'}`);
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleScheduleReview = async () => {
    if (!selectedTeamForSchedule || !scheduleTitle.trim() || !scheduleDate || !user) return;

    try {
      setIsSubmittingSchedule(true);

      const reviewDate = new Date(scheduleDate);

      if (scheduleTime) {
        const [hours, minutes] = scheduleTime.split(':');
        reviewDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);
      } else {
        reviewDate.setHours(12, 0, 0, 0);
      }

      const scheduleItem = {
        id: `sch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        title: scheduleTitle.trim(),
        description: scheduleDescription.trim() || undefined,
        date: Timestamp.fromDate(reviewDate),
        time: scheduleTime || undefined,
        location: scheduleLocation.trim() || undefined,
        addedBy: user.id,
        addedByName: user.name,
        status: 'scheduled',
        addedAt: Timestamp.fromDate(new Date())
      };

      console.log('📅 Creating schedule:', scheduleItem);

      const teamRef = doc(db, 'teams', selectedTeamForSchedule);
      await updateDoc(teamRef, {
        reviewSchedules: arrayUnion(scheduleItem)
      });

      console.log('✅ Schedule saved to Firestore');

      const team = assignedTeams.find(t => t.id === selectedTeamForSchedule);
      if (team) {
        const teamMembers = getTeamMembers(team);
        const formattedDate = reviewDate.toLocaleDateString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        console.log(`📧 Sending schedule notification emails to ${teamMembers.length} team members`);
        console.log(`📅 Review: ${scheduleTitle} on ${formattedDate} ${scheduleTime ? 'at ' + scheduleTime : ''}`);

        toast.success(`Review scheduled! Email notifications sent to ${teamMembers.length} team members.`);
      } else {
        toast.success('Review scheduled successfully!');
      }

      setScheduleTitle('');
      setScheduleDescription('');
      setScheduleDate('');
      setScheduleTime('');
      setScheduleLocation('');
      setScheduleDialogOpen(false);
      setSelectedTeamForSchedule(null);
    } catch (error: any) {
      console.error('❌ Failed to schedule review:', error);
      toast.error('Failed to schedule review. Please try again.');
    } finally {
      setIsSubmittingSchedule(false);
    }
  };

  const handleOpenEvaluation = (team: ExtendedTeam) => {
    console.log('🔍 Opening evaluation for team:', team);
    setSelectedTeamForEvaluation(team);
    setSelectedReviewPhase(1); // Default to Review 1
    const marks: { [key: string]: string } = {};
    const comments: { [key: string]: string } = {};
    team.members.forEach(memberId => {
      marks[memberId] = '';
      comments[memberId] = '';
    });
    setMemberMarks(marks);
    setEvaluationComments(comments);
    setEvaluationDialogOpen(true);
  };

  const handleSubmitEvaluation = async () => {
    if (!selectedTeamForEvaluation || !user) return;

    const currentPhase = reviewPhases.find(p => p.phase === selectedReviewPhase);
    if (!currentPhase) return;

    try {
      setIsSubmittingEvaluation(true);

      const evaluationData = selectedTeamForEvaluation.members.map(memberId => {
        const marks = memberMarks[memberId] ? parseFloat(memberMarks[memberId]) : 0;
        return {
          memberId,
          marks,
          comments: evaluationComments[memberId] || '',
          evaluatedBy: user.id,
          evaluatedByName: user.name,
          evaluatedAt: Timestamp.fromDate(new Date()),
          reviewPhase: selectedReviewPhase,
          maxMarks: currentPhase.maxMarks
        };
      });

      console.log('📝 Submitting evaluation:', evaluationData);

      const teamRef = doc(db, 'teams', selectedTeamForEvaluation.id);
      const teamDoc = await getDoc(teamRef);

      if (teamDoc.exists()) {
        const existingEvaluations = teamDoc.data().evaluations || [];

        // Remove any existing evaluation for this phase
        const filteredEvaluations = existingEvaluations.filter(
          (e: any) => e.reviewPhase !== selectedReviewPhase
        );

        // Add new evaluation
        await updateDoc(teamRef, {
          evaluations: [...filteredEvaluations, ...evaluationData],
          [`lastEvaluatedPhase${selectedReviewPhase}`]: Timestamp.fromDate(new Date())
        });
      }

      console.log('✅ Evaluation saved to Firestore');
      toast.success(`${currentPhase.name} evaluation submitted successfully!`);

      setEvaluationDialogOpen(false);
      setSelectedTeamForEvaluation(null);
      setSelectedReviewPhase(1);
      setMemberMarks({});
      setEvaluationComments({});
    } catch (error: any) {
      console.error('❌ Failed to submit evaluation:', error);
      toast.error('Failed to submit evaluation. Please try again.');
    } finally {
      setIsSubmittingEvaluation(false);
    }
  };

  // Get existing marks for a member in a specific phase
  const getExistingMarks = (memberId: string, phase: number) => {
    if (!selectedTeamForEvaluation) return null;
    // This would come from Firebase - placeholder for now
    return null;
  };

  // Calculate total marks for a member across all phases
  const calculateTotalMarks = (memberId: string) => {
    // This would sum up marks from all phases from Firebase
    return 0;
  };

  const handleDownloadExcel = async () => {
    if (assignedTeams.length === 0) {
      toast.error('No teams to export');
      return;
    }

    try {
      let csvContent = 'Team Name,Team Number,Project,Student Name,Roll Number,Email,Role,Marks (Out of 100),Comments\n';

      assignedTeams.forEach(team => {
        const members = getTeamMembers(team);
        const project = projects.find(p => p.id === team.projectId);

        members.forEach(member => {
          csvContent += `"${team.name}","${team.teamNumber || 'N/A'}","${project?.title || 'No project'}","${member.name}","${member.rollNo || 'N/A'}","${member.email}","${member.id === team.leaderId ? 'Leader' : 'Member'}","",""\n`;
        });

        csvContent += '\n';
      });

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Team_Evaluations_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success('CSV file downloaded successfully!');
    } catch (error) {
      console.error('❌ Failed to generate file:', error);
      toast.error('Failed to download file. Please try again.');
    }
  };

  const getProjectTitle = (projectId?: string) => {
    if (!projectId) return 'No project assigned';
    const project = projects.find(p => p.id === projectId);
    return project?.title || 'Unknown project';
  };

  const getIconForMaterialType = (type: string) => {
    switch (type.toLowerCase()) {
      case 'github':
        return <Github className="h-4 w-4" />;
      case 'document':
      case 'pdf':
        return <FileText className="h-4 w-4" />;
      default:
        return <LinkIcon className="h-4 w-4" />;
    }
  };

  const stats = {
    assignedTeams: assignedTeams.length,
    maxTeams: user?.maxTeams || 3,
    availableSlots: Math.max(0, (user?.maxTeams || 3) - assignedTeams.length),
    completedReviews: assignedTeams.reduce((acc, team) =>
      acc + (team.reviewSchedules?.filter(s => s.status === 'completed').length || 0), 0
    )
  };

  return (
    <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">
          {user?.role === 'faculty' ? 'Faculty Guide' : 'Reviewer'} Dashboard
        </h1>
        <div className="flex items-center space-x-4">
          {unreadCount > 0 && (
            <div className="relative">
              <Bell className="h-5 w-5 text-blue-600 animate-pulse" />
              <Badge
                variant="destructive"
                className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs rounded-full"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            </div>
          )}
          <div className="text-sm text-muted-foreground">
            Welcome, {user?.name}
          </div>
        </div>
      </div>

      {unreadCount > 0 && (
        <Alert className="bg-blue-50 border-blue-200 border-l-4">
          <Bell className="h-4 w-4 text-blue-600 animate-pulse" />
          <AlertDescription className="text-blue-800">
            <strong>You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}!</strong> Check the Notifications tab to view them.
          </AlertDescription>
        </Alert>
      )}
      {assignedTeams.length > 0 && (
        <Alert className="bg-green-50 border-green-200">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>✅ Email Matching Enabled:</strong> Teams matched using {user?.email}.
            {assignedTeams.length} team(s) found.
          </AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assigned Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedTeams}</div>
            <p className="text-xs text-muted-foreground">of {stats.maxTeams} maximum</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Available Slots</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.availableSlots}</div>
            <p className="text-xs text-muted-foreground">
              {stats.availableSlots > 0 ? 'teams can be assigned' : 'At capacity'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Specialization</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">{user?.specialization || 'N/A'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Reviews</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedReviews}</div>
            <p className="text-xs text-muted-foreground">completed</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="teams" className="w-full">
        <TabsList>
          <TabsTrigger value="teams">My Teams</TabsTrigger>
          <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
          <TabsTrigger value="schedule">Schedule</TabsTrigger>
          <TabsTrigger value="notifications" className="relative">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
            {unreadCount > 0 && (
              <Badge
                variant="destructive"
                className="ml-2 h-5 min-w-5 flex items-center justify-center px-1.5 text-xs rounded-full"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assigned Teams</CardTitle>
              <CardDescription>
                Teams assigned to you as {user?.role === 'faculty' ? 'guide' : 'reviewer'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assignedTeams.length === 0 ? (
                <div className="text-center py-12">
                  <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Users className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">No Teams Assigned</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Teams will appear here once assigned. Email matching is enabled.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {assignedTeams.map((team) => {
                    const members = getTeamMembers(team);
                    const project = projects.find(p => p.id === team.projectId);

                    return (
                      <Card key={team.id} className="border-l-4 border-l-blue-500">
                        <CardHeader>
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <CardTitle className="text-xl flex items-center gap-2 mb-2">
                                {team.name}
                                {team.teamNumber && (
                                  <Badge variant="default" className="font-mono">
                                    {team.teamNumber}
                                  </Badge>
                                )}
                              </CardTitle>
                              {project ? (
                                <div className="space-y-2 p-4 bg-blue-50 rounded-lg border border-blue-200">
                                  <div className="flex items-start gap-2">
                                    <BookOpen className="h-5 w-5 text-blue-600 mt-0.5" />
                                    <div className="flex-1">
                                      <p className="font-semibold text-base text-blue-900">{project.title}</p>
                                      <p className="text-sm text-blue-700 mt-1">{project.description}</p>
                                      <div className="mt-2">
                                        <Badge variant="secondary">{project.specialization}</Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-sm text-muted-foreground">No project assigned</p>
                              )}
                            </div>
                            <Badge variant={team.status === 'assigned' ? 'default' : 'secondary'}>
                              {team.status}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {/* Team Members */}
                            <div>
                              <h4 className="font-semibold mb-3 flex items-center gap-2">
                                <Users className="h-5 w-5" />
                                Team Members ({members.length}/4)
                              </h4>
                              <div className="space-y-2">
                                {members.length === 0 ? (
                                  <p className="text-sm text-muted-foreground py-4 text-center">
                                    Loading team members...
                                  </p>
                                ) : (
                                  members.map((member) => (
                                    <div key={member.id} className={`flex items-center gap-4 p-3 border rounded-lg ${member.id === team.leaderId ? 'bg-blue-50 border-blue-300' : 'bg-white'
                                      }`}>
                                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${member.id === team.leaderId ? 'bg-blue-600' : 'bg-gray-500'
                                        }`}>
                                        {member.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                          <p className="font-semibold">{member.name}</p>
                                          {member.id === team.leaderId && (
                                            <Badge variant="default" className="bg-blue-600 text-xs">Leader</Badge>
                                          )}
                                        </div>
                                        <div className="text-sm text-muted-foreground space-y-1">
                                          {member.email && (
                                            <div className="flex items-center gap-2">
                                              <Mail className="h-3 w-3" />
                                              {member.email}
                                            </div>
                                          )}
                                          {member.rollNo && (
                                            <div className="flex items-center gap-2">
                                              <GraduationCap className="h-3 w-3" />
                                              {member.rollNo}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                              </div>
                            </div>

                            {/* Project Materials */}
                            {team.projectMaterials && team.projectMaterials.length > 0 && (
                              <div className="border-t pt-4">
                                <h4 className="font-semibold mb-3 flex items-center gap-2">
                                  <FileText className="h-5 w-5" />
                                  Project Materials ({team.projectMaterials.length})
                                </h4>
                                <div className="space-y-2">
                                  {team.projectMaterials.map((material, index) => (
                                    <div key={material.id || index} className="flex items-start gap-3 p-3 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors">
                                      <div className="mt-1">
                                        {getIconForMaterialType(material.type)}
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2">
                                          <div className="flex-1">
                                            <p className="font-medium text-sm">{material.title}</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Added by {material.addedByName} • {material.addedAt.toLocaleDateString()}
                                            </p>
                                          </div>
                                          <Badge variant="outline" className="text-xs">
                                            {material.type}
                                          </Badge>
                                        </div>
                                        <a
                                          href={material.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-flex items-center gap-1"
                                        >
                                          <ExternalLink className="h-3 w-3" />
                                          Open Link
                                        </a>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Actions */}
                            <div className="flex flex-wrap gap-2 pt-4 border-t">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedTeamForFeedback(team.id);
                                  setFeedbackDialogOpen(true);
                                }}
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Add Feedback
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSelectedTeamForSchedule(team.id);
                                  setScheduleDialogOpen(true);
                                }}
                              >
                                <Calendar className="h-4 w-4 mr-2" />
                                Schedule Review
                              </Button>
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

        <TabsContent value="evaluation" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Team Evaluations</CardTitle>
                  <CardDescription>Review materials and assign marks to team members</CardDescription>
                </div>
                <Button
                  onClick={handleDownloadExcel}
                  disabled={assignedTeams.length === 0}
                  variant="outline"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Excel Template
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {assignedTeams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No teams to evaluate
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Team</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Members</TableHead>
                      <TableHead>Materials</TableHead>
                      <TableHead>Feedback</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {assignedTeams.map((team) => (
                      <TableRow key={team.id}>
                        <TableCell className="font-medium">{team.name}</TableCell>
                        <TableCell className="max-w-xs truncate">{getProjectTitle(team.projectId)}</TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {team.members.length} members
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={team.projectMaterials && team.projectMaterials.length > 0 ? "default" : "outline"}>
                            {team.projectMaterials?.length || 0} files
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {team.feedback?.length || 0} items
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => handleOpenEvaluation(team)}
                          >
                            Evaluate
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <NotificationDisplay />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Review Schedule</CardTitle>
              <CardDescription>Manage review meetings and deadlines</CardDescription>
            </CardHeader>
            <CardContent>
              {assignedTeams.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No teams assigned
                </div>
              ) : (
                <div className="space-y-4">
                  {assignedTeams.map((team) => {
                    const upcomingReviews = team.reviewSchedules?.filter(s =>
                      s.date >= new Date() && s.status === 'scheduled'
                    ) || [];
                    const completedReviews = team.reviewSchedules?.filter(s =>
                      s.status === 'completed'
                    ) || [];

                    return (
                      <Card key={team.id}>
                        <CardHeader>
                          <div className="flex justify-between items-center">
                            <div>
                              <CardTitle>{team.name}</CardTitle>
                              <CardDescription>{getProjectTitle(team.projectId)}</CardDescription>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSelectedTeamForSchedule(team.id);
                                setScheduleDialogOpen(true);
                              }}
                            >
                              <Calendar className="h-4 w-4 mr-2" />
                              Schedule New
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm text-muted-foreground">Upcoming Reviews</p>
                                <p className="text-2xl font-bold">{upcomingReviews.length}</p>
                              </div>
                              <div className="p-3 bg-green-50 rounded-lg">
                                <p className="text-sm text-muted-foreground">Completed</p>
                                <p className="text-2xl font-bold">{completedReviews.length}</p>
                              </div>
                            </div>

                            {team.reviewSchedules && team.reviewSchedules.length > 0 && (
                              <div className="space-y-2 max-h-60 overflow-y-auto">
                                {team.reviewSchedules
                                  .sort((a, b) => a.date.getTime() - b.date.getTime())
                                  .map((schedule) => (
                                    <div key={schedule.id} className="p-3 border rounded-lg">
                                      <div className="flex justify-between items-start mb-2">
                                        <h5 className="font-semibold">{schedule.title}</h5>
                                        <Badge variant={
                                          schedule.status === 'completed' ? 'default' :
                                            schedule.status === 'cancelled' ? 'secondary' : 'outline'
                                        }>
                                          {schedule.status}
                                        </Badge>
                                      </div>
                                      <div className="space-y-1 text-sm text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                          <Calendar className="h-3 w-3" />
                                          {schedule.date.toLocaleDateString()}
                                        </div>
                                        {schedule.time && (
                                          <div className="flex items-center gap-2">
                                            <Clock className="h-3 w-3" />
                                            {schedule.time}
                                          </div>
                                        )}
                                        {schedule.location && (
                                          <div className="flex items-center gap-2">
                                            <MapPin className="h-3 w-3" />
                                            {schedule.location}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            )}
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
      </Tabs>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Add Feedback</DialogTitle>
            <DialogDescription>
              Provide feedback and suggestions for the team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="feedback-content">Feedback</Label>
              <Textarea
                id="feedback-content"
                value={feedbackContent}
                onChange={(e) => setFeedbackContent(e.target.value)}
                placeholder="Enter your feedback, suggestions, or comments..."
                rows={8}
                className="mt-2"
              />
              <p className="text-xs text-muted-foreground mt-2">
                This feedback will be visible to all team members in their dashboard.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setFeedbackDialogOpen(false);
                setFeedbackContent('');
                setSelectedTeamForFeedback(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedbackContent.trim() || isSubmittingFeedback}
            >
              <Send className="h-4 w-4 mr-2" />
              {isSubmittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Schedule Review Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={(open) => {
        setScheduleDialogOpen(open);
        if (!open) {
          setScheduleTitle('');
          setScheduleDescription('');
          setScheduleDate('');
          setScheduleTime('');
          setScheduleLocation('');
          setSelectedTeamForSchedule(null);
        }
      }}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Schedule Review Meeting</DialogTitle>
            <DialogDescription>
              Set up a review meeting for the team
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="schedule-title">Meeting Title *</Label>
              <Input
                id="schedule-title"
                value={scheduleTitle}
                onChange={(e) => setScheduleTitle(e.target.value)}
                placeholder="e.g., Phase 1 Review, Progress Check"
                className="mt-2"
              />
            </div>
            <div>
              <Label htmlFor="schedule-description">Description (Optional)</Label>
              <Textarea
                id="schedule-description"
                value={scheduleDescription}
                onChange={(e) => setScheduleDescription(e.target.value)}
                placeholder="Add meeting details, agenda, or preparation requirements..."
                rows={3}
                className="mt-2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="schedule-date">Date *</Label>
                <Input
                  id="schedule-date"
                  type="date"
                  value={scheduleDate}
                  onChange={(e) => setScheduleDate(e.target.value)}
                  className="mt-2"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label htmlFor="schedule-time">Time (Optional)</Label>
                <Input
                  id="schedule-time"
                  type="time"
                  value={scheduleTime}
                  onChange={(e) => setScheduleTime(e.target.value)}
                  className="mt-2"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="schedule-location">Location (Optional)</Label>
              <Input
                id="schedule-location"
                value={scheduleLocation}
                onChange={(e) => setScheduleLocation(e.target.value)}
                placeholder="e.g., Room 301, Building A or Online (Zoom link)"
                className="mt-2"
              />
            </div>
            <Alert>
              <Calendar className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Team members will receive email notifications and see this schedule in their dashboard.
              </AlertDescription>
            </Alert>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setScheduleDialogOpen(false);
                setScheduleTitle('');
                setScheduleDescription('');
                setScheduleDate('');
                setScheduleTime('');
                setScheduleLocation('');
                setSelectedTeamForSchedule(null);
              }}
              disabled={isSubmittingSchedule}
            >
              Cancel
            </Button>
            <Button
              onClick={handleScheduleReview}
              disabled={!scheduleTitle.trim() || !scheduleDate || isSubmittingSchedule}
            >
              <Calendar className="h-4 w-4 mr-2" />
              {isSubmittingSchedule ? 'Scheduling...' : 'Schedule Review'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Evaluation Dialog */}
      <Dialog open={evaluationDialogOpen} onOpenChange={(open) => {
        setEvaluationDialogOpen(open);
        if (!open) {
          setSelectedTeamForEvaluation(null);
          setSelectedReviewPhase(1);
          setMemberMarks({});
          setEvaluationComments({});
        }
      }}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Evaluate Team: {selectedTeamForEvaluation?.name}</DialogTitle>
            <DialogDescription>
              Review submitted materials and assign marks to each team member
            </DialogDescription>
          </DialogHeader>

          {selectedTeamForEvaluation && (
            <div className="space-y-6 py-4">
              {/* Review Phase Selector */}
              <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                <Label className="text-sm font-semibold mb-3 block">Select Review Phase</Label>
                <div className="grid grid-cols-4 gap-2">
                  {reviewPhases.map((phase) => (
                    <Button
                      key={phase.phase}
                      variant={selectedReviewPhase === phase.phase ? "default" : "outline"}
                      className={`flex flex-col items-center p-4 h-auto ${selectedReviewPhase === phase.phase
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'hover:bg-blue-50'
                        }`}
                      onClick={() => {
                        setSelectedReviewPhase(phase.phase);
                        // Reset marks when switching phases
                        const marks: { [key: string]: string } = {};
                        const comments: { [key: string]: string } = {};
                        selectedTeamForEvaluation.members.forEach(memberId => {
                          marks[memberId] = '';
                          comments[memberId] = '';
                        });
                        setMemberMarks(marks);
                        setEvaluationComments(comments);
                      }}
                    >
                      <span className="font-semibold">{phase.name}</span>
                      <span className="text-xs mt-1">Max: {phase.maxMarks} marks</span>
                    </Button>
                  ))}
                </div>
                <div className="mt-3 text-sm text-blue-700 bg-blue-100 p-2 rounded">
                  <strong>Current Selection:</strong> {reviewPhases.find(p => p.phase === selectedReviewPhase)?.name}
                  (Maximum {reviewPhases.find(p => p.phase === selectedReviewPhase)?.maxMarks} marks per student)
                </div>
              </div>

              {/* Project Info */}
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Project Details
                </h4>
                <p className="text-sm">
                  {getProjectTitle(selectedTeamForEvaluation.projectId)}
                </p>
              </div>

              {/* Project Materials */}
              {selectedTeamForEvaluation.projectMaterials && selectedTeamForEvaluation.projectMaterials.length > 0 && (
                <div className="border rounded-lg p-4">
                  <h4 className="font-semibold mb-3 flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Submitted Materials ({selectedTeamForEvaluation.projectMaterials.length})
                  </h4>
                  <div className="space-y-2">
                    {selectedTeamForEvaluation.projectMaterials.map((material, index) => (
                      <div key={material.id || index} className="flex items-start gap-3 p-3 bg-gray-50 border rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="mt-1">
                          {getIconForMaterialType(material.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-medium text-sm">{material.title}</p>
                              <p className="text-xs text-muted-foreground mt-1">
                                Added by {material.addedByName} • {material.addedAt.toLocaleDateString()}
                              </p>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {material.type}
                            </Badge>
                          </div>
                          <a
                            href={material.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-blue-600 hover:text-blue-800 mt-2 inline-flex items-center gap-1"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open & Review
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedTeamForEvaluation.projectMaterials?.length === 0 && (
                <Alert>
                  <AlertDescription>
                    No materials have been submitted by this team yet.
                  </AlertDescription>
                </Alert>
              )}

              {/* Team Member Evaluation */}
              <div className="border rounded-lg p-4">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Evaluate Team Members - {reviewPhases.find(p => p.phase === selectedReviewPhase)?.name}
                </h4>
                <div className="space-y-4">
                  {getTeamMembers(selectedTeamForEvaluation).map((member) => {
                    const maxMarks = reviewPhases.find(p => p.phase === selectedReviewPhase)?.maxMarks || 100;
                    const currentMarks = memberMarks[member.id] ? parseFloat(memberMarks[member.id]) : 0;
                    const percentage = maxMarks > 0 ? (currentMarks / maxMarks) * 100 : 0;

                    return (
                      <div key={member.id} className="border rounded-lg p-4 space-y-3 bg-white">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold ${member.id === selectedTeamForEvaluation.leaderId ? 'bg-blue-600' : 'bg-gray-500'
                            }`}>
                            {member.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold">{member.name}</p>
                              {member.id === selectedTeamForEvaluation.leaderId && (
                                <Badge variant="default" className="bg-blue-600 text-xs">Leader</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">{member.rollNo}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor={`marks-${member.id}`}>
                              Marks (Out of {maxMarks}) *
                            </Label>
                            <Input
                              id={`marks-${member.id}`}
                              type="number"
                              min="0"
                              max={maxMarks}
                              step="0.5"
                              value={memberMarks[member.id] || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                const numValue = parseFloat(value);
                                if (value === '' || (numValue >= 0 && numValue <= maxMarks)) {
                                  setMemberMarks({
                                    ...memberMarks,
                                    [member.id]: value
                                  });
                                }
                              }}
                              placeholder={`Enter marks (0-${maxMarks})`}
                              className="mt-2"
                            />
                          </div>
                          <div className="flex items-end">
                            <div className="text-sm w-full">
                              {memberMarks[member.id] && (
                                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded border border-blue-200">
                                  <div className="flex justify-between items-center mb-1">
                                    <span className="font-semibold text-blue-900">Score:</span>
                                    <span className="text-lg font-bold text-blue-600">
                                      {currentMarks}/{maxMarks}
                                    </span>
                                  </div>
                                  <div className="w-full bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full transition-all ${percentage >= 90 ? 'bg-green-500' :
                                          percentage >= 70 ? 'bg-blue-500' :
                                            percentage >= 50 ? 'bg-yellow-500' :
                                              'bg-red-500'
                                        }`}
                                      style={{ width: `${Math.min(percentage, 100)}%` }}
                                    />
                                  </div>
                                  <p className="text-xs text-blue-700 mt-1">
                                    {percentage.toFixed(1)}% of maximum marks
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        <div>
                          <Label htmlFor={`comments-${member.id}`}>Comments (Optional)</Label>
                          <Textarea
                            id={`comments-${member.id}`}
                            value={evaluationComments[member.id] || ''}
                            onChange={(e) => setEvaluationComments({
                              ...evaluationComments,
                              [member.id]: e.target.value
                            })}
                            placeholder="Add individual feedback for this member..."
                            rows={2}
                            className="mt-2"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <Alert>
                <AlertDescription className="text-xs">
                  <strong>Note:</strong> Marks are saved per review phase. You can evaluate each phase separately.
                  Total marks = Review 1 (20) + Review 2 (20) + Review 3 (20) + Final Review (40) = 100 marks.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setEvaluationDialogOpen(false);
                setSelectedTeamForEvaluation(null);
                setSelectedReviewPhase(1);
                setMemberMarks({});
                setEvaluationComments({});
              }}
              disabled={isSubmittingEvaluation}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitEvaluation}
              disabled={isSubmittingEvaluation || !selectedTeamForEvaluation?.members.every(id => memberMarks[id])}
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              {isSubmittingEvaluation ? 'Submitting...' : `Submit ${reviewPhases.find(p => p.phase === selectedReviewPhase)?.name}`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}