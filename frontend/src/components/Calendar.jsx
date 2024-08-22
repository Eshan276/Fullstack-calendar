import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import axios from "axios";
import Modal from "react-modal";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";

const locales = {
  "en-US": enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

const CalendarComponent = ({ userEmail }) => {
  const [events, setEvents] = useState([]);
  const [view, setView] = useState("month");
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [view, userEmail]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get("http://localhost:8000/user/events/", {
        params: { email: userEmail },
      });
      setEvents(
        response.data.map((event) => ({
          ...event,
          start: new Date(event.start_time),
          end: new Date(event.end_time),
        }))
      );
    } catch (error) {
      console.error("Error fetching events:", error);
      setError("Failed to fetch events. Please check your backend connection.");
    }
  };

  const handleSelect = (slotInfo) => {
    setSelectedSlot(slotInfo);
    setModalIsOpen(true);
  };

  const handleModalClose = () => {
    setModalIsOpen(false);
    setSelectedSlot(null);
  };

  const handleEventCreate = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const startTime = formData.get("start_time");
    let endTime = formData.get("end_time");

    const startDate = new Date(selectedSlot.start);
    startDate.setHours(startTime.split(":")[0], startTime.split(":")[1]);

    let endDate;
    if (!endTime) {
      endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + 1);
    } else {
      endDate = new Date(startDate);
      endDate.setHours(endTime.split(":")[0], endTime.split(":")[1]);
    }

    if (endDate < startDate) {
      alert("End time cannot be earlier than start time.");
      return;
    }

    if (endDate.getDate() !== startDate.getDate()) {
      alert("End time must be within the same day as the start time.");
      return;
    }

    const newEvent = {
      title: formData.get("title"),
      description: formData.get("description"),
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
    };

    try {
      await axios.post("http://localhost:8000/events/", newEvent, {
        params: { email: userEmail },
      });
      setModalIsOpen(false);
      fetchEvents();
    } catch (error) {
      console.error("Error creating event:", error);
      setError("Failed to create event. Please try again.");
    }
  };

  const handleEndTimeChange = (e) => {
    const endTime = e.target.value;
    const startTime = document.querySelector('input[name="start_time"]').value;

    if (endTime < startTime) {
      alert("End time cannot be earlier than start time.");
      e.target.value = "";
    }
  };

  const handleEventDrop = async ({ event, start, end }) => {
    const updatedEvent = {
      ...event,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
    };

    try {
      await axios.put(
        `http://localhost:8000/events/${event.id}/`,
        updatedEvent,
        {
          params: { email: userEmail },
        }
      );
      fetchEvents();
    } catch (error) {
      console.error("Error updating event:", error);
      setError("Failed to update event. Please try again.");
    }
  };

  if (error) {
    return <div style={{ color: "#FF0000" }}>Error: {error}</div>;
  }

  return (
    <div style={{ height: "500px" }}>
      <DndProvider backend={HTML5Backend}>
        <DnDCalendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          onSelectSlot={handleSelect}
          onEventDrop={handleEventDrop}
          resizable
          view={view}
          onView={setView}
          style={{ color: "#000", backgroundColor: "#f5f5f5" }}
        />
      </DndProvider>

      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleModalClose}
        style={{
          content: {
            color: "#000",
            backgroundColor: "#fff",
            padding: "20px",
            borderRadius: "10px",
            width: "400px",
            margin: "auto",
            zIndex: "1000",
          },
          overlay: {
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            zIndex: "999",
          },
        }}
      >
        <h2 style={{ color: "#333" }}>Create New Event</h2>
        <form onSubmit={handleEventCreate}>
          <div>
            <label style={{ color: "#007BFF" }}>Title: </label>
            <input
              type="text"
              name="title"
              required
              style={{ color: "#000", backgroundColor: "#f0f0f0" }}
            />
          </div>
          <div>
            <label style={{ color: "#007BFF" }}>Description: </label>
            <textarea
              name="description"
              style={{ color: "#000", backgroundColor: "#f0f0f0" }}
            />
          </div>
          <div>
            <label style={{ color: "#007BFF" }}>Start Time: </label>
            <input
              type="time"
              name="start_time"
              required
              style={{ color: "#000", backgroundColor: "#f0f0f0" }}
            />
          </div>
          <div>
            <label style={{ color: "#007BFF" }}>End Time: </label>
            <input
              type="time"
              name="end_time"
              style={{ color: "#000", backgroundColor: "#f0f0f0" }}
              onChange={handleEndTimeChange}
            />
          </div>
          <button
            type="submit"
            style={{
              color: "#fff",
              backgroundColor: "#007BFF",
              padding: "10px",
              border: "none",
              borderRadius: "5px",
              marginTop: "10px",
            }}
          >
            Create Event
          </button>
          <button
            type="button"
            onClick={handleModalClose}
            style={{
              color: "#fff",
              backgroundColor: "#FF0000",
              padding: "10px",
              border: "none",
              borderRadius: "5px",
              marginLeft: "10px",
              marginTop: "10px",
            }}
          >
            Cancel
          </button>
        </form>
      </Modal>
    </div>
  );
};

const LoginComponent = ({ onLogin }) => {
  const [email, setEmail] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    onLogin(email);
  };

  return (
    <form onSubmit={handleSubmit}>
      <label>Email: </label>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />
      <button type="submit">Login</button>
    </form>
  );
};

const App = () => {
  const [userEmail, setUserEmail] = useState(null);

  const handleLogin = (email) => {
    setUserEmail(email);
  };

  return (
    <div>
      <h1>Event Calendar App</h1>
      {!userEmail ? (
        <LoginComponent onLogin={handleLogin} />
      ) : (
        <>
          <p>Logged in as: {userEmail}</p>
          <CalendarComponent userEmail={userEmail} />
        </>
      )}
    </div>
  );
};

export default App;
