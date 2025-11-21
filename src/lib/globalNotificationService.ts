/**
 * Global Notification Service
 * Handles sending notifications to all users (students and faculty)
 */

import { db } from './firebase';
import { collection, addDoc, getDocs, query, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';

export interface GlobalNotification {
    id: string;
    title: string;
    message: string;
    targetRoles: ('student' | 'faculty' | 'admin')[];
    sentBy: string;
    sentByName: string;
    createdAt: Date;
    readBy: string[];
}

export interface SendGlobalNotificationParams {
    title: string;
    message: string;
    targetRoles: ('student' | 'faculty' | 'admin')[];
    sentBy: string;
    sentByName: string;
}

export interface SendGlobalNotificationResult {
    success: boolean;
    error?: string;
    notificationId?: string;
}

/**
 * Send a global notification to all users with specified roles
 */
export const sendGlobalNotification = async (
    params: SendGlobalNotificationParams
): Promise<SendGlobalNotificationResult> => {
    try {
        console.log('📢 Sending global notification:', params);

        // Validate parameters
        if (!params.title || !params.message) {
            return {
                success: false,
                error: 'Title and message are required',
            };
        }

        if (!params.targetRoles || params.targetRoles.length === 0) {
            return {
                success: false,
                error: 'At least one target role is required',
            };
        }

        // Create notification document
        const notificationData = {
            title: params.title.trim(),
            message: params.message.trim(),
            targetRoles: params.targetRoles,
            sentBy: params.sentBy,
            sentByName: params.sentByName,
            createdAt: serverTimestamp(),
            readBy: [],
        };

        const docRef = await addDoc(collection(db, 'globalNotifications'), notificationData);

        console.log('✅ Global notification sent successfully:', docRef.id);

        return {
            success: true,
            notificationId: docRef.id,
        };
    } catch (error: any) {
        console.error('❌ Error sending global notification:', error);
        return {
            success: false,
            error: error.message || 'Failed to send notification',
        };
    }
};

/**
 * Get all sent global notifications
 */
export const getAllSentNotifications = async (): Promise<GlobalNotification[]> => {
    try {
        console.log('📥 Fetching all global notifications...');

        const q = query(
            collection(db, 'globalNotifications'),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const notifications: GlobalNotification[] = [];

        querySnapshot.forEach((doc) => {
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

        console.log(`✅ Fetched ${notifications.length} global notifications`);
        return notifications;
    } catch (error) {
        console.error('❌ Error fetching global notifications:', error);
        return [];
    }
};

/**
 * Get global notifications for a specific user based on their role
 */
export const getNotificationsForUser = async (
    userId: string,
    userRole: 'student' | 'faculty' | 'admin'
): Promise<GlobalNotification[]> => {
    try {
        console.log(`📥 Fetching notifications for user ${userId} with role ${userRole}...`);

        const q = query(
            collection(db, 'globalNotifications'),
            orderBy('createdAt', 'desc')
        );

        const querySnapshot = await getDocs(q);
        const notifications: GlobalNotification[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();

            // Only include notifications that target this user's role
            if (data.targetRoles && data.targetRoles.includes(userRole)) {
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
            }
        });

        console.log(`✅ Fetched ${notifications.length} notifications for user ${userId}`);
        return notifications;
    } catch (error) {
        console.error('❌ Error fetching notifications for user:', error);
        return [];
    }
};

/**
 * Mark a notification as read by a user
 */
export const markNotificationAsRead = async (
    notificationId: string,
    userId: string
): Promise<boolean> => {
    try {
        console.log(`📖 Marking notification ${notificationId} as read by user ${userId}...`);

        const { doc, updateDoc, arrayUnion } = await import('firebase/firestore');

        const notificationRef = doc(db, 'globalNotifications', notificationId);
        await updateDoc(notificationRef, {
            readBy: arrayUnion(userId),
        });

        console.log('✅ Notification marked as read');
        return true;
    } catch (error) {
        console.error('❌ Error marking notification as read:', error);
        return false;
    }
};

/**
 * Get unread notification count for a user
 */
export const getUnreadNotificationCount = async (
    userId: string,
    userRole: 'student' | 'faculty' | 'admin'
): Promise<number> => {
    try {
        const notifications = await getNotificationsForUser(userId, userRole);
        const unreadCount = notifications.filter(
            (notification) => !notification.readBy.includes(userId)
        ).length;

        console.log(`📊 User ${userId} has ${unreadCount} unread notifications`);
        return unreadCount;
    } catch (error) {
        console.error('❌ Error getting unread notification count:', error);
        return 0;
    }
};
