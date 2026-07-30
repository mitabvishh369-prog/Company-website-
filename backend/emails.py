"""Emergent-managed Resend email helper + templates for Cosmic Elemental."""
import os, logging, httpx, asyncio
logger = logging.getLogger("cosmic.email")

EMAIL_BASE_URL = "https://integrations.emergentagent.com"
EMAIL_KEY = os.environ.get("EMERGENT_EMAIL_KEY", "")
EMAIL_FROM_NAME = os.environ.get("EMAIL_FROM_NAME", "Cosmic Elemental")

async def send_email(to: str, subject: str, html: str, reply_to: str | None = None):
    if not to or not EMAIL_KEY:
        logger.warning(f"Skipping email — key missing or no recipient: to={to}")
        return
    payload = {"to": [to], "subject": subject, "html": html, "from_name": EMAIL_FROM_NAME}
    if reply_to: payload["contact_email"] = reply_to
    try:
        async with httpx.AsyncClient(timeout=20) as c:
            r = await c.post(f"{EMAIL_BASE_URL}/api/v1/email/send",
                             headers={"X-Email-Key": EMAIL_KEY}, json=payload)
        if r.status_code >= 400:
            logger.warning(f"Email send failed {r.status_code}: {r.text[:200]}")
    except Exception as e:
        logger.warning(f"Email send exception: {e}")

def _shell(title: str, body_html: str, cta_url: str | None = None, cta_text: str | None = None) -> str:
    cta = f'<tr><td style="padding:22px 0;"><a href="{cta_url}" style="background:#FF5A00;color:#fff;text-decoration:none;padding:14px 26px;font-family:Arial,sans-serif;font-weight:700;font-size:14px;letter-spacing:0.02em;">{cta_text}</a></td></tr>' if cta_url and cta_text else ''
    return f"""<html><body style="margin:0;padding:0;background:#FAFAFA;font-family:Arial,sans-serif;color:#111;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FAFAFA;padding:32px 0;"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #ddd;">
<tr><td style="padding:24px 32px;border-bottom:1px solid #eee;">
<div style="letter-spacing:0.22em;font-size:11px;font-weight:700;color:#FF5A00;">COSMIC · ELEMENTAL</div>
</td></tr>
<tr><td style="padding:36px 32px 8px;font-family:'Oswald',Arial,sans-serif;font-size:36px;font-weight:700;line-height:1.05;letter-spacing:-0.01em;color:#111;">{title}</td></tr>
<tr><td style="padding:12px 32px 8px;font-size:15px;line-height:1.6;color:#333;">{body_html}</td></tr>
<tr><td style="padding:0 32px;">{cta}</td></tr>
<tr><td style="padding:24px 32px;border-top:1px solid #eee;font-size:12px;color:#888;">A world built for artists — Cosmic Elemental.</td></tr>
</table></td></tr></table></body></html>"""

def registration_confirmation(name, event_title, event_date, event_venue, txn_id, amount, currency, url):
    body = f"<p>Hi <b>{name}</b>,</p><p>You&rsquo;re confirmed for <b>{event_title}</b>.</p><p><b>When:</b> {event_date}<br/><b>Where:</b> {event_venue}<br/><b>Amount:</b> {currency.upper()} {amount}<br/><b>Transaction:</b> {txn_id}</p>"
    return _shell(f"You&rsquo;re in — {event_title}.", body, url, "View event →")

def organizer_new_registration(organizer_name, event_title, participant, url):
    body = f"<p>Hi <b>{organizer_name}</b>,</p><p>A new registration just came in for <b>{event_title}</b>.</p><p><b>Name:</b> {participant.get('name')}<br/><b>Email:</b> {participant.get('email')}<br/><b>Phone:</b> {participant.get('phone')}<br/><b>Category:</b> {participant.get('category','—')}<br/><b>Ticket:</b> {participant.get('ticket_type','Standard')}<br/><b>Amount:</b> ₹{participant.get('amount',0)} (net after 6% commission: ₹{participant.get('net',0)})</p>"
    return _shell("New registration.", body, url, "Open dashboard →")

def approval_notification(name, kind, item_title, status, url):
    verb = "approved" if status == "approved" else "not approved"
    body = f"<p>Hi <b>{name}</b>,</p><p>Your {kind} <b>{item_title}</b> was <b>{verb}</b> by the Cosmic Elemental team.</p><p>{'It&rsquo;s now live and discoverable on the platform.' if status=='approved' else 'Feel free to update it and resubmit for another review.'}</p>"
    return _shell(f"{kind.title()} {verb}.", body, url, "Open dashboard →")

def booking_received(client_name, artist_name, url):
    body = f"<p>Hi <b>{client_name}</b>,</p><p>We received your booking request for <b>{artist_name}</b>.</p><p>Our team reviews every request within 24h to confirm availability, discuss pricing, and match the best fit for your project.</p>"
    return _shell("Booking request received.", body, url, "Discover more artists →")

def booking_admin_alert(artist_name, booking, url):
    body = f"<p>A new booking request just came in.</p><p><b>Artist:</b> {artist_name}<br/><b>Company:</b> {booking.get('company_name')}<br/><b>Contact:</b> {booking.get('contact_person')} · {booking.get('email')} · {booking.get('phone')}<br/><b>Project:</b> {booking.get('project_name')} — {booking.get('city')} — {booking.get('date')}<br/><b>Budget:</b> ₹{booking.get('budget') or '—'}</p><p><i>{booking.get('requirements')}</i></p>"
    return _shell("Booking request.", body, url, "Open admin console →")

def subscription_active(name, plan, url):
    body = f"<p>Hi <b>{name}</b>,</p><p>Your <b>{plan}</b> plan is now active on Cosmic Elemental. Enjoy your first month on us — you won&rsquo;t be charged for the first 30 days.</p>"
    return _shell(f"Welcome to {plan}.", body, url, "Open your dashboard →")
