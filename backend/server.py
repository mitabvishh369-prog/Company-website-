"""Cosmic Elemental backend – FastAPI + MongoDB."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os, uuid, logging, secrets, jwt, bcrypt, requests
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any, Annotated
from bson import ObjectId

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File
from fastapi.responses import Response as FastAPIResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, BeforeValidator

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cosmic")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
APP_NAME = os.environ.get("APP_NAME", "cosmic-elemental")

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
_storage_key = None

def init_storage():
    global _storage_key
    if _storage_key:
        return _storage_key
    r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    r.raise_for_status()
    _storage_key = r.json()["storage_key"]
    return _storage_key

def put_object(path, data, content_type):
    k = init_storage()
    r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": k, "Content-Type": content_type}, data=data, timeout=120)
    r.raise_for_status()
    return r.json()

def get_object(path):
    k = init_storage()
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": k}, timeout=60)
    r.raise_for_status()
    return r.content, r.headers.get("Content-Type", "application/octet-stream")

def hash_password(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def verify_password(p, h):
    try: return bcrypt.checkpw(p.encode(), h.encode())
    except Exception: return False

def create_access_token(uid, email, role):
    payload = {"sub": uid, "email": email, "role": role,
               "exp": datetime.now(timezone.utc) + timedelta(days=7), "type": "access"}
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)

async def get_current_user(request: Request):
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "): token = auth[7:]
    if not token: raise HTTPException(401, "Not authenticated")
    try: payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.ExpiredSignatureError: raise HTTPException(401, "Token expired")
    except jwt.InvalidTokenError: raise HTTPException(401, "Invalid token")
    user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
    if not user: raise HTTPException(401, "User not found")
    user["id"] = str(user["_id"]); user.pop("_id", None); user.pop("password_hash", None)
    return user

async def require_admin(user: dict = Depends(get_current_user)):
    if user.get("role") != "admin": raise HTTPException(403, "Admin only")
    return user

def public_user(u):
    return {"id": str(u.get("_id") or u.get("id")), "email": u.get("email"),
            "name": u.get("name"), "role": u.get("role"), "avatar_url": u.get("avatar_url"),
            "created_at": u.get("created_at")}

def serialize(d):
    if not d: return d
    if "_id" in d: d["id"] = str(d["_id"]); d.pop("_id", None)
    return d

class RegisterIn(BaseModel):
    email: EmailStr; password: str = Field(min_length=6); name: str
    role: Optional[str] = "user"
class LoginIn(BaseModel):
    email: EmailStr; password: str
class GoogleAuthIn(BaseModel):
    session_id: str
class RoleUpdate(BaseModel):
    role: str
class EventIn(BaseModel):
    title: str; description: str; event_type: str; art_form: str
    date: str; end_date: Optional[str] = None
    venue: str; city: str; state: Optional[str] = ""; country: str
    registration_deadline: Optional[str] = None
    registration_fee: float = 0.0; prize_money: float = 0.0
    judges: List[str] = []; guest_artists: List[str] = []
    schedule: Optional[str] = ""; sponsors: List[str] = []
    contact_email: Optional[str] = ""; contact_phone: Optional[str] = ""
    capacity: int = 0
    poster_url: Optional[str] = ""; images: List[str] = []; videos: List[str] = []
    rules: Optional[str] = ""; skill_level: Optional[str] = "All Levels"
    faqs: List[dict] = []
class ClassIn(BaseModel):
    title: str; description: str; instructor_name: str; instructor_bio: Optional[str] = ""
    art_form: str; skill_level: str = "Beginner"; mode: str = "Offline"
    venue: Optional[str] = ""; city: str; country: str
    schedule: str; duration: Optional[str] = ""
    fee: float = 0.0; batch_timings: List[str] = []; seats: int = 0
    images: List[str] = []; videos: List[str] = []
    contact_email: Optional[str] = ""; contact_phone: Optional[str] = ""
class ArtistProfileIn(BaseModel):
    stage_name: str; specializations: List[str] = []; bio: str = ""
    city: str; country: str
    experience_years: int = 0; achievements: List[str] = []
    portfolio_images: List[str] = []; portfolio_videos: List[str] = []
    avatar_url: Optional[str] = ""; cover_url: Optional[str] = ""
    social_links: dict = {}
    contact_email: Optional[str] = ""; contact_phone: Optional[str] = ""
class BookingIn(BaseModel):
    artist_id: str
    company_name: str; contact_person: str
    email: EmailStr; phone: str
    project_name: str; city: str; date: str
    budget: Optional[float] = None; requirements: str
class CheckoutIn(BaseModel):
    kind: str; ref_id: str; origin_url: str
class ApprovalIn(BaseModel):
    status: str; reason: Optional[str] = ""

app = FastAPI(title="Cosmic Elemental API")
api = APIRouter(prefix="/api")

@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.events.create_index([("status", 1), ("date", 1)])
        await db.classes.create_index([("status", 1), ("city", 1)])
        await db.artists.create_index([("status", 1), ("city", 1)])
        admin_email = os.environ["ADMIN_EMAIL"].lower()
        admin_pw = os.environ["ADMIN_PASSWORD"]
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            await db.users.insert_one({
                "email": admin_email, "password_hash": hash_password(admin_pw),
                "name": "Cosmic Admin", "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat()})
            logger.info(f"Seeded admin {admin_email}")
        else:
            upd = {}
            if not verify_password(admin_pw, existing["password_hash"]):
                upd["password_hash"] = hash_password(admin_pw)
            if existing.get("role") != "admin": upd["role"] = "admin"
            if upd: await db.users.update_one({"_id": existing["_id"]}, {"$set": upd})
        try: init_storage(); logger.info("Storage initialized")
        except Exception as e: logger.warning(f"Storage init deferred: {e}")
    except Exception as e:
        logger.error(f"Startup err: {e}")

def _set_auth_cookie(resp, token):
    resp.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=7*24*3600, path="/")

@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}): raise HTTPException(400, "Email already registered")
    role = body.role if body.role in {"user","artist","organizer","instructor"} else "user"
    doc = {"email": email, "password_hash": hash_password(body.password),
           "name": body.name, "role": role, "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.users.insert_one(doc); doc["_id"] = r.inserted_id
    token = create_access_token(str(r.inserted_id), email, role)
    _set_auth_cookie(response, token)
    return {"token": token, "user": public_user(doc)}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    u = await db.users.find_one({"email": email})
    if not u or not verify_password(body.password, u["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(str(u["_id"]), email, u.get("role","user"))
    _set_auth_cookie(response, token)
    return {"token": token, "user": public_user(u)}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)): return {"user": user}

@api.post("/auth/google")
async def google_auth(body: GoogleAuthIn, response: Response):
    try:
        r = requests.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                         headers={"X-Session-ID": body.session_id}, timeout=15)
        r.raise_for_status(); data = r.json()
    except Exception as e:
        raise HTTPException(401, f"Invalid session: {e}")
    email = (data.get("email") or "").lower()
    if not email: raise HTTPException(400, "No email")
    u = await db.users.find_one({"email": email})
    if not u:
        doc = {"email": email, "password_hash": hash_password(secrets.token_urlsafe(24)),
               "name": data.get("name") or email.split("@")[0],
               "avatar_url": data.get("picture"), "role": "user", "provider": "google",
               "created_at": datetime.now(timezone.utc).isoformat()}
        rr = await db.users.insert_one(doc); doc["_id"] = rr.inserted_id; u = doc
    token = create_access_token(str(u["_id"]), email, u.get("role","user"))
    _set_auth_cookie(response, token)
    return {"token": token, "user": public_user(u)}

@api.patch("/users/me/role")
async def update_role(body: RoleUpdate, user: dict = Depends(get_current_user)):
    if body.role not in {"user","artist","organizer","instructor"}:
        raise HTTPException(400, "Invalid role")
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"role": body.role}})
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    return {"user": public_user(u)}

@api.post("/uploads")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename or "").split(".")[-1].lower() if "." in (file.filename or "") else "bin"
    fid = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{user['id']}/{fid}.{ext}"
    data = await file.read()
    ct = file.content_type or "application/octet-stream"
    result = put_object(path, data, ct)
    await db.files.insert_one({
        "id": fid, "storage_path": result["path"], "owner_id": user["id"],
        "content_type": ct, "size": result.get("size"), "original_filename": file.filename,
        "is_deleted": False, "created_at": datetime.now(timezone.utc).isoformat()})
    return {"id": fid, "url": f"/api/files/{fid}", "path": result["path"], "content_type": ct}

@api.get("/files/{fid}")
async def get_file(fid: str):
    rec = await db.files.find_one({"id": fid, "is_deleted": False})
    if not rec: raise HTTPException(404, "File not found")
    data, ct = get_object(rec["storage_path"])
    return FastAPIResponse(content=data, media_type=rec.get("content_type") or ct,
                           headers={"Cache-Control": "public, max-age=86400"})

# ---------- Events ----------
@api.post("/events")
async def create_event(body: EventIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({"organizer_id": user["id"], "organizer_name": user.get("name"),
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()})
    r = await db.events.insert_one(doc); doc["_id"] = r.inserted_id
    return serialize(doc)

@api.get("/events")
async def list_events(request: Request,
    country: Optional[str] = None, state: Optional[str] = None, city: Optional[str] = None,
    art_form: Optional[str] = None, event_type: Optional[str] = None,
    organizer: Optional[str] = None, skill_level: Optional[str] = None,
    q: Optional[str] = None, status: Optional[str] = "approved", mine: bool = False):
    query = {}
    if mine:
        user = await get_current_user(request); query["organizer_id"] = user["id"]
        if status and status != "any": query["status"] = status
    else:
        query["status"] = status or "approved"
    for k, v in [("country",country),("state",state),("city",city),("art_form",art_form),
                 ("event_type",event_type),("organizer_name",organizer),("skill_level",skill_level)]:
        if v: query[k] = {"$regex": f"^{v}$", "$options": "i"}
    if q: query["$or"] = [{"title":{"$regex":q,"$options":"i"}},{"description":{"$regex":q,"$options":"i"}}]
    docs = await db.events.find(query).sort("date", 1).to_list(200)
    return [serialize(d) for d in docs]

@api.get("/events/{eid}")
async def get_event(eid: str):
    try: d = await db.events.find_one({"_id": ObjectId(eid)})
    except Exception: d = None
    if not d: raise HTTPException(404, "Event not found")
    return serialize(d)

@api.put("/events/{eid}")
async def update_event(eid: str, body: EventIn, user: dict = Depends(get_current_user)):
    d = await db.events.find_one({"_id": ObjectId(eid)})
    if not d: raise HTTPException(404, "Not found")
    if d["organizer_id"] != user["id"] and user["role"] != "admin": raise HTTPException(403, "Forbidden")
    upd = body.model_dump(); upd["updated_at"] = datetime.now(timezone.utc).isoformat(); upd["status"] = "pending"
    await db.events.update_one({"_id": ObjectId(eid)}, {"$set": upd})
    return serialize(await db.events.find_one({"_id": ObjectId(eid)}))

@api.delete("/events/{eid}")
async def delete_event(eid: str, user: dict = Depends(get_current_user)):
    d = await db.events.find_one({"_id": ObjectId(eid)})
    if not d: raise HTTPException(404, "Not found")
    if d["organizer_id"] != user["id"] and user["role"] != "admin": raise HTTPException(403, "Forbidden")
    await db.events.delete_one({"_id": ObjectId(eid)}); return {"ok": True}

# ---------- Classes ----------
@api.post("/classes")
async def create_class(body: ClassIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({"instructor_id": user["id"], "instructor_owner_name": user.get("name"),
                "status": "pending",
                "created_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()})
    r = await db.classes.insert_one(doc); doc["_id"] = r.inserted_id
    return serialize(doc)

@api.get("/classes")
async def list_classes(request: Request,
    art_form: Optional[str] = None, city: Optional[str] = None, instructor: Optional[str] = None,
    skill_level: Optional[str] = None, mode: Optional[str] = None,
    q: Optional[str] = None, status: Optional[str] = "approved", mine: bool = False):
    query = {}
    if mine:
        user = await get_current_user(request); query["instructor_id"] = user["id"]
        if status and status != "any": query["status"] = status
    else:
        query["status"] = status or "approved"
    for k, v in [("art_form",art_form),("city",city),("instructor_name",instructor),
                 ("skill_level",skill_level),("mode",mode)]:
        if v: query[k] = {"$regex": f"^{v}$", "$options": "i"}
    if q: query["$or"] = [{"title":{"$regex":q,"$options":"i"}},{"description":{"$regex":q,"$options":"i"}}]
    docs = await db.classes.find(query).sort("created_at", -1).to_list(200)
    return [serialize(d) for d in docs]

@api.get("/classes/{cid}")
async def get_class(cid: str):
    try: d = await db.classes.find_one({"_id": ObjectId(cid)})
    except Exception: d = None
    if not d: raise HTTPException(404, "Not found")
    return serialize(d)

@api.put("/classes/{cid}")
async def update_class(cid: str, body: ClassIn, user: dict = Depends(get_current_user)):
    d = await db.classes.find_one({"_id": ObjectId(cid)})
    if not d: raise HTTPException(404, "Not found")
    if d["instructor_id"] != user["id"] and user["role"] != "admin": raise HTTPException(403, "Forbidden")
    upd = body.model_dump(); upd["updated_at"] = datetime.now(timezone.utc).isoformat(); upd["status"]="pending"
    await db.classes.update_one({"_id": ObjectId(cid)}, {"$set": upd})
    return serialize(await db.classes.find_one({"_id": ObjectId(cid)}))

@api.delete("/classes/{cid}")
async def delete_class(cid: str, user: dict = Depends(get_current_user)):
    d = await db.classes.find_one({"_id": ObjectId(cid)})
    if not d: raise HTTPException(404, "Not found")
    if d["instructor_id"] != user["id"] and user["role"] != "admin": raise HTTPException(403, "Forbidden")
    await db.classes.delete_one({"_id": ObjectId(cid)}); return {"ok": True}

# ---------- Artists ----------
@api.post("/artists")
async def upsert_artist(body: ArtistProfileIn, user: dict = Depends(get_current_user)):
    existing = await db.artists.find_one({"user_id": user["id"]})
    doc = body.model_dump()
    doc.update({"user_id": user["id"], "user_email": user.get("email"),
                "updated_at": datetime.now(timezone.utc).isoformat(), "status": "pending"})
    if existing:
        await db.artists.update_one({"_id": existing["_id"]}, {"$set": doc})
        return serialize(await db.artists.find_one({"_id": existing["_id"]}))
    doc["created_at"] = doc["updated_at"]
    r = await db.artists.insert_one(doc); doc["_id"] = r.inserted_id
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"role": "artist"}})
    return serialize(doc)

@api.get("/artists")
async def list_artists(request: Request,
    art_form: Optional[str] = None, specialization: Optional[str] = None,
    city: Optional[str] = None, q: Optional[str] = None,
    status: Optional[str] = "approved", mine: bool = False):
    query = {}
    if mine:
        user = await get_current_user(request); query["user_id"] = user["id"]
        if status and status != "any": query["status"] = status
    else:
        query["status"] = status or "approved"
    if city: query["city"] = {"$regex": f"^{city}$", "$options": "i"}
    spec = specialization or art_form
    if spec: query["specializations"] = {"$regex": spec, "$options": "i"}
    if q: query["$or"] = [{"stage_name":{"$regex":q,"$options":"i"}},{"bio":{"$regex":q,"$options":"i"}}]
    docs = await db.artists.find(query).sort("created_at", -1).to_list(200)
    return [serialize(d) for d in docs]

@api.get("/artists/mine/profile")
async def my_artist_profile(user: dict = Depends(get_current_user)):
    d = await db.artists.find_one({"user_id": user["id"]})
    return serialize(d) if d else None

@api.get("/artists/{aid}")
async def get_artist(aid: str):
    try: d = await db.artists.find_one({"_id": ObjectId(aid)})
    except Exception: d = None
    if not d: raise HTTPException(404, "Not found")
    return serialize(d)

# ---------- Bookings ----------
@api.post("/bookings")
async def create_booking(body: BookingIn):
    try: artist = await db.artists.find_one({"_id": ObjectId(body.artist_id)})
    except Exception: artist = None
    if not artist: raise HTTPException(404, "Artist not found")
    doc = body.model_dump()
    doc.update({"artist_name": artist.get("stage_name"), "status": "new",
                "created_at": datetime.now(timezone.utc).isoformat()})
    r = await db.bookings.insert_one(doc); doc["_id"] = r.inserted_id
    return serialize(doc)

@api.get("/bookings")
async def list_bookings(admin: dict = Depends(require_admin)):
    docs = await db.bookings.find().sort("created_at", -1).to_list(500)
    return [serialize(d) for d in docs]

@api.patch("/bookings/{bid}")
async def update_booking(bid: str, body: dict, admin: dict = Depends(require_admin)):
    allowed = {k:v for k,v in body.items() if k in {"status","notes"}}
    await db.bookings.update_one({"_id": ObjectId(bid)}, {"$set": allowed})
    return serialize(await db.bookings.find_one({"_id": ObjectId(bid)}))

# ---------- Admin ----------
@api.get("/admin/pending")
async def admin_pending(admin: dict = Depends(require_admin)):
    events = [serialize(d) for d in await db.events.find({"status":"pending"}).to_list(500)]
    classes = [serialize(d) for d in await db.classes.find({"status":"pending"}).to_list(500)]
    artists = [serialize(d) for d in await db.artists.find({"status":"pending"}).to_list(500)]
    return {"events": events, "classes": classes, "artists": artists}

@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    return {
        "users": await db.users.count_documents({}),
        "events_approved": await db.events.count_documents({"status":"approved"}),
        "events_pending": await db.events.count_documents({"status":"pending"}),
        "classes_approved": await db.classes.count_documents({"status":"approved"}),
        "classes_pending": await db.classes.count_documents({"status":"pending"}),
        "artists_approved": await db.artists.count_documents({"status":"approved"}),
        "artists_pending": await db.artists.count_documents({"status":"pending"}),
        "bookings": await db.bookings.count_documents({}),
        "registrations": await db.registrations.count_documents({}),
    }

@api.patch("/admin/{kind}/{item_id}")
async def admin_approve(kind: str, item_id: str, body: ApprovalIn, admin: dict = Depends(require_admin)):
    coll = {"events": db.events, "classes": db.classes, "artists": db.artists}.get(kind)
    if coll is None: raise HTTPException(400, "Invalid kind")
    if body.status not in {"approved","rejected"}: raise HTTPException(400, "Invalid status")
    await coll.update_one({"_id": ObjectId(item_id)}, {"$set": {
        "status": body.status, "review_reason": body.reason,
        "reviewed_at": datetime.now(timezone.utc).isoformat(),
        "reviewer_id": admin["id"]}})
    return serialize(await coll.find_one({"_id": ObjectId(item_id)}))

# ---------- Payments (Flow B) ----------
try:
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    STRIPE_AVAILABLE = True
except Exception as e:
    STRIPE_AVAILABLE = False
    logger.warning(f"emergentintegrations not available: {e}")

@api.post("/payments/checkout")
async def checkout(body: CheckoutIn, request: Request, user: dict = Depends(get_current_user)):
    if not STRIPE_AVAILABLE: raise HTTPException(500, "Payments unavailable")
    if body.kind == "event":
        item = await db.events.find_one({"_id": ObjectId(body.ref_id)})
        amount = float(item.get("registration_fee") or 0) if item else 0
        title = item.get("title") if item else ""
    elif body.kind == "class":
        item = await db.classes.find_one({"_id": ObjectId(body.ref_id)})
        amount = float(item.get("fee") or 0) if item else 0
        title = item.get("title") if item else ""
    else: raise HTTPException(400, "Invalid kind")
    if not item: raise HTTPException(404, "Item not found")
    if amount <= 0:
        await db.registrations.insert_one({
            "kind": body.kind, "ref_id": body.ref_id, "user_id": user["id"],
            "email": user["email"], "name": user.get("name"),
            "status": "confirmed", "amount": 0,
            "created_at": datetime.now(timezone.utc).isoformat()})
        return {"free": True, "checkout_url": f"{body.origin_url}/payment/success?free=1"}
    host_url = str(request.base_url)
    webhook_url = f"{host_url}api/webhook/stripe"
    checkout_obj = StripeCheckout(api_key=os.environ.get("STRIPE_API_KEY","sk_test_emergent"), webhook_url=webhook_url)
    req = CheckoutSessionRequest(
        amount=float(amount), currency="usd",
        success_url=f"{body.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{body.origin_url}/payment/cancel",
        metadata={"kind": body.kind, "ref_id": body.ref_id, "user_id": user["id"],
                  "email": user["email"], "title": (title or "")[:100]})
    session = await checkout_obj.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id, "user_id": user["id"], "email": user["email"],
        "kind": body.kind, "ref_id": body.ref_id, "title": title,
        "amount": float(amount), "currency": "usd",
        "status": "initiated", "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()})
    return {"checkout_url": session.url, "session_id": session.session_id}

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str):
    rec = await db.payment_transactions.find_one({"session_id": session_id})
    if not rec: raise HTTPException(404, "Not found")
    if rec.get("payment_status") != "paid" and STRIPE_AVAILABLE:
        try:
            checkout_obj = StripeCheckout(api_key=os.environ.get("STRIPE_API_KEY","sk_test_emergent"), webhook_url="")
            status = await checkout_obj.get_checkout_status(session_id)
            if status.payment_status == "paid" or status.status == "complete":
                await db.payment_transactions.update_one(
                    {"session_id": session_id, "payment_status": {"$ne":"paid"}},
                    {"$set": {"status":"completed","payment_status":"paid",
                              "updated_at": datetime.now(timezone.utc).isoformat()}})
                await _record_paid_registration(rec)
                rec = await db.payment_transactions.find_one({"session_id": session_id})
        except Exception as e:
            logger.warning(f"status lookup: {e}")
    return {"session_id": rec["session_id"], "status": rec["status"],
            "payment_status": rec["payment_status"], "amount": rec.get("amount"),
            "title": rec.get("title")}

async def _record_paid_registration(rec):
    exists = await db.registrations.find_one({"session_id": rec["session_id"]})
    if exists: return
    await db.registrations.insert_one({
        "kind": rec["kind"], "ref_id": rec["ref_id"], "user_id": rec.get("user_id"),
        "email": rec.get("email"), "session_id": rec["session_id"],
        "amount": rec.get("amount"), "status": "confirmed",
        "created_at": datetime.now(timezone.utc).isoformat()})

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    if not STRIPE_AVAILABLE: return {"ok": True}
    body_bytes = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        checkout_obj = StripeCheckout(api_key=os.environ.get("STRIPE_API_KEY","sk_test_emergent"), webhook_url="")
        r = await checkout_obj.handle_webhook(body_bytes, sig)
        if r.payment_status == "paid":
            await db.payment_transactions.update_one(
                {"session_id": r.session_id, "payment_status": {"$ne":"paid"}},
                {"$set": {"status":"completed","payment_status":"paid",
                          "updated_at": datetime.now(timezone.utc).isoformat()}})
            rec = await db.payment_transactions.find_one({"session_id": r.session_id})
            if rec: await _record_paid_registration(rec)
    except Exception as e:
        logger.error(f"webhook err: {e}")
    return {"ok": True}

@api.get("/")
async def root(): return {"service": "Cosmic Elemental API", "ok": True}

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown(): client.close()
