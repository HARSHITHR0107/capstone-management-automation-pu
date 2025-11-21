import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { User, Users, Mail, GraduationCap } from 'lucide-react';
import { User as UserType, Team } from '@/types/user';

interface TeamMembersDisplayProps {
    team: Team;
    users: UserType[];
    currentUserId?: string;
}

export const TeamMembersDisplay: React.FC<TeamMembersDisplayProps> = ({
    team,
    users,
    currentUserId
}) => {
    const teamMembers = users.filter(user => team.members.includes(user.id));
    const teamLeader = users.find(user => user.id === team.leaderId);
    const isCurrentUserLeader = currentUserId === team.leaderId;

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Team Members
                </CardTitle>
                <CardDescription>
                    Team {team.teamNumber || 'T' + team.id.slice(-6)} • {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''}
                </CardDescription>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Team Leader */}
                    {teamLeader && (
                        <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                            <div className="flex items-start space-x-3">
                                <Avatar className="h-10 w-10 flex-shrink-0">
                                    <AvatarFallback className="bg-blue-100 text-blue-600">
                                        <User className="h-5 w-5" />
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex-1 min-w-0">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h4 className="font-semibold truncate">{teamLeader.name}</h4>
                                        <Badge variant="default" className="bg-blue-100 text-blue-800 whitespace-nowrap">
                                            Team Leader
                                        </Badge>
                                    </div>
                                    <div className="flex flex-col gap-1 text-sm text-muted-foreground mt-1">
                                        <span className="flex items-center gap-1 truncate">
                                            <Mail className="h-3 w-3 flex-shrink-0" />
                                            <span className="truncate">{teamLeader.email}</span>
                                        </span>
                                        {teamLeader.rollNo && (
                                            <span className="flex items-center gap-1">
                                                <GraduationCap className="h-3 w-3 flex-shrink-0" />
                                                {teamLeader.rollNo}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Team Members */}
                    {teamMembers
                        .filter(member => member.id !== team.leaderId)
                        .map((member) => (
                            <div key={member.id} className="border rounded-lg p-4">
                                <div className="flex items-start space-x-3">
                                    <Avatar className="h-10 w-10 flex-shrink-0">
                                        <AvatarFallback className="bg-green-100 text-green-600">
                                            <User className="h-5 w-5" />
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <h4 className="font-semibold truncate">{member.name}</h4>
                                            {member.id === currentUserId && (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 whitespace-nowrap">
                                                    You
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex flex-col gap-1 text-sm text-muted-foreground mt-1">
                                            <span className="flex items-center gap-1 truncate">
                                                <Mail className="h-3 w-3 flex-shrink-0" />
                                                <span className="truncate">{member.email}</span>
                                            </span>
                                            {member.rollNo && (
                                                <span className="flex items-center gap-1">
                                                    <GraduationCap className="h-3 w-3 flex-shrink-0" />
                                                    {member.rollNo}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}

                    {/* Empty state */}
                    {teamMembers.length === 1 && (
                        <div className="text-center py-8 text-muted-foreground">
                            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p>No other team members yet</p>
                            {isCurrentUserLeader && (
                                <p className="text-sm">Invite students to join your team</p>
                            )}
                        </div>
                    )}
                </div>

                {/* Team Stats */}
                <div className="mt-6 pt-4 border-t">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-muted-foreground">Total Members:</span>
                            <span className="ml-2 font-semibold">{teamMembers.length}</span>
                        </div>
                        <div>
                            <span className="text-muted-foreground">Team Number:</span>
                            <span className="ml-2 font-semibold">{team.teamNumber || 'T' + team.id.slice(-6)}</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};








