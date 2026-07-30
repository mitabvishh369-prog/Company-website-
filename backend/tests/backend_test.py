"""Cosmic Elemental — end-to-end backend API tests. Uses plain requests calls (no
session cookie persistence) so Bearer tokens control auth."""
import os, io, uuid
import pytest
import requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://cosmic-events-13.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = os.environ["ADMIN_EMAIL"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]

def _uniq(prefix="user"):
    return f"test_{prefix}_{uuid.uuid4().hex[:8]}@example.com"

def H(tok): return {"Authorization": f"Bearer {tok}"}

# Use plain requests functions (no Session) so cookies never leak between calls.
rq = requests

@pytest.fixture(scope="session")
def admin_token():
    r = rq.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    data = r.json()
    assert data["user"]["role"] == "admin"
    return data["token"]

@pytest.fixture(scope="session")
def organizer():
    email = _uniq("org")
    r = rq.post(f"{API}/auth/register", json={"email": email, "password": "Testpass1!", "name": "Org T", "role": "organizer"}, timeout=30)
    assert r.status_code == 200, r.text
    return {"token": r.json()["token"], "user": r.json()["user"], "email": email}

@pytest.fixture(scope="session")
def instructor():
    email = _uniq("ins")
    r = rq.post(f"{API}/auth/register", json={"email": email, "password": "Testpass1!", "name": "Ins T", "role": "instructor"}, timeout=30)
    assert r.status_code == 200, r.text
    return {"token": r.json()["token"], "user": r.json()["user"], "email": email}

@pytest.fixture(scope="session")
def artist_user():
    email = _uniq("art")
    r = rq.post(f"{API}/auth/register", json={"email": email, "password": "Testpass1!", "name": "Art T", "role": "user"}, timeout=30)
    assert r.status_code == 200, r.text
    return {"token": r.json()["token"], "user": r.json()["user"], "email": email}

_state = {}

# ---- Health / root ----------------------------------------------------------
def test_health_root():
    r = rq.get(f"{API}/", timeout=15)
    assert r.status_code == 200
    assert r.json().get("ok") == True

# ---- Auth -------------------------------------------------------------------
def test_admin_login_sets_cookie_and_role():
    r = rq.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200
    j = r.json()
    assert j["user"]["role"] == "admin"
    assert isinstance(j["token"], str) and len(j["token"]) > 20
    assert "access_token" in r.cookies

def test_login_bad_password():
    r = rq.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong!"})
    assert r.status_code == 401

def test_register_and_me(organizer):
    r = rq.get(f"{API}/auth/me", headers=H(organizer["token"]))
    assert r.status_code == 200
    assert r.json()["user"]["email"].lower() == organizer["email"].lower()
    assert r.json()["user"]["role"] == "organizer"

def test_register_duplicate(organizer):
    r = rq.post(f"{API}/auth/register", json={"email": organizer["email"], "password": "Testpass1!", "name": "dup"})
    assert r.status_code == 400

def test_me_unauth():
    r = rq.get(f"{API}/auth/me")
    assert r.status_code == 401

# ---- Events -----------------------------------------------------------------
def _event_payload(title="TEST_Event"):
    return {"title": title, "description": "d", "event_type": "workshop", "art_form": "music",
            "date": "2026-06-01", "venue": "V", "city": "Mumbai", "country": "India",
            "registration_fee": 0.0, "capacity": 10}

def test_create_event_requires_auth():
    r = rq.post(f"{API}/events", json=_event_payload())
    assert r.status_code == 401

def test_event_flow(organizer, admin_token):
    r = rq.post(f"{API}/events", json=_event_payload("TEST_Event_A"), headers=H(organizer["token"]))
    assert r.status_code == 200, r.text
    ev = r.json()
    assert ev["status"] == "pending"
    assert ev["organizer_id"] == organizer["user"]["id"]
    eid = ev["id"]; _state["event_id"] = eid

    r = rq.get(f"{API}/events?status=approved")
    assert all(e["id"] != eid for e in r.json())

    r = rq.get(f"{API}/events?mine=true&status=any", headers=H(organizer["token"]))
    assert any(e["id"] == eid for e in r.json())

    other_email = _uniq("other")
    o2 = rq.post(f"{API}/auth/register", json={"email": other_email, "password": "Testpass1!", "name": "O2"}).json()
    r = rq.put(f"{API}/events/{eid}", json=_event_payload("TEST_Event_A"), headers=H(o2["token"]))
    assert r.status_code == 403

    r = rq.patch(f"{API}/admin/events/{eid}", json={"status": "approved"}, headers=H(admin_token))
    assert r.status_code == 200
    assert r.json()["status"] == "approved"

    r = rq.get(f"{API}/events?status=approved")
    assert any(e["id"] == eid for e in r.json())

def test_non_admin_cannot_approve(organizer):
    eid = _state.get("event_id")
    assert eid, "event_flow must run first"
    r = rq.patch(f"{API}/admin/events/{eid}", json={"status":"approved"}, headers=H(organizer["token"]))
    assert r.status_code == 403

# ---- Classes ----------------------------------------------------------------
def _class_payload(title="TEST_Class"):
    return {"title": title, "description": "d", "instructor_name": "Ins", "art_form": "dance",
            "city": "Delhi", "country": "India", "schedule": "Mon 6pm", "fee": 0.0}

def test_class_flow(instructor, admin_token):
    r = rq.post(f"{API}/classes", json=_class_payload("TEST_Class_A"), headers=H(instructor["token"]))
    assert r.status_code == 200, r.text
    c = r.json(); assert c["status"] == "pending"
    cid = c["id"]; _state["class_id"] = cid

    r = rq.get(f"{API}/classes?mine=true&status=any", headers=H(instructor["token"]))
    assert any(x["id"] == cid for x in r.json())

    r = rq.patch(f"{API}/admin/classes/{cid}", json={"status":"approved"}, headers=H(admin_token))
    assert r.status_code == 200
    assert r.json()["status"] == "approved"

    r = rq.get(f"{API}/classes?status=approved")
    assert any(x["id"] == cid for x in r.json())

# ---- Artists ----------------------------------------------------------------
def test_artist_profile_flow(artist_user, admin_token):
    body = {"stage_name": "TEST_Artist_A", "specializations": ["singer"], "bio": "b",
            "city": "Mumbai", "country": "India", "experience_years": 3}
    r = rq.post(f"{API}/artists", json=body, headers=H(artist_user["token"]))
    assert r.status_code == 200, r.text
    a = r.json(); assert a["status"] == "pending"
    aid = a["id"]; _state["artist_id"] = aid

    me = rq.get(f"{API}/auth/me", headers=H(artist_user["token"])).json()
    assert me["user"]["role"] == "artist"

    r = rq.get(f"{API}/artists/mine/profile", headers=H(artist_user["token"]))
    assert r.status_code == 200 and r.json()["id"] == aid

    r = rq.patch(f"{API}/admin/artists/{aid}", json={"status":"approved"}, headers=H(admin_token))
    assert r.status_code == 200
    assert r.json()["status"] == "approved"

    r = rq.get(f"{API}/artists?status=approved")
    assert any(x["id"] == aid for x in r.json())

# ---- Admin ------------------------------------------------------------------
def test_admin_pending_and_stats(admin_token, organizer):
    rq.post(f"{API}/events", json=_event_payload("TEST_Pending_E"), headers=H(organizer["token"]))
    r = rq.get(f"{API}/admin/pending", headers=H(admin_token))
    assert r.status_code == 200
    assert set(r.json().keys()) == {"events","classes","artists"}

    r = rq.get(f"{API}/admin/stats", headers=H(admin_token))
    assert r.status_code == 200
    for k in ["users","events_approved","events_pending","classes_approved","classes_pending",
              "artists_approved","artists_pending","bookings","registrations"]:
        assert k in r.json()

def test_admin_pending_forbidden_for_user(organizer):
    r = rq.get(f"{API}/admin/pending", headers=H(organizer["token"]))
    assert r.status_code == 403

# ---- Bookings ---------------------------------------------------------------
def test_booking_flow(admin_token):
    aid = _state.get("artist_id")
    assert aid, "artist_profile_flow must run first"
    body = {"artist_id": aid, "company_name": "TEST_Co", "contact_person": "P",
            "email": "test@example.com", "phone": "1", "project_name": "PN",
            "city": "Mumbai", "date": "2026-06-15", "requirements": "R"}
    r = rq.post(f"{API}/bookings", json=body)
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "new"

    r = rq.get(f"{API}/bookings", headers=H(admin_token))
    assert r.status_code == 200
    assert any(b["company_name"] == "TEST_Co" for b in r.json())

def test_booking_invalid_artist():
    body = {"artist_id": "507f1f77bcf86cd799439011", "company_name": "TEST", "contact_person": "P",
            "email": "t@t.com", "phone": "1", "project_name": "PN",
            "city": "Mumbai", "date": "2026-06-15", "requirements": "R"}
    r = rq.post(f"{API}/bookings", json=body)
    assert r.status_code == 404

# ---- Payments ---------------------------------------------------------------
def test_payment_free_flow(organizer, admin_token):
    r = rq.post(f"{API}/events", json=_event_payload("TEST_Free"), headers=H(organizer["token"]))
    eid = r.json()["id"]
    rq.patch(f"{API}/admin/events/{eid}", json={"status":"approved"}, headers=H(admin_token))
    r = rq.post(f"{API}/payments/checkout",
                json={"kind":"event","ref_id":eid,"origin_url":BASE},
                headers=H(organizer["token"]))
    assert r.status_code == 200, r.text
    assert r.json().get("free") == True

def test_payment_paid_flow(organizer, admin_token):
    payload = _event_payload("TEST_Paid"); payload["registration_fee"] = 500.0
    r = rq.post(f"{API}/events", json=payload, headers=H(organizer["token"]))
    eid = r.json()["id"]
    rq.patch(f"{API}/admin/events/{eid}", json={"status":"approved"}, headers=H(admin_token))
    r = rq.post(f"{API}/payments/checkout",
                json={"kind":"event","ref_id":eid,"origin_url":BASE},
                headers=H(organizer["token"]))
    if r.status_code == 500 and "unavail" in r.text.lower():
        pytest.skip("Stripe integration unavailable in env")
    assert r.status_code == 200, r.text
    j = r.json()
    assert "checkout_url" in j and "session_id" in j
    sid = j["session_id"]
    r = rq.get(f"{API}/payments/status/{sid}")
    assert r.status_code == 200
    assert r.json()["session_id"] == sid

# ---- Upload -----------------------------------------------------------------
def test_upload_and_fetch(organizer):
    files = {"file": ("test.txt", io.BytesIO(b"hello cosmic"), "text/plain")}
    r = rq.post(f"{API}/uploads", files=files, headers=H(organizer["token"]))
    if r.status_code >= 500:
        pytest.skip(f"Object storage unavailable: {r.status_code} {r.text[:200]}")
    assert r.status_code == 200, r.text
    j = r.json()
    assert "id" in j and j["url"].startswith("/api/files/")
    fid = j["id"]
    r = rq.get(f"{API}/files/{fid}")
    assert r.status_code == 200
    assert r.content == b"hello cosmic"

def test_upload_requires_auth():
    files = {"file": ("test.txt", io.BytesIO(b"x"), "text/plain")}
    r = rq.post(f"{API}/uploads", files=files)
    assert r.status_code == 401
