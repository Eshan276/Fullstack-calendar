# app/routes/events.py
from fastapi import APIRouter, HTTPException
from app.models.event import Event, EventCreate
from app.database import event_collection
from bson import ObjectId
from datetime import datetime, timedelta

router = APIRouter()


@router.post("/events/", response_model=Event)
async def create_event(event: EventCreate):
    event_dict = event.dict()
    result = await event_collection.insert_one(event_dict)
    created_event = await event_collection.find_one({"_id": result.inserted_id})
    return Event(**created_event, id=str(created_event["_id"]))


@router.get("/events/", response_model=list[Event])
async def get_events(start_date: datetime, end_date: datetime):
    events = await event_collection.find({
        "start_time": {"$gte": start_date, "$lt": end_date}
    }).to_list(None)
    return [Event(**event, id=str(event["_id"])) for event in events]


@router.put("/events/{event_id}", response_model=Event)
async def update_event(event_id: str, event: EventCreate):
    updated_event = await event_collection.find_one_and_update(
        {"_id": ObjectId(event_id)},
        {"$set": event.dict()},
        return_document=True
    )
    if updated_event:
        return Event(**updated_event, id=str(updated_event["_id"]))
    raise HTTPException(status_code=404, detail="Event not found")


@router.delete("/events/{event_id}")
async def delete_event(event_id: str):
    result = await event_collection.delete_one({"_id": ObjectId(event_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Event not found")
    return {"message": "Event deleted successfully"}
