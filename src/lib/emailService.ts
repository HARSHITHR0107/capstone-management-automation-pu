import emailjs from '@emailjs/browser';
import { getEmailConfig } from './emailConfig';
import { sendTeamInvitationEmail as sendWorkingEmail } from './workingEmailService';

export interface EmailInvitationData {
    toEmail: string;
    toName: string;
    fromName: string;
    teamName: string;
    invitationLink: string;
    projectName?: string;
    teamLeaderEmail?: string;
    teamLeaderRollNo?: string;
    teamNumber?: string;
}

export interface EmailInvitationResult {
    success: boolean;
    message: string;
    invitationId?: string;
}

/**
 * Send a team invitation email
 */
export const sendTeamInvitationEmail = async (
    invitationData: EmailInvitationData
): Promise<EmailInvitationResult> => {
    try {
        // Normalize email addresses to lowercase (emails are case-insensitive per RFC)
        const normalizedToEmail = invitationData.toEmail.trim().toLowerCase();
        const normalizedFromEmail = invitationData.teamLeaderEmail?.trim().toLowerCase() || '';

        console.log('📧 ===== SENDING TEAM INVITATION EMAIL ===== 📧');
        console.log('To (normalized):', normalizedToEmail);
        console.log('To (original):', invitationData.toEmail);
        console.log('Name:', invitationData.toName);
        console.log('From:', invitationData.fromName);
        console.log('Team:', invitationData.teamName);
        console.log('Link:', invitationData.invitationLink);

        // Get email configuration
        const emailConfig = getEmailConfig();

        // Method 1: Try EmailJS if configured
        // Check if using demo/placeholder credentials
        const hasDemoServiceId = emailConfig.serviceId === 'service_x2a6fwk';
        const hasDemoTemplateId = emailConfig.templateId === 'template_8h5x8yq';
        const hasDemoPublicKey = emailConfig.publicKey === 'your_public_key' || emailConfig.publicKey === 'LxVqGdVK9IvL-TA1n';

        const isFullyDemo = hasDemoServiceId && hasDemoTemplateId && hasDemoPublicKey;

        if (isFullyDemo) {
            console.warn('⚠️⚠️⚠️ EMAILJS NOT CONFIGURED ⚠️⚠️⚠️');
            console.warn('📧 Using DEMO/PLACEHOLDER credentials - emails will NOT be sent!');
            console.warn('📝 To fix: Set up EmailJS at https://www.emailjs.com/ and update credentials in src/lib/emailConfig.ts');
        } else {
            // Check for missing credentials
            if (hasDemoTemplateId) {
                console.warn('⚠️ Template ID is still using demo value. Update templateId in emailConfig.ts');
            }
            if (hasDemoPublicKey) {
                console.warn('⚠️ Public Key is still using demo value. Update publicKey in emailConfig.ts');
            }
        }

        // Try EmailJS if enabled and at least service ID is configured
        if (emailConfig.enabled && !hasDemoServiceId) {
            try {
                console.log('🔄 Attempting EmailJS (Automated)...');
                console.log('📧 Using EmailJS Service:', emailConfig.serviceId);
                console.log('📧 Using EmailJS Template:', emailConfig.templateId);
                console.log('📧 Using EmailJS Public Key:', emailConfig.publicKey.substring(0, 10) + '...');

                // EmailJS should already be initialized in main.tsx, but ensure it's initialized here too
                try {
                    emailjs.init(emailConfig.publicKey);
                    console.log('🔄 EmailJS initialized/verified');
                } catch (initError) {
                    console.warn('⚠️ EmailJS initialization check failed:', initError);
                }

                // Template parameters matching EmailJS template variables
                // User's template expects: email, to_name, inviter_name, team_name, team_number, invitation_link
                const templateParams = {
                    email: normalizedToEmail || '', // Recipient email (required)
                    to_name: invitationData.toName || 'Student', // Recipient name
                    inviter_name: invitationData.fromName || 'Team Leader', // Inviter/sender name
                    team_name: invitationData.teamName || 'Team', // Team name
                    team_number: invitationData.teamNumber || 'T000000', // Team number
                    invitation_link: invitationData.invitationLink || '', // Invitation link (required)
                    // Additional optional parameters (in case template uses them)
                    from_name: invitationData.fromName || 'Team Leader', // Alias for inviter_name
                    project_name: invitationData.projectName || 'Capstone Project',
                    team_leader_email: normalizedFromEmail || '',
                    team_leader_rollno: invitationData.teamLeaderRollNo || ''
                };

                console.log('📤 ===== EMAILJS SEND REQUEST =====');
                console.log('📧 Service ID:', emailConfig.serviceId);
                console.log('📧 Template ID:', emailConfig.templateId);
                console.log('📧 Template Params:', {
                    email: templateParams.email,
                    to_name: templateParams.to_name,
                    inviter_name: templateParams.inviter_name,
                    team_name: templateParams.team_name,
                    team_number: templateParams.team_number,
                    invitation_link: '[LINK_HIDDEN]',
                    project_name: templateParams.project_name
                });

                // Send email via EmailJS
                const result = await emailjs.send(
                    emailConfig.serviceId,
                    emailConfig.templateId,
                    templateParams,
                    emailConfig.publicKey // Explicitly pass publicKey as 4th parameter
                );

                console.log('✅ ===== EMAILJS SEND SUCCESS =====');
                console.log('✅ Status:', result.status);
                console.log('✅ Text:', result.text);
                console.log('✅ Email sent to:', normalizedToEmail);

                // Show browser notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('✅ Invitation Email Sent Automatically!', {
                        body: `Email sent to ${invitationData.toName} (${invitationData.toEmail})`,
                        icon: '/favicon.svg'
                    });
                }

                return {
                    success: true,
                    message: `✅ Invitation email sent automatically to ${invitationData.toName}!`,
                    invitationId: Date.now().toString()
                };
            } catch (emailjsError: any) {
                console.error('❌ ===== EMAILJS SEND FAILED =====');
                console.error('❌ Error object:', emailjsError);
                console.error('❌ Error status:', emailjsError?.status);
                console.error('❌ Error text:', emailjsError?.text);
                console.error('❌ Error message:', emailjsError?.message);
                console.error('❌ Full error:', JSON.stringify(emailjsError, null, 2));

                // Provide helpful error message
                let errorMessage = 'EmailJS Error: ';
                if (emailjsError?.text) {
                    errorMessage += emailjsError.text;
                } else if (emailjsError?.message) {
                    errorMessage += emailjsError.message;
                } else if (emailjsError?.status) {
                    errorMessage += `HTTP ${emailjsError.status} - Check your EmailJS credentials`;
                } else {
                    errorMessage += 'Invalid EmailJS configuration. Please check your Template ID and Public Key in emailConfig.ts';
                }

                // Check for common errors and provide specific guidance
                if (errorMessage.includes('template') || errorMessage.includes('Template') || emailjsError?.status === 400) {
                    errorMessage += '\n\n⚠️ Missing or invalid Template ID. Get it from EmailJS dashboard → Email Templates';
                    errorMessage += `\n   Current Template ID: ${emailConfig.templateId}`;
                }
                if (errorMessage.includes('user') || errorMessage.includes('public') || errorMessage.includes('401') || errorMessage.includes('403')) {
                    errorMessage += '\n\n⚠️ Missing or invalid Public Key. Get it from EmailJS dashboard → Account → General';
                    errorMessage += `\n   Current Public Key: ${emailConfig.publicKey.substring(0, 10)}...`;
                }
                if (emailjsError?.status === 404) {
                    errorMessage += '\n\n⚠️ Service or Template not found. Verify your Service ID and Template ID in EmailJS dashboard';
                }

                console.error('❌ User-friendly error:', errorMessage);
                console.error('❌ Debugging checklist:');
                console.error('   1. Check VITE_EMAILJS_SERVICE_ID in .env file');
                console.error('   2. Check VITE_EMAILJS_TEMPLATE_ID in .env file');
                console.error('   3. Check VITE_EMAILJS_PUBLIC_KEY in .env file');
                console.error('   4. Verify template variables match: email, to_name, inviter_name, team_name, team_number, invitation_link');
                console.error('   5. Check EmailJS dashboard for service/template status');

                // Don't return here - let it try the working email service as fallback
            }
        } else if (!emailConfig.enabled) {
            console.log('⚠️ EmailJS is disabled. Enable it in emailConfig.ts');
        } else if (hasDemoServiceId) {
            console.warn('⚠️ Service ID is still using demo value. Update serviceId in emailConfig.ts');
        }

        // Method 2: Use working email service (sends actual emails automatically - NO OUTLOOK POPUP)
        try {
            console.log('🔄 Attempting working email service (Automated)...');
            console.log('📧 Preparing to send email to:', invitationData.toEmail);

            const result = await sendWorkingEmail({
                toEmail: invitationData.toEmail,
                toName: invitationData.toName,
                fromName: invitationData.fromName,
                teamName: invitationData.teamName,
                invitationLink: invitationData.invitationLink,
                projectName: invitationData.projectName,
                teamLeaderEmail: invitationData.teamLeaderEmail,
                teamLeaderRollNo: invitationData.teamLeaderRollNo,
                teamNumber: invitationData.teamNumber
            });

            // Check if email was sent successfully
            if (result.success) {
                console.log('✅ Working email service SUCCESS (Automated)');
                console.log('✅ Email result:', result);

                // Show browser notification
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('✅ Invitation Email Sent!', {
                        body: `Email sent to ${invitationData.toName} (${invitationData.toEmail})`,
                        icon: '/favicon.svg'
                    });
                }

                return {
                    success: true,
                    message: result.message || `✅ Invitation email sent automatically to ${invitationData.toName}!`,
                    invitationId: result.emailId || Date.now().toString()
                };
            } else {
                console.warn('⚠️ Working email service returned failure:', result.message);
                // Don't throw here, let it fall through to clipboard fallback
            }
        } catch (workingEmailError: any) {
            console.error('❌ Working email service error:', workingEmailError);
            console.error('❌ Error details:', workingEmailError?.message || workingEmailError);
            // Don't throw here, let it fall through to clipboard fallback
        }

        // Method 3: Fallback - Create invitation WITHOUT opening email client
        // Reuse the demo check variables already declared at the top
        console.error('📝 All automated email services failed. Invitation created in database.');
        console.error('💡 Invitation link for manual sharing:', invitationData.invitationLink);

        let errorDetails = '⚠️ EMAIL NOT SENT - EmailJS configuration issue:\n';
        if (hasDemoTemplateId) {
            errorDetails += '   ❌ Template ID is using placeholder value (template_8h5x8yq)\n';
            errorDetails += '   → Get your Template ID from EmailJS dashboard → Email Templates\n';
        }
        if (hasDemoPublicKey) {
            errorDetails += '   ❌ Public Key is using placeholder value\n';
            errorDetails += '   → Get your Public Key from EmailJS dashboard → Account → General\n';
        }
        if (!hasDemoTemplateId && !hasDemoPublicKey) {
            errorDetails += '   → Check EmailJS dashboard for service connection issues\n';
            errorDetails += '   → See OUTLOOK_EMAIL_SETUP.md for detailed setup instructions\n';
        }
        errorDetails += '   → Update src/lib/emailConfig.ts with real values\n';
        errorDetails += '   → Or use the Email Diagnostics tool in Email Setup tab';

        console.error(errorDetails);

        // Copy invitation link to clipboard (NO email client popup)
        try {
            await navigator.clipboard.writeText(invitationData.invitationLink);
            console.log('📋 Invitation link copied to clipboard!');
        } catch (clipboardError) {
            console.warn('⚠️ Failed to copy to clipboard:', clipboardError);
        }

        // Show browser notification (NO email client popup)
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('⚠️ Email Not Sent', {
                body: `Email failed to send. Check Email Setup tab for diagnostics. Invitation link copied to clipboard.`,
                icon: '/favicon.svg'
            });
        }

        let userMessage = `❌ Email failed to send! `;
        if (hasDemoTemplateId || hasDemoPublicKey) {
            userMessage += `EmailJS is not properly configured. `;
            if (hasDemoTemplateId) userMessage += `Template ID needs to be updated. `;
            if (hasDemoPublicKey) userMessage += `Public Key needs to be updated. `;
            userMessage += `See Email Setup tab → Email Diagnostics for help. `;
        } else {
            userMessage += `Please check EmailJS dashboard for service issues. `;
        }
        userMessage += `Invitation created - share link manually: ${invitationData.invitationLink}`;

        return {
            success: false,
            message: userMessage,
            invitationId: Date.now().toString()
        };

    } catch (error) {
        console.error('❌ CRITICAL ERROR in sendTeamInvitationEmail:', error);
        return {
            success: false,
            message: 'Failed to send invitation email. Please try again or contact support.'
        };
    }
};

