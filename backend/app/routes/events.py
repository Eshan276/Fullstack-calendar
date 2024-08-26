from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, EmailStr
from app.database import event_collection, user_collection
from bson import ObjectId
from datetime import datetime, timedelta
from typing import List, Optional
from dateutil.rrule import rrule, rrulestr
import asyncio

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
    recurrence: Optional[str] = None  # Make recurrence optional


class Event(EventCreate):
    id: str
    user_id: str


async def get_user(email: EmailStr):
    user = await user_collection.find_one({"email": email})
    if not user:
        new_user = await user_collection.insert_one({"email": email})
        user = await user_collection.find_one({"_id": new_user.inserted_id})
    return User(**user, id=str(user["_id"]))


# def generate_occurrences(event: Event) -> List[Event]:
#     occurrences = []
#     if event.recurrence:
#         recurrence_rule = event.recurrence.replace('RRULE:', '')
#         rule = rrulestr(recurrence_rule)

#         start_time = event.start_time
#         end_time = event.end_time

#         for dt in rule:
#             occurrence_start = dt
#             occurrence_end = dt + (end_time - start_time)
#             occurrences.append({
#                 "title": event.title,
#                 "description": event.description,
#                 "start_time": occurrence_start,
#                 "end_time": occurrence_end,
#                 "type": event.type,
#                 "color": event.color,
#                 "recurrence": event.recurrence,
#                 "user_id": event.user_id
#             })
#     else:
#         occurrences.append(event.dict())
#     print("neww", occurrences)
#     return occurrences
def generate_occurrences(event: Event) -> List[Event]:
    occurrences = []

    # Define recurrence intervals
    recurrence_intervals = {
        "daily": timedelta(days=1),
        "weekly": timedelta(weeks=1),
        "monthly": None  # Monthly will need to be handled separately
    }

    if event.recurrence:
        start_time = event.start_time
        end_time = event.end_time
        # e.g., "daily", "weekly", "monthly"
        recurrence_interval = event.recurrence.lower()

        if recurrence_interval == "daily":
            delta = recurrence_intervals[recurrence_interval]

            for i in range(100):  # Example: generate 10 occurrences
                occurrence_start = start_time + i * delta
                occurrence_end = end_time + i * delta
                occurrences.append({
                    "id": event.id,
                    "title": event.title,
                    "description": event.description,
                    "start_time": occurrence_start,
                    "end_time": occurrence_end,
                    "type": event.type,
                    "color": event.color,
                    "recurrence": event.recurrence,
                    "user_id": event.user_id
                })
        elif recurrence_interval == "weekly":
            delta = recurrence_intervals[recurrence_interval]
            for i in range(25):  # Example: generate 10 occurrences
                occurrence_start = start_time + i * delta
                occurrence_end = end_time + i * delta
                occurrences.append({
                    "id": event.id,
                    "title": event.title,
                    "description": event.description,
                    "start_time": occurrence_start,
                    "end_time": occurrence_end,
                    "type": event.type,
                    "color": event.color,
                    "recurrence": event.recurrence,
                    "user_id": event.user_id
                })
        elif recurrence_interval == "monthly":
            for i in range(10):  # Example: generate 10 monthly occurrences
                month_delta = start_time.month + i
                year_delta = start_time.year + (month_delta - 1) // 12
                occurrence_start = start_time.replace(
                    month=(month_delta - 1) % 12 + 1, year=year_delta)
                occurrence_end = occurrence_start + (end_time - start_time)

                occurrences.append({
                    "id": event.id,
                    "title": event.title,
                    "description": event.description,
                    "start_time": occurrence_start,
                    "end_time": occurrence_end,
                    "type": event.type,
                    "color": event.color,
                    "recurrence": event.recurrence,
                    "user_id": event.user_id
                })
    else:
        occurrences.append(event.dict())

    print("Generated Occurrences:", occurrences)
    return occurrences


@router.get("/hello")
async def hello():
    return {"message": "Hello, World!"}


# @router.post("/events/", response_model=List[Event])
# async def create_event(event: EventCreate, email: EmailStr):
#     user = await get_user(email)
#     event_dict = event.dict()
#     event_dict["user_id"] = user.id

#     if event.recurrence:
#         occurrences = generate_occurrences(Event(**event_dict))
#         results = []
#         for occurrence in occurrences:
#             result = await event_collection.insert_one(occurrence)
#             created_event = await event_collection.find_one({"_id": result.inserted_id})
#             results.append(
#                 Event(**created_event, id=str(created_event["_id"])))
#         return results

#     result = await event_collection.insert_one(event_dict)
#     created_event = await event_collection.find_one({"_id": result.inserted_id})
#     return [Event(**created_event, id=str(created_event["_id"]))]
@router.post("/events/", response_model=Event)
async def create_event(event: EventCreate, email: EmailStr):
    user = await get_user(email)
    event_dict = event.dict()
    event_dict["user_id"] = user.id
    result = await event_collection.insert_one(event_dict)
    created_event = await event_collection.find_one({"_id": result.inserted_id})
    return Event(**created_event, id=str(created_event["_id"]))


@router.get("/events/", response_model=List[Event])
async def get_events(start_date: datetime, end_date: datetime, email: EmailStr):
    user = await get_user(email)
    events = await event_collection.find({
        "user_id": user.id,
        "start_time": {"$gte": start_date, "$lt": end_date}
    }).to_list(None)
    print(events)
    all_events = []
    for event in events:
        if event.get("recurrence"):
            occurrences = generate_occurrences(Event(**event))
            all_events.extend(occurrences)
        else:
            all_events.append(Event(**{**event, "id": str(event["_id"])}))

    return all_events


@router.get("/user/events/", response_model=List[Event])
async def get_user_events(email: EmailStr):
    print("hello")
    user = await get_user(email)
    events = await event_collection.find({"user_id": user.id}).to_list(None)
    print(events)
    all_events = []
    for event in events:
        event["id"] = str(event.pop("_id"))
        if event.get("recurrence") and event.get("recurrence").lower() != "none":
            print("event", event)
            occurrences = generate_occurrences(Event(**event))
            all_events.extend(occurrences)
        else:
            all_events.append(Event(**event))

    return all_events


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
