// lib/notificationService.ts
// Email notification service for feedback and review schedules

import { User } from '@/types/user';

interface FeedbackNotification {
  teamName: string;
  teamNumber: string;
  facultyName: string;
  feedbackContent: string;
  timestamp: Date;
}

interface ScheduleNotification {
  teamName: string;
  teamNumber: string;
  facultyName: string;
  reviewTitle: string;
  reviewDate: Date;
  reviewTime?: string;
  reviewLocation?: string;
  description?: string;
}

/**
 * Send email notification when faculty provides feedback
 */
export async function sendFeedbackNotificationEmail(
  teamMembers: User[],
  notification: FeedbackNotification
): Promise<void> {
  try {
    console.log('📧 Sending feedback notification emails...');

    const emailPromises = teamMembers.map(async (member) => {
      const emailData = {
        to: member.email,
        subject: `New Feedback for ${notification.teamName}`,
        html: generateFeedbackEmailHTML(member.name, notification),
        text: generateFeedbackEmailText(member.name, notification)
      };

      console.log(`✉️ Email to: ${member.email}`);

      // Integration with your email service (e.g., SendGrid, AWS SES, etc.)
      // await sendEmail(emailData);

      // For now, we'll use the browser notification API
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`New Feedback - ${notification.teamName}`, {
          body: `${notification.facultyName} has provided feedback for your team`,
          icon: '/favicon.ico',
          tag: 'feedback-notification'
        });
      }
    });

    await Promise.all(emailPromises);
    console.log(`✅ Feedback notifications sent to ${teamMembers.length} members`);
  } catch (error) {
    console.error('❌ Error sending feedback notifications:', error);
    throw error;
  }
}

/**
 * Send email notification when review is scheduled
 */
export async function sendScheduleNotificationEmail(
  teamMembers: User[],
  notification: ScheduleNotification
): Promise<void> {
  try {
    console.log('📧 Sending schedule notification emails...');

    const emailPromises = teamMembers.map(async (member) => {
      const emailData = {
        to: member.email,
        subject: `Review Scheduled: ${notification.reviewTitle}`,
        html: generateScheduleEmailHTML(member.name, notification),
        text: generateScheduleEmailText(member.name, notification)
      };

      console.log(`✉️ Email to: ${member.email}`);

      // Integration with your email service
      // await sendEmail(emailData);

      // Browser notification
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(`Review Scheduled - ${notification.teamName}`, {
          body: `${notification.reviewTitle} on ${notification.reviewDate.toLocaleDateString()}`,
          icon: '/favicon.ico',
          tag: 'schedule-notification'
        });
      }
    });

    await Promise.all(emailPromises);
    console.log(`✅ Schedule notifications sent to ${teamMembers.length} members`);
  } catch (error) {
    console.error('❌ Error sending schedule notifications:', error);
    throw error;
  }
}

/**
 * Generate HTML email for feedback notification
 */