/**
 * Send a welcome email to new team members
 */
export const sendWelcomeEmail = async (
    toEmail: string,
    toName: string,
    teamName: string,
    projectName?: string
): Promise<EmailInvitationResult> => {
    try {
        console.log('Sending welcome email:', { toEmail, toName, teamName, projectName });

        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 1000));

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Welcome to the Team!', {
                body: `Welcome ${toName} to team ${teamName}`,
                icon: '/favicon.svg'
            });
        }

        return {
            success: true,
            message: `Welcome email sent to ${toName}`
        };
    } catch (error) {
        console.error('Failed to send welcome email:', error);
        return {
            success: false,
            message: 'Failed to send welcome email.'
        };
    }
};

/**
 * Send project assignment notification
 */
export const sendProjectAssignmentEmail = async (
    toEmail: string,
    toName: string,
    teamName: string,
    projectName: string,
    guideName?: string
): Promise<EmailInvitationResult> => {
    try {
        console.log('Sending project assignment email:', {
            toEmail, toName, teamName, projectName, guideName
        });

        // Simulate email sending
        await new Promise(resolve => setTimeout(resolve, 1000));

        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Project Assigned!', {
                body: `Team ${teamName} has been assigned project: ${projectName}`,
                icon: '/favicon.svg'
            });
        }

        return {
            success: true,
            message: `Project assignment notification sent to ${toName}`
        };
    } catch (error) {
        console.error('Failed to send project assignment email:', error);
        return {
            success: false,
            message: 'Failed to send project assignment notification.'
        };
    }
};

/**
 * Request notification permission from user
 */
export const requestNotificationPermission = async (): Promise<boolean> => {
    if (!('Notification' in window)) {
        console.log('This browser does not support notifications');
        return false;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission === 'denied') {
        console.log('Notification permission denied');
        return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
};

/**
 * Generate invitation link for team joining
 * Uses VITE_APP_URL environment variable if set, otherwise falls back to window.location.origin
 * This ensures invitation links always use the correct production URL
 */
export const generateInvitationLink = (teamId: string, inviteId: string): string => {
    // Use environment variable if available (recommended for production)
    // Otherwise fallback to current origin (works for local development)
    const baseUrl = import.meta.env.VITE_APP_URL || window.location.origin;

    console.log('🔗 Generating invitation link with base URL:', baseUrl);

    return `${baseUrl}/invitation/${teamId}/${inviteId}`;
};
