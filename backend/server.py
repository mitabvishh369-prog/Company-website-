"""Cosmic Elemental backend – FastAPI + MongoDB (Phase 2)."""
from dotenv import load_dotenv
from pathlib import Path
ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os, uuid, logging, secrets, jwt, bcrypt, requests, csv, io, asyncio
from datetime import datetime, timezone, timedelta
from typing import Optional, List, Any
from bson import ObjectId

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends, UploadFile, File, BackgroundTasks
from fastapi.responses import Response as FastAPIResponse, StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr

from emails import (
    send_email, registration_confirmation, organizer_new_registration,
    approval_notification, booking_received, booking_admin_alert, subscription_active
)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("cosmic")

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGO = "HS256"
APP_NAME = os.environ.get("APP_NAME", "cosmic-elemental")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "")
CURRENCY = os.environ.get("CURRENCY", "inr").lower()
COMMISSION_PCT = float(os.environ.get("PLATFORM_COMMISSION_PCT", "6"))
FREE_TRIAL_DAYS = int(os.environ.get("FREE_TRIAL_DAYS", "30"))

PLANS = {
    "viewer": {"id":"viewer","name":"Audience","price": float(os.environ.get("PLAN_VIEWER_PRICE","30")),
               "features":["Discover events","Register for events","Save favourites","Event updates","Registration history"]},
    "artist": {"id":"artist","name":"Artist","price": float(os.environ.get("PLAN_ARTIST_PRICE","99")),
               "features":["Professional artist portfolio","Photo & video uploads","Experience, achievements & specialization","Publish classes/workshops","Receive booking inquiries","Artist dashboard"]},
    "organizer": {"id":"organizer","name":"Organizer","price": float(os.environ.get("PLAN_ORGANIZER_PRICE","99")),
               "features":["Create & manage events","Accept registrations","Manage flyers & content","Organizer dashboard","Registration analytics & CSV export"]},
}

STORAGE_URL = "https://integrations.emergentagent.com/objstore/api/v1/storage"
EMERGENT_KEY = os.environ.get("EMERGENT_LLM_KEY")
_storage_key = None
def init_storage():
    global _storage_key
    if _storage_key: return _storage_key
    r = requests.post(f"{STORAGE_URL}/init", json={"emergent_key": EMERGENT_KEY}, timeout=30)
    r.raise_for_status(); _storage_key = r.json()["storage_key"]; return _storage_key
