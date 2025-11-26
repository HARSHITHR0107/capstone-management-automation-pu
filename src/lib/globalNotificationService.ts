/**
 * Global Notification Service
 * Handles sending notifications to all registered users (students and faculty)
 */

import { db } from './firebase';
import {
    collection,
    addDoc,
    query,
    where,
    getDocs,
    orderBy,
    limit,
    serverTimestamp,
    doc,
    updateDoc,
    arrayUnion,
    getDoc,
    Timestamp,
    onSnapshot,
} from 'firebase/firestore';

export interface GlobalNotification {
    id: string;
    title: string;
    message: string;
    targetRoles: ('student' | 'faculty' | 'admin')[];
    sentBy: string;
    sentByName: string;
    createdAt: Date;
    readBy: string[]; // Array of user IDs who have read this notification
    attachmentLinks?: string[]; // Optional array of links (Google Drive, etc.)
}

export interface SendNotificationData {
    title: string;
    message: string;
    targetRoles: ('student' | 'faculty' | 'admin')[];
    sentBy: string;
    sentByName: string;
    attachmentLinks?: string[]; // Optional array of links to attach
}

/**
 * Send a global notification to all users with specified roles
 */
export const sendGlobalNotification = async (
    data: SendNotificationData
): Promise<{ success: boolean; notificationId?: string; error?: string }> => {
    try {
        console.log('📢 Sending global notification:', data);

        const notificationData = {
            title: data.title.trim(),
            message: data.message.trim(),
            targetRoles: data.targetRoles,
            sentBy: data.sentBy,
            sentByName: data.sentByName,
            readBy: [],
            attachmentLinks: data.attachmentLinks || [],
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(
            collection(db, 'globalNotifications'),
            notificationData
        );

        console.log('✅ Global notification sent successfully:', docRef.id);

        // Get all users matching the target roles
        const usersSnapshot = await getDocs(
            query(
                collection(db, 'users'),
                where('role', 'in', data.targetRoles)
            )
        );

        const totalUsers = usersSnapshot.size;
        console.log(`📊 Notification will be visible to ${totalUsers} users`);

        return {
            success: true,
            notificationId: docRef.id,
        };
    } catch (error: any) {
        console.error('❌ Failed to send global notification:', error);
        return {
            success: false,
            error: error.message || 'Failed to send notification',
        };
    }
};

/**
 * Get all global notifications for a user based on their role
 */
export const getGlobalNotifications = async (
    userRole: string
): Promise<GlobalNotification[]> => {
    try {
        // Try indexed query first
        const q = query(
            collection(db, 'globalNotifications'),
            where('targetRoles', 'array-contains', userRole),
            orderBy('createdAt', 'desc'),
            limit(50)
        );

        const snapshot = await getDocs(q);
        const notifications: GlobalNotification[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            notifications.push({
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

        return notifications;
    } catch (error: any) {
        console.warn('⚠️ Indexed query failed, trying fallback:', error);

        // Fallback: query without orderBy
        try {
            const fallbackQuery = query(
                collection(db, 'globalNotifications'),
                where('targetRoles', 'array-contains', userRole),
                limit(50)
            );

            const snapshot = await getDocs(fallbackQuery);
            const notifications: GlobalNotification[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                notifications.push({
                    id: doc.id,
                    title: data.title || '',
                    message: data.message || '',
                    targetRoles: data.targetRoles || [],
                    sentBy: data.sentBy || '',
                    sentByName: data.sentByName || 'Admin',
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    readBy: data.readBy || [],
                    attachmentLinks: data.attachmentLinks || [],
                });
            });

            // Sort client-side
            notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            return notifications;
        } catch (fallbackError: any) {
            console.warn('⚠️ Fallback query failed, trying last resort:', fallbackError);

            // Last resort: fetch all and filter client-side
            try {
                const allQuery = query(collection(db, 'globalNotifications'), limit(100));
                const snapshot = await getDocs(allQuery);
                const notifications: GlobalNotification[] = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    const targetRoles = data.targetRoles || [];

                    if (targetRoles.includes(userRole)) {
                        notifications.push({
                            id: doc.id,
                            title: data.title || '',
                            message: data.message || '',
                            targetRoles: targetRoles,
                            sentBy: data.sentBy || '',
                            sentByName: data.sentByName || 'Admin',
                            createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                            readBy: data.readBy || [],
                            attachmentLinks: data.attachmentLinks || [],
                        });
                    }
                });

                // Sort client-side
                notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                return notifications;
            } catch (lastResortError) {
                console.error('❌ All notification queries failed:', lastResortError);
                return [];
            }
        }
    }
};

/**
 * Subscribe to global notifications in real-time
 */
export const subscribeToGlobalNotifications = (
    userRole: string,
    callback: (notifications: GlobalNotification[]) => void
): (() => void) => {
    let unsubscribe: (() => void) | null = null;
    let activeUnsubscribe: (() => void) | null = null;

    const setupFallbackQuery = () => {
        // Fallback: query without orderBy (no index needed)
        const fallbackQuery = query(
            collection(db, 'globalNotifications'),
            where('targetRoles', 'array-contains', userRole),
            limit(50)
        );

        activeUnsubscribe = onSnapshot(
            fallbackQuery,
            (snapshot) => {
                const notifications: GlobalNotification[] = [];

                snapshot.forEach((doc) => {
                    const data = doc.data();
                    notifications.push({
                        id: doc.id,
                        title: data.title || '',
                        message: data.message || '',
                        targetRoles: data.targetRoles || [],
                        sentBy: data.sentBy || '',
                        sentByName: data.sentByName || 'Admin',
                        createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                        readBy: data.readBy || [],
                        attachmentLinks: data.attachmentLinks || [],
                    });
                });

                // Sort client-side
                notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                callback(notifications);
            },
            (fallbackError: any) => {
                console.error('❌ Fallback query also failed:', fallbackError);

                // Last resort: fetch all and filter client-side
                const allQuery = query(collection(db, 'globalNotifications'), limit(100));
                activeUnsubscribe = onSnapshot(
                    allQuery,
                    (snapshot) => {
                        const notifications: GlobalNotification[] = [];

                        snapshot.forEach((doc) => {
                            const data = doc.data();
                            const targetRoles = data.targetRoles || [];

                            // Filter client-side
                            if (targetRoles.includes(userRole)) {
                                notifications.push({
                                    id: doc.id,
                                    title: data.title || '',
                                    message: data.message || '',
                                    targetRoles: targetRoles,
                                    sentBy: data.sentBy || '',
                                    sentByName: data.sentByName || 'Admin',
                                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                                    readBy: data.readBy || [],
                                    attachmentLinks: data.attachmentLinks || [],
                                });
                            }
                        });

                        // Sort client-side
                        notifications.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                        callback(notifications);
                    },
                    (lastResortError: any) => {
                        console.error('❌ All notification queries failed:', lastResortError);
                        callback([]);
                    }
                );
            }
        );
    };

    // Try the indexed query first (with orderBy)
    const indexedQuery = query(
        collection(db, 'globalNotifications'),
        where('targetRoles', 'array-contains', userRole),
        orderBy('createdAt', 'desc'),
        limit(50)
    );

    // Try indexed query first
    unsubscribe = onSnapshot(
        indexedQuery,
        (snapshot) => {
            const notifications: GlobalNotification[] = [];

            snapshot.forEach((doc) => {
                const data = doc.data();
                notifications.push({
                    id: doc.id,
                    title: data.title || '',
                    message: data.message || '',
                    targetRoles: data.targetRoles || [],
                    sentBy: data.sentBy || '',
                    sentByName: data.sentByName || 'Admin',
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                    readBy: data.readBy || [],
                    attachmentLinks: data.attachmentLinks || [],
                });
            });

            callback(notifications);
        },
        (error: any) => {
            console.warn('⚠️ Indexed query failed, trying fallback query:', error);
            setupFallbackQuery();
        }
    );

    activeUnsubscribe = unsubscribe;

    return () => {
        if (activeUnsubscribe) activeUnsubscribe();
        if (unsubscribe && unsubscribe !== activeUnsubscribe) unsubscribe();
    };
};

/**
 * Mark a notification as read by a user
 */
export const markNotificationAsRead = async (
    notificationId: string,
    userId: string
): Promise<boolean> => {
    try {
        const notificationRef = doc(db, 'globalNotifications', notificationId);
        const notificationDoc = await getDoc(notificationRef);

        if (!notificationDoc.exists()) {
            console.error('Notification not found:', notificationId);
            return false;
        }

        const data = notificationDoc.data();
        const readBy = data.readBy || [];

        if (!readBy.includes(userId)) {
            await updateDoc(notificationRef, {
                readBy: arrayUnion(userId),
            });
            console.log('✅ Notification marked as read');
        }

        return true;
    } catch (error) {
        console.error('❌ Failed to mark notification as read:', error);
        return false;
    }
};

/**
 * Mark all notifications as read for a user
 */
export const markAllNotificationsAsRead = async (
    userId: string,
    userRole: string
): Promise<boolean> => {
    try {
        const notifications = await getGlobalNotifications(userRole);

        const updatePromises = notifications.map(async (notification) => {
            if (!notification.readBy.includes(userId)) {
                const notificationRef = doc(db, 'globalNotifications', notification.id);
                await updateDoc(notificationRef, {
                    readBy: arrayUnion(userId),
                });
            }
        });

        await Promise.all(updatePromises);
        console.log('✅ All notifications marked as read');
        return true;
    } catch (error) {
        console.error('❌ Failed to mark all notifications as read:', error);
        return false;
    }
};

/**
 * Get unread notification count for a user
 */
export const getUnreadNotificationCount = async (
    userId: string,
    userRole: string
): Promise<number> => {
    try {
        const notifications = await getGlobalNotifications(userRole);
        return notifications.filter((n) => !n.readBy.includes(userId)).length;
    } catch (error) {
        console.error('❌ Failed to get unread count:', error);
        return 0;
    }
};

/**
 * Get all sent notifications (for admin dashboard)
 */
export const getAllSentNotifications = async (): Promise<GlobalNotification[]> => {
    try {
        const q = query(
            collection(db, 'globalNotifications'),
            orderBy('createdAt', 'desc'),
            limit(100)
        );

        const snapshot = await getDocs(q);
        const notifications: GlobalNotification[] = [];

        snapshot.forEach((doc) => {
            const data = doc.data();
            notifications.push({
                id: doc.id,
                title: data.title || '',
                message: data.message || '',
                targetRoles: data.targetRoles || [],
                sentBy: data.sentBy || '',
                sentByName: data.sentByName || 'Admin',
                createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                readBy: data.readBy || [],
                attachmentLinks: data.attachmentLinks || [],
            });
        });

        return notifications;
    } catch (error) {
        console.error('❌ Failed to fetch all notifications:', error);
        return [];
    }
};

