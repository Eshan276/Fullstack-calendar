# Dynamic Calendar Application

A web-based calendar application built using FastAPI, MongoDB, and Vite.js. The calendar supports day, week, and month views, allowing users to manage their schedules efficiently.

- DEPLOYEDLINK:- [CLICK HERE](https://yourcalender.netlify.app/)

## Features

1. **Dynamic Calendar Views**:

   - Switch between day, week, and month views seamlessly.
   - Display all events for a selected day, week, or month.

2. **Event Scheduling**:

   - Create, update, and delete events.
   - Specify event title, description, date, time, and duration.

3. **Event Display**:

   - View all scheduled events/tasks in the selected calendar view.
   - Events are visually distinguishable and aligned based on time and duration.

4. **Backend**:

   - FastAPI backend for handling API requests (CRUD operations for events).
   - MongoDB for storing event data.

5. **Frontend**:
   - Vite.js for a responsive and interactive user interface.
   - Fetch and display events dynamically from the backend.

## Installation

### Prerequisites

- Python 3.8+
- Node.js 14+

### Backend Setup /FastAPI/

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Eshan276/Fullstack-calendar.git
   cd Fullstack-calendar/backend
   ```
2. **Create and activate a virtual environment:**
   - THIS IS OPTIONAL BUT PREFFERED
   ```bash
   python -m venv venv
   source venv/bin/activate   # On Windows use `/venv/Scripts/activate/`
   ```
3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```
4. **Start the FastAPI server:**
   ```bash
   uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
   ```

### Frontend Setup /Vite.js/

1. **Navigate to the frontend directory:**
   ```bash
   cd ../frontend
   ```
2. **Install dependencies:**

   ```bash
   npm install
   ```

3. **Start the frontend development server:**
   ```bash
    npm run dev
   ```

### Database Setup /MongoDB/

1. **Configure MongoDB connection details in the backend's `/config/` file.**

## Usage

- Access the frontend at `http://localhost:3000`.
- The FastAPI backend will be running on `http://localhost:8000`.
- You can now create, view, and manage events using the calendar interface.

## Additional Features /Optional/

- Recurring events /e.g., weekly meetings/.
- Drag-and-drop functionality for rescheduling events.

## License

This project is licensed under the MIT License.

```

```
