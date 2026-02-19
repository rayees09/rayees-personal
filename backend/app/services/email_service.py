import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, List
import os
from sqlalchemy.orm import Session

from app.models.admin import EmailConfig, EmailProvider
from app.database import get_db
from app.config import settings


class EmailService:
    """Multi-provider email service supporting SMTP, Gmail, Zoho, etc."""

    def __init__(self, db: Session = None):
        self.db = db
        self._config: Optional[EmailConfig] = None

    def _get_config(self) -> Optional[EmailConfig]:
        """Get email configuration from database or environment."""
        if self._config:
            return self._config

        if self.db:
            self._config = self.db.query(EmailConfig).filter(EmailConfig.is_active == True).first()
            if self._config:
                return self._config

        # Fallback to environment variables
        return self._env_config()

    def _env_config(self) -> Optional[EmailConfig]:
        """Create config from environment variables."""
        smtp_host = os.getenv("SMTP_HOST")
        if not smtp_host:
            return None

        config = EmailConfig(
            provider=EmailProvider(os.getenv("EMAIL_PROVIDER", "smtp")),
            smtp_host=smtp_host,
            smtp_port=int(os.getenv("SMTP_PORT", "587")),
            smtp_user=os.getenv("SMTP_USER"),
            smtp_password=os.getenv("SMTP_PASSWORD"),
            from_email=os.getenv("FROM_EMAIL"),
            from_name=os.getenv("FROM_NAME", "Family Hub"),
            is_active=True
        )
        return config

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send an email using the configured provider."""
        config = self._get_config()
        if not config:
            print("Email not configured")
            return False

        if config.provider == EmailProvider.SMTP:
            return await self._send_smtp(config, to_email, subject, html_content, text_content)
        elif config.provider == EmailProvider.GMAIL:
            return await self._send_gmail(config, to_email, subject, html_content, text_content)
        elif config.provider == EmailProvider.ZOHO:
            return await self._send_zoho(config, to_email, subject, html_content, text_content)
        else:
            return await self._send_smtp(config, to_email, subject, html_content, text_content)

    async def _send_smtp(
        self,
        config: EmailConfig,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email via SMTP."""
        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            from_email = config.from_email or config.smtp_user
            msg["From"] = f"{config.from_name} <{from_email}>"
            msg["To"] = to_email

            if text_content:
                msg.attach(MIMEText(text_content, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            context = ssl.create_default_context()

            # Use SSL for port 465, STARTTLS for port 587
            if config.smtp_port == 465:
                with smtplib.SMTP_SSL(config.smtp_host, config.smtp_port, context=context, timeout=30) as server:
                    server.login(config.smtp_user, config.smtp_password)
                    server.sendmail(from_email, to_email, msg.as_string())
            else:
                with smtplib.SMTP(config.smtp_host, config.smtp_port, timeout=30) as server:
                    server.ehlo()
                    server.starttls(context=context)
                    server.ehlo()
                    server.login(config.smtp_user, config.smtp_password)
                    server.sendmail(from_email, to_email, msg.as_string())

            return True
        except Exception as e:
            print(f"SMTP Error: {e}")
            return False

    async def _send_gmail(
        self,
        config: EmailConfig,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email via Gmail (uses SMTP with app password). Uses config settings directly."""
        # Don't override - use the settings from database/config
        return await self._send_smtp(config, to_email, subject, html_content, text_content)

    async def _send_zoho(
        self,
        config: EmailConfig,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """Send email via Zoho Mail. Uses config settings directly (smtppro.zoho.in for custom domains)."""
        # Don't override - use the settings from database/config
        # For Zoho custom domains: smtppro.zoho.in:587
        # For @zoho.com emails: smtp.zoho.com:587
        return await self._send_smtp(config, to_email, subject, html_content, text_content)

    # Email Templates
    async def send_verification_email(self, to_email: str, name: str, verification_link: str) -> bool:
        """Send email verification."""
        subject = "Verify your Family Hub account"
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2e7d32; color: white; padding: 20px; text-align: center;">
                <h1>Welcome to Family Hub!</h1>
            </div>
            <div style="padding: 20px;">
                <p>Hi {name},</p>
                <p>Thank you for registering your family on Family Hub. Please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{verification_link}" style="background: #2e7d32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Verify Email
                    </a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #666;">{verification_link}</p>
                <p>This link expires in 24 hours.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">If you didn't create this account, please ignore this email.</p>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to_email, subject, html_content)

    async def send_password_reset_email(self, to_email: str, name: str, reset_link: str) -> bool:
        """Send password reset email."""
        subject = "Reset your Family Hub password"
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2e7d32; color: white; padding: 20px; text-align: center;">
                <h1>Password Reset</h1>
            </div>
            <div style="padding: 20px;">
                <p>Hi {name},</p>
                <p>We received a request to reset your password. Click the button below to set a new password:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{reset_link}" style="background: #d32f2f; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Reset Password
                    </a>
                </div>
                <p>Or copy and paste this link in your browser:</p>
                <p style="word-break: break-all; color: #666;">{reset_link}</p>
                <p>This link expires in 1 hour.</p>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">If you didn't request a password reset, please ignore this email.</p>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to_email, subject, html_content)

    async def send_welcome_email(self, to_email: str, name: str, family_name: str) -> bool:
        """Send welcome email after verification."""
        subject = f"Welcome to Family Hub - {family_name}"
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2e7d32; color: white; padding: 20px; text-align: center;">
                <h1>Welcome to Family Hub!</h1>
            </div>
            <div style="padding: 20px;">
                <p>Hi {name},</p>
                <p>Your email has been verified and your family <strong>{family_name}</strong> is now active!</p>
                <p>You can now:</p>
                <ul>
                    <li>Add family members</li>
                    <li>Track prayers and Islamic practice</li>
                    <li>Manage family tasks</li>
                    <li>Track kids' learning progress</li>
                    <li>And much more!</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{settings.frontend_url}/login" style="background: #2e7d32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Go to Family Hub
                    </a>
                </div>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">Need help? Contact us at support@familyhub.com</p>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to_email, subject, html_content)

    async def send_member_invite_email(
        self,
        to_email: str,
        inviter_name: str,
        family_name: str,
        setup_link: str
    ) -> bool:
        """Send invitation to join family."""
        subject = f"{inviter_name} invited you to join {family_name} on Family Hub"
        html_content = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #2e7d32; color: white; padding: 20px; text-align: center;">
                <h1>You're Invited!</h1>
            </div>
            <div style="padding: 20px;">
                <p>Hi there!</p>
                <p><strong>{inviter_name}</strong> has invited you to join <strong>{family_name}</strong> on Family Hub.</p>
                <p>Family Hub helps families:</p>
                <ul>
                    <li>Track daily prayers together</li>
                    <li>Manage family tasks and rewards</li>
                    <li>Monitor kids' learning progress</li>
                    <li>Stay organized as a family</li>
                </ul>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="{setup_link}" style="background: #2e7d32; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                        Join Family
                    </a>
                </div>
                <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #999; font-size: 12px;">If you don't know {inviter_name}, please ignore this email.</p>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to_email, subject, html_content)


# Singleton instance
email_service = EmailService()


async def get_email_service(db: Session) -> EmailService:
    """Get email service with database session."""
    return EmailService(db)
