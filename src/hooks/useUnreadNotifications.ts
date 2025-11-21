/**
 * Custom hook to track unread global notifications for the current user
 */

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { getNotificationsForUser } from '@/lib/globalNotificationService';

export interface UseUnreadNotificationsResult {
    unreadCount: number;
    loading: boolean;
    refresh: () => Promise<void>;
}

/**
 * Hook to get the count of unread notifications for the current user
 */
export const useUnreadNotifications = (): UseUnreadNotificationsResult => {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState<number>(0);
    const [loading, setLoading] = useState<boolean>(true);

    const fetchUnreadCount = async () => {
        if (!user?.id || !user?.role) {
            setUnreadCount(0);
            setLoading(false);
            return;
        }

        try {
            setLoading(true);

            // Get all notifications for this user's role
            const notifications = await getNotificationsForUser(
                user.id,
                user.role as 'student' | 'faculty' | 'admin'
            );

            // Count unread notifications (those not in the readBy array)
            const unread = notifications.filter(
                (notification) => !notification.readBy.includes(user.id)
            ).length;

            setUnreadCount(unread);
        } catch (error) {
            console.error('Error fetching unread notifications:', error);
            setUnreadCount(0);
        } finally {
            setLoading(false);
        }
    };

    // Fetch on mount and when user changes
    useEffect(() => {
        fetchUnreadCount();
    }, [user?.id, user?.role]);

    // Set up polling to check for new notifications every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchUnreadCount();
        }, 30000); // 30 seconds

        return () => clearInterval(interval);
    }, [user?.id, user?.role]);

    return {
        unreadCount,
        loading,
        refresh: fetchUnreadCount,
    };
};