def put_object(path, data, ct):
    k = init_storage()
    r = requests.put(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": k, "Content-Type": ct}, data=data, timeout=120)
    r.raise_for_status(); return r.json()
def get_object(path):
    k = init_storage()
    r = requests.get(f"{STORAGE_URL}/objects/{path}", headers={"X-Storage-Key": k}, timeout=60)
    r.raise_for_status(); return r.content, r.headers.get("Content-Type","application/octet-stream")

def hash_password(p): return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()
def verify_password(p, h):
    try: return bcrypt.checkpw(p.encode(), h.encode())
    except Exception: return False
def create_access_token(uid, email, role):
    return jwt.encode({"sub": uid, "email": email, "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(days=7), "type":"access"}, JWT_SECRET, algorithm=JWT_ALGO)

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
            "plan": u.get("plan"), "plan_status": u.get("plan_status"),
            "plan_expires_at": u.get("plan_expires_at"),
            "created_at": u.get("created_at")}

def serialize(d):
    if not d: return d
    if "_id" in d: d["id"] = str(d["_id"]); d.pop("_id", None)
    return d

# --------- Models ---------
class RegisterIn(BaseModel):
    email: EmailStr; password: str = Field(min_length=6); name: str
    role: Optional[str] = "user"
class LoginIn(BaseModel):
    email: EmailStr; password: str
class GoogleAuthIn(BaseModel):
    session_id: str
class RoleUpdate(BaseModel):
    role: str
class TicketType(BaseModel):
    name: str = "Standard"; price: float = 0.0
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
    poster_url: Optional[str] = ""
    images: List[str] = []; videos: List[str] = []
    flyers: List[str] = []   # NEW: ordered flyer gallery (organizer-controlled order)
    art_categories: List[str] = []  # NEW: categories for registration form
    ticket_types: List[TicketType] = []  # NEW: multiple ticket tiers
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
class Participant(BaseModel):
    name: str; email: EmailStr; phone: str
    category: Optional[str] = ""    # art / dance category
    ticket_type: Optional[str] = "Standard"
class CheckoutIn(BaseModel):
    kind: str  # 'event' | 'class'
    ref_id: str
    origin_url: str
    participant: Optional[Participant] = None
class SubscribeIn(BaseModel):
    plan: str  # viewer | artist | organizer
    origin_url: str
class ApprovalIn(BaseModel):
    status: str; reason: Optional[str] = ""
class FeatureToggle(BaseModel):
    featured: bool
class ReorderIn(BaseModel):
    order: List[str]   # ordered urls

# --------- App setup ---------
app = FastAPI(title="Cosmic Elemental API")
api = APIRouter(prefix="/api")

@app.on_event("startup")
async def startup():
    try:
        await db.users.create_index("email", unique=True)
        await db.events.create_index([("status", 1), ("date", 1)])
        await db.classes.create_index([("status", 1), ("city", 1)])
        await db.artists.create_index([("status", 1), ("featured", -1), ("city", 1)])
        admin_email = os.environ["ADMIN_EMAIL"].lower()
        admin_pw = os.environ["ADMIN_PASSWORD"]
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_pw),
                "name": "Cosmic Admin", "role": "admin",
                "created_at": datetime.now(timezone.utc).isoformat()})
            logger.info(f"Seeded admin {admin_email}")
        else:
            upd = {}
            if not verify_password(admin_pw, existing["password_hash"]): upd["password_hash"] = hash_password(admin_pw)
            if existing.get("role") != "admin": upd["role"] = "admin"
            if upd: await db.users.update_one({"_id": existing["_id"]}, {"$set": upd})
        try: init_storage(); logger.info("Storage initialized")
        except Exception as e: logger.warning(f"Storage init deferred: {e}")
    except Exception as e:
        logger.error(f"Startup err: {e}")

def _set_auth_cookie(resp, token):
    resp.set_cookie("access_token", token, httponly=True, secure=True, samesite="none", max_age=7*24*3600, path="/")

# --------- Auth ---------
@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower()
    if await db.users.find_one({"email": email}): raise HTTPException(400, "Email already registered")
    role = body.role if body.role in {"user","artist","organizer","instructor"} else "user"
    doc = {"email": email, "password_hash": hash_password(body.password),
           "name": body.name, "role": role,
           "plan": None, "plan_status": None, "plan_expires_at": None,
           "created_at": datetime.now(timezone.utc).isoformat()}
    r = await db.users.insert_one(doc); doc["_id"] = r.inserted_id
    token = create_access_token(str(r.inserted_id), email, role); _set_auth_cookie(response, token)
    return {"token": token, "user": public_user(doc)}

@api.post("/auth/login")
async def login(body: LoginIn, response: Response):
    email = body.email.lower()
    u = await db.users.find_one({"email": email})
    if not u or not verify_password(body.password, u["password_hash"]):
        raise HTTPException(401, "Invalid email or password")
    token = create_access_token(str(u["_id"]), email, u.get("role","user")); _set_auth_cookie(response, token)
    return {"token": token, "user": public_user(u)}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/"); return {"ok": True}

@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)): return {"user": user}

