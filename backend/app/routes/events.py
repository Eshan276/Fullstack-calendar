from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
from app.database import event_collection, user_collection
from bson import ObjectId
from datetime import datetime

router = APIRouter()


class UserCreate(BaseModel):
    email: EmailStr


class User(UserCreate):
    id: str


class EventCreate(BaseModel):
    title: str
    description: str
    start_time: datetime
    end_time: datetime
    type: str  # New field
    color: str  # New field


class Event(EventCreate):
    id: str
    user_id: str


async def get_user(email: EmailStr):
    user = await user_collection.find_one({"email": email})
    if not user:
        new_user = await user_collection.insert_one({"email": email})
        user = await user_collection.find_one({"_id": new_user.inserted_id})
    return User(**user, id=str(user["_id"]))


@router.get("/hello")
async def hello():
    return {"message": "Hello, World!"}


@router.post("/events/", response_model=Event)
async def create_event(event: EventCreate, email: EmailStr):
    user = await get_user(email)
    event_dict = event.dict()
    event_dict["user_id"] = user.id
    result = await event_collection.insert_one(event_dict)
    created_event = await event_collection.find_one({"_id": result.inserted_id})
    return Event(**created_event, id=str(created_event["_id"]))


@router.get("/events/", response_model=list[Event])
async def get_events(start_date: datetime, end_date: datetime, email: EmailStr):
    user = await get_user(email)
    events = await event_collection.find({
        "user_id": user.id,
        "start_time": {"$gte": start_date, "$lt": end_date}
    }).to_list(None)

    # Handle missing `event_type` and `color` fields in older documents
    return [
        Event(**{**event, "id": str(event["_id"]), "event_type": event.get(
            "event_type", ""), "color": event.get("color", "")})
        for event in events
    ]


@router.get("/user/events/", response_model=list[Event])
async def get_user_events(email: EmailStr):
    user = await get_user(email)
    events = await event_collection.find({"user_id": user.id}).to_list(None)

    # Handle missing `event_type` and `color` fields in older documents
    return [
        Event(**{**event, "id": str(event["_id"]), "event_type": event.get(
            "event_type", ""), "color": event.get("color", "")})
        for event in events
    ]


@router.post("/users/", response_model=User)
async def create_user(user: UserCreate):
    existing_user = await user_collection.find_one({"email": user.email})
    if existing_user:
        return User(**existing_user, id=str(existing_user["_id"]))

    new_user = await user_collection.insert_one(user.dict())
    created_user = await user_collection.find_one({"_id": new_user.inserted_id})
    return User(**created_user, id=str(created_user["_id"]))


@router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, event: EventCreate, email: EmailStr):
    user = await get_user(email)
    updated_event = await event_collection.find_one_and_update(
        {"_id": ObjectId(event_id), "user_id": user.id},
        {"$set": event.dict()},
        return_document=True
    )
    if updated_event:
        return Event(**{**updated_event, "id": str(updated_event["_id"]), "event_type": updated_event.get("event_type", ""), "color": updated_event.get("color", "")})
    raise HTTPException(status_code=404, detail="Event not found")


@router.delete("/events/{event_id}")
async def delete_event(event_id: str, email: EmailStr):
    user = await get_user(email)
    result = await event_collection.delete_one({"_id": ObjectId(event_id), "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}
