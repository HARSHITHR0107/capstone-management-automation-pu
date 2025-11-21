import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { subscribeToGlobalNotifications, GlobalNotification } from '@/lib/globalNotificationService';

/**
 * Hook to get unread notification count
 */
export const useUnreadNotifications = () => {
    const { user } = useAuth();
    const [unreadCount, setUnreadCount] = useState(0);
    const [notifications, setNotifications] = useState<GlobalNotification[]>([]);

    useEffect(() => {
        if (!user?.role || !user?.id) {
            setUnreadCount(0);
            return;
        }

        const unsubscribe = subscribeToGlobalNotifications(
            user.role,
            (allNotifications) => {
                setNotifications(allNotifications);
                const unread = allNotifications.filter(
                    (n) => !n.readBy.includes(user.id)
                );
                setUnreadCount(unread.length);
            }
        );

        return () => unsubscribe();
    }, [user?.role, user?.id]);

    return { unreadCount, notifications };
};