@api.post("/auth/google")
async def google_auth(body: GoogleAuthIn, response: Response):
    try:
        r = requests.get("https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
                         headers={"X-Session-ID": body.session_id}, timeout=15)
        r.raise_for_status(); data = r.json()
    except Exception as e: raise HTTPException(401, f"Invalid session: {e}")
    email = (data.get("email") or "").lower()
    if not email: raise HTTPException(400, "No email")
    u = await db.users.find_one({"email": email})
    if not u:
        doc = {"email": email, "password_hash": hash_password(secrets.token_urlsafe(24)),
               "name": data.get("name") or email.split("@")[0], "avatar_url": data.get("picture"),
               "role": "user", "provider": "google",
               "created_at": datetime.now(timezone.utc).isoformat()}
        rr = await db.users.insert_one(doc); doc["_id"] = rr.inserted_id; u = doc
    token = create_access_token(str(u["_id"]), email, u.get("role","user")); _set_auth_cookie(response, token)
    return {"token": token, "user": public_user(u)}

@api.patch("/users/me/role")
async def update_role(body: RoleUpdate, user: dict = Depends(get_current_user)):
    if body.role not in {"user","artist","organizer","instructor"}: raise HTTPException(400, "Invalid role")
    await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"role": body.role}})
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    return {"user": public_user(u)}

