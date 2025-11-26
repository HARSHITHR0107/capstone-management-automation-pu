import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { getUsers, updateTeams } from '@/lib/mockData';
import { createTeamInFirestore, updateUserTeamId, getTeamCapacity, updateUserProjectSelection, checkTeamProjectConsensus, autoAssignFacultyToTeam, updateTeamProject, getTeamProjectSelections } from '@/lib/teamService';
import { User, Project, Team } from '@/types/user';
import { collection, getDocs, onSnapshot, doc, getDoc, updateDoc, arrayUnion, arrayRemove, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Users, BookOpen, Plus, Mail, AlertCircle, User as UserIcon, GraduationCap, Phone, Link as LinkIcon, Github, FolderOpen, Trash2, ExternalLink, MessageSquare, Calendar, Clock, MapPin, Bell, Search } from 'lucide-react';
import { InvitationManager } from '@/components/teams/InvitationManager';
import { requestNotificationPermission } from '@/lib/emailService';
import { EmailSetupStatus } from '@/components/ui/EmailSetupStatus';
import { NotificationDisplay } from '@/components/notifications/NotificationDisplay';
import { useUnreadNotifications } from '@/hooks/useUnreadNotifications';
import { EmailProgressDashboard } from '@/components/email/EmailProgressDashboard';
import { EmailDiagnostics } from '@/components/ui/EmailDiagnostics';

