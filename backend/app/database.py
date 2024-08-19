import os
from motor.motor_asyncio import AsyncIOMotorClient

MONGO_URL = os.getenv(
    "MONGO_URL", "mongodb+srv://eshandas12:eshandas12@cluster0.hxo2yhb.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0")
client = AsyncIOMotorClient(MONGO_URL)

# Access (or create if it doesn't exist) a database named 'eventdb'
db = client.eventdb

# Access (or create if they don't exist) collections named 'events' and 'users'
event_collection = db.events
user_collection = db.users
