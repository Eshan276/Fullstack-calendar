import os
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi import Request

MONGO_URL = os.getenv(
    "MONGO_URL", "mongodb+srv://eshandas12:eshandas12@cluster0.hxo2yhb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")


def get_database():
    client = AsyncIOMotorClient(MONGO_URL)
    return client.eventdb


async def get_event_collection(request: Request):
    db = get_database()
    try:
        yield db.events
    finally:
        db.client.close()


async def get_user_collection(request: Request):
    db = get_database()
    try:
        yield db.users
    finally:
        db.client.close()
