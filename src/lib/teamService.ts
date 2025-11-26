/**
 * Team Service - Manages teams in Firestore
 * Handles team creation, updates, and member management
 */

import {
    collection,
    doc,
    addDoc,
    updateDoc,
    getDoc,
    getDocs,
    query,
    where,
    arrayUnion,
    arrayRemove,
    serverTimestamp
} from 'firebase/firestore';
import { db } from './firebase';
import { Team, TeamInvite } from '@/types/user';

/**
 * Constants
 */
const MAX_TEAM_SIZE = 3;
const MIN_TEAM_SIZE = 1;

/**
 * Validate team size before adding a member
 */
export const canAddMemberToTeam = async (teamId: string): Promise<{ canAdd: boolean; reason?: string }> => {
    try {
        const team = await getTeamFromFirestore(teamId);

        if (!team) {
            return { canAdd: false, reason: 'Team not found' };
        }

        if (team.members.length >= MAX_TEAM_SIZE) {
            return { canAdd: false, reason: `Team is full. Maximum team size is ${MAX_TEAM_SIZE} members.` };
        }

        return { canAdd: true };
    } catch (error) {
        console.error('Error checking team capacity:', error);
        return { canAdd: false, reason: 'Error checking team capacity' };
    }
};

/**
 * Get team capacity info
 */
export const getTeamCapacity = (team: Team): { current: number; max: number; available: number; isFull: boolean } => {
    const current = team.members.length;
    const pendingInvites = team.invites.filter(inv => inv.status === 'pending').length;
    const potential = current + pendingInvites;

    return {
        current,
        max: MAX_TEAM_SIZE,
        available: MAX_TEAM_SIZE - potential,
        isFull: potential >= MAX_TEAM_SIZE
    };
};

/**
 * Create a new team in Firestore
 */
export const createTeamInFirestore = async (team: Omit<Team, 'id'>): Promise<string> => {
    try {
        console.log('📝 Creating team in Firestore:', team.name);

        const teamRef = await addDoc(collection(db, 'teams'), {
            name: team.name,
            teamNumber: team.teamNumber || '',
            members: team.members || [],
            leaderId: team.leaderId,
            projectId: team.projectId || null,
            status: team.status || 'forming',
            invites: team.invites || [],
            createdAt: serverTimestamp()
        });

        console.log('✅ Team created in Firestore:', teamRef.id);
        return teamRef.id;
    } catch (error) {
        console.error('❌ Failed to create team in Firestore:', error);
        throw error;
    }
};

/**
 * Get team from Firestore by ID
 */
export const getTeamFromFirestore = async (teamId: string): Promise<Team | null> => {
    try {
        const teamRef = doc(db, 'teams', teamId);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
            return null;
        }

        const data = teamSnap.data();
        return {
            id: teamSnap.id,
            name: data.name || '',
            teamNumber: data.teamNumber || '',
            members: data.members || [],
            leaderId: data.leaderId || '',
            projectId: data.projectId || null,
            status: data.status || 'forming',
            invites: data.invites || [],
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
        };
    } catch (error) {
        console.error('❌ Failed to get team from Firestore:', error);
        return null;
    }
};

/**
 * Accept team invitation
 * Updates the invite status to 'accepted' and adds user to team members
 */
export const acceptTeamInvitation = async (
    teamId: string,
    userId: string,
    inviteId: string
): Promise<void> => {
    try {
        console.log(`✅ Accepting invitation for user ${userId} to team ${teamId}`);

        // Check if team has space
        const capacityCheck = await canAddMemberToTeam(teamId);
        if (!capacityCheck.canAdd) {
            throw new Error(capacityCheck.reason || 'Cannot add member to team');
        }

        const teamRef = doc(db, 'teams', teamId);
        const teamDoc = await getDoc(teamRef);

        if (!teamDoc.exists()) {
            throw new Error('Team not found');
        }

        const teamData = teamDoc.data();
        const invites = teamData.invites || [];

        // Update the invite status to 'accepted'
        const updatedInvites = invites.map((invite: TeamInvite) =>
            invite.id === inviteId
                ? { ...invite, status: 'accepted' as const, acceptedAt: new Date() }
                : invite
        );

        // Update team document: add member and update invite status
        await updateDoc(teamRef, {
            members: arrayUnion(userId),
            invites: updatedInvites,
            updatedAt: serverTimestamp()
        });

        // Update user document with teamId
        await updateUserTeamId(userId, teamId);

        console.log('✅ Invitation accepted successfully');
    } catch (error) {
        console.error('❌ Error accepting invitation:', error);
        throw error;
    }
};

