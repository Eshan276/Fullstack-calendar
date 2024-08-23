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

// Date-fns localization
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

const modalStyles = {
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
};

const inputStyles = {
  color: "#000",
  backgroundColor: "#f0f0f0",
};

const buttonStyles = (bgColor) => ({
  color: "#fff",
  backgroundColor: bgColor,
  padding: "10px",
  border: "none",
  borderRadius: "5px",
  marginTop: "10px",
});

const CalendarComponent = ({ userEmail }) => {
  const [events, setEvents] = useState([]);
  const [filteredEvents, setFilteredEvents] = useState([]);
  const [view, setView] = useState("month");
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const [isCustomTypeModalOpen, setIsCustomTypeModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [error, setError] = useState(null);
  const [customTypes, setCustomTypes] = useState([]); // Array to store custom types
  const [newType, setNewType] = useState("");
  const [newColor, setNewColor] = useState("#000000"); // Default color
  const [selectedTypes, setSelectedTypes] = useState(new Set()); // Set to track selected types

  const localizer = dateFnsLocalizer({
    format,
    parse,
    startOfWeek,
    getDay,
    locales: {
      "en-US": enUS,
    },
  });

  useEffect(() => {
    fetchEvents();
  }, [view, userEmail]);

  useEffect(() => {
    filterEvents();
  }, [events, selectedTypes]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get("http://localhost:8000/user/events/", {
        params: { email: userEmail },
      });
      console.log(response.data);
      for (let i = 0; i < response.data.length; i++) {
        if (
          response.data[i].type !== "task" &&
          response.data[i].type !== "meeting" &&
          response.data[i].type !== "reminder" &&
          !customTypes.some(
            (customType) => customType.name === response.data[i].type
          )
        ) {
          setCustomTypes([
            ...customTypes,
            { name: response.data[i].type, color: response.data[i].color },
          ]);
        }
      }
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

  const filterEvents = () => {
    if (selectedTypes.size === 0) {
      setFilteredEvents(events);
    } else {
      setFilteredEvents(
        events.filter((event) => selectedTypes.has(event.type))
      );
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

  const handleCustomTypeModalClose = () => {
    setIsCustomTypeModalOpen(false);
    setNewType("");
    setNewColor("#000000");
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

    let color = "#007BFF"; // Default color
    const type = formData.get("type");

    const customType = customTypes.find((custom) => custom.name === type);
    if (customType) {
      color = customType.color;
    } else {
      switch (type) {
        case "task":
          color = "#007BFF"; // Blue for Task
          break;
        case "meeting":
          color = "#28a745"; // Green for Meeting
          break;
        case "reminder":
          color = "#dc3545"; // Red for Reminder
          break;
        default:
          break;
      }
    }

    const newEvent = {
      title: formData.get("title"),
      description: formData.get("description"),
      start_time: startDate.toISOString(),
      end_time: endDate.toISOString(),
      type,
      color, // Include the color in the event data
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

  const handleTypeChange = (type) => {
    const updatedSelectedTypes = new Set(selectedTypes);
    if (updatedSelectedTypes.has(type)) {
      updatedSelectedTypes.delete(type);
    } else {
      updatedSelectedTypes.add(type);
    }
    setSelectedTypes(updatedSelectedTypes);
  };

  const eventPropGetter = (event) => {
    const backgroundColor = event.color || "#007BFF"; // Default to blue if color is not set
    return {
      style: {
        backgroundColor,
        color: "#fff",
      },
    };
  };

  if (error) {
    return <div style={{ color: "#FF0000" }}>Error: {error}</div>;
  }

  return (
    <div style={{ display: "flex", height: "500px" }}>
      <div style={{ flex: 1 }}>
        <DndProvider backend={HTML5Backend}>
          <DnDCalendar
            localizer={localizer}
            events={filteredEvents}
            startAccessor="start"
            endAccessor="end"
            selectable
            onSelectSlot={handleSelect}
            onEventDrop={handleEventDrop}
            resizable
            view={view}
            onView={setView}
            eventPropGetter={eventPropGetter} // Add this line to customize event colors
            style={{ color: "#000", backgroundColor: "#f5f5f5" }}
          />
        </DndProvider>
      </div>
      <div
        style={{
          width: "250px",
          padding: "20px",
          borderLeft: "1px solid #ccc",
        }}
      >
        <h3 style={{ color: "#333" }}>Event Types</h3>
        <div>
          <label>
            <input
              type="checkbox"
              checked={selectedTypes.has("task")}
              onChange={() => handleTypeChange("task")}
            />
            Task
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={selectedTypes.has("meeting")}
              onChange={() => handleTypeChange("meeting")}
            />
            Meeting
          </label>
        </div>
        <div>
          <label>
            <input
              type="checkbox"
              checked={selectedTypes.has("reminder")}
              onChange={() => handleTypeChange("reminder")}
            />
            Reminder
          </label>
        </div>
        <h3 style={{ color: "#333" }}>Custom Types</h3>
        {customTypes.map((customType, index) => (
          <div key={index}>
            <label>
              <input
                type="checkbox"
                checked={selectedTypes.has(customType.name)}
                onChange={() => handleTypeChange(customType.name)}
              />
              {customType.name}
              <span
                style={{
                  display: "inline-block",
                  width: "20px",
                  height: "20px",
                  backgroundColor: customType.color,
                  marginLeft: "10px",
                }}
              ></span>
            </label>
          </div>
        ))}
      </div>
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleModalClose}
        style={modalStyles}
      >
        <h2 style={{ color: "#333" }}>Create Event</h2>
        <form onSubmit={handleEventCreate}>
          <div>
            <label style={{ color: "#007BFF" }}>Title: </label>
            <input type="text" name="title" required style={inputStyles} />
          </div>
          <div>
            <label style={{ color: "#007BFF" }}>Description: </label>
            <textarea name="description" style={inputStyles} />
          </div>
          <div>
            <label style={{ color: "#007BFF" }}>Type: </label>
            <select name="type" required style={inputStyles}>
              <option value="task">Task</option>
              <option value="meeting">Meeting</option>
              <option value="reminder">Reminder</option>
              {customTypes.map((customType, index) => (
                <option key={index} value={customType.name}>
                  {customType.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ color: "#007BFF" }}>Start Time: </label>
            <input type="time" name="start_time" required style={inputStyles} />
          </div>
          <div>
            <label style={{ color: "#007BFF" }}>End Time: </label>
            <input
              type="time"
              name="end_time"
              onChange={handleEndTimeChange}
              style={inputStyles}
            />
          </div>
          <button type="submit" style={buttonStyles("#007BFF")}>
            Create Event
          </button>
          <button
            type="button"
            onClick={handleModalClose}
            style={buttonStyles("#FF0000")}
          >
            Cancel
          </button>
        </form>
      </Modal>

      <Modal
        isOpen={isCustomTypeModalOpen}
        onRequestClose={handleCustomTypeModalClose}
        style={modalStyles}
      >
        <h2 style={{ color: "#333" }}>Add Custom Type</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCustomTypes([
              ...customTypes,
              { name: newType, color: newColor },
            ]);
            setNewType("");
            setNewColor("#000000"); // Reset color
            handleCustomTypeModalClose();
          }}
        >
          <div>
            <label style={{ color: "#007BFF" }}>Type Name: </label>
            <input
              type="text"
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              required
              style={inputStyles}
            />
          </div>
          <div>
            <label style={{ color: "#007BFF" }}>Color: </label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              required
              style={inputStyles}
            />
          </div>
          <button type="submit" style={buttonStyles("#007BFF")}>
            Add Custom Type
          </button>
          <button
            type="button"
            onClick={handleCustomTypeModalClose}
            style={buttonStyles("#FF0000")}
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
        style={inputStyles}
      />
      <button type="submit" style={buttonStyles("#007BFF")}>
        Login
      </button>
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
