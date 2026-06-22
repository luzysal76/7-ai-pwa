// Google Calendar API integration via Google Identity Services (GIS)
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let _tokenClient = null;
let _accessToken = sessionStorage.getItem('gcal_token') || null;

// Called once when the GIS script is ready
export function initGoogleCalendar(clientId) {
  if (!clientId || !window.google?.accounts?.oauth2) return false;

  _tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error) {
        console.error('GCal OAuth error:', resp.error);
        return;
      }
      if (resp.access_token) {
        _accessToken = resp.access_token;
        sessionStorage.setItem('gcal_token', resp.access_token);
        window.dispatchEvent(new CustomEvent('gcal-authed'));
      }
    },
  });

  return true;
}

export function signInGoogleCalendar() {
  if (!_tokenClient) {
    window.dispatchEvent(new CustomEvent('gcal-need-setup'));
    return;
  }
  _tokenClient.requestAccessToken({ prompt: '' });
}

export function signOutGoogleCalendar() {
  if (_accessToken) {
    try { window.google?.accounts.oauth2.revoke(_accessToken); } catch { /* ignore */ }
  }
  _accessToken = null;
  sessionStorage.removeItem('gcal_token');
  window.dispatchEvent(new CustomEvent('gcal-signed-out'));
}

export function isGCalAuthed() {
  return !!_accessToken;
}

// Create a Google Calendar event. Returns the created event object.
export async function createCalendarEvent({ title, startDateTime, endDateTime, description = '' }) {
  if (!_accessToken) throw new Error('not-authed');

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const end = endDateTime || _addHour(startDateTime);

  const body = {
    summary: title,
    description,
    start: { dateTime: startDateTime, timeZone: tz },
    end:   { dateTime: end,           timeZone: tz },
  };

  const res = await fetch(`${CALENDAR_API}/calendars/primary/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${_accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    _accessToken = null;
    sessionStorage.removeItem('gcal_token');
    throw new Error('token-expired');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || 'api-error');
  }
  return await res.json();
}

// Delete a Google Calendar event by ID
export async function deleteCalendarEvent(eventId) {
  if (!_accessToken || !eventId) return;

  await fetch(`${CALENDAR_API}/calendars/primary/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${_accessToken}` },
  });
}

function _addHour(iso) {
  const d = new Date(iso);
  d.setHours(d.getHours() + 1);
  return d.toISOString();
}