/**
 * Reject team invitation
 * Updates the invite status to 'rejected'
 */
export const rejectTeamInvitation = async (
    teamId: string,
    inviteId: string
): Promise<void> => {
    try {
        console.log(`❌ Rejecting invitation ${inviteId} for team ${teamId}`);

        const teamRef = doc(db, 'teams', teamId);
        const teamDoc = await getDoc(teamRef);

        if (!teamDoc.exists()) {
            throw new Error('Team not found');
        }

        const teamData = teamDoc.data();
        const invites = teamData.invites || [];

        // Update the invite status to 'rejected'
        const updatedInvites = invites.map((invite: TeamInvite) =>
            invite.id === inviteId
                ? { ...invite, status: 'rejected' as const, rejectedAt: new Date() }
                : invite
        );

        await updateDoc(teamRef, {
            invites: updatedInvites,
            updatedAt: serverTimestamp()
        });

        console.log('✅ Invitation rejected successfully');
    } catch (error) {
        console.error('❌ Error rejecting invitation:', error);
        throw error;
    }
};

/**
 * Cancel/withdraw team invitation
 * Updates the invite status to 'cancelled' (useful for team leaders)
 */
export const cancelTeamInvitation = async (
    teamId: string,
    inviteId: string
): Promise<void> => {
    try {
        console.log(`🚫 Cancelling invitation ${inviteId} for team ${teamId}`);

        const teamRef = doc(db, 'teams', teamId);
        const teamDoc = await getDoc(teamRef);

        if (!teamDoc.exists()) {
            throw new Error('Team not found');
        }

        const teamData = teamDoc.data();
        const invites = teamData.invites || [];

        // Update the invite status to 'cancelled'
        const updatedInvites = invites.map((invite: TeamInvite) =>
            invite.id === inviteId
                ? { ...invite, status: 'cancelled' as const, cancelledAt: new Date() }
                : invite
        );

        await updateDoc(teamRef, {
            invites: updatedInvites,
            updatedAt: serverTimestamp()
        });

        console.log('✅ Invitation cancelled successfully');
    } catch (error) {
        console.error('❌ Error cancelling invitation:', error);
        throw error;
    }
};

/**
 * Add member to team in Firestore
 */
export const addMemberToTeam = async (teamId: string, userId: string): Promise<boolean> => {
    try {
        console.log(`➕ Adding user ${userId} to team ${teamId}`);

        // Check team capacity first
        const capacityCheck = await canAddMemberToTeam(teamId);
        if (!capacityCheck.canAdd) {
            console.error('❌', capacityCheck.reason);
            return false;
        }

        const teamRef = doc(db, 'teams', teamId);
        const teamSnap = await getDoc(teamRef);

        if (!teamSnap.exists()) {
            console.error('❌ Team not found:', teamId);
            return false;
        }

        const teamData = teamSnap.data();
        const currentMembers = teamData.members || [];

        // Check if user is already a member
        if (currentMembers.includes(userId)) {
            console.log('⚠️ User is already a team member');
            return true; // Already a member, consider it success
        }

        // Add user to members array
        await updateDoc(teamRef, {
            members: arrayUnion(userId),
            updatedAt: serverTimestamp()
        });

        console.log('✅ Member added to team successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to add member to team:', error);
        return false;
    }
};

/**
 * Remove member from team in Firestore
 */
export const removeMemberFromTeam = async (teamId: string, userId: string): Promise<boolean> => {
    try {
        console.log(`➖ Removing user ${userId} from team ${teamId}`);

        const teamRef = doc(db, 'teams', teamId);
        await updateDoc(teamRef, {
            members: arrayRemove(userId),
            updatedAt: serverTimestamp()
        });

        // Clear user's teamId
        await updateUserTeamId(userId, null);

        console.log('✅ Member removed from team successfully');
        return true;
    } catch (error) {
        console.error('❌ Failed to remove member from team:', error);
        return false;
    }
};

/**
 * Update team status in Firestore
 */
