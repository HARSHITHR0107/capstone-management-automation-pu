import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useInvitations } from '@/hooks/useInvitations';
import { Check, X, Users, User, Mail, Phone, IdCard } from 'lucide-react';
import { toast } from 'sonner';

const InvitationPage: React.FC = () => {
    const { teamId, invitationId } = useParams<{ teamId: string; invitationId: string }>();
    const [searchParams] = useSearchParams();
    const action = searchParams.get('action'); // Get action from query params
    const { user } = useAuth();
    const { getInvitation, acceptInvitation, rejectInvitation } = useInvitations();
    const navigate = useNavigate();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [invitation, setInvitation] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showMemberDetails, setShowMemberDetails] = useState(false);
    const [actionExecuted, setActionExecuted] = useState(false); // Prevent infinite loops

    useEffect(() => {
        const loadInvitation = async () => {
            if (!invitationId) {
                setError('Invalid invitation link');
                setIsLoading(false);
                return;
            }

            // If user is not logged in, don't try to load invitation yet
            // The component will show login/signup prompt instead
            if (!user) {
                setIsLoading(false);
                return;
            }

            try {
                // Mark link as clicked when invitation page loads
                const { realTimeProgressService } = await import('@/lib/realTimeProgressService');
                realTimeProgressService.markLinkClicked(invitationId);

                const inv = await getInvitation(invitationId);
                if (inv) {
                    setInvitation(inv);
                } else {
                    setError('Invitation not found or has expired');
                }
            } catch (err) {
                setError('Failed to load invitation details');
                console.error('Error loading invitation:', err);
            } finally {
                setIsLoading(false);
            }
        };

        loadInvitation();
    }, [invitationId, getInvitation, user]);

    // Auto-execute action if provided in URL (only once)
    useEffect(() => {
        if (!invitation || !user || !action || isProcessing || actionExecuted) return;

        console.log('🎯 Auto-executing action:', action);
        setActionExecuted(true); // Mark as executed to prevent infinite loops

        if (action === 'accept') {
            handleAccept();
        } else if (action === 'reject') {
            handleReject();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [invitation, user, action, actionExecuted]);

    const handleAccept = async () => {
        if (!invitation || !user) return;

        setIsProcessing(true);
        try {
            const result = await acceptInvitation(invitation.id);

            if (result.success) {
                toast.success('🎉 Welcome to the team! You are now a team member.');

                // Show member details
                setShowMemberDetails(true);

                // Show additional success message
                setTimeout(() => {
                    toast.success('Team leader has been notified of your acceptance!');
                }, 1000);

                // Redirect to dashboard after showing details
                setTimeout(() => {
                    navigate('/dashboard');
                }, 4000);
            } else {
                toast.error(result.message);
                setIsProcessing(false);
            }
        } catch (err) {
            toast.error('Failed to accept invitation');
            console.error('Error accepting invitation:', err);
            setIsProcessing(false);
        }
    };

    const handleReject = async () => {
        if (!invitation || !user) return;

        setIsProcessing(true);
        try {
            const result = await rejectInvitation(invitation.id);

            if (result.success) {
                toast.success('Invitation declined');

                // Show additional message
                setTimeout(() => {
                    toast.info('Team leader has been notified of your decision');
                }, 1000);

                navigate('/dashboard');
            } else {
                toast.error(result.message);
            }
        } catch (err) {
            toast.error('Failed to reject invitation');
            console.error('Error rejecting invitation:', err);
        } finally {
            setIsProcessing(false);
        }
    };

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Loading invitation...</p>
                </div>
            </div>
        );
    }

    // IMPORTANT: Check if user is logged in FIRST before showing error
    // This prevents showing "Invalid Invitation" to users who just need to log in
    if (!user) {
        // Store invitation link to redirect back after login/signup
        const returnUrl = `/invitation/${teamId}/${invitationId}${action ? `?action=${action}` : ''}`;
        sessionStorage.setItem('returnUrl', returnUrl);

        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center">🎓 Team Invitation Received!</CardTitle>
                        <CardDescription className="text-center">
                            Please login or create an account to view and respond to this invitation
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <Alert className="bg-blue-50 border-blue-200">
                            <AlertDescription className="text-blue-800">
                                <strong>✅ Your invitation is valid and waiting for you!</strong>
                                <p className="mt-2">After you login or create an account, you'll be automatically redirected back to view the invitation details and can choose to accept or decline.</p>
                            </AlertDescription>
                        </Alert>
                        <div className="space-y-2">
                            <Button onClick={() => navigate('/login')} className="w-full" size="lg">
                                🔑 Login to Your Account
                            </Button>
                            <Button onClick={() => navigate('/signup')} variant="outline" className="w-full" size="lg">
                                🆕 Create New Account
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // NOW check for errors - user is logged in but invitation is invalid
    if (error || !invitation) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center text-red-600">Invalid Invitation</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <Alert variant="destructive">
                            <AlertDescription>{error || 'This invitation is not valid or has expired.'}</AlertDescription>
                        </Alert>
                        <Button onClick={() => navigate('/dashboard')} className="w-full">
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (invitation.status !== 'pending') {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-md">
                    <CardHeader>
                        <CardTitle className="text-center">
                            {invitation.status === 'accepted' ? '✅ Invitation Accepted' : '❌ Invitation Declined'}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="text-center space-y-4">
                        <Badge
                            className={
                                invitation.status === 'accepted'
                                    ? 'bg-green-100 text-green-800 text-lg py-2 px-4'
                                    : 'bg-red-100 text-red-800 text-lg py-2 px-4'
                            }
                        >
                            {invitation.status}
                        </Badge>
                        <p className="text-muted-foreground">
                            {invitation.status === 'accepted'
                                ? 'You have already accepted this invitation.'
                                : 'You have already declined this invitation.'}
                        </p>
                        <Button onClick={() => navigate('/dashboard')} className="w-full">
                            Go to Dashboard
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Show member details after acceptance
    if (showMemberDetails) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4">
                <Card className="w-full max-w-lg">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <div className="bg-green-100 p-4 rounded-full">
                                <Check className="h-12 w-12 text-green-600" />
                            </div>
                        </div>
                        <CardTitle className="text-2xl">🎉 Welcome to the Team!</CardTitle>
                        <CardDescription>You've successfully joined {invitation.teamName}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Alert className="bg-green-50 border-green-200">
                            <Check className="h-4 w-4 text-green-600" />
                            <AlertDescription className="text-green-800">
                                <strong>Success!</strong> The team leader has been notified of your acceptance.
                            </AlertDescription>
                        </Alert>

                        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border-2 border-blue-200">
                            <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                                <User className="h-5 w-5 text-blue-600" />
                                Your Member Details
                            </h3>
                            <div className="space-y-3">
                                <div className="flex items-start gap-3">
                                    <IdCard className="h-5 w-5 text-blue-600 mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Name</p>
                                        <p className="font-semibold text-lg">{user.name}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Mail className="h-5 w-5 text-blue-600 mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Email</p>
                                        <p className="font-semibold">{user.email}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <Users className="h-5 w-5 text-blue-600 mt-1" />
                                    <div>
                                        <p className="text-sm text-gray-600">Role</p>
                                        <p className="font-semibold capitalize">{user.role}</p>
                                    </div>
                                </div>
                                {user.rollNo && (
                                    <div className="flex items-start gap-3">
                                        <IdCard className="h-5 w-5 text-blue-600 mt-1" />
                                        <div>
                                            <p className="text-sm text-gray-600">Roll Number</p>
                                            <p className="font-semibold">{user.rollNo}</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                            <h4 className="font-semibold mb-2 text-purple-900">Team Information</h4>
                            <div className="space-y-2 text-sm">
                                <p><strong>Team:</strong> {invitation.teamName}</p>
                                <p><strong>Team Leader:</strong> {invitation.inviterName}</p>
                                {invitation.teamNumber && <p><strong>Team Number:</strong> {invitation.teamNumber}</p>}
                            </div>
                        </div>

                        <div className="text-center">
                            <p className="text-sm text-muted-foreground mb-3">
                                📤 Redirecting to dashboard in a few seconds...
                            </p>
                            <Button onClick={() => navigate('/dashboard')} className="w-full" size="lg">
                                🎯 Go to Dashboard Now
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <Card className="w-full max-w-lg">
                <CardHeader>
                    <CardTitle className="text-center flex items-center justify-center gap-2">
                        <Users className="h-6 w-6" />
                        Team Invitation
                    </CardTitle>
                    <CardDescription className="text-center">
                        You've been invited to join a capstone project team
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="text-center space-y-2">
                        <h3 className="text-xl font-semibold">{invitation.teamName}</h3>
                        <p className="text-muted-foreground">
                            Invited by <span className="font-medium">{invitation.inviterName}</span>
                        </p>
                        <p className="text-sm text-muted-foreground">
                            Invitation sent on {invitation.createdAt.toLocaleDateString()}
                        </p>
                    </div>

                    <div className="bg-muted p-4 rounded-lg space-y-2">
                        <div className="flex items-center gap-2">
                            <User className="h-4 w-4" />
                            <span className="font-medium">Your Details:</span>
                        </div>
                        <p className="text-sm">Name: {user.name}</p>
                        <p className="text-sm">Email: {user.email}</p>
                        <p className="text-sm">Role: {user.role}</p>
                    </div>

                    <Alert>
                        <AlertDescription>
                            By accepting this invitation, you will become a member of the team and will be able to
                            collaborate on the capstone project. Make sure you're available to work with this team
                            before accepting.
                        </AlertDescription>
                    </Alert>

                    <div className="flex space-x-3">
                        <Button
                            onClick={handleReject}
                            variant="outline"
                            className="flex-1"
                            disabled={isProcessing}
                        >
                            <X className="h-4 w-4 mr-2" />
                            {isProcessing ? 'Processing...' : 'Decline'}
                        </Button>
                        <Button
                            onClick={handleAccept}
                            className="flex-1"
                            disabled={isProcessing}
                        >
                            <Check className="h-4 w-4 mr-2" />
                            {isProcessing ? 'Processing...' : 'Accept'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default InvitationPage;