# --------- Uploads ---------
@api.post("/uploads")
async def upload_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    ext = (file.filename or "").split(".")[-1].lower() if "." in (file.filename or "") else "bin"
    fid = str(uuid.uuid4())
    path = f"{APP_NAME}/uploads/{user['id']}/{fid}.{ext}"
    data = await file.read(); ct = file.content_type or "application/octet-stream"
    result = put_object(path, data, ct)
    await db.files.insert_one({"id": fid, "storage_path": result["path"], "owner_id": user["id"],
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

# --------- Events ---------
@api.post("/events")
async def create_event(body: EventIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({"organizer_id": user["id"], "organizer_name": user.get("name"),
                "organizer_email": user.get("email"),
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

@api.patch("/events/{eid}/flyers/reorder")
async def reorder_flyers(eid: str, body: ReorderIn, user: dict = Depends(get_current_user)):
    d = await db.events.find_one({"_id": ObjectId(eid)})
    if not d: raise HTTPException(404, "Not found")
    if d["organizer_id"] != user["id"] and user["role"] != "admin": raise HTTPException(403, "Forbidden")
    await db.events.update_one({"_id": ObjectId(eid)}, {"$set": {"flyers": body.order,
        "updated_at": datetime.now(timezone.utc).isoformat()}})
    return {"ok": True, "flyers": body.order}

@api.delete("/events/{eid}")
async def delete_event(eid: str, user: dict = Depends(get_current_user)):
    d = await db.events.find_one({"_id": ObjectId(eid)})
    if not d: raise HTTPException(404, "Not found")
    if d["organizer_id"] != user["id"] and user["role"] != "admin": raise HTTPException(403, "Forbidden")
    await db.events.delete_one({"_id": ObjectId(eid)}); return {"ok": True}

@api.get("/events/{eid}/registrations")
async def event_registrations(eid: str, user: dict = Depends(get_current_user)):
    d = await db.events.find_one({"_id": ObjectId(eid)})
    if not d: raise HTTPException(404, "Not found")
    if d["organizer_id"] != user["id"] and user["role"] != "admin": raise HTTPException(403, "Forbidden")
    docs = await db.registrations.find({"kind": "event", "ref_id": eid}).sort("created_at", -1).to_list(1000)
    return [serialize(x) for x in docs]

@api.get("/events/{eid}/registrations.csv")
async def event_registrations_csv(eid: str, user: dict = Depends(get_current_user)):
    d = await db.events.find_one({"_id": ObjectId(eid)})
    if not d: raise HTTPException(404, "Not found")
    if d["organizer_id"] != user["id"] and user["role"] != "admin": raise HTTPException(403, "Forbidden")
    docs = await db.registrations.find({"kind": "event", "ref_id": eid}).sort("created_at", -1).to_list(2000)
    buf = io.StringIO(); w = csv.writer(buf)
    w.writerow(["Name","Email","Phone","Category","Ticket Type","Registered At","Payment Status","Amount","Currency","Commission","Net to Organizer","Transaction ID","Session ID"])
    for r in docs:
        w.writerow([r.get("name"), r.get("email"), r.get("phone"), r.get("category",""), r.get("ticket_type","Standard"),
                    r.get("created_at",""), r.get("payment_status", r.get("status","confirmed")),
                    r.get("amount",0), r.get("currency", CURRENCY).upper(),
                    r.get("commission_amount",0), r.get("net_amount",0),
                    r.get("transaction_id") or r.get("session_id") or "", r.get("session_id","")])
    buf.seek(0)
    fname = f"{d.get('title','event').replace(' ','_')}_registrations.csv"
    return StreamingResponse(iter([buf.getvalue()]), media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={fname}"})

# --------- Classes ---------
@api.post("/classes")
async def create_class(body: ClassIn, user: dict = Depends(get_current_user)):
    doc = body.model_dump()
    doc.update({"instructor_id": user["id"], "instructor_owner_name": user.get("name"),
                "instructor_owner_email": user.get("email"),
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

@api.get("/classes/{cid}/registrations")
async def class_registrations(cid: str, user: dict = Depends(get_current_user)):
    d = await db.classes.find_one({"_id": ObjectId(cid)})
    if not d: raise HTTPException(404, "Not found")
    if d["instructor_id"] != user["id"] and user["role"] != "admin": raise HTTPException(403, "Forbidden")
    docs = await db.registrations.find({"kind":"class","ref_id":cid}).sort("created_at",-1).to_list(1000)
    return [serialize(x) for x in docs]

# --------- Artists ---------
@api.post("/artists")
async def upsert_artist(body: ArtistProfileIn, user: dict = Depends(get_current_user)):
    existing = await db.artists.find_one({"user_id": user["id"]})
    doc = body.model_dump()
    doc.update({"user_id": user["id"], "user_email": user.get("email"),
                "updated_at": datetime.now(timezone.utc).isoformat(), "status": "pending"})
    if existing:
        await db.artists.update_one({"_id": existing["_id"]}, {"$set": doc})
        return serialize(await db.artists.find_one({"_id": existing["_id"]}))
    doc["created_at"] = doc["updated_at"]; doc["featured"] = False
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
    docs = await db.artists.find(query).sort([("featured",-1),("created_at",-1)]).to_list(200)
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

# --------- Bookings ---------
@api.post("/bookings")
async def create_booking(body: BookingIn, bg: BackgroundTasks):
    try: artist = await db.artists.find_one({"_id": ObjectId(body.artist_id)})
    except Exception: artist = None
    if not artist: raise HTTPException(404, "Artist not found")
    doc = body.model_dump()
    doc.update({"artist_name": artist.get("stage_name"), "status": "new",
                "created_at": datetime.now(timezone.utc).isoformat()})
    r = await db.bookings.insert_one(doc); doc["_id"] = r.inserted_id
    # Emails
    bg.add_task(send_email, body.email, f"Booking request received — {artist.get('stage_name')}",
                booking_received(body.contact_person or body.company_name, artist.get('stage_name'), FRONTEND_URL))
    admin_email = os.environ.get("ADMIN_EMAIL")
    if admin_email:
        bg.add_task(send_email, admin_email, f"[Booking] {artist.get('stage_name')} — {body.company_name}",
                    booking_admin_alert(artist.get('stage_name'), body.model_dump(), f"{FRONTEND_URL}/admin"))
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

# --------- Admin ---------
@api.get("/admin/pending")
async def admin_pending(admin: dict = Depends(require_admin)):
    events = [serialize(d) for d in await db.events.find({"status":"pending"}).to_list(500)]
    classes = [serialize(d) for d in await db.classes.find({"status":"pending"}).to_list(500)]
    artists = [serialize(d) for d in await db.artists.find({"status":"pending"}).to_list(500)]
    return {"events": events, "classes": classes, "artists": artists}

@api.get("/admin/stats")
async def admin_stats(admin: dict = Depends(require_admin)):
    total_commission = 0.0
    async for tx in db.payment_transactions.find({"payment_status":"paid","kind":{"$in":["event","class"]}}):
        total_commission += float(tx.get("commission_amount") or 0)
    return {
        "users": await db.users.count_documents({}),
        "events_approved": await db.events.count_documents({"status":"approved"}),
        "events_pending": await db.events.count_documents({"status":"pending"}),
        "classes_approved": await db.classes.count_documents({"status":"approved"}),
        "classes_pending": await db.classes.count_documents({"status":"pending"}),
        "artists_approved": await db.artists.count_documents({"status":"approved"}),
        "artists_pending": await db.artists.count_documents({"status":"pending"}),
        "artists_featured": await db.artists.count_documents({"featured": True}),
        "bookings": await db.bookings.count_documents({}),
        "registrations": await db.registrations.count_documents({}),
        "subscriptions_active": await db.users.count_documents({"plan_status": "active"}),
        "total_commission": round(total_commission, 2),
        "currency": CURRENCY.upper(),
    }

@api.patch("/admin/{kind}/{item_id}")
async def admin_approve(kind: str, item_id: str, body: ApprovalIn, bg: BackgroundTasks, admin: dict = Depends(require_admin)):
    coll = {"events": db.events, "classes": db.classes, "artists": db.artists}.get(kind)
    if coll is None: raise HTTPException(400, "Invalid kind")
    if body.status not in {"approved","rejected"}: raise HTTPException(400, "Invalid status")
    await coll.update_one({"_id": ObjectId(item_id)}, {"$set": {"status": body.status, "review_reason": body.reason,
        "reviewed_at": datetime.now(timezone.utc).isoformat(), "reviewer_id": admin["id"]}})
    d = await coll.find_one({"_id": ObjectId(item_id)})
    # Email owner
    owner_email = d.get("organizer_email") or d.get("instructor_owner_email") or d.get("user_email") or d.get("contact_email")
    owner_name = d.get("organizer_name") or d.get("instructor_owner_name") or d.get("stage_name") or "there"
    title = d.get("title") or d.get("stage_name") or ""
    label = {"events":"event","classes":"class","artists":"artist profile"}[kind]
    if owner_email:
        bg.add_task(send_email, owner_email, f"Your {label} was {body.status}",
                    approval_notification(owner_name, label, title, body.status, f"{FRONTEND_URL}/dashboard"))
    return serialize(d)

@api.patch("/admin/artists/{aid}/feature")
async def toggle_featured(aid: str, body: FeatureToggle, admin: dict = Depends(require_admin)):
    await db.artists.update_one({"_id": ObjectId(aid)}, {"$set": {"featured": bool(body.featured),
        "featured_at": datetime.now(timezone.utc).isoformat() if body.featured else None}})
    return serialize(await db.artists.find_one({"_id": ObjectId(aid)}))

# --------- Payments (Flow B) ---------
try:
    from emergentintegrations.payments.stripe.checkout import StripeCheckout, CheckoutSessionRequest
    STRIPE_AVAILABLE = True
except Exception as e:
    STRIPE_AVAILABLE = False
    logger.warning(f"emergentintegrations not available: {e}")

def _commission(amount: float):
    commission = round(amount * (COMMISSION_PCT/100.0), 2)
    net = round(amount - commission, 2)
    return commission, net

@api.get("/plans")
async def list_plans():
    return {"plans": list(PLANS.values()), "currency": CURRENCY.upper(),
            "commission_pct": COMMISSION_PCT, "free_trial_days": FREE_TRIAL_DAYS}

@api.post("/subscriptions/checkout")
async def sub_checkout(body: SubscribeIn, request: Request, bg: BackgroundTasks, user: dict = Depends(get_current_user)):
    if body.plan not in PLANS: raise HTTPException(400, "Invalid plan")
    if not STRIPE_AVAILABLE: raise HTTPException(500, "Payments unavailable")
    plan = PLANS[body.plan]
    now = datetime.now(timezone.utc)
    already_had_trial = bool(user.get("trial_started_at"))
    if not already_had_trial:
        # First month free — mark active with 30-day expiry
        exp = (now + timedelta(days=FREE_TRIAL_DAYS)).isoformat()
        await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {
            "plan": body.plan, "plan_status": "trialing", "plan_expires_at": exp,
            "trial_started_at": now.isoformat()}})
        # Auto-align role for artist/organizer plans
        if body.plan == "artist":
            await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"role": "artist"}})
        elif body.plan == "organizer":
            await db.users.update_one({"_id": ObjectId(user["id"])}, {"$set": {"role": "organizer"}})
        bg.add_task(send_email, user["email"], f"Welcome to {plan['name']} — first month free",
                    subscription_active(user.get("name"), plan["name"], f"{FRONTEND_URL}/dashboard"))
        return {"free_trial": True, "checkout_url": f"{body.origin_url}/subscription/success?trial=1&plan={body.plan}"}
    # Paid subscription checkout (one-time charge for the month; renewal handled manually / later)
    host_url = str(request.base_url); webhook_url = f"{host_url}api/webhook/stripe"
    co = StripeCheckout(api_key=os.environ.get("STRIPE_API_KEY","sk_test_emergent"), webhook_url=webhook_url)
    req = CheckoutSessionRequest(amount=float(plan["price"]), currency=CURRENCY,
        success_url=f"{body.origin_url}/subscription/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{body.origin_url}/subscription/cancel",
        metadata={"kind":"subscription","plan":body.plan,"user_id":user["id"],"email":user["email"]})
    sess = await co.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": sess.session_id, "user_id": user["id"], "email": user["email"],
        "kind":"subscription","plan":body.plan,"amount":float(plan["price"]),"currency":CURRENCY,
        "status":"initiated","payment_status":"pending",
        "created_at": now.isoformat(),"updated_at": now.isoformat()})
    return {"checkout_url": sess.url, "session_id": sess.session_id}

@api.get("/subscriptions/mine")
async def my_subscription(user: dict = Depends(get_current_user)):
    u = await db.users.find_one({"_id": ObjectId(user["id"])})
    return {"plan": u.get("plan"), "plan_status": u.get("plan_status"),
            "plan_expires_at": u.get("plan_expires_at"),
            "trial_started_at": u.get("trial_started_at")}

@api.post("/payments/checkout")
async def checkout(body: CheckoutIn, request: Request, user: dict = Depends(get_current_user)):
    if not STRIPE_AVAILABLE: raise HTTPException(500, "Payments unavailable")
    if body.kind == "event":
        item = await db.events.find_one({"_id": ObjectId(body.ref_id)})
        base_amount = float(item.get("registration_fee") or 0) if item else 0
        title = item.get("title") if item else ""
    elif body.kind == "class":
        item = await db.classes.find_one({"_id": ObjectId(body.ref_id)})
        base_amount = float(item.get("fee") or 0) if item else 0
        title = item.get("title") if item else ""
    else: raise HTTPException(400, "Invalid kind")
    if not item: raise HTTPException(404, "Item not found")
    # Ticket type override
    ticket_price = None
    if body.participant and body.participant.ticket_type and item.get("ticket_types"):
        for t in item["ticket_types"]:
            if t.get("name") == body.participant.ticket_type:
                ticket_price = float(t.get("price") or 0); break
    amount = ticket_price if ticket_price is not None else base_amount
    commission, net = _commission(amount)
    p = body.participant.model_dump() if body.participant else {
        "name": user.get("name"), "email": user["email"], "phone": "", "category":"", "ticket_type":"Standard"}
    if amount <= 0:
        reg = {"kind": body.kind, "ref_id": body.ref_id, "user_id": user["id"],
               **p, "status":"confirmed", "payment_status":"free",
               "amount": 0, "currency": CURRENCY, "commission_amount": 0, "net_amount": 0,
               "created_at": datetime.now(timezone.utc).isoformat()}
        await db.registrations.insert_one(reg)
        return {"free": True, "checkout_url": f"{body.origin_url}/payment/success?free=1"}
    host_url = str(request.base_url); webhook_url = f"{host_url}api/webhook/stripe"
    co = StripeCheckout(api_key=os.environ.get("STRIPE_API_KEY","sk_test_emergent"), webhook_url=webhook_url)
    req = CheckoutSessionRequest(
        amount=float(amount), currency=CURRENCY,
        success_url=f"{body.origin_url}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
        cancel_url=f"{body.origin_url}/payment/cancel",
        metadata={"kind": body.kind, "ref_id": body.ref_id, "user_id": user["id"],
                  "email": user["email"], "title": (title or "")[:80],
                  "p_name": p["name"][:60], "p_phone": p["phone"][:20],
                  "p_category": (p.get("category") or "")[:40],
                  "p_ticket": (p.get("ticket_type") or "Standard")[:40]})
    session = await co.create_checkout_session(req)
    await db.payment_transactions.insert_one({
        "session_id": session.session_id, "user_id": user["id"], "email": user["email"],
        "kind": body.kind, "ref_id": body.ref_id, "title": title,
        "amount": float(amount), "currency": CURRENCY,
        "commission_amount": commission, "net_amount": net, "commission_pct": COMMISSION_PCT,
        "participant": p,
        "status": "initiated", "payment_status": "pending",
        "created_at": datetime.now(timezone.utc).isoformat(),
        "updated_at": datetime.now(timezone.utc).isoformat()})
    return {"checkout_url": session.url, "session_id": session.session_id,
            "amount": amount, "commission_amount": commission, "net_amount": net, "currency": CURRENCY}

@api.get("/payments/status/{session_id}")
async def payment_status(session_id: str, bg: BackgroundTasks):
    rec = await db.payment_transactions.find_one({"session_id": session_id})
    if not rec: raise HTTPException(404, "Not found")
    if rec.get("payment_status") != "paid" and STRIPE_AVAILABLE:
        try:
            co = StripeCheckout(api_key=os.environ.get("STRIPE_API_KEY","sk_test_emergent"), webhook_url="")
            status = await co.get_checkout_status(session_id)
            if status.payment_status == "paid" or status.status == "complete":
                await db.payment_transactions.update_one({"session_id": session_id, "payment_status": {"$ne":"paid"}},
                    {"$set": {"status":"completed","payment_status":"paid",
                              "updated_at": datetime.now(timezone.utc).isoformat()}})
                await _post_payment_success(session_id, bg)
                rec = await db.payment_transactions.find_one({"session_id": session_id})
        except Exception as e:
            logger.warning(f"status lookup: {e}")
    return {"session_id": rec["session_id"], "status": rec["status"],
            "payment_status": rec["payment_status"], "amount": rec.get("amount"),
            "commission_amount": rec.get("commission_amount"), "net_amount": rec.get("net_amount"),
            "currency": rec.get("currency", CURRENCY), "title": rec.get("title"),
            "kind": rec.get("kind"), "plan": rec.get("plan")}

async def _post_payment_success(session_id: str, bg: BackgroundTasks):
    rec = await db.payment_transactions.find_one({"session_id": session_id})
    if not rec: return
    if rec["kind"] == "subscription":
        plan = rec.get("plan"); now = datetime.now(timezone.utc)
        exp = (now + timedelta(days=30)).isoformat()
        await db.users.update_one({"_id": ObjectId(rec["user_id"])},
            {"$set": {"plan": plan, "plan_status": "active", "plan_expires_at": exp}})
        p = PLANS.get(plan, {}).get("name", plan)
        bg.add_task(send_email, rec["email"], f"Payment received — {p} plan",
                    subscription_active("there", p, f"{FRONTEND_URL}/dashboard"))
        return
    # Event / Class registration
    existing = await db.registrations.find_one({"session_id": session_id})
    if existing: return
    p = rec.get("participant") or {}
    reg = {"kind": rec["kind"], "ref_id": rec["ref_id"], "user_id": rec.get("user_id"),
           "session_id": session_id, "transaction_id": session_id,
           "name": p.get("name"), "email": p.get("email") or rec.get("email"),
           "phone": p.get("phone"), "category": p.get("category",""), "ticket_type": p.get("ticket_type","Standard"),
           "amount": rec.get("amount"), "currency": rec.get("currency", CURRENCY),
           "commission_amount": rec.get("commission_amount"), "net_amount": rec.get("net_amount"),
           "status":"confirmed","payment_status":"paid",
           "created_at": datetime.now(timezone.utc).isoformat()}
    await db.registrations.insert_one(reg)
    # Emails
    coll = db.events if rec["kind"] == "event" else db.classes
    item = await coll.find_one({"_id": ObjectId(rec["ref_id"])})
    if item:
        url = f"{FRONTEND_URL}/{rec['kind']}s/{rec['ref_id']}"
        title = item.get("title","")
        when = item.get("date") or item.get("schedule","")
        where = f"{item.get('venue','')}, {item.get('city','')}"
        bg.add_task(send_email, reg["email"], f"You&rsquo;re confirmed — {title}",
                    registration_confirmation(reg["name"], title, str(when)[:16], where,
                        reg["transaction_id"], reg["amount"], reg.get("currency", CURRENCY), url))
        owner_email = item.get("organizer_email") or item.get("instructor_owner_email")
        owner_name  = item.get("organizer_name") or item.get("instructor_owner_name") or "organizer"
        if owner_email:
            info = {**p, "amount": reg["amount"], "net": reg["net_amount"]}
            bg.add_task(send_email, owner_email, f"New registration — {title}",
                        organizer_new_registration(owner_name, title, info, f"{FRONTEND_URL}/dashboard"))

@api.post("/webhook/stripe")
async def stripe_webhook(request: Request, bg: BackgroundTasks):
    if not STRIPE_AVAILABLE: return {"ok": True}
    body_bytes = await request.body(); sig = request.headers.get("Stripe-Signature", "")
    try:
        co = StripeCheckout(api_key=os.environ.get("STRIPE_API_KEY","sk_test_emergent"), webhook_url="")
        r = await co.handle_webhook(body_bytes, sig)
        if r.payment_status == "paid":
            await db.payment_transactions.update_one({"session_id": r.session_id, "payment_status": {"$ne":"paid"}},
                {"$set": {"status":"completed","payment_status":"paid",
                          "updated_at": datetime.now(timezone.utc).isoformat()}})
            await _post_payment_success(r.session_id, bg)
    except Exception as e:
        logger.error(f"webhook err: {e}")
    return {"ok": True}

# --------- Public share (Open Graph) ---------
@api.get("/share/event/{eid}", include_in_schema=False)
async def og_event(eid: str):
    try: d = await db.events.find_one({"_id": ObjectId(eid)})
    except Exception: d = None
    if not d: raise HTTPException(404, "Not found")
    img = ""
    if d.get("flyers"): img = d["flyers"][0]
    elif d.get("poster_url"): img = d["poster_url"]
    if img and img.startswith("/api/"): img = FRONTEND_URL + img
    title = d.get("title",""); desc = (d.get("description") or "")[:180]
    url = f"{FRONTEND_URL}/events/{eid}"
    html = f"""<!doctype html><html><head><meta charset='utf-8'>
<title>{title} — Cosmic Elemental</title>
<meta property='og:title' content='{title}'/>
<meta property='og:description' content='{desc}'/>
<meta property='og:image' content='{img}'/>
<meta property='og:url' content='{url}'/>
<meta property='og:type' content='event'/>
<meta name='twitter:card' content='summary_large_image'/>
<meta http-equiv='refresh' content='0;url={url}'/>
</head><body><a href='{url}'>{title}</a></body></html>"""
    return FastAPIResponse(content=html, media_type="text/html")

@api.get("/")
async def root(): return {"service": "Cosmic Elemental API", "ok": True,
                          "currency": CURRENCY.upper(), "commission_pct": COMMISSION_PCT}

app.include_router(api)
app.add_middleware(CORSMiddleware, allow_credentials=True,
                   allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

@app.on_event("shutdown")
async def shutdown(): client.close()