function generateFeedbackEmailHTML(studentName: string, notification: FeedbackNotification): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .feedback-box { background-color: white; padding: 20px; border-left: 4px solid #2563eb; margin: 20px 0; border-radius: 4px; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .button { background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">New Faculty Feedback</h1>
        </div>
        <div class="content">
          <p>Dear ${studentName},</p>
          <p>Your faculty guide <strong>${notification.facultyName}</strong> has provided feedback for your team <strong>${notification.teamName}</strong> (${notification.teamNumber}).</p>
          
          <div class="feedback-box">
            <h3 style="margin-top: 0; color: #2563eb;">Feedback:</h3>
            <p style="white-space: pre-wrap;">${notification.feedbackContent}</p>
          </div>
          
          <p><strong>Submitted on:</strong> ${notification.timestamp.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}</p>
          
          <a href="${window.location.origin}/student" class="button">View in Dashboard</a>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Please review this feedback and take appropriate action. If you have any questions, feel free to reach out to your faculty guide.
          </p>
        </div>
        <div class="footer">
          <p>This is an automated notification from the Capstone Project Management System</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email for feedback notification
 */
function generateFeedbackEmailText(studentName: string, notification: FeedbackNotification): string {
  return `
Dear ${studentName},

Your faculty guide ${notification.facultyName} has provided feedback for your team ${notification.teamName} (${notification.teamNumber}).

FEEDBACK:
${notification.feedbackContent}

Submitted on: ${notification.timestamp.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })}

Please log in to your dashboard to view and respond to this feedback.

---
This is an automated notification from the Capstone Project Management System
© ${new Date().getFullYear()} All rights reserved
  `.trim();
}

/**
 * Generate HTML email for schedule notification
 */
function generateScheduleEmailHTML(studentName: string, notification: ScheduleNotification): string {
  const formattedDate = notification.reviewDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background-color: #059669; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .schedule-box { background-color: white; padding: 20px; border-left: 4px solid #059669; margin: 20px 0; border-radius: 4px; }
        .detail-row { display: flex; margin: 10px 0; }
        .detail-label { font-weight: bold; min-width: 120px; color: #6b7280; }
        .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 12px; }
        .button { background-color: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin-top: 20px; }
        .calendar-icon { font-size: 48px; text-align: center; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">📅 Review Meeting Scheduled</h1>
        </div>
        <div class="content">
          <p>Dear ${studentName},</p>
          <p>A review meeting has been scheduled for your team <strong>${notification.teamName}</strong> (${notification.teamNumber}).</p>
          
          <div class="schedule-box">
            <h2 style="margin-top: 0; color: #059669;">${notification.reviewTitle}</h2>
            
            ${notification.description ? `<p style="color: #6b7280; margin-bottom: 20px;">${notification.description}</p>` : ''}
            
            <div class="detail-row">
              <span class="detail-label">📅 Date:</span>
              <span>${formattedDate}</span>
            </div>
            
            ${notification.reviewTime ? `
            <div class="detail-row">
              <span class="detail-label">🕐 Time:</span>
              <span>${notification.reviewTime}</span>
            </div>
            ` : ''}
            
            ${notification.reviewLocation ? `
            <div class="detail-row">
              <span class="detail-label">📍 Location:</span>
              <span>${notification.reviewLocation}</span>
            </div>
            ` : ''}
            
            <div class="detail-row">
              <span class="detail-label">👤 Scheduled by:</span>
              <span>${notification.facultyName}</span>
            </div>
          </div>
          
          <a href="${window.location.origin}/student" class="button">View in Dashboard</a>
          
          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Please mark your calendar and prepare for this review meeting. Make sure all team members are available.
          </p>
        </div>
        <div class="footer">
          <p>This is an automated notification from the Capstone Project Management System</p>
          <p>© ${new Date().getFullYear()} All rights reserved</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Generate plain text email for schedule notification
 */
function generateScheduleEmailText(studentName: string, notification: ScheduleNotification): string {
  const formattedDate = notification.reviewDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return `
Dear ${studentName},

A review meeting has been scheduled for your team ${notification.teamName} (${notification.teamNumber}).

MEETING DETAILS:
Title: ${notification.reviewTitle}
${notification.description ? `Description: ${notification.description}\n` : ''}
Date: ${formattedDate}
${notification.reviewTime ? `Time: ${notification.reviewTime}\n` : ''}
${notification.reviewLocation ? `Location: ${notification.reviewLocation}\n` : ''}
Scheduled by: ${notification.facultyName}

Please mark your calendar and prepare for this review meeting. Make sure all team members are available.

Log in to your dashboard for more details.

---
This is an automated notification from the Capstone Project Management System
© ${new Date().getFullYear()} All rights reserved
  `.trim();
}

/**
 * Request notification permissions
 */
export function requestNotificationPermission(): void {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().then(permission => {
      console.log('Notification permission:', permission);
    });
  }
}

/**
 * Send immediate browser notification
 */
export function sendBrowserNotification(title: string, body: string, tag?: string): void {
  if ('Notification' in window && Notification.permission === 'granted') {
    new Notification(title, {
      body,
      icon: '/favicon.ico',
      tag: tag || 'general-notification',
      requireInteraction: true
    });
  }
}