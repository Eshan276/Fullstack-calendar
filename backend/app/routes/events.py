from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel, EmailStr
from app.database import get_event_collection, get_user_collection
from motor.motor_asyncio import AsyncIOMotorCollection
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Optional
from dateutil.rrule import rrule, rrulestr

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
    type: str
    color: str
    recurrence: Optional[str] = None


class Event(EventCreate):
    id: str
    user_id: str


async def get_user(email: EmailStr, user_collection: AsyncIOMotorCollection = Depends(get_user_collection)):
    user = await user_collection.find_one({"email": email})
    if not user:
        new_user = await user_collection.insert_one({"email": email})
        user = await user_collection.find_one({"_id": new_user.inserted_id})
    return User(**user, id=str(user["_id"]))


def generate_occurrences(event: Event) -> List[Event]:
    occurrences = []
    recurrence_intervals = {
        "daily": timedelta(days=1),
        "weekly": timedelta(weeks=1),
        "monthly": None
    }

    if event.recurrence:
        start_time = event.start_time
        end_time = event.end_time
        recurrence_interval = event.recurrence.lower()

        if recurrence_interval in ["daily", "weekly"]:
            delta = recurrence_intervals[recurrence_interval]
            num_occurrences = 100 if recurrence_interval == "daily" else 25
            for i in range(num_occurrences):
                occurrence_start = start_time + i * delta
                occurrence_end = end_time + i * delta
                occurrences.append(event.dict() | {
                    "start_time": occurrence_start,
                    "end_time": occurrence_end,
                })
        elif recurrence_interval == "monthly":
            for i in range(10):
                month_delta = start_time.month + i
                year_delta = start_time.year + (month_delta - 1) // 12
                occurrence_start = start_time.replace(
                    month=(month_delta - 1) % 12 + 1, year=year_delta)
                occurrence_end = occurrence_start + (end_time - start_time)
                occurrences.append(event.dict() | {
                    "start_time": occurrence_start,
                    "end_time": occurrence_end,
                })
    else:
        occurrences.append(event.dict())

    return occurrences


@router.get("/hello")
async def hello():
    return {"message": "Hello, World!"}


@router.post("/events/", response_model=Event)
async def create_event(
    event: EventCreate,
    email: EmailStr,
    event_collection: AsyncIOMotorCollection = Depends(get_event_collection),
    user_collection: AsyncIOMotorCollection = Depends(get_user_collection)
):
    user = await get_user(email, user_collection)
    event_dict = event.dict() | {"user_id": user.id}
    result = await event_collection.insert_one(event_dict)
    created_event = await event_collection.find_one({"_id": result.inserted_id})
    return Event(**created_event, id=str(created_event["_id"]))


@router.get("/events/", response_model=List[Event])
async def get_events(
    start_date: datetime,
    end_date: datetime,
    email: EmailStr,
    event_collection: AsyncIOMotorCollection = Depends(get_event_collection),
    user_collection: AsyncIOMotorCollection = Depends(get_user_collection)
):
    user = await get_user(email, user_collection)
    events = await event_collection.find({
        "user_id": user.id,
        "start_time": {"$gte": start_date, "$lt": end_date}
    }).to_list(None)

    all_events = []
    for event in events:
        event["id"] = str(event.pop("_id"))
        if event.get("recurrence"):
            occurrences = generate_occurrences(Event(**event))
            all_events.extend(occurrences)
        else:
            all_events.append(Event(**event))

    return all_events


@router.get("/user/events/", response_model=List[Event])
async def get_user_events(
    email: EmailStr,
    event_collection: AsyncIOMotorCollection = Depends(get_event_collection),
    user_collection: AsyncIOMotorCollection = Depends(get_user_collection)
):
    user = await get_user(email, user_collection)
    events = await event_collection.find({"user_id": user.id}).to_list(None)

    all_events = []
    for event in events:
        event["id"] = str(event.pop("_id"))
        if event.get("recurrence") and event.get("recurrence").lower() != "none":
            occurrences = generate_occurrences(Event(**event))
            all_events.extend(occurrences)
        else:
            all_events.append(Event(**event))

    return all_events


@router.post("/users/", response_model=User)
async def create_user(
    user: UserCreate,
    user_collection: AsyncIOMotorCollection = Depends(get_user_collection)
):
    existing_user = await user_collection.find_one({"email": user.email})
    if existing_user:
        return User(**existing_user, id=str(existing_user["_id"]))

    new_user = await user_collection.insert_one(user.dict())
    created_user = await user_collection.find_one({"_id": new_user.inserted_id})
    return User(**created_user, id=str(created_user["_id"]))


@router.put("/events/{event_id}", response_model=Event)
async def update_event(
    event_id: str,
    event: EventCreate,
    email: EmailStr,
    event_collection: AsyncIOMotorCollection = Depends(get_event_collection),
    user_collection: AsyncIOMotorCollection = Depends(get_user_collection)
):
    user = await get_user(email, user_collection)
    updated_event = await event_collection.find_one_and_update(
        {"_id": ObjectId(event_id), "user_id": user.id},
        {"$set": event.dict()},
        return_document=True
    )
    if updated_event:
        return Event(**updated_event, id=str(updated_event["_id"]))
    raise HTTPException(status_code=404, detail="Event not found")


@router.delete("/events/{event_id}")
async def delete_event(
    event_id: str,
    email: EmailStr,
    event_collection: AsyncIOMotorCollection = Depends(get_event_collection),
    user_collection: AsyncIOMotorCollection = Depends(get_user_collection)
):
    user = await get_user(email, user_collection)
    result = await event_collection.delete_one({"_id": ObjectId(event_id), "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}
