import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Bell, CheckCircle, XCircle, Users, Mail, MessageSquare } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {

    subscribeToGlobalNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    GlobalNotification,
} from '@/lib/globalNotificationService';

interface Notification {
    id: string;
    type: 'invitation_accepted' | 'invitation_rejected' | 'team_member_added' | 'global';
    title: string;
    message: string;
    timestamp: Date;
    isRead: boolean;
    teamName?: string;
    teamNumber?: string;
    memberName?: string;
    memberEmail?: string;
    sentByName?: string;
}

export const NotificationDisplay: React.FC = () => {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [globalNotifications, setGlobalNotifications] = useState<GlobalNotification[]>([]);
    const markedAsReadRef = useRef<Set<string>>(new Set());

    // Subscribe to global notifications in real-time
    useEffect(() => {
        if (!user?.role) {
            console.log('⚠️ NotificationDisplay: No user role found');
            return;
        }

        console.log('📢 NotificationDisplay: Subscribing to notifications for role:', user.role);
        setIsLoading(true);
        const unsubscribe = subscribeToGlobalNotifications(
            user.role,
            (notifications) => {
                console.log(`✅ NotificationDisplay: Received ${notifications.length} notifications for role ${user.role}`);
                setGlobalNotifications(notifications);
                setIsLoading(false);
            }
        );

        return () => {
            console.log('🔌 NotificationDisplay: Unsubscribing from notifications');
            unsubscribe();
        };
    }, [user?.role]);

    // Auto-mark notifications as read when displayed in the dashboard
    useEffect(() => {
        if (!user?.id || globalNotifications.length === 0) return;

        // Mark all unread notifications as read automatically when displayed
        const unreadNotifications = globalNotifications.filter(
            (n) => !n.readBy.includes(user.id) && !markedAsReadRef.current.has(n.id)
        );

        if (unreadNotifications.length > 0) {
            console.log(`📖 Auto-marking ${unreadNotifications.length} notification(s) as read`);

            // Track which notifications we're marking
            unreadNotifications.forEach(n => markedAsReadRef.current.add(n.id));

            // Update local state immediately for better UX
            setGlobalNotifications(prev =>
                prev.map(n =>
                    !n.readBy.includes(user.id) && markedAsReadRef.current.has(n.id)
                        ? { ...n, readBy: [...n.readBy, user.id] }
                        : n
                )
            );

            // Mark each unread notification as read in Firestore
            Promise.all(
                unreadNotifications.map(notification =>
                    markNotificationAsRead(notification.id, user.id)
                )
            ).catch(error => {
                console.error('Error auto-marking notifications as read:', error);
                // Remove from ref on error so we can retry
                unreadNotifications.forEach(n => markedAsReadRef.current.delete(n.id));
            });
        }
    }, [globalNotifications, user?.id]);

    // Combine global notifications with local notifications
    useEffect(() => {
        const combined: Notification[] = [
            ...globalNotifications.map((n) => ({
                id: n.id,
                type: 'global' as const,
                title: n.title,
                message: n.message,
                timestamp: n.createdAt,
                isRead: n.readBy.includes(user?.id || ''),
                sentByName: n.sentByName,
            })),
        ];

        setNotifications(combined);
    }, [globalNotifications, user?.id]);

    const markAsRead = async (notificationId: string) => {
        if (!user?.id) return;

        // Update local state immediately for better UX
        setNotifications(prev =>
            prev.map(notif =>
                notif.id === notificationId
                    ? { ...notif, isRead: true }
                    : notif
            )
        );

        // Mark as read in Firestore
        await markNotificationAsRead(notificationId, user.id);
    };

    const markAllAsRead = async () => {
        if (!user?.id || !user?.role) return;

        // Update local state immediately
        setNotifications(prev =>
            prev.map(notif => ({ ...notif, isRead: true }))
        );

        // Mark all as read in Firestore
        await markAllNotificationsAsRead(user.id, user.role);
    };

    const getNotificationIcon = (type: string) => {
        switch (type) {
            case 'invitation_accepted':
                return <CheckCircle className="h-4 w-4 text-green-500" />;
            case 'invitation_rejected':
                return <XCircle className="h-4 w-4 text-red-500" />;
            case 'team_member_added':
                return <Users className="h-4 w-4 text-blue-500" />;
            case 'global':
                return <MessageSquare className="h-4 w-4 text-blue-500" />;
            default:
                return <Bell className="h-4 w-4 text-gray-500" />;
        }
    };

    const getNotificationColor = (type: string) => {
        switch (type) {
            case 'invitation_accepted':
                return 'border-green-200 bg-green-50';
            case 'invitation_rejected':
                return 'border-red-200 bg-red-50';
            case 'team_member_added':
                return 'border-blue-200 bg-blue-50';
            case 'global':
                return 'border-blue-200 bg-blue-50';
            default:
                return 'border-gray-200 bg-gray-50';
        }
    };

    const unreadCount = notifications.filter(n => !n.isRead).length;

    if (isLoading) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notifications
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p>Loading notifications...</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                        <Bell className="h-5 w-5" />
                        Notifications
                        {unreadCount > 0 && (
                            <Badge variant="destructive" className="ml-2">
                                {unreadCount}
                            </Badge>
                        )}
                    </CardTitle>
                    {unreadCount > 0 && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={markAllAsRead}
                        >
                            Mark All Read
                        </Button>
                    )}
                </div>
                <CardDescription>
                    Global announcements and team updates
                </CardDescription>
            </CardHeader>
            <CardContent>
                {notifications.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No notifications yet</p>
                        <p className="text-sm">You'll receive notifications from admin and team updates here</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 rounded-lg border ${getNotificationColor(notification.type)} ${!notification.isRead ? 'ring-2 ring-blue-200' : ''
                                    }`}
                            >
                                <div className="flex items-start space-x-3">
                                    {getNotificationIcon(notification.type)}
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold">{notification.title}</h4>
                                            {!notification.isRead && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => markAsRead(notification.id)}
                                                >
                                                    Mark Read
                                                </Button>
                                            )}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">
                                            {notification.message}
                                        </p>
                                        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-2">
                                            {notification.type === 'global' && notification.sentByName && (
                                                <span>From: {notification.sentByName}</span>
                                            )}
                                            {notification.teamName && (
                                                <>
                                                    <span>Team: {notification.teamName}</span>
                                                    {notification.teamNumber && (
                                                        <span>Number: {notification.teamNumber}</span>
                                                    )}
                                                </>
                                            )}
                                            <span>{notification.timestamp.toLocaleString()}</span>
                                        </div>
                                        {notification.memberName && (
                                            <div className="flex items-center gap-2 mt-2">
                                                <span className="text-xs text-muted-foreground">
                                                    Member: {notification.memberName}
                                                </span>
                                                {notification.memberEmail && (
                                                    <span className="text-xs text-muted-foreground">
                                                        Email: {notification.memberEmail}
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};