export const updateTeamStatus = async (teamId: string, status: Team['status']): Promise<boolean> => {
    try {
        const teamRef = doc(db, 'teams', teamId);
        await updateDoc(teamRef, {
            status,
            updatedAt: serverTimestamp()
        });

        console.log(`✅ Team status updated to: ${status}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to update team status:', error);
        return false;
    }
};

/**
 * Update team project in Firestore
 */
export const updateTeamProject = async (teamId: string, projectId: string | null): Promise<boolean> => {
    try {
        const teamRef = doc(db, 'teams', teamId);
        await updateDoc(teamRef, {
            projectId,
            updatedAt: serverTimestamp()
        });

        console.log(`✅ Team project updated to: ${projectId}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to update team project:', error);
        return false;
    }
};

/**
 * Update user's project selection
 */
export const updateUserProjectSelection = async (userId: string, projectId: string | null): Promise<boolean> => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            selectedProjectId: projectId,
            projectSelectedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });

        console.log(`✅ User ${userId} project selection updated to: ${projectId}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to update user project selection:', error);
        return false;
    }
};

/**
 * Get all team members' project selections
 */
export const getTeamProjectSelections = async (teamId: string): Promise<Record<string, string | null>> => {
    try {
        const team = await getTeamFromFirestore(teamId);
        if (!team) {
            return {};
        }

        const selections: Record<string, string | null> = {};

        for (const memberId of team.members) {
            const memberDoc = await getDoc(doc(db, 'users', memberId));
            if (memberDoc.exists()) {
                const data = memberDoc.data();
                selections[memberId] = data.selectedProjectId || null;
            }
        }

        return selections;
    } catch (error) {
        console.error('❌ Failed to get team project selections:', error);
        return {};
    }
};

/**
 * Check if all team members have selected the same project
 */
export const checkTeamProjectConsensus = async (teamId: string): Promise<{
    hasConsensus: boolean;
    projectId: string | null;
    selections: Record<string, string | null>;
}> => {
    try {
        const team = await getTeamFromFirestore(teamId);
        if (!team) {
            return { hasConsensus: false, projectId: null, selections: {} };
        }

        // Team must have at least 1 member (allows 1, 2, or 3 members to finalize)
        if (team.members.length < MIN_TEAM_SIZE) {
            return { hasConsensus: false, projectId: null, selections: {} };
        }

        const selections = await getTeamProjectSelections(teamId);

        // Check if all members have selected a project
        const allSelected = team.members.every(memberId => selections[memberId] !== null && selections[memberId] !== undefined);

        if (!allSelected) {
            return { hasConsensus: false, projectId: null, selections };
        }

        // Check if all selections are the same
        const projectIds = team.members.map(memberId => selections[memberId]).filter(Boolean) as string[];
        const uniqueProjects = [...new Set(projectIds)];

        if (uniqueProjects.length === 1) {
            return {
                hasConsensus: true,
                projectId: uniqueProjects[0],
                selections
            };
        }

        return { hasConsensus: false, projectId: null, selections };
    } catch (error) {
        console.error('❌ Failed to check team project consensus:', error);
        return { hasConsensus: false, projectId: null, selections: {} };
    }
};

/**
 * Auto-assign faculty to team based on project specialization
 */
export const autoAssignFacultyToTeam = async (teamId: string, projectId: string): Promise<{
    success: boolean;
    facultyId?: string;
    message: string;
}> => {
    try {
        console.log(`🎓 Auto-assigning faculty to team ${teamId} for project ${projectId}`);

        // Get project details
        const projectDoc = await getDoc(doc(db, 'projects', projectId));
        if (!projectDoc.exists()) {
            return { success: false, message: 'Project not found' };
        }

        const projectData = projectDoc.data();

        // FIRST COME FIRST SERVE: Check if project is already assigned
        if (projectData.isAssigned && projectData.guideId) {
            console.warn(`⚠️ Project ${projectId} is already assigned to another team (first come first serve)`);
            return { success: false, message: 'This project has already been assigned to another team. Please select a different project.' };
        }

        const projectSpecialization = projectData.specialization || 'General';

        // Get team details
        const team = await getTeamFromFirestore(teamId);
        if (!team) {
            return { success: false, message: 'Team not found' };
        }

        // Check if faculty is already assigned
        if (team.guideId) {
            console.log(`⚠️ Team already has a faculty guide: ${team.guideId}`);
            return { success: true, facultyId: team.guideId, message: 'Faculty already assigned' };
        }

        // Find available faculty with matching specialization
        const facultyQuery = query(
            collection(db, 'users'),
            where('role', '==', 'faculty'),
            where('specialization', '==', projectSpecialization)
        );

        const facultySnapshot = await getDocs(facultyQuery);
        const facultyList: Array<{ id: string; assignedTeams: number; maxTeams: number }> = [];

        facultySnapshot.forEach((doc) => {
            const data = doc.data();
            facultyList.push({
                id: doc.id,
                assignedTeams: 0, // Will calculate below
                maxTeams: data.maxTeams || 3
            });
        });

        // Count assigned teams for each faculty
        const teamsSnapshot = await getDocs(collection(db, 'teams'));
        teamsSnapshot.forEach((teamDoc) => {
            const teamData = teamDoc.data();
            if (teamData.guideId) {
                const faculty = facultyList.find(f => f.id === teamData.guideId);
                if (faculty) {
                    faculty.assignedTeams++;
                }
            }
        });

        // Find faculty with available slots
        const availableFaculty = facultyList.filter(f => f.assignedTeams < f.maxTeams);

        if (availableFaculty.length === 0) {
            console.warn('⚠️ No available faculty found with matching specialization');
            // Fallback: assign any available faculty
            const allFacultyQuery = query(
                collection(db, 'users'),
                where('role', '==', 'faculty')
            );
            const allFacultySnapshot = await getDocs(allFacultyQuery);
            const allFaculty: Array<{ id: string; assignedTeams: number; maxTeams: number }> = [];

            allFacultySnapshot.forEach((doc) => {
                const data = doc.data();
                allFaculty.push({
                    id: doc.id,
                    assignedTeams: 0,
                    maxTeams: data.maxTeams || 3
                });
            });

            // Count assigned teams
            teamsSnapshot.forEach((teamDoc) => {
                const teamData = teamDoc.data();
                if (teamData.guideId) {
                    const faculty = allFaculty.find(f => f.id === teamData.guideId);
                    if (faculty) {
                        faculty.assignedTeams++;
                    }
                }
            });

            const fallbackFaculty = allFaculty.filter(f => f.assignedTeams < f.maxTeams);
            if (fallbackFaculty.length === 0) {
                return { success: false, message: 'No available faculty found' };
            }

            // Assign faculty with least teams (round-robin)
            const selectedFaculty = fallbackFaculty.sort((a, b) => a.assignedTeams - b.assignedTeams)[0];
            const teamRef = doc(db, 'teams', teamId);
            await updateDoc(teamRef, {
                guideId: selectedFaculty.id,
                status: 'assigned',
                updatedAt: serverTimestamp()
            });

            console.log(`✅ Assigned faculty ${selectedFaculty.id} to team ${teamId} (fallback)`);
            return { success: true, facultyId: selectedFaculty.id, message: 'Faculty assigned (fallback)' };
        }

        // Assign faculty with least teams (round-robin)
        const selectedFaculty = availableFaculty.sort((a, b) => a.assignedTeams - b.assignedTeams)[0];
        const teamRef = doc(db, 'teams', teamId);
        await updateDoc(teamRef, {
            guideId: selectedFaculty.id,
            projectId: projectId,
            status: 'assigned',
            updatedAt: serverTimestamp()
        });

        // Mark project as assigned
        const projectRef = doc(db, 'projects', projectId);
        await updateDoc(projectRef, {
            isAssigned: true,
            guideId: selectedFaculty.id,
            updatedAt: serverTimestamp()
        });

        console.log(`✅ Assigned faculty ${selectedFaculty.id} to team ${teamId}`);
        return { success: true, facultyId: selectedFaculty.id, message: 'Faculty assigned successfully' };
    } catch (error) {
        console.error('❌ Failed to auto-assign faculty:', error);
        return { success: false, message: 'Failed to assign faculty' };
    }
};

/**
 * Get all teams from Firestore
 */
export const getAllTeamsFromFirestore = async (): Promise<Team[]> => {
    try {
        const teamsSnapshot = await getDocs(collection(db, 'teams'));
        const teams: Team[] = [];

        teamsSnapshot.forEach((doc) => {
            const data = doc.data();
            teams.push({
                id: doc.id,
                name: data.name || '',
                teamNumber: data.teamNumber || '',
                members: data.members || [],
                leaderId: data.leaderId || '',
                projectId: data.projectId || null,
                status: data.status || 'forming',
                invites: data.invites || [],
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
            });
        });

        return teams;
    } catch (error) {
        console.error('❌ Failed to get teams from Firestore:', error);
        return [];
    }
};

/**
 * Get teams for a specific user (where user is a member or leader)
 */
export const getUserTeams = async (userId: string): Promise<Team[]> => {
    try {
        const teamsSnapshot = await getDocs(collection(db, 'teams'));
        const teams: Team[] = [];

        teamsSnapshot.forEach((doc) => {
            const data = doc.data();
            const members = data.members || [];

            // Check if user is a member or leader
            if (members.includes(userId) || data.leaderId === userId) {
                teams.push({
                    id: doc.id,
                    name: data.name || '',
                    teamNumber: data.teamNumber || '',
                    members: members,
                    leaderId: data.leaderId || '',
                    projectId: data.projectId || null,
                    status: data.status || 'forming',
                    invites: data.invites || [],
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date()
                });
            }
        });

        return teams;
    } catch (error) {
        console.error('❌ Failed to get user teams:', error);
        return [];
    }
};

/**
 * Get pending invitations for a specific user
 */
export const getUserPendingInvitations = async (userId: string): Promise<Array<Team & { inviteId: string }>> => {
    try {
        const teamsSnapshot = await getDocs(collection(db, 'teams'));
        const invitedTeams: Array<Team & { inviteId: string }> = [];

        teamsSnapshot.forEach((doc) => {
            const data = doc.data();
            const invites = data.invites || [];

            // Find pending invites for this user
            const userInvite = invites.find(
                (invite: TeamInvite) => invite.invitedUserId === userId && invite.status === 'pending'
            );

            if (userInvite) {
                invitedTeams.push({
                    id: doc.id,
                    name: data.name || '',
                    teamNumber: data.teamNumber || '',
                    members: data.members || [],
                    leaderId: data.leaderId || '',
                    projectId: data.projectId || null,
                    status: data.status || 'forming',
                    invites: invites,
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    inviteId: userInvite.id
                });
            }
        });

        return invitedTeams;
    } catch (error) {
        console.error('❌ Failed to get user pending invitations:', error);
        return [];
    }
};

/**
 * Update user's teamId in Firestore users collection
 */
export const updateUserTeamId = async (userId: string, teamId: string | null): Promise<boolean> => {
    try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
            teamId: teamId,
            updatedAt: serverTimestamp()
        });

        console.log(`✅ User ${userId} teamId updated to: ${teamId}`);
        return true;
    } catch (error) {
        console.error('❌ Failed to update user teamId:', error);
        return false;
    }
};

/**
 * Add invitation to team
 */
export const addInvitationToTeam = async (
    teamId: string,
    invitedUserId: string,
    invitedByUserId: string
): Promise<string> => {
    try {
        console.log(`📨 Adding invitation for user ${invitedUserId} to team ${teamId}`);

        const teamRef = doc(db, 'teams', teamId);
        const teamDoc = await getDoc(teamRef);

        if (!teamDoc.exists()) {
            throw new Error('Team not found');
        }

        const teamData = teamDoc.data();
        const currentMembers = teamData.members || [];
        const invites = teamData.invites || [];

        // Check current team size + pending invites
        const pendingInvites = invites.filter((inv: TeamInvite) => inv.status === 'pending');
        const potentialSize = currentMembers.length + pendingInvites.length;

        if (potentialSize >= MAX_TEAM_SIZE) {
            throw new Error(`Cannot send more invitations. Team is at maximum capacity (${MAX_TEAM_SIZE} members including pending invites).`);
        }

        // Check if user already has a pending invitation
        const existingInvite = invites.find(
            (invite: TeamInvite) => invite.invitedUserId === invitedUserId && invite.status === 'pending'
        );

        if (existingInvite) {
            throw new Error('User already has a pending invitation');
        }

        // Create new invitation
        const newInvite: TeamInvite = {
            id: `invite_${Date.now()}_${Math.random().toString(36).substring(7)}`,
            teamId: teamId,
            invitedUserId: invitedUserId,
            invitedByUserId: invitedByUserId,
            status: 'pending',
            createdAt: new Date()
        };

        // Add invitation to team
        await updateDoc(teamRef, {
            invites: [...invites, newInvite],
            updatedAt: serverTimestamp()
        });

        console.log('✅ Invitation added successfully');
        return newInvite.id;
    } catch (error) {
        console.error('❌ Error adding invitation:', error);
        throw error;
    }
};