// Marks Tab Component
const MarksTab: React.FC<{ myTeam: Team | null; user: any }> = ({ myTeam, user }) => {
  const [evaluations, setEvaluations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const reviewPhases = [
    { phase: 1, name: 'Review 1', maxMarks: 20 },
    { phase: 2, name: 'Review 2', maxMarks: 20 },
    { phase: 3, name: 'Review 3', maxMarks: 20 },
    { phase: 4, name: 'Final Review', maxMarks: 40 }
  ];

  useEffect(() => {
    const fetchEvaluations = async () => {
      if (!myTeam?.id || !user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const teamDoc = await getDoc(doc(db, 'teams', myTeam.id));

        if (teamDoc.exists()) {
          const data = teamDoc.data();
          const allEvaluations = data.evaluations || [];

          const myEvaluations = allEvaluations
            .filter((e: any) => e.memberId === user.id)
            .map((e: any) => ({
              ...e,
              evaluatedAt: e.evaluatedAt?.toDate ? e.evaluatedAt.toDate() : new Date(e.evaluatedAt)
            }))
            .sort((a: any, b: any) => a.reviewPhase - b.reviewPhase);

          setEvaluations(myEvaluations);
        }
      } catch (error) {
        console.error('Failed to fetch evaluations:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchEvaluations();

    if (myTeam?.id) {
      const unsubscribe = onSnapshot(
        doc(db, 'teams', myTeam.id),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            const allEvaluations = data.evaluations || [];

            const myEvaluations = allEvaluations
              .filter((e: any) => e.memberId === user.id)
              .map((e: any) => ({
                ...e,
                evaluatedAt: e.evaluatedAt?.toDate ? e.evaluatedAt.toDate() : new Date(e.evaluatedAt)
              }))
              .sort((a: any, b: any) => a.reviewPhase - b.reviewPhase);

            setEvaluations(myEvaluations);
          }
        }
      );
      return () => unsubscribe();
    }
  }, [myTeam?.id, user?.id]);

  const totalMarks = evaluations.reduce((sum, e) => sum + (e.marks || 0), 0);
  const totalMaxMarks = evaluations.reduce((sum, e) => sum + (e.maxMarks || 0), 0);
  const percentage = totalMaxMarks > 0 ? (totalMarks / totalMaxMarks) * 100 : 0;
  const completedReviews = evaluations.length;
  const pendingReviews = reviewPhases.length - completedReviews;

  if (!myTeam) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">Create or join a team to view marks</p>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Loading your marks...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Score</CardTitle>
            <Badge className="bg-yellow-500">{totalMarks.toFixed(1)}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMarks.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">out of {totalMaxMarks} marks</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Percentage</CardTitle>
            <Badge variant={percentage >= 70 ? 'default' : percentage >= 50 ? 'secondary' : 'destructive'}>
              {percentage.toFixed(1)}%
            </Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{percentage.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              {percentage >= 90 ? 'Excellent!' : percentage >= 70 ? 'Good!' : percentage >= 50 ? 'Fair' : 'Needs improvement'}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <Badge variant="default">{completedReviews}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedReviews}</div>
            <p className="text-xs text-muted-foreground">of {reviewPhases.length} reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Badge variant="outline">{pendingReviews}</Badge>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingReviews}</div>
            <p className="text-xs text-muted-foreground">reviews remaining</p>
          </CardContent>
        </Card>
      </div>

      {/* Overall Progress Bar */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Overall Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Project Completion</span>
              <span className="font-semibold">{((completedReviews / reviewPhases.length) * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${percentage >= 90 ? 'bg-green-500' :
                  percentage >= 70 ? 'bg-blue-500' :
                    percentage >= 50 ? 'bg-yellow-500' :
                      'bg-red-500'
                  }`}
                style={{ width: `${(completedReviews / reviewPhases.length) * 100}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {completedReviews} out of {reviewPhases.length} reviews completed
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Marks by Review Phase */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Detailed Marks Breakdown
          </CardTitle>
          <CardDescription>Your marks for each review phase</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reviewPhases.map((phase) => {
              const evaluation = evaluations.find(e => e.reviewPhase === phase.phase);
              const marks = evaluation?.marks || 0;
              const maxMarks = phase.maxMarks;
              const phasePercentage = maxMarks > 0 ? (marks / maxMarks) * 100 : 0;
              const isEvaluated = !!evaluation;

              return (
                <div
                  key={phase.phase}
                  className={`p-4 border rounded-lg ${isEvaluated ? 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200' : 'bg-gray-50 border-gray-200'
                    }`}
                >
                  <div className="flex flex-col md:flex-row items-start justify-between mb-3 gap-4 md:gap-0">
                    <div className="flex-1 w-full md:w-auto">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">{phase.name}</h4>
                        {isEvaluated ? (
                          <Badge variant="default" className="bg-green-600">
                            ✓ Evaluated
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-orange-600 border-orange-300">
                            ⏳ Pending
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Maximum {maxMarks} marks
                      </p>
                    </div>
                    {isEvaluated && (
                      <div className="text-left md:text-right w-full md:w-auto flex flex-row md:flex-col justify-between md:justify-start items-center md:items-end mt-2 md:mt-0">
                        <div className="text-2xl font-bold text-blue-600">
                          {marks.toFixed(1)}/{maxMarks}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {phasePercentage.toFixed(1)}%
                        </p>
                      </div>
                    )}
                  </div>

                  {isEvaluated && (
                    <>
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className={`h-2 rounded-full transition-all ${phasePercentage >= 90 ? 'bg-green-500' :
                            phasePercentage >= 70 ? 'bg-blue-500' :
                              phasePercentage >= 50 ? 'bg-yellow-500' :
                                'bg-red-500'
                            }`}
                          style={{ width: `${Math.min(phasePercentage, 100)}%` }}
                        />
                      </div>
                      {evaluation.comments && (
                        <div className="mt-3 p-3 bg-white border border-blue-200 rounded">
                          <p className="text-xs font-semibold text-blue-900 mb-1">Faculty Comments:</p>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{evaluation.comments}</p>
                        </div>
                      )}
                      <div className="mt-3 pt-3 border-t border-blue-200">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span>Evaluated by: {evaluation.evaluatedByName}</span>
                          <span>{evaluation.evaluatedAt.toLocaleDateString()} at {evaluation.evaluatedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                      </div>
                    </>
                  )}

                  {!isEvaluated && (
                    <div className="mt-3 text-sm text-muted-foreground text-center py-2">
                      This review has not been evaluated yet. Your faculty guide will provide marks after the review.
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Insights */}
      {evaluations.length > 0 && (
        <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
              Performance Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {percentage >= 90 && (
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5">✓</div>
                  <div>
                    <p className="font-semibold text-green-900">Outstanding Performance!</p>
                    <p className="text-sm text-green-700">You're maintaining an excellent academic standing. Keep up the great work!</p>
                  </div>
                </div>
              )}
              {percentage >= 70 && percentage < 90 && (
                <div className="flex items-start gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs flex-shrink-0 mt-0.5">✓</div>
                  <div>
                    <p className="font-semibold text-blue-900">Good Progress!</p>
                    <p className="text-sm text-blue-700">You're doing well. Focus on incorporating feedback to reach excellence.</p>
                  </div>
                </div>
              )}
              {percentage >= 50 && percentage < 70 && (
                <div className="flex items-start gap-2">
                  <Clock className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-yellow-900">Room for Improvement</p>
                    <p className="text-sm text-yellow-700">Review faculty comments carefully and work on addressing their feedback in upcoming reviews.</p>
                  </div>
                </div>
              )}
              {percentage < 50 && percentage > 0 && (
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-900">Needs Attention</p>
                    <p className="text-sm text-red-700">Schedule a meeting with your faculty guide to discuss improvement strategies.</p>
                  </div>
                </div>
              )}
              <div className="pt-3 border-t border-purple-200">
                <p className="text-sm font-medium mb-2">Next Steps:</p>
                <ul className="text-sm space-y-1 text-muted-foreground ml-4">
                  {pendingReviews > 0 && (
                    <li className="list-disc">Complete {pendingReviews} remaining review{pendingReviews > 1 ? 's' : ''}</li>
                  )}
                  <li className="list-disc">Review faculty feedback and implement suggestions</li>
                  <li className="list-disc">Maintain regular communication with your faculty guide</li>
                  <li className="list-disc">Update project materials regularly in the Materials tab</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {evaluations.length === 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            No evaluations yet. Your marks will appear here once your faculty guide completes the first review evaluation.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
};

interface ProjectMaterial {
  id: string;
  url: string;
  title: string;
  type: 'github' | 'drive' | 'other';
  addedBy: string;
  addedByName: string;
  addedAt: Date;
}

interface Feedback {
  id: string;
  content: string;
  addedBy: string;
  addedByName: string;
  addedAt: Date;
  type: 'guide' | 'reviewer';
}

interface ReviewSchedule {
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
}

export const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const { unreadCount } = useUnreadNotifications();
  const [users, setUsers] = useState<User[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [newTeamName, setNewTeamName] = useState('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [message, setMessage] = useState('');
  const [teamProjectSelections, setTeamProjectSelections] = useState<Record<string, string | null>>({});
  const [facultyGuide, setFacultyGuide] = useState<User | null>(null);

  // Project materials state
  const [projectMaterials, setProjectMaterials] = useState<ProjectMaterial[]>([]);
  const [newMaterialUrl, setNewMaterialUrl] = useState('');
  const [newMaterialTitle, setNewMaterialTitle] = useState('');
  const [isAddingMaterial, setIsAddingMaterial] = useState(false);

  // Feedback and schedule state
  const [teamFeedback, setTeamFeedback] = useState<Feedback[]>([]);
  const [reviewSchedules, setReviewSchedules] = useState<ReviewSchedule[]>([]);
  const [projectSearch, setProjectSearch] = useState('');

  // Fetch users from Firestore with real-time updates
  useEffect(() => {
    console.log('🔄 Setting up real-time listener for users...');

    const unsubscribe = onSnapshot(
      collection(db, 'users'),
      (snapshot) => {
        console.log('📡 Users updated, processing changes...');
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
            teamId: data.teamId || undefined,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          });
        });

        console.log(`✅ Received ${firebaseUsers.length} users from Firestore`);
        const localUsers = getUsers();
        const userMap = new Map<string, User>();
        localUsers.forEach(u => userMap.set(u.id, u));
        firebaseUsers.forEach(u => userMap.set(u.id, u));
        const allUsers = Array.from(userMap.values());

        setUsers(allUsers);
        requestNotificationPermission();
      },
      (error) => {
        console.error('❌ Error listening to users:', error);
        const localUsers = getUsers();
        setUsers(localUsers);
      }
    );

    return () => {
      console.log('🔌 Unsubscribing from users listener');
      unsubscribe();
    };
  }, []);

  // Fetch projects from Firestore with real-time updates
  useEffect(() => {
    console.log('🔄 Setting up real-time listener for projects...');

    const unsubscribe = onSnapshot(
      collection(db, 'projects'),
      (snapshot) => {
        console.log('📡 Projects updated, processing changes...');
        const updatedProjects: Project[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          updatedProjects.push({
            id: doc.id,
            title: data.title || '',
            description: data.description || '',
            specialization: data.specialization || '',
            isAssigned: data.isAssigned || false,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          });
        });

        console.log(`✅ Received ${updatedProjects.length} projects from Firestore`);
        setProjects(updatedProjects);
      },
      (error) => {
        console.error('❌ Error listening to projects:', error);
        setProjects([]);
      }
    );

    return () => {
      console.log('🔌 Unsubscribing from projects listener');
      unsubscribe();
    };
  }, []);

  // Real-time listener for teams collection
  useEffect(() => {
    if (!user?.id) return;

    console.log('🔄 Setting up real-time listener for teams...');

    const unsubscribe = onSnapshot(
      collection(db, 'teams'),
      (snapshot) => {
        console.log('📡 Teams updated, processing changes...');
        const updatedTeams: Team[] = [];

        snapshot.forEach((doc) => {
          const data = doc.data();
          updatedTeams.push({
            id: doc.id,
            name: data.name || '',
            teamNumber: data.teamNumber || '',
            members: data.members || [],
            leaderId: data.leaderId || '',
            status: data.status || 'forming',
            invites: data.invites || [],
            projectId: data.projectId || undefined,
            guideId: data.guideId || undefined,
            reviewerId: data.reviewerId || undefined,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          });
        });

        console.log(`✅ Received ${updatedTeams.length} teams from Firestore`);
        setTeams(updatedTeams);

        const userTeam = updatedTeams.find(team =>
          team.members.includes(user.id) || team.leaderId === user.id
        );

        if (userTeam) {
          console.log(`👥 User is in team: ${userTeam.name} with ${userTeam.members.length} members`);
          setMyTeam(userTeam);
        } else {
          console.log('👤 User is not in any team');
          setMyTeam(null);
          setTeamMembers([]);
        }

        updateTeams(updatedTeams);
      },
      (error) => {
        console.error('❌ Error listening to teams:', error);
        setTeams([]);
        setMyTeam(null);
      }
    );

    return () => {
      console.log('🔌 Unsubscribing from teams listener');
      unsubscribe();
    };
  }, [user?.id]);

  // Fetch team members details when myTeam or users change
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!myTeam || !myTeam.members || myTeam.members.length === 0) {
        setTeamMembers([]);
        return;
      }

      console.log(`👥 Fetching details for ${myTeam.members.length} team members...`);
      const memberDetails: User[] = [];

      for (const memberId of myTeam.members) {
        let member = users.find(u => u.id === memberId);

        if (!member) {
          try {
            console.log(`🔍 Fetching member ${memberId} from Firestore...`);
            const memberDoc = await getDoc(doc(db, 'users', memberId));
            if (memberDoc.exists()) {
              const data = memberDoc.data();
              member = {
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
              };
              console.log(`✅ Found member: ${member.name}`);
            } else {
              console.warn(`⚠️ Member ${memberId} not found in Firestore`);
            }
          } catch (error) {
            console.error(`❌ Error fetching member ${memberId}:`, error);
          }
        }

        if (member) {
          memberDetails.push(member);
        }
      }

      console.log(`✅ Loaded ${memberDetails.length} team members`);
      setTeamMembers(memberDetails);
    };

    fetchTeamMembers();
  }, [myTeam, users]);

  // Fetch team project selections when team changes
  useEffect(() => {
    const fetchProjectSelections = async () => {
      if (!myTeam) {
        setTeamProjectSelections({});
        return;
      }

      try {
        const selections = await getTeamProjectSelections(myTeam.id);
        setTeamProjectSelections(selections);
      } catch (error) {
        console.error('Failed to fetch project selections:', error);
      }
    };

    fetchProjectSelections();

    const interval = setInterval(fetchProjectSelections, 5000);
    return () => clearInterval(interval);
  }, [myTeam]);

  // Fetch faculty guide details when guideId is present
  useEffect(() => {
    const fetchFacultyGuide = async () => {
      if (!myTeam?.guideId) {
        setFacultyGuide(null);
        return;
      }

      try {
        let guide = users.find(u => u.id === myTeam.guideId && u.role === 'faculty');

        if (!guide) {
          console.log(`🔍 Fetching faculty guide ${myTeam.guideId} from Firestore...`);
          const guideDoc = await getDoc(doc(db, 'users', myTeam.guideId));
          if (guideDoc.exists()) {
            const data = guideDoc.data();
            guide = {
              id: guideDoc.id,
              email: data.email || '',
              rollNo: data.rollNo || '',
              name: data.name || 'Unknown',
              role: data.role || 'faculty',
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
            };
            console.log(`✅ Found faculty guide: ${guide.name}`);
          } else {
            console.warn(`⚠️ Faculty guide ${myTeam.guideId} not found in Firestore`);
          }
        }

        setFacultyGuide(guide || null);
      } catch (error) {
        console.error(`❌ Error fetching faculty guide:`, error);
        setFacultyGuide(null);
      }
    };

    fetchFacultyGuide();
  }, [myTeam?.guideId, users]);

  // Fetch project materials, feedback, and schedules
  useEffect(() => {
    const fetchTeamData = async () => {
      if (!myTeam?.id) {
        setProjectMaterials([]);
        setTeamFeedback([]);
        setReviewSchedules([]);
        return;
      }

      try {
        const teamDoc = await getDoc(doc(db, 'teams', myTeam.id));
        if (teamDoc.exists()) {
          const data = teamDoc.data();

          // Parse project materials
          const materials = (data.projectMaterials || []).map((m: any) => ({
            ...m,
            addedAt: m.addedAt?.toDate ? m.addedAt.toDate() : new Date(m.addedAt)
          }));
          setProjectMaterials(materials);

          // Parse feedback
          const feedback = (data.feedback || []).map((f: any) => ({
            ...f,
            addedAt: f.addedAt?.toDate ? f.addedAt.toDate() : new Date(f.addedAt)
          }));
          setTeamFeedback(feedback);

          // Parse review schedules
          const schedules = (data.reviewSchedules || []).map((s: any) => ({
            ...s,
            date: s.date?.toDate ? s.date.toDate() : new Date(s.date),
            addedAt: s.addedAt?.toDate ? s.addedAt.toDate() : new Date(s.addedAt)
          }));
          setReviewSchedules(schedules);
        }
      } catch (error) {
        console.error('Failed to fetch team data:', error);
      }
    };

    fetchTeamData();

    // Real-time listener for team data
    if (myTeam?.id) {
      const unsubscribe = onSnapshot(
        doc(db, 'teams', myTeam.id),
        (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();

            const materials = (data.projectMaterials || []).map((m: any) => ({
              ...m,
              addedAt: m.addedAt?.toDate ? m.addedAt.toDate() : new Date(m.addedAt)
            }));
            setProjectMaterials(materials);

            const feedback = (data.feedback || []).map((f: any) => ({
              ...f,
              addedAt: f.addedAt?.toDate ? f.addedAt.toDate() : new Date(f.addedAt)
            }));
            setTeamFeedback(feedback);

            const schedules = (data.reviewSchedules || []).map((s: any) => ({
              ...s,
              date: s.date?.toDate ? s.date.toDate() : new Date(s.date),
              addedAt: s.addedAt?.toDate ? s.addedAt.toDate() : new Date(s.addedAt)
            }));
            setReviewSchedules(schedules);
          }
        }
      );

      return () => unsubscribe();
    }
  }, [myTeam?.id]);

  const detectLinkType = (url: string): 'github' | 'drive' | 'other' => {
    if (url.includes('github.com')) return 'github';
    if (url.includes('drive.google.com') || url.includes('docs.google.com')) return 'drive';
    return 'other';
  };

  const handleAddMaterial = async () => {
    if (!newMaterialUrl || !newMaterialTitle || !myTeam || !user) return;

    try {
      setIsAddingMaterial(true);

      // Validate URL
      try {
        new URL(newMaterialUrl);
      } catch {
        setMessage('❌ Please enter a valid URL');
        setTimeout(() => setMessage(''), 3000);
        return;
      }

      const material: ProjectMaterial = {
        id: `mat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        url: newMaterialUrl,
        title: newMaterialTitle,
        type: detectLinkType(newMaterialUrl),
        addedBy: user.id,
        addedByName: user.name,
        addedAt: new Date()
      };

      const teamRef = doc(db, 'teams', myTeam.id);
      await updateDoc(teamRef, {
        projectMaterials: arrayUnion({
          ...material,
          addedAt: Timestamp.fromDate(material.addedAt)
        })
      });

      setNewMaterialUrl('');
      setNewMaterialTitle('');
      setMessage('✅ Project material added successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to add material:', error);
      setMessage('❌ Failed to add project material. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    } finally {
      setIsAddingMaterial(false);
    }
  };

  const handleDeleteMaterial = async (materialId: string) => {
    if (!myTeam || !user) return;

    const material = projectMaterials.find(m => m.id === materialId);
    if (!material) return;

    // Only allow deletion by the person who added it or team leader
    if (material.addedBy !== user.id && myTeam.leaderId !== user.id) {
      setMessage('❌ Only the person who added this link or the team leader can delete it.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    try {
      const teamRef = doc(db, 'teams', myTeam.id);
      await updateDoc(teamRef, {
        projectMaterials: arrayRemove({
          ...material,
          addedAt: Timestamp.fromDate(material.addedAt)
        })
      });

      setMessage('✅ Project material deleted successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to delete material:', error);
      setMessage('❌ Failed to delete project material. Please try again.');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleCreateTeam = async () => {
    if (!newTeamName || !user) return;

    let teamNumber = `T${Date.now().toString().slice(-6)}`;

    if (user.rollNo) {
      const rollNo = user.rollNo.toUpperCase();
      const deptMatch = rollNo.match(/[A-Z]{3,4}/);

      if (deptMatch) {
        const deptCode = deptMatch;
        const timestamp = Date.now().toString().slice(-4);
        teamNumber = `${deptCode}-${timestamp}`;
      }
    }

    try {
      const teamData = {
        name: newTeamName,
        teamNumber,
        members: [user.id],
        leaderId: user.id,
        status: 'forming' as const,
        invites: [],
        createdAt: new Date()
      };

      const teamId = await createTeamInFirestore(teamData);
      await updateUserTeamId(user.id, teamId);

      setNewTeamName('');
      setMessage(`Team created successfully! Team ID: ${teamNumber}`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Failed to create team:', error);
      setMessage('Failed to create team. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const handleSelectProject = async () => {
    if (!selectedProject || !myTeam || !user) return;

    try {
      console.log(`📤 Submitting project selection: ${selectedProject} for team ${myTeam.id}`);

      await updateUserProjectSelection(user.id, selectedProject);
      console.log(`✅ User ${user.id} project selection saved to Firestore`);

      const updatedSelections = await getTeamProjectSelections(myTeam.id);
      setTeamProjectSelections(updatedSelections);

      const consensus = await checkTeamProjectConsensus(myTeam.id);

      if (consensus.hasConsensus && consensus.projectId) {
        console.log(`🎯 Team consensus reached! All 4 members selected project: ${consensus.projectId}`);

        const projectDoc = await getDoc(doc(db, 'projects', consensus.projectId));
        if (projectDoc.exists()) {
          const projectData = projectDoc.data();

          if (projectData.isAssigned && projectData.guideId) {
            setMessage(`⚠️ This project has already been assigned to another team. Please select a different project.`);
            setTimeout(() => setMessage(''), 8000);
            return;
          }
        }

        await updateTeamProject(myTeam.id, consensus.projectId);
        console.log(`✅ Project ${consensus.projectId} stored in teams collection for team ${myTeam.id}`);

        const assignmentResult = await autoAssignFacultyToTeam(myTeam.id, consensus.projectId);

        if (assignmentResult.success) {
          setMessage(`✅ Project submitted successfully! Faculty guide has been automatically assigned to your team.`);
          setSelectedProject('');
        } else {
          setMessage(`✅ Project submitted! ${assignmentResult.message}`);
        }
      } else {
        const selectedCount = Object.values(consensus.selections).filter(p => p !== null).length;
        const totalMembers = myTeam.members.length;

        if (selectedCount < totalMembers) {
          setMessage(`✅ Project selection submitted! Waiting for all team members to select the same project (${selectedCount}/${totalMembers} selected).`);
        } else {
          setMessage(`⚠️ All members have selected projects, but they don't match. Please coordinate with your team to select the same project.`);
        }
      }

      setTimeout(() => setMessage(''), 8000);
    } catch (error) {
      console.error('❌ Failed to submit project selection:', error);
      setMessage('Failed to submit project selection. Please try again.');
      setTimeout(() => setMessage(''), 5000);
    }
  };

  const availableProjects = projects.filter(p => !p.isAssigned);
  const myProject = myTeam?.projectId ? projects.find(p => p.id === myTeam.projectId) : null;
  const teamCapacity = myTeam ? getTeamCapacity(myTeam) : null;
  const teamLeader = teamMembers.find(m => m.id === myTeam?.leaderId);

  const getMaterialIcon = (type: string) => {
    switch (type) {
      case 'github':
        return <Github className="h-4 w-4" />;
      case 'drive':
        return <FolderOpen className="h-4 w-4" />;
      default:
        return <LinkIcon className="h-4 w-4" />;
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-0">
        <h1 className="text-2xl md:text-3xl font-bold">Student Dashboard</h1>
        <div className="flex flex-wrap items-center gap-2 md:space-x-4 w-full md:w-auto">
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
          <div className="text-sm text-muted-foreground whitespace-nowrap">Welcome, {user?.name}</div>
        </div>
      </div>

      {unreadCount > 0 && (
        <Alert className="bg-blue-50 border-blue-200 border-l-4">
          <Bell className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>You have {unreadCount} unread notification{unreadCount > 1 ? 's' : ''}!</strong> Check the Notifications tab to view them.
          </AlertDescription>
        </Alert>
      )}
      {message && (<Alert className={message.includes('successfully') || message.includes('sent to') || message.includes('✅') ? 'border-green-500 bg-green-50' : message.includes('❌') || message.includes('⚠️') ? 'border-red-500 bg-red-50' : ''}><AlertDescription>{message}</AlertDescription></Alert>)}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">My Team</CardTitle><Users className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{myTeam ? myTeam.name : 'No Team'}</div><p className="text-xs text-muted-foreground">{myTeam ? (<span className="flex items-center gap-2">{teamMembers.length}/3 members{teamCapacity?.isFull && (<Badge variant="secondary" className="text-xs">Full</Badge>)}</span>) : ('Create or join a team')}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Project Status</CardTitle><BookOpen className="h-4 w-4 text-muted-foreground" /></CardHeader><CardContent><div className="text-2xl font-bold">{myProject ? 'Assigned' : 'Not Selected'}</div><p className="text-xs text-muted-foreground">{myProject ? myProject.title : 'Select a project'}</p></CardContent></Card>
        <Card><CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Team Status</CardTitle><Badge variant="secondary">{myTeam?.status || 'No Team'}</Badge></CardHeader><CardContent><div className="text-2xl font-bold">{myTeam?.invites.filter(i => i.status === 'pending').length || 0}</div><p className="text-xs text-muted-foreground">Pending invites</p></CardContent></Card>
      </div>

      <Tabs defaultValue="team" className="w-full">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto py-2 no-scrollbar">
          <TabsTrigger value="team" className="whitespace-nowrap">Team Management</TabsTrigger>
          <TabsTrigger value="projects" className="whitespace-nowrap">Project Selection</TabsTrigger>
          <TabsTrigger value="materials" className="whitespace-nowrap">Project Materials</TabsTrigger>
          <TabsTrigger value="feedback" className="whitespace-nowrap">Feedback & Reviews</TabsTrigger>
          <TabsTrigger value="marks" className="whitespace-nowrap">My Marks</TabsTrigger>
          <TabsTrigger value="progress" className="whitespace-nowrap">Progress Tracking</TabsTrigger>
          <TabsTrigger value="email-progress" className="whitespace-nowrap">Email Progress</TabsTrigger>
          <TabsTrigger value="notifications" className="relative whitespace-nowrap">
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

        <TabsContent value="team" className="space-y-4">
          {!myTeam ? (<Card><CardHeader><CardTitle>Create a Team</CardTitle><CardDescription>Start by creating your capstone project team</CardDescription></CardHeader><CardContent className="space-y-4"><div><Label htmlFor="teamName">Team Name</Label><Input id="teamName" value={newTeamName} onChange={(e) => setNewTeamName(e.target.value)} placeholder="Enter team name" /></div><Button onClick={handleCreateTeam} disabled={!newTeamName}><Plus className="h-4 w-4 mr-2" />Create Team</Button></CardContent></Card>) : (<div className="space-y-4"><Card><CardHeader><CardTitle className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2"><span>{myTeam.name}</span>{teamCapacity?.isFull && (<Badge variant="secondary">Team Full</Badge>)}</CardTitle><CardDescription>Team Number: <strong>{myTeam.teamNumber || 'T' + myTeam.id.slice(-6)}</strong> | Team Leader: {teamLeader?.name || 'Loading...'}</CardDescription></CardHeader><CardContent><div className="space-y-4"><div><div className="flex items-center justify-between mb-2"><h4 className="font-semibold">Team Members</h4><span className="text-sm text-muted-foreground">{teamMembers.length}/{teamCapacity?.max}</span></div>{teamCapacity && teamCapacity.available === 0 && (<Alert className="mb-3"><AlertCircle className="h-4 w-4" /><AlertDescription>Your team is at maximum capacity. No more members can be added.</AlertDescription></Alert>)}<div className="space-y-2">{teamMembers.length === 0 ? (<div className="text-sm text-muted-foreground py-2">Loading team members...</div>) : teamMembers.map((member) => (<div key={member.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-3 border rounded-lg gap-3 md:gap-0"><div className="flex items-center space-x-3"><UserIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" /><div><div className="font-medium">{member.name}</div><div className="text-xs text-muted-foreground">{member.email}</div><div className="text-xs text-muted-foreground">Roll No: {member.rollNo}</div></div></div><div className="flex items-center space-x-2 w-full md:w-auto justify-end">{member.id === myTeam.leaderId && (<Badge variant="default">Leader</Badge>)}<Badge variant="outline">{member.role}</Badge></div></div>))}</div></div></div></CardContent></Card><InvitationManager team={myTeam} users={users} onInvitationSent={() => { setMessage('Invitation sent successfully!'); setTimeout(() => setMessage(''), 3000); }} /></div>)}
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Available Projects</CardTitle>
              <CardDescription>
                {myProject
                  ? `Current Project: ${myProject.title}`
                  : teamCapacity?.isFull
                    ? 'Select a project for your team. All 4 members must select the same project to proceed.'
                    : 'Select a project for your team'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!myTeam ? (
                <Alert>
                  <AlertDescription>You need to create or join a team before selecting a project.</AlertDescription>
                </Alert>
              ) : myProject ? (
                <div className="space-y-4">
                  <div className="p-4 border rounded-lg bg-green-50">
                    <h3 className="font-semibold">{myProject.title}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{myProject.description}</p>
                    <Badge className="mt-2">{myProject.specialization}</Badge>
                    {myTeam.guideId && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium text-green-700">✅ Faculty guide assigned to your team</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : availableProjects.length === 0 ? (
                <Alert>
                  <AlertDescription>No projects available at the moment. Please check back later or contact your administrator.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-4">
                  <div className="mb-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search projects by title or description..."
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  {teamCapacity?.isFull && Object.keys(teamProjectSelections).length > 0 && (
                    <Card className="bg-blue-50">
                      <CardHeader>
                        <CardTitle className="text-sm">Team Project Selections</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {teamMembers.map((member) => {
                            const memberSelection = teamProjectSelections[member.id];
                            const selectedProjectTitle = memberSelection
                              ? projects.find(p => p.id === memberSelection)?.title
                              : 'Not selected';
                            return (
                              <div key={member.id} className="flex items-center justify-between text-sm">
                                <span className={member.id === user?.id ? 'font-semibold' : ''}>
                                  {member.name} {member.id === user?.id && '(You)'}
                                </span>
                                <Badge variant={memberSelection ? 'default' : 'outline'}>
                                  {selectedProjectTitle}
                                </Badge>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="grid gap-4">
                    {availableProjects
                      .filter(project =>
                        projectSearch === '' ||
                        project.title.toLowerCase().includes(projectSearch.toLowerCase()) ||
                        project.description.toLowerCase().includes(projectSearch.toLowerCase())
                      )
                      .map(project => (
                        <div key={project.id} className="space-y-3">
                          <div className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                            <div className="flex flex-col md:flex-row items-start justify-between gap-4 md:gap-0">
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold break-words">{project.title}</h3>
                                <p className="text-sm text-muted-foreground mt-1 break-words">{project.description}</p>
                                <Badge className="mt-2">{project.specialization}</Badge>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => setSelectedProject(project.id)}
                                variant={selectedProject === project.id ? "default" : "outline"}
                                className="w-full md:w-auto"
                              >
                                {selectedProject === project.id ? "Selected" : "Select"}
                              </Button>
                            </div>
                          </div>

                          {selectedProject === project.id && (
                            <div className="space-y-2 pl-4 pr-4">
                              <Button
                                onClick={handleSelectProject}
                                className="w-full"
                                size="lg"
                              >
                                Submit Project Selection
                              </Button>
                              <p className="text-xs text-center text-muted-foreground">
                                {teamCapacity?.isFull
                                  ? 'All 4 team members must submit the same project to proceed with faculty assignment.'
                                  : 'Your selection will be saved. Once your team is full, all members must select the same project.'}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="materials" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="h-5 w-5" />
                Project Materials
              </CardTitle>
              <CardDescription>
                Share GitHub repositories, Google Drive links, and other project resources with your team
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!myTeam ? (
                <Alert>
                  <AlertDescription>You need to create or join a team before adding project materials.</AlertDescription>
                </Alert>
              ) : (
                <div className="space-y-6">
                  {/* Add new material form */}
                  <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
                    <h4 className="font-semibold text-sm">Add New Material</h4>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="materialTitle">Title</Label>
                        <Input
                          id="materialTitle"
                          value={newMaterialTitle}
                          onChange={(e) => setNewMaterialTitle(e.target.value)}
                          placeholder="e.g., Main Repository, Design Docs, Project Presentation"
                        />
                      </div>
                      <div>
                        <Label htmlFor="materialUrl">URL</Label>
                        <Input
                          id="materialUrl"
                          type="url"
                          value={newMaterialUrl}
                          onChange={(e) => setNewMaterialUrl(e.target.value)}
                          placeholder="https://github.com/... or https://drive.google.com/..."
                        />
                      </div>
                      <Button
                        onClick={handleAddMaterial}
                        disabled={!newMaterialTitle || !newMaterialUrl || isAddingMaterial}
                        className="w-full"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        {isAddingMaterial ? 'Adding...' : 'Add Material'}
                      </Button>
                    </div>
                  </div>

                  {/* List of materials */}
                  <div className="space-y-3">
                    <h4 className="font-semibold text-sm">Team Materials ({projectMaterials.length})</h4>
                    {projectMaterials.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground border rounded-lg">
                        <LinkIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
                        <p>No project materials yet</p>
                        <p className="text-xs mt-1">Add your first link above to get started</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {projectMaterials.map((material) => (
                          <div
                            key={material.id}
                            className="flex flex-col md:flex-row items-start justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors gap-3 md:gap-0"
                          >
                            <div className="flex items-start gap-3 flex-1 min-w-0 w-full">
                              <div className="mt-1 flex-shrink-0">
                                {getMaterialIcon(material.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-1">
                                  <h5 className="font-semibold truncate max-w-[200px]">{material.title}</h5>
                                  <Badge variant="secondary" className="text-xs">
                                    {material.type}
                                  </Badge>
                                </div>
                                <a
                                  href={material.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline flex items-center gap-1 truncate max-w-full"
                                >
                                  <span className="truncate">{material.url}</span>
                                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                                </a>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Added by {material.addedByName} • {material.addedAt.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            {(material.addedBy === user?.id || myTeam.leaderId === user?.id) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteMaterial(material.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50 w-full md:w-auto mt-2 md:mt-0"
                              >
                                <Trash2 className="h-4 w-4 mr-2 md:mr-0" />
                                <span className="md:hidden">Delete</span>
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Helper tips */}
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Tips:</strong> Share your GitHub repositories, Google Drive folders, documentation, and any other links relevant to your project. All team members can add materials, but only the person who added a link or the team leader can delete it.
                    </AlertDescription>
                  </Alert>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="feedback" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Faculty Feedback Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Faculty Feedback
                </CardTitle>
                <CardDescription>
                  Feedback and suggestions from your faculty guide
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!myTeam ? (
                  <Alert>
                    <AlertDescription>Create or join a team to receive feedback.</AlertDescription>
                  </Alert>
                ) : teamFeedback.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No feedback yet</p>
                    <p className="text-xs mt-1">Your faculty guide will provide feedback here</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {teamFeedback
                      .sort((a, b) => b.addedAt.getTime() - a.addedAt.getTime())
                      .map((fb) => (
                        <div
                          key={fb.id}
                          className="p-4 border rounded-lg bg-blue-50 border-blue-200"
                        >
                          <div className="flex flex-col md:flex-row items-start justify-between mb-2 gap-2 md:gap-0">
                            <div className="flex items-center gap-2">
                              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                {fb.addedByName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{fb.addedByName}</p>
                                <p className="text-xs text-muted-foreground">
                                  {fb.type === 'guide' ? 'Faculty Guide' : 'Reviewer'}
                                </p>
                              </div>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {fb.addedAt.toLocaleDateString()} {fb.addedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap mt-3">{fb.content}</p>
                        </div>
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Review Schedule Section */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Review Schedule
                </CardTitle>
                <CardDescription>
                  Upcoming review meetings and deadlines
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!myTeam ? (
                  <Alert>
                    <AlertDescription>Create or join a team to view schedules.</AlertDescription>
                  </Alert>
                ) : reviewSchedules.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground border rounded-lg">
                    <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
                    <p>No reviews scheduled</p>
                    <p className="text-xs mt-1">Review meetings will appear here</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-[500px] overflow-y-auto">
                    {reviewSchedules
                      .sort((a, b) => a.date.getTime() - b.date.getTime())
                      .map((schedule) => {
                        const isPast = schedule.date < new Date();
                        const isToday = schedule.date.toDateString() === new Date().toDateString();

                        return (
                          <div
                            key={schedule.id}
                            className={`p-4 border rounded-lg ${schedule.status === 'completed'
                              ? 'bg-green-50 border-green-200'
                              : schedule.status === 'cancelled'
                                ? 'bg-gray-50 border-gray-300 opacity-60'
                                : isToday
                                  ? 'bg-orange-50 border-orange-300'
                                  : isPast
                                    ? 'bg-gray-50 border-gray-200'
                                    : 'bg-white border-gray-200'
                              }`}
                          >
                            <div className="flex flex-col md:flex-row items-start justify-between mb-2 gap-2 md:gap-0">
                              <h4 className="font-semibold text-sm">{schedule.title}</h4>
                              <Badge
                                variant={
                                  schedule.status === 'completed'
                                    ? 'default'
                                    : schedule.status === 'cancelled'
                                      ? 'secondary'
                                      : isToday
                                        ? 'destructive'
                                        : 'outline'
                                }
                                className="text-xs"
                              >
                                {schedule.status === 'completed'
                                  ? 'Completed'
                                  : schedule.status === 'cancelled'
                                    ? 'Cancelled'
                                    : isToday
                                      ? 'Today'
                                      : isPast
                                        ? 'Past'
                                        : 'Upcoming'}
                              </Badge>
                            </div>

                            {schedule.description && (
                              <p className="text-sm text-muted-foreground mb-3">
                                {schedule.description}
                              </p>
                            )}

                            <div className="space-y-2">
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">
                                  {schedule.date.toLocaleDateString('en-US', {
                                    weekday: 'long',
                                    year: 'numeric',
                                    month: 'long',
                                    day: 'numeric'
                                  })}
                                </span>
                              </div>

                              {schedule.time && (
                                <div className="flex items-center gap-2 text-sm">
                                  <Clock className="h-4 w-4 text-muted-foreground" />
                                  <span>{schedule.time}</span>
                                </div>
                              )}

                              {schedule.location && (
                                <div className="flex items-center gap-2 text-sm">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <span>{schedule.location}</span>
                                </div>
                              )}

                              <div className="pt-2 border-t mt-2">
                                <p className="text-xs text-muted-foreground">
                                  Scheduled by {schedule.addedByName}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Summary Cards */}
          {myTeam && (teamFeedback.length > 0 || reviewSchedules.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Total Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{teamFeedback.length}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {teamFeedback.filter(f => f.type === 'guide').length} from guide, {teamFeedback.filter(f => f.type === 'reviewer').length} from reviewer
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Upcoming Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {reviewSchedules.filter(s => s.date >= new Date() && s.status === 'scheduled').length}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {reviewSchedules.filter(s => s.status === 'completed').length} completed
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Next Review</CardTitle>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const nextReview = reviewSchedules
                      .filter(s => s.date >= new Date() && s.status === 'scheduled')
                      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];

                    return nextReview ? (
                      <>
                        <div className="text-lg font-bold">
                          {nextReview.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {nextReview.title}
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="text-lg font-bold text-muted-foreground">-</div>
                        <p className="text-xs text-muted-foreground mt-1">No upcoming reviews</p>
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="marks" className="space-y-4">
          <MarksTab myTeam={myTeam} user={user} />
        </TabsContent>

        <TabsContent value="progress" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Progress Tracking</CardTitle>
              <CardDescription>Monitor your project progress and milestones</CardDescription>
            </CardHeader>
            <CardContent>
              {!myProject ? (
                <Alert>
                  <AlertDescription>Select a project to start tracking progress.</AlertDescription>
                </Alert>
              ) : !myTeam?.guideId ? (
                <div className="space-y-4">
                  <div className="text-center py-8 text-muted-foreground">
                    Waiting for faculty guide assignment. Once assigned, you'll see your guide's details here.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {facultyGuide ? (
                    <Card className="bg-blue-50 border-blue-200">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <GraduationCap className="h-5 w-5 text-blue-600" />
                          Faculty Guide Details
                        </CardTitle>
                        <CardDescription>Your assigned faculty guide for this project</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="flex-1 space-y-3">
                              <div>
                                <h3 className="font-semibold text-lg">
                                  {facultyGuide.title && `${facultyGuide.title} `}
                                  {facultyGuide.name}
                                </h3>
                                {facultyGuide.designation && (
                                  <p className="text-sm text-muted-foreground">{facultyGuide.designation}</p>
                                )}
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {facultyGuide.email && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Email:</span>
                                    <span className="font-medium">{facultyGuide.email}</span>
                                  </div>
                                )}

                                {facultyGuide.contactNumber && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Contact:</span>
                                    <span className="font-medium">{facultyGuide.contactNumber}</span>
                                  </div>
                                )}

                                {facultyGuide.specialization && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Specialization:</span>
                                    <Badge variant="outline">{facultyGuide.specialization}</Badge>
                                  </div>
                                )}

                                {facultyGuide.employeeId && (
                                  <div className="flex items-center gap-2 text-sm">
                                    <UserIcon className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">Employee ID:</span>
                                    <span className="font-medium">{facultyGuide.employeeId}</span>
                                  </div>
                                )}
                              </div>

                              {facultyGuide.school && (
                                <div className="pt-2 border-t">
                                  <p className="text-sm">
                                    <span className="text-muted-foreground">School/Department: </span>
                                    <span className="font-medium">{facultyGuide.school}</span>
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Alert>
                      <AlertDescription>Loading faculty guide details...</AlertDescription>
                    </Alert>
                  )}

                  {myProject && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Project Information</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div>
                            <h3 className="font-semibold">{myProject.title}</h3>
                            <p className="text-sm text-muted-foreground mt-1">{myProject.description}</p>
                            <Badge className="mt-2">{myProject.specialization}</Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Card>
                    <CardHeader>
                      <CardTitle>Project Milestones</CardTitle>
                      <CardDescription>Track your project progress and milestones</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-8 text-muted-foreground">
                        Progress tracking features will be available soon. You can communicate with your faculty guide using the contact information above.
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email-progress" className="space-y-4">{myTeam ? (<EmailProgressDashboard teamId={myTeam.id} teamName={myTeam.name} teamNumber={myTeam.teamNumber || 'T' + myTeam.id.slice(-6)} />) : (<Card><CardContent className="text-center py-8"><Mail className="h-12 w-12 mx-auto mb-4 opacity-50" /><p>Create a team to track email progress</p></CardContent></Card>)}</TabsContent>

        <TabsContent value="notifications" className="space-y-4"><NotificationDisplay /></TabsContent>

        <TabsContent value="email" className="space-y-4"><EmailSetupStatus /><EmailDiagnostics /></TabsContent>
      </Tabs>
    </div>
  );
};