"""Phase 3 backend tests: public stats, artist ratings, admin finance, subscription auto-renew."""
import os, uuid, io, csv, time
import pytest, requests
from dotenv import load_dotenv

load_dotenv("/app/backend/.env")
load_dotenv("/app/frontend/.env")

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://cosmic-events-13.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "mitabvishh369@gmail.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "Cosmic@Admin2026!")


# -------- Fixtures --------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="module")
def user_token():
    email = f"test_p3_{uuid.uuid4().hex[:8]}@example.com"
    r = requests.post(f"{API}/auth/register",
                      json={"email": email, "password": "TestPass123!", "name": "P3 User"}, timeout=30)
    assert r.status_code in (200, 201), r.text
    return r.json()["token"], email


@pytest.fixture(scope="module")
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token[0]}"}


@pytest.fixture(scope="module")
def artist_id(admin_headers):
    """Find/create an approved artist for rating tests."""
    r = requests.get(f"{API}/artists", timeout=30)
    assert r.status_code == 200
    lst = r.json()
    for a in lst:
        if a.get("status") == "approved":
            return a["id"]
    # else create one via admin and approve
    email2 = f"test_artist_{uuid.uuid4().hex[:6]}@example.com"
    reg = requests.post(f"{API}/auth/register",
                        json={"email": email2, "password": "TestPass123!", "name": "P3 Artist"}, timeout=30)
    tok = reg.json()["token"]
    ah = {"Authorization": f"Bearer {tok}"}
    requests.patch(f"{API}/users/me/role", json={"role": "artist"}, headers=ah, timeout=30)
    r2 = requests.post(f"{API}/artists", headers=ah, json={
        "name": "TEST P3 Artist", "bio": "test", "specializations": ["fire"],
        "country": "India", "city": "Mumbai"
    }, timeout=30)
    aid = r2.json()["id"]
    requests.patch(f"{API}/admin/artists/{aid}/approve", headers=admin_headers, timeout=30)
    return aid


# -------- Public stats --------
class TestPublicStats:
    def test_public_stats_shape(self):
        r = requests.get(f"{API}/stats/public", timeout=30)
        assert r.status_code == 200
        d = r.json()
        for k in ["events", "classes", "artists", "users", "countries"]:
            assert k in d
            assert isinstance(d[k], int)
            assert d[k] >= 0


