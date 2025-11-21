import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useInvitations } from '@/hooks/useInvitations';
import { useAuth } from '@/contexts/AuthContext';
import { User, Team } from '@/types/user';
import { Mail, UserPlus, Check, X, Clock, Users, Copy, Info } from 'lucide-react';
import { toast } from 'sonner';
import { TeamMembersDisplay } from './TeamMembersDisplay';
import { EmailProgressTracker } from '@/components/email/EmailProgressTracker';
import { InvitationSummary } from './InvitationSummary';

interface InvitationManagerProps {
    team: Team;
    users: User[];
    onInvitationSent?: () => void;
}

export const InvitationManager: React.FC<InvitationManagerProps> = ({
    team,
    users,
    onInvitationSent
}) => {
    const { user } = useAuth();
    const {
        teamInvitations,
        userInvitations,
        isLoading,
        error,
        sendInvitation,
        acceptInvitation,
        rejectInvitation,
        cancelInvitation,
        loadTeamInvitations
    } = useInvitations();

    const [inviteEmail, setInviteEmail] = useState('');
    const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [trackingInvitations, setTrackingInvitations] = useState<{ [key: string]: boolean }>({});

    // Load team invitations when component mounts or team changes
    useEffect(() => {
        if (team?.id) {
            loadTeamInvitations(team.id);
        }
    }, [team?.id, loadTeamInvitations]);

    const handleSendInvitation = async () => {
        if (!inviteEmail || !team || !user) return;

        // Trim and normalize email
        const normalizedEmail = inviteEmail.trim().toLowerCase();

        // Check if user exists in the system
        let invitedUser = users.find(u =>
            u.email.toLowerCase() === normalizedEmail && u.role === 'student'
        );

        // If user doesn't exist, we'll still send the invitation with email-only
        // Extract name from email if user not found (e.g., "john.doe@email.com" -> "John Doe")
        let invitedUserName = invitedUser?.name || '';
        let invitedUserId = invitedUser?.id || '';

        if (!invitedUser) {
            // Generate a name from email (e.g., "john.doe@email.com" -> "John Doe")
            const emailParts = normalizedEmail.split('@')[0];
            const nameParts = emailParts.split(/[._-]/);
            invitedUserName = nameParts
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ') || 'Student';

            // Create a temporary ID based on email for tracking
            invitedUserId = `email_${normalizedEmail.replace(/[^a-z0-9]/g, '_')}`;

            console.log('📧 User not found in system, sending email-only invitation to:', normalizedEmail);
        } else {
            // Check if user is already a team member
            if (team.members.includes(invitedUser.id)) {
                toast.error('User is already a team member');
                return;
            }
        }

        // Use existing team number or generate new one based on roll number
        let teamNumber = team.teamNumber;

        if (!teamNumber && user.rollNo) {
            // Generate team number based on team leader's roll number
            const rollNo = user.rollNo.toUpperCase();
            const deptMatch = rollNo.match(/[A-Z]{3,4}/);

            if (deptMatch) {
                const deptCode = deptMatch[0]; // e.g., CIT, CSD, CSE
                const timestamp = Date.now().toString().slice(-4);
                teamNumber = `${deptCode}-${timestamp}`;
            } else {
                teamNumber = `T${Date.now().toString().slice(-6)}`; // Fallback
            }
        } else if (!teamNumber) {
            teamNumber = `T${Date.now().toString().slice(-6)}`; // Fallback
        }

        const invitationData = {
            teamId: team.id,
            invitedUserId: invitedUserId,
            inviterId: user.id,
            teamName: team.name,
            inviterName: user.name,
            invitedUserName: invitedUserName,
            invitedUserEmail: normalizedEmail,
            teamLeaderEmail: user.email,
            teamLeaderRollNo: user.rollNo,
            teamNumber
        };

        console.log('📤 ===== SENDING INVITATION =====');
        console.log('📤 Invitation Data:', {
            teamId: invitationData.teamId,
            invitedUserEmail: invitationData.invitedUserEmail,
            invitedUserName: invitationData.invitedUserName,
            inviterName: invitationData.inviterName,
            teamName: invitationData.teamName,
            teamNumber: invitationData.teamNumber
        });

        const result = await sendInvitation(invitationData);

        console.log('📤 Invitation Result:', result);

        if (result.success) {
            // Show detailed success message
            const successMessage = invitedUser
                ? `✅ Invitation sent successfully! Email has been sent to ${invitedUser.name}`
                : `✅ Invitation sent successfully! Email has been sent to ${normalizedEmail}. The student will receive an invitation email and can register to accept.`;
            toast.success(successMessage, { duration: 5000 });

            // Copy invitation link to clipboard for manual sharing
            const invitationLink = `${window.location.origin}/invitation/${team.id}/${result.invitationId}`;
            try {
                await navigator.clipboard.writeText(invitationLink);
                toast.info('📋 Invitation link copied to clipboard for manual sharing!', { duration: 4000 });
            } catch (clipError) {
                console.warn('Could not copy to clipboard:', clipError);
            }

            setInviteEmail('');
            setIsInviteDialogOpen(false);

            // Start tracking this invitation only if it was actually sent
            if (result.success && result.invitationId) {
                setTrackingInvitations(prev => ({
                    ...prev,
                    [result.invitationId!]: true
                }));
            }

            // Reload team invitations to show in the sent invitations list
            await loadTeamInvitations(team.id);

            onInvitationSent?.();
        } else {
            toast.error(result.message);
        }
    };

    const handleAcceptInvitation = async (invitationId: string) => {
        const result = await acceptInvitation(invitationId);

        if (result.success) {
            toast.success('Invitation accepted! You are now a member of the team.');
        } else {
            toast.error(result.message);
        }
    };

    const handleRejectInvitation = async (invitationId: string) => {
        const result = await rejectInvitation(invitationId);

        if (result.success) {
            toast.success('Invitation rejected');
        } else {
            toast.error(result.message);
        }
    };

    const handleCancelInvitation = async (invitationId: string) => {
        const result = await cancelInvitation(invitationId, team.id);

        if (result.success) {
            toast.success('Invitation cancelled');
        } else {
            toast.error(result.message);
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending':
                return <Clock className="h-4 w-4 text-yellow-500" />;
            case 'accepted':
                return <Check className="h-4 w-4 text-green-500" />;
            case 'rejected':
                return <X className="h-4 w-4 text-red-500" />;
            default:
                return <Clock className="h-4 w-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'accepted':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const isTeamLeader = team?.leaderId === user?.id;
    const pendingInvitations = teamInvitations.filter(inv => inv.status === 'pending');
    const myPendingInvitations = userInvitations.filter(inv => inv.status === 'pending');

    // Debug logging
    console.log('📄 InvitationManager - Team Invitations:', {
        teamId: team?.id,
        teamInvitationsCount: teamInvitations.length,
        teamInvitations: teamInvitations,
        isLoading,
        error
    });

    return (
        <div className="space-y-6">
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {/* Email Setup Information */}
            {isTeamLeader && (
                <Alert className="bg-green-50 border-green-200">
                    <Mail className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                        <strong>✅ Automatic Email Invitations Enabled:</strong> When you send an invitation, an email is automatically sent to the student with all team details and an invitation link.
                        The invitation will also appear in the "Sent Invitations" tab below.
                    </AlertDescription>
                </Alert>
            )}

            {/* Team Members Display */}
            <TeamMembersDisplay
                team={team}
                users={users}
                currentUserId={user?.id}
            />

            <Tabs defaultValue="summary" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="summary">
                        <Info className="h-4 w-4 mr-2" />
                        Summary
                    </TabsTrigger>
                    <TabsTrigger value="sent">Sent Invitations</TabsTrigger>
                    <TabsTrigger value="received">Received Invitations</TabsTrigger>
                </TabsList>

                <TabsContent value="summary" className="space-y-4">
                    <InvitationSummary
                        invitations={teamInvitations}
                        title="Team Invitation Overview"
                        description="Complete summary of all invitations sent to potential team members"
                        emptyMessage="No invitations have been sent yet. Click 'Invite Member' to get started."
                    />
                </TabsContent>

                <TabsContent value="sent" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="flex items-center gap-2">
                                        <Users className="h-5 w-5" />
                                        Team Invitations
                                    </CardTitle>
                                    <CardDescription>
                                        Manage invitations sent to potential team members
                                    </CardDescription>
                                </div>
                                {isTeamLeader && (
                                    <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button>
                                                <UserPlus className="h-4 w-4 mr-2" />
                                                Invite Member
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>Invite Team Member</DialogTitle>
                                                <DialogDescription>
                                                    Send an invitation email to a student to join your team. The student doesn't need to be registered yet - they'll receive an email with an invitation link.
                                                </DialogDescription>
                                            </DialogHeader>
                                            <div className="space-y-4">
                                                <div>
                                                    <Label htmlFor="inviteEmail">Student Email</Label>
                                                    <Input
                                                        id="inviteEmail"
                                                        type="email"
                                                        value={inviteEmail}
                                                        onChange={(e) => setInviteEmail(e.target.value)}
                                                        placeholder="Enter student email (e.g., student.rollno@presidencyuniversity.in)"
                                                    />
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        An invitation email will be sent to this address. The student can register and accept the invitation.
                                                    </p>
                                                </div>
                                                <div className="flex justify-end space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        onClick={() => setIsInviteDialogOpen(false)}
                                                    >
                                                        Cancel
                                                    </Button>
                                                    <Button
                                                        onClick={handleSendInvitation}
                                                        disabled={!inviteEmail || isLoading}
                                                    >
                                                        {isLoading ? 'Sending...' : 'Send Invitation'}
                                                    </Button>
                                                </div>
                                            </div>
                                        </DialogContent>
                                    </Dialog>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent>
                            {teamInvitations.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No invitations sent yet</p>
                                    {isTeamLeader && (
                                        <p className="text-sm">Click "Invite Member" to send your first invitation</p>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {teamInvitations.map((invitation) => (
                                        <div key={invitation.id} className="space-y-3">
                                            {/* Invitation Info */}
                                            <div className="p-4 border-2 rounded-lg bg-card hover:shadow-md transition-shadow">
                                                <div className="flex flex-col md:flex-row items-start justify-between mb-3 gap-4 md:gap-0">
                                                    <div className="flex items-start space-x-3 flex-1 w-full">
                                                        {getStatusIcon(invitation.status)}
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-semibold text-lg truncate">{invitation.invitedUserName}</p>
                                                            <p className="text-sm text-muted-foreground flex items-center gap-2 truncate">
                                                                <Mail className="h-3 w-3 flex-shrink-0" />
                                                                <span className="truncate">{invitation.invitedUserEmail}</span>
                                                            </p>
                                                            <div className="flex flex-wrap gap-2 mt-2">
                                                                <Badge variant="outline" className="text-xs">
                                                                    Sent: {invitation.createdAt.toLocaleString()}
                                                                </Badge>
                                                                {invitation.teamNumber && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        Team #{invitation.teamNumber}
                                                                    </Badge>
                                                                )}
                                                                {invitation.inviterId && (
                                                                    <Badge variant="outline" className="text-xs">
                                                                        By: {invitation.inviterName}
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-start w-full md:w-auto gap-2 md:gap-2 mt-2 md:mt-0">
                                                        <Badge className={getStatusColor(invitation.status) + " text-xs font-semibold"}>
                                                            {invitation.status.toUpperCase()}
                                                        </Badge>
                                                        {invitation.status === 'pending' && isTeamLeader && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleCancelInvitation(invitation.id)}
                                                                disabled={isLoading}
                                                                className="text-red-600 hover:text-red-700"
                                                            >
                                                                <X className="h-4 w-4 mr-1" />
                                                                Cancel
                                                            </Button>
                                                        )}
                                                    </div>
                                                </div>


                                                {/* Status Details */}
                                                {invitation.status === 'pending' && (
                                                    <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                                                        <p className="text-sm text-yellow-800 flex items-center gap-2">
                                                            <Clock className="h-4 w-4 flex-shrink-0" />
                                                            <span className="font-medium">Waiting for response...</span>
                                                        </p>
                                                        <p className="text-xs text-yellow-700 mt-1">
                                                            The invitation email has been sent to <span className="break-all font-medium">{invitation.invitedUserEmail}</span>. They need to check their email and accept the invitation.
                                                        </p>
                                                    </div>
                                                )}

                                                {invitation.status === 'accepted' && (
                                                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                                                        <p className="text-sm text-green-800 flex items-center gap-2">
                                                            <Check className="h-4 w-4" />
                                                            <span className="font-medium">Accepted!</span>
                                                        </p>
                                                        <p className="text-xs text-green-700 mt-1">
                                                            {invitation.invitedUserName} has joined your team.
                                                        </p>
                                                    </div>
                                                )}

                                                {invitation.status === 'rejected' && (
                                                    <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                                                        <p className="text-sm text-red-800 flex items-center gap-2">
                                                            <X className="h-4 w-4" />
                                                            <span className="font-medium">Declined</span>
                                                        </p>
                                                        <p className="text-xs text-red-700 mt-1">
                                                            {invitation.invitedUserName} declined the invitation.
                                                        </p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* Email Progress Tracker */}
                                            {trackingInvitations[invitation.id] && invitation.status === 'pending' && (
                                                <EmailProgressTracker
                                                    invitationId={invitation.id}
                                                    teamName={team.name}
                                                    teamNumber={team.teamNumber || 'T' + team.id.slice(-6)}
                                                    recipientName={invitation.invitedUserName}
                                                    recipientEmail={invitation.invitedUserEmail}
                                                    onProgressComplete={(status) => {
                                                        setTrackingInvitations(prev => ({
                                                            ...prev,
                                                            [invitation.id]: false
                                                        }));

                                                        if (status === 'accepted') {
                                                            toast.success('🎉 Team member joined!');
                                                        } else {
                                                            toast.info('Invitation was declined');
                                                        }
                                                    }}
                                                />
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="received" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Mail className="h-5 w-5" />
                                My Invitations
                            </CardTitle>
                            <CardDescription>
                                Invitations you've received to join teams
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {myPendingInvitations.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                                    <p>No pending invitations</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {myPendingInvitations.map((invitation) => (
                                        <div
                                            key={invitation.id}
                                            className="p-4 border rounded-lg space-y-3"
                                        >
                                            <div className="flex flex-col md:flex-row items-start justify-between gap-2 md:gap-0">
                                                <div>
                                                    <p className="font-medium">Invitation to join {invitation.teamName}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        Invited by {invitation.inviterName}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        Received {invitation.createdAt.toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <Badge className={getStatusColor(invitation.status) + " mt-2 md:mt-0"}>
                                                    {invitation.status}
                                                </Badge>
                                            </div>
                                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2 pt-2">
                                                <Button
                                                    size="sm"
                                                    onClick={() => handleAcceptInvitation(invitation.id)}
                                                    disabled={isLoading}
                                                    className="w-full sm:w-auto"
                                                >
                                                    <Check className="h-4 w-4 mr-2" />
                                                    Accept
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => handleRejectInvitation(invitation.id)}
                                                    disabled={isLoading}
                                                    className="w-full sm:w-auto"
                                                >
                                                    <X className="h-4 w-4 mr-2" />
                                                    Reject
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};
