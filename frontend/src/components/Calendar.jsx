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
const plusButtonStyles = {
  backgroundColor: "#007BFF",
  borderRadius: "50%",
  color: "#fff",
  border: "none",
  width: "30px",
  height: "30px",
  fontSize: "20px",
  textAlign: "center",
  lineHeight: "30px",
  cursor: "pointer",
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
  const [selectedEvent, setSelectedEvent] = useState(null); // Track selected event for editing
  const [error, setError] = useState(null);
  const [customTypes, setCustomTypes] = useState([]); // Array to store custom types
  const [newType, setNewType] = useState("");
  const [newColor, setNewColor] = useState("#000000"); // Default color
  const [selectedTypes, setSelectedTypes] = useState(new Set()); // Set to track selected types

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
    setSelectedEvent(null); // Reset selected event when creating a new event
    setModalIsOpen(true);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event); // Set the selected event for editing
    setModalIsOpen(true);
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
  const handleModalClose = () => {
    setModalIsOpen(false);
    setSelectedSlot(null);
    setSelectedEvent(null); // Reset selected event on close
  };

  const handleEventCreateOrEdit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const startTime = formData.get("start_time");
    let endTime = formData.get("end_time");

    const startDate = selectedEvent
      ? new Date(selectedEvent.start)
      : new Date(selectedSlot.start);
    const year = startDate.getFullYear();
    const month = String(startDate.getMonth() + 1).padStart(2, "0"); // Months are zero-based
    const day = String(startDate.getDate()).padStart(2, "0");

    // Format date as YYYY-MM-DD
    const formattedDate = `${year}-${month}-${day}`;

    let [hours, minutes] = startTime.split(":").map(Number);

    // Combine date and time into the desired format
    const newStartTime = `${formattedDate}T${String(hours).padStart(
      2,
      "0"
    )}:${String(minutes).padStart(2, "0")}:00.000Z`;

    let newEndTime;
    if (!endTime) {
      hours += 1;
      if (hours >= 24) {
        newEndTime = `${formattedDate}T23:59:00.000Z`;
      } else {
        newEndTime = `${formattedDate}T${String(hours).padStart(
          2,
          "0"
        )}:${String(minutes).padStart(2, "0")}:00.000Z`;
      }
    } else {
      const [endHours, endMinutes] = endTime.split(":").map(Number);
      newEndTime = `${formattedDate}T${String(endHours).padStart(
        2,
        "0"
      )}:${String(endMinutes).padStart(2, "0")}:00.000Z`;

      const startDateObj = new Date(newStartTime);
      const endDateObj = new Date(newEndTime);
      if (endDateObj < startDateObj) {
        alert("End time cannot be earlier than start time.");
        return;
      }

      if (endDateObj.getDate() !== startDateObj.getDate()) {
        alert("End time must be within the same day as the start time.");
        return;
      }
    }

    let color = "#007BFF"; // Default color
    const type = formData.get("type");
    let recurrence = formData.get("recurrence"); // Get recurrence value
    if (recurrence == "none") {
      recurrence = "";
    }
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

    const eventData = {
      title: formData.get("title"),
      description: formData.get("description"),
      start_time: newStartTime,
      end_time: newEndTime,
      type,
      color,
      recurrence,
    };

    try {
      if (selectedEvent) {
        // Update the event
        await axios.put(
          `http://localhost:8000/events/${selectedEvent.id}/`,
          eventData,
          { params: { email: userEmail } }
        );
      } else {
        // Create a new event
        await axios.post("http://localhost:8000/events/", eventData, {
          params: { email: userEmail },
        });
      }
      setModalIsOpen(false);
      fetchEvents();
    } catch (error) {
      console.error("Error creating/updating event:", error);
      setError(
        "Failed to save the event. Please check your backend connection."
      );
    }
  };

  const handleDeleteEvent = async () => {
    if (selectedEvent) {
      try {
        await axios.delete(
          `http://localhost:8000/events/${selectedEvent.id}/`,
          {
            params: { email: userEmail },
          }
        );
        setModalIsOpen(false);
        fetchEvents();
      } catch (error) {
        console.error("Error deleting event:", error);
        setError(
          "Failed to delete the event. Please check your backend connection."
        );
      }
    }
  };

  const handleTypesChange = (type) => {
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
    <div style={{ height: "100vh" }}>
      <h1 style={{ textAlign: "center" }}>My Calendar</h1>

      {error && <p style={{ color: "red" }}>{error}</p>}

      {/* Type filters */}
      <div style={{ marginBottom: "10px" }}>
        <strong>Filter by Type: </strong>
        <label>
          <input
            type="checkbox"
            checked={selectedTypes.has("task")}
            onChange={() => handleTypesChange("task")}
          />
          Task
        </label>
        <label>
          <input
            type="checkbox"
            checked={selectedTypes.has("meeting")}
            onChange={() => handleTypesChange("meeting")}
          />
          Meeting
        </label>
        <label>
          <input
            type="checkbox"
            checked={selectedTypes.has("reminder")}
            onChange={() => handleTypesChange("reminder")}
          />
          Reminder
        </label>
        {/* Render checkboxes for custom types */}
        {customTypes.map((customType) => (
          <label key={customType.name}>
            <input
              type="checkbox"
              checked={selectedTypes.has(customType.name)}
              onChange={() => handleTypesChange(customType.name)}
            />
            {customType.name}
          </label>
        ))}
      </div>

      <DndProvider backend={HTML5Backend}>
        <DnDCalendar
          localizer={localizer}
          events={filteredEvents}
          startAccessor="start"
          endAccessor="end"
          style={{
            height: "80vh",
            margin: "20px",
            color: "#000",
            backgroundColor: "#f5f5f5",
          }}
          selectable
          onSelectSlot={handleSelect}
          onSelectEvent={handleEventClick}
          onEventDrop={handleEventDrop}
          resizable
          defaultView={view}
          onView={(newView) => setView(newView)}
          eventPropGetter={eventPropGetter}
        />
      </DndProvider>

      {/* Create/Edit Event Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleModalClose}
        style={modalStyles}
      >
        <h2>{selectedEvent ? "Edit Event" : "Create New Event"}</h2>
        <form onSubmit={handleEventCreateOrEdit}>
          <label>
            Title:
            <input
              name="title"
              defaultValue={selectedEvent?.title || ""}
              style={inputStyles}
              required
            />
          </label>
          <label>
            Description:
            <input
              name="description"
              defaultValue={selectedEvent?.description || ""}
              style={inputStyles}
            />
          </label>
          <label>
            Type:
            <select
              name="type"
              defaultValue={selectedEvent?.type || "task"}
              style={inputStyles}
            >
              <option value="task">Task</option>
              <option value="meeting">Meeting</option>
              <option value="reminder">Reminder</option>
              {/* Render options for custom types */}
              {customTypes.map((customType) => (
                <option key={customType.name} value={customType.name}>
                  {customType.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsCustomTypeModalOpen(true)}
              style={plusButtonStyles}
            >
              +
            </button>
          </label>
          <label>
            Start Time:
            <input
              name="start_time"
              type="time"
              defaultValue={
                selectedEvent
                  ? format(new Date(selectedEvent.start), "HH:mm")
                  : ""
              }
              style={inputStyles}
              required
            />
          </label>
          <label>
            End Time:
            <input
              name="end_time"
              type="time"
              defaultValue={
                selectedEvent
                  ? format(new Date(selectedEvent.end), "HH:mm")
                  : ""
              }
              style={inputStyles}
            />
          </label>
          <label>
            Recurrence:
            <select
              name="recurrence"
              defaultValue={selectedEvent?.recurrence || "none"}
              style={inputStyles}
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              {/* Add more recurrence options if needed */}
            </select>
          </label>
          <button type="submit" style={buttonStyles("#007BFF")}>
            {selectedEvent ? "Update Event" : "Create Event"}
          </button>
        </form>
        {selectedEvent && (
          <button onClick={handleDeleteEvent} style={buttonStyles("#dc3545")}>
            Delete Event
          </button>
        )}
      </Modal>

      {/* Custom Type Modal */}
      <Modal
        isOpen={isCustomTypeModalOpen}
        onRequestClose={() => setIsCustomTypeModalOpen(false)}
        style={modalStyles}
      >
        <h2>Create Custom Type</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCustomTypes([
              ...customTypes,
              { name: newType, color: newColor },
            ]);
            setIsCustomTypeModalOpen(false);
          }}
        >
          <label>
            Type Name:
            <input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              required
              style={inputStyles}
            />
          </label>
          <label>
            Color:
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              style={inputStyles}
            />
          </label>
          <button type="submit" style={buttonStyles("#007BFF")}>
            Create
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