# -------- Artist ratings --------
class TestArtistRatings:
    def test_rate_artist_validation_low(self, user_headers, artist_id):
        r = requests.post(f"{API}/artists/{artist_id}/ratings",
                          headers=user_headers, json={"stars": 0}, timeout=30)
        assert r.status_code == 422

    def test_rate_artist_validation_high(self, user_headers, artist_id):
        r = requests.post(f"{API}/artists/{artist_id}/ratings",
                          headers=user_headers, json={"stars": 6}, timeout=30)
        assert r.status_code == 422

    def test_rate_artist_ok_and_upsert(self, user_headers, artist_id):
        r = requests.post(f"{API}/artists/{artist_id}/ratings",
                          headers=user_headers,
                          json={"stars": 4, "comment": "Great!", "project_name": "P1"}, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["ok"] is True
        assert d["rating_count"] >= 1
        assert 1 <= d["rating_avg"] <= 5
        count_after_first = d["rating_count"]

        # Second post by same user -> upsert, count unchanged
        r2 = requests.post(f"{API}/artists/{artist_id}/ratings",
                           headers=user_headers,
                           json={"stars": 5, "comment": "Better"}, timeout=30)
        assert r2.status_code == 200
        assert r2.json()["rating_count"] == count_after_first

    def test_list_ratings(self, artist_id):
        r = requests.get(f"{API}/artists/{artist_id}/ratings", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_artist_detail_has_rating_fields(self, artist_id):
        r = requests.get(f"{API}/artists/{artist_id}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "rating_avg" in d and "rating_count" in d
        assert d["rating_count"] >= 1


# -------- Subscription auto-renew --------
class TestSubscriptionCheckout:
    def _new_user_headers(self):
        email = f"test_sub_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/auth/register",
                          json={"email": email, "password": "TestPass123!", "name": "Sub"}, timeout=30)
        return {"Authorization": f"Bearer {r.json()['token']}"}, email

    def test_paid_checkout_returns_auto_renew(self):
        h, email = self._new_user_headers()
        # Consume trial first
        r1 = requests.post(f"{API}/subscriptions/checkout", headers=h,
                           json={"plan": "artist", "origin_url": BASE}, timeout=45)
        assert r1.status_code == 200, r1.text
        assert r1.json().get("free_trial") is True

        # Second call -> paid path
        r2 = requests.post(f"{API}/subscriptions/checkout", headers=h,
                           json={"plan": "artist", "origin_url": BASE}, timeout=60)
        assert r2.status_code == 200, r2.text
        d = r2.json()
        assert d.get("auto_renew") is True
        assert d.get("checkout_url")
        assert d.get("session_id")


# -------- Admin Finance: Bank accounts --------
class TestBankAccounts:
    def test_non_admin_forbidden(self, user_headers):
        r = requests.get(f"{API}/admin/finance/bank-accounts", headers=user_headers, timeout=30)
        assert r.status_code == 403

    def test_create_lists_masked_and_primary_exclusivity(self, admin_headers):
        # Create A primary=true
        payload_a = {"account_holder": "TEST Cosmic A", "account_number": "1234567890123456",
                     "ifsc_code": "HDFC0001234", "bank_name": "HDFC", "branch": "MG Rd",
                     "account_type": "current", "is_primary": True}
        ra = requests.post(f"{API}/admin/finance/bank-accounts", headers=admin_headers, json=payload_a, timeout=30)
        assert ra.status_code == 200, ra.text
        a = ra.json()
        assert "account_number" not in a  # masked
        assert a.get("account_number_masked", "").endswith("3456")
        assert a["is_primary"] is True
        aid = a["id"]

        # Create B primary=true -> A should become non-primary
        payload_b = dict(payload_a)
        payload_b.update({"account_holder": "TEST Cosmic B", "account_number": "9876543210001111",
                          "is_primary": True})
        rb = requests.post(f"{API}/admin/finance/bank-accounts", headers=admin_headers, json=payload_b, timeout=30)
        assert rb.status_code == 200
        bid = rb.json()["id"]

        lst = requests.get(f"{API}/admin/finance/bank-accounts", headers=admin_headers, timeout=30).json()
        by_id = {x["id"]: x for x in lst}
        assert by_id[aid]["is_primary"] is False
        assert by_id[bid]["is_primary"] is True
        assert "account_number" not in by_id[aid]
        assert by_id[aid]["account_number_masked"].endswith("3456")

        # Toggle primary back to A
        rp = requests.patch(f"{API}/admin/finance/bank-accounts/{aid}/primary", headers=admin_headers, timeout=30)
        assert rp.status_code == 200
        assert rp.json()["is_primary"] is True

        # OTP send
        rs = requests.post(f"{API}/admin/finance/bank-accounts/{aid}/otp-send",
                           headers=admin_headers, timeout=30)
        assert rs.status_code == 200, rs.text
        sd = rs.json()
        assert sd["ok"] is True
        assert sd["sent_to"] == ADMIN_EMAIL
        assert sd["expires_at"]

        # Wrong OTP -> 400
        rw = requests.patch(f"{API}/admin/finance/bank-accounts/{aid}/verify",
                            headers=admin_headers, json={"otp": "000000"}, timeout=30)
        # Wrong OTP could match by luck (1e-6) — accept 400 primarily
        assert rw.status_code in (400,)

        # Fetch OTP directly from DB to test the correct path
        # (can't from API, so simulate by using a known otp - skip actual verify unless we can read it)
        # Attempt: use motor to read - but we're an external test. Alternative: assert OTP flow with a stub is not possible; leave verify success out of scope.

        # PUT (update) resets verified to False
        upd = dict(payload_a); upd["branch"] = "Updated Branch"; upd["is_primary"] = True
        ru = requests.patch(f"{API}/admin/finance/bank-accounts/{aid}", headers=admin_headers, json=upd, timeout=30)
        assert ru.status_code == 200
        assert ru.json()["verified"] is False

        # Cleanup
        requests.delete(f"{API}/admin/finance/bank-accounts/{aid}", headers=admin_headers, timeout=30)
        requests.delete(f"{API}/admin/finance/bank-accounts/{bid}", headers=admin_headers, timeout=30)

    def test_otp_verify_success(self, admin_headers):
        """Verify OTP by reading it from Mongo."""
        from pymongo import MongoClient
        from bson import ObjectId
        payload = {"account_holder": "TEST OTP", "account_number": "1111222233334444",
                   "ifsc_code": "SBIN0001111", "bank_name": "SBI",
                   "account_type": "current", "is_primary": False}
        rc = requests.post(f"{API}/admin/finance/bank-accounts", headers=admin_headers, json=payload, timeout=30)
        bid = rc.json()["id"]
        rs = requests.post(f"{API}/admin/finance/bank-accounts/{bid}/otp-send",
                           headers=admin_headers, timeout=30)
        assert rs.status_code == 200
        cli = MongoClient(os.environ["MONGO_URL"])
        d = cli[os.environ["DB_NAME"]].bank_accounts.find_one({"_id": ObjectId(bid)})
        otp = d.get("otp")
        assert otp and len(otp) == 6
        rv = requests.patch(f"{API}/admin/finance/bank-accounts/{bid}/verify",
                            headers=admin_headers, json={"otp": otp}, timeout=30)
        assert rv.status_code == 200
        assert rv.json()["verified"] is True
        # Cleanup
        requests.delete(f"{API}/admin/finance/bank-accounts/{bid}", headers=admin_headers, timeout=30)


# -------- Admin Finance: Overview / Transactions / Payouts --------
class TestFinanceOverview:
    def test_non_admin_forbidden(self, user_headers):
        for path in ["/admin/finance/overview", "/admin/finance/transactions",
                     "/admin/finance/payouts", "/admin/finance/payouts/history"]:
            r = requests.get(f"{API}{path}", headers=user_headers, timeout=30)
            assert r.status_code == 403, path

    def test_overview_shape(self, admin_headers):
        r = requests.get(f"{API}/admin/finance/overview", headers=admin_headers, timeout=30)
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ["total_revenue", "subscription_revenue", "commission_revenue",
                  "daily_revenue", "weekly_revenue", "monthly_revenue",
                  "total_transactions", "pending_payouts", "completed_payouts"]:
            assert k in d, f"missing {k}"
            assert isinstance(d[k], (int, float))
        assert d["currency"] == "INR"

    def test_transactions_and_csv(self, admin_headers):
        r = requests.get(f"{API}/admin/finance/transactions", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        rows = r.json()
        assert isinstance(rows, list)
        if rows:
            assert "user_name" in rows[0] and "organizer_name" in rows[0]

        r2 = requests.get(f"{API}/admin/finance/transactions",
                          headers=admin_headers, params={"kind": "subscription"}, timeout=30)
        assert r2.status_code == 200
        for row in r2.json():
            assert row.get("kind") == "subscription"

        rcsv = requests.get(f"{API}/admin/finance/transactions.csv", headers=admin_headers, timeout=30)
        assert rcsv.status_code == 200
        assert "text/csv" in rcsv.headers.get("content-type", "")
        first = rcsv.text.splitlines()[0]
        for col in ["Transaction ID", "Kind", "User Email", "Amount", "Commission", "Net Organizer", "Payment Status"]:
            assert col in first

    def test_payouts_flow(self, admin_headers):
        r = requests.get(f"{API}/admin/finance/payouts", headers=admin_headers, timeout=30)
        assert r.status_code == 200
        by_org = r.json()
        assert isinstance(by_org, list)
        for row in by_org:
            for k in ["organizer_id", "gross", "commission", "net", "count", "paid_out", "pending_amount"]:
                assert k in row

        # Create synthetic payout
        payload = {"organizer_id": "TEST_ORG_" + uuid.uuid4().hex[:6],
                   "amount": 100.0, "method": "bank_transfer",
                   "reference": "TEST_REF", "notes": "phase3 test"}
        rc = requests.post(f"{API}/admin/finance/payouts", headers=admin_headers, json=payload, timeout=30)
        assert rc.status_code == 200
        assert rc.json()["status"] == "completed"

        rh = requests.get(f"{API}/admin/finance/payouts/history", headers=admin_headers, timeout=30)
        assert rh.status_code == 200
        assert any(p.get("reference") == "TEST_REF" for p in rh.json())

        rcsv = requests.get(f"{API}/admin/finance/payouts.csv", headers=admin_headers, timeout=30)
        assert rcsv.status_code == 200
        assert "text/csv" in rcsv.headers.get("content-type", "")
        assert "Payout ID" in rcsv.text.splitlines()[0]
