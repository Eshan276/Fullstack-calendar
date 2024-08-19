# app/models/event.py
from pydantic import BaseModel
from datetime import datetime


class EventCreate(BaseModel):
    title: str
    description: str
    start_time: datetime
    end_time: datetime


class Event(EventCreate):
    id: str
