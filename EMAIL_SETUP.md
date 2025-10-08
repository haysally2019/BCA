# Email Setup for Team Member Account Creation

## Overview

The system now properly sends welcome emails to new team members with their temporary passwords. Team members are required to change their password on first login for security.

## How It Works

### 1. Account Creation Flow

When a manager creates a new team member account:

1. A secure 16-character password is generated automatically
2. The account is created with `must_change_password: true` flag in user metadata
3. A welcome email is sent to the team member via Supabase Auth
4. The temporary password is displayed to the manager in the UI as a backup
5. The manager can copy and share credentials through secure channels

### 2. First Login Flow

When a team member logs in for the first time:

1. They authenticate with their email and temporary password
2. The system detects the `must_change_password` flag
3. They are redirected to the password change screen
4. They must create a new password meeting all requirements:
   - At least 8 characters
   - Contains uppercase letter
   - Contains lowercase letter
   - Contains number
   - Contains special character
5. After changing the password, they can access the system

### 3. Email Template Configuration

To customize the welcome email sent to team members:

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Select the **Invite User** template
4. Customize the email with the following variables available:
   - `{{ .Email }}` - The user's email address
   - `{{ .SiteURL }}` - Your application URL
   - `{{ .Token }}` - Authentication token
   - `{{ .Data.name }}` - The user's name
   - `{{ .Data.temporary_password }}` - The temporary password
   - `{{ .Data.user_role }}` - The user's role

#### Example Email Template

```html
<h2>Welcome to Blue Collar Academy Sales Portal!</h2>

<p>Hi {{ .Data.name }},</p>

<p>Your account has been created. Here are your login credentials:</p>

<p>
  <strong>Email:</strong> {{ .Email }}<br>
  <strong>Temporary Password:</strong> {{ .Data.temporary_password }}
</p>

<p>
  <a href="{{ .SiteURL }}">Click here to log in</a>
</p>

<p><strong>Important:</strong> You will be required to change your password on first login for security reasons.</p>

<p>If you have any questions, please contact your manager.</p>

<p>Best regards,<br>
Blue Collar Academy Team</p>
```

### 4. Environment Variables

The following environment variables are automatically configured:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Public API key
- `SUPABASE_SERVICE_ROLE_KEY` - Admin API key for Edge Function
- `SITE_URL` - Application URL (defaults to the Supabase URL)

To customize the site URL for email redirects, you can set `SITE_URL` in your Edge Function environment variables.

## Security Features

1. **Secure Password Generation**: 16-character passwords with uppercase, lowercase, numbers, and special characters
2. **Mandatory Password Change**: Users cannot access the system until they change their temporary password
3. **Email Confirmation**: Emails are auto-confirmed for internal team members
4. **Password Requirements**: Strong password validation on password change
5. **Backup Delivery**: Password is shown in UI if email delivery fails

## Troubleshooting

### Email Not Received

If a team member doesn't receive the welcome email:

1. Check spam/junk folders
2. The manager can copy the password from the UI when creating the account
3. Share the credentials through a secure channel (e.g., encrypted messaging)
4. Check Supabase Dashboard → Authentication → Logs for email delivery status

### Email Delivery Delays

- Supabase emails may take a few minutes to arrive
- The UI displays the password immediately as a backup
- Managers should always copy the password when shown

### Custom Email Domain

To send emails from your own domain:

1. Go to Supabase Dashboard → Project Settings → Auth
2. Configure SMTP settings with your email provider
3. Update sender email and name
4. Test email delivery

## Testing

To test the complete flow:

1. Create a new team member account with a test email
2. Check if the email is received
3. Log in with the temporary password
4. Verify the password change screen appears
5. Change the password successfully
6. Verify access to the dashboard

## Notes

- Email sending is non-blocking - if it fails, the account is still created
- The temporary password is stored in user metadata for the email template
- The `must_change_password` flag is cleared after successful password change
- All email activity is logged in the team activity log
