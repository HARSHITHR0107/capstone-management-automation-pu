import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, CheckCircle, XCircle, Clock, Copy, ExternalLink } from 'lucide-react';
import { InvitationWithDetails } from '@/lib/invitationService';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface InvitationSummaryProps {
    invitations: InvitationWithDetails[];
    title: string;
    description: string;
    emptyMessage?: string;
}

export const InvitationSummary: React.FC<InvitationSummaryProps> = ({
    invitations,
    title,
    description,
    emptyMessage = 'No invitations to display'
}) => {
    const copyInvitationLink = (invitationId: string, teamId: string) => {
        const link = `${window.location.origin}/invitation/${teamId}/${invitationId}`;
        navigator.clipboard.writeText(link).then(() => {
            toast.success('📋 Invitation link copied to clipboard!');
        }).catch(() => {
            toast.error('Failed to copy link');
        });
    };

    const getStatusStats = () => {
        const pending = invitations.filter(inv => inv.status === 'pending').length;
        const accepted = invitations.filter(inv => inv.status === 'accepted').length;
        const rejected = invitations.filter(inv => inv.status === 'rejected').length;
        return { pending, accepted, rejected };
    };

    const stats = getStatusStats();

    if (invitations.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>{title}</CardTitle>
                    <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8 text-muted-foreground">
                        <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>{emptyMessage}</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>

                {/* Stats Summary */}
                <div className="flex flex-wrap gap-3 mt-4">
                    {stats.pending > 0 && (
                        <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 whitespace-nowrap">
                            <Clock className="h-3 w-3 mr-1" />
                            {stats.pending} Pending
                        </Badge>
                    )}
                    {stats.accepted > 0 && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 whitespace-nowrap">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            {stats.accepted} Accepted
                        </Badge>
                    )}
                    {stats.rejected > 0 && (
                        <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200 whitespace-nowrap">
                            <XCircle className="h-3 w-3 mr-1" />
                            {stats.rejected} Rejected
                        </Badge>
                    )}
                </div>
            </CardHeader>
            <CardContent>
                <div className="space-y-3">
                    {invitations.map((invitation) => (
                        <div
                            key={invitation.id}
                            className="border-2 rounded-lg p-4 hover:shadow-md transition-all duration-200"
                            style={{
                                borderColor:
                                    invitation.status === 'accepted' ? '#22c55e' :
                                        invitation.status === 'rejected' ? '#ef4444' :
                                            '#eab308'
                            }}
                        >
                            {/* Header */}
                            <div className="flex flex-col md:flex-row items-start justify-between mb-3 gap-2 md:gap-0">
                                <div className="flex-1 min-w-0 w-full">
                                    <div className="flex items-center gap-2 mb-1">
                                        {invitation.status === 'pending' && <Clock className="h-4 w-4 text-yellow-500 flex-shrink-0" />}
                                        {invitation.status === 'accepted' && <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />}
                                        {invitation.status === 'rejected' && <XCircle className="h-4 w-4 text-red-500 flex-shrink-0" />}
                                        <h4 className="font-semibold text-lg truncate">{invitation.invitedUserName}</h4>
                                    </div>

                                    <div className="space-y-1 text-sm text-muted-foreground">
                                        <p className="flex items-center gap-2 truncate">
                                            <Mail className="h-3 w-3 flex-shrink-0" />
                                            <span className="font-medium truncate">{invitation.invitedUserEmail}</span>
                                        </p>
                                    </div>
                                </div>

                                <Badge
                                    className={
                                        (invitation.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                            invitation.status === 'accepted' ? 'bg-green-100 text-green-800' :
                                                'bg-red-100 text-red-800') + " mt-2 md:mt-0 self-start md:self-auto"
                                    }
                                >
                                    {invitation.status.toUpperCase()}
                                </Badge>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm mb-3">
                                <div>
                                    <span className="text-muted-foreground">Team:</span>
                                    <p className="font-medium truncate">{invitation.teamName}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Sent by:</span>
                                    <p className="font-medium truncate">{invitation.inviterName}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Date:</span>
                                    <p className="font-medium">{invitation.createdAt.toLocaleDateString()}</p>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Time:</span>
                                    <p className="font-medium">{invitation.createdAt.toLocaleTimeString()}</p>
                                </div>
                                {invitation.teamNumber && (
                                    <div className="md:col-span-2">
                                        <span className="text-muted-foreground">Team Number:</span>
                                        <p className="font-medium">#{invitation.teamNumber}</p>
                                    </div>
                                )}
                            </div>

                            {/* Status Message */}
                            {invitation.status === 'pending' && (
                                <Alert className="bg-yellow-50 border-yellow-200">
                                    <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                                    <AlertDescription className="text-yellow-800 min-w-0">
                                        <strong>Waiting for response</strong> - The invitation has been sent to <span className="break-all font-medium">{invitation.invitedUserEmail}</span>.
                                        They need to check their email and accept the invitation.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {invitation.status === 'accepted' && (
                                <Alert className="bg-green-50 border-green-200">
                                    <CheckCircle className="h-4 w-4 text-green-600" />
                                    <AlertDescription className="text-green-800">
                                        <strong>Accepted!</strong> {invitation.invitedUserName} has joined the team.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {invitation.status === 'rejected' && (
                                <Alert className="bg-red-50 border-red-200">
                                    <XCircle className="h-4 w-4 text-red-600" />
                                    <AlertDescription className="text-red-800">
                                        <strong>Declined</strong> - {invitation.invitedUserName} declined this invitation.
                                    </AlertDescription>
                                </Alert>
                            )}

                            {/* Actions */}
                            {invitation.status === 'pending' && (
                                <div className="flex flex-col sm:flex-row gap-2 mt-3">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => copyInvitationLink(invitation.id, invitation.teamId)}
                                        className="flex-1 w-full sm:w-auto"
                                    >
                                        <Copy className="h-4 w-4 mr-2" />
                                        Copy Link
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            const link = `${window.location.origin}/invitation/${invitation.teamId}/${invitation.id}`;
                                            window.open(link, '_blank');
                                        }}
                                        className="flex-1 w-full sm:w-auto"
                                    >
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Open Link
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
};
