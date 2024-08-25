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
import { darken } from "polished";
import moment from "moment";
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
    color: "#333",
    backgroundColor: "#fff",
    padding: "30px",
    borderRadius: "15px",
    width: "400px",
    maxWidth: "90%",
    margin: "auto",
    zIndex: "1000",
    boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
    border: "none",
  },
  overlay: {
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    zIndex: "999",
  },
};

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
  const [currentDate, setCurrentDate] = React.useState(new Date());

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
    console.log(slotInfo);
    setSelectedSlot(slotInfo);
    setSelectedEvent(null); // Reset selected event when creating a new event
    setModalIsOpen(true);
  };

  const handleEventClick = (event) => {
    setSelectedEvent(event); // Set the selected event for editing
    setModalIsOpen(true);
  };
  const formatLocalDateTime = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    const milliseconds = String(date.getMilliseconds()).padStart(3, "0");
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}.${milliseconds}Z`;
  };

  const handleEventDrop = async ({ event, start, end }) => {
    console.log(start, end);
    console.log(start.toLocaleTimeString(), start.toISOString());
    //return;
    const updatedEvent = {
      ...event,
      start_time: formatLocalDateTime(start),
      end_time: formatLocalDateTime(end),
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
  const messages = {
    agenda: "Schedule",
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
  const dayPropGetter = (date, currentMonth) => {
    const today = new Date();
    const dateMonth = moment(date).month();

    if (date.toDateString() === today.toDateString()) {
      return {
        style: {
          backgroundColor: "#64b5f6", // Blue 300 color for current date
        },
      };
    } else if (dateMonth !== currentMonth) {
      return {
        style: {
          backgroundColor: "#507A76", // Light gray color for previous/next month's dates
          color: "#212121", // Light gray text color
        },
      };
    }
    return {};
  };
  if (error) {
    return <div style={{ color: "#FF0000" }}>Error: {error}</div>;
  }
  return (
    <div className="h-screen w-full">
      {/* <h1 className="text-center text-2xl font-bold mb-4">My Calendar</h1> */}

      {error && <p className="text-red-500">{error}</p>}

      <div className="flex-row sm:flex">
        <div className="flex-1 mr-5 rounded-md">
          <DndProvider backend={HTML5Backend}>
            <div className="bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg border border-white border-opacity-30 shadow-lg rounded-xl p-4">
              <DnDCalendar
                localizer={localizer}
                events={filteredEvents}
                startAccessor="start"
                endAccessor="end"
                className="h-[80vh] m-5 text-black font-bold bg-transparent rounded-md" // Updated styles
                selectable
                onSelectSlot={handleSelect}
                onSelectEvent={handleEventClick}
                onEventDrop={handleEventDrop}
                resizable
                defaultView={view}
                onView={(newView) => setView(newView)}
                eventPropGetter={eventPropGetter}
                messages={messages}
                step={60}
                timeslots={1}
                onNavigate={(date) => setCurrentDate(date)}
                dayPropGetter={(date) =>
                  dayPropGetter(date, moment(currentDate).month())
                }
              />
            </div>
          </DndProvider>
        </div>

        <div className="h-1/2 mt-5 w-64 mx-5 border-2 border-white bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg shadow-lg p-6 rounded-lg text-gray-300">
          <strong>Filter by Type: </strong>
          <div className="flex flex-col gap-2 mt-2">
            {[
              "task",
              "meeting",
              "reminder",
              ...customTypes.map((t) => t.name),
            ].map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 text-gray-300"
              >
                <input
                  type="checkbox"
                  checked={selectedTypes.has(type)}
                  onChange={() => handleTypesChange(type)}
                  className="form-checkbox"
                />
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Create/Edit Event Modal */}
      {/* Create/Edit Event Modal */}
      <Modal
        isOpen={modalIsOpen}
        onRequestClose={handleModalClose}
        style={modalStyles}
        className="bg-white p-8 rounded-lg max-w-md mx-auto mt-20"
      >
        <h2 className="text-2xl font-bold mb-4">
          {selectedEvent ? "Edit Event" : "Create New Event"}
        </h2>
        <form onSubmit={handleEventCreateOrEdit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Title:
            </label>
            <input
              name="title"
              defaultValue={selectedEvent?.title || ""}
              className="mt-1 block w-full rounded-md bg-slate-300 border-2 border-blue-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Description:
            </label>
            <input
              name="description"
              defaultValue={selectedEvent?.description || ""}
              className="mt-1 block w-full rounded-md bg-slate-300 border-2 border-blue-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Type:
            </label>
            <div className="flex items-center">
              <select
                name="type"
                defaultValue={selectedEvent?.type || "task"}
                className="mt-1 block w-3/4 rounded-md bg-slate-300 border-2 border-blue-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              >
                <option value="task">Task</option>
                <option value="meeting">Meeting</option>
                <option value="reminder">Reminder</option>
                {customTypes.map((customType) => (
                  <option key={customType.name} value={customType.name}>
                    {customType.name}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setIsCustomTypeModalOpen(true)}
                className="ml-2 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center focus:outline-none hover:bg-blue-600"
              >
                <p className="flex items-center justify-center mb-1">+</p>
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Time:
            </label>
            <input
              name="start_time"
              type="time"
              defaultValue={
                (view == "day" || view == "week") && selectedSlot
                  ? format(new Date(selectedSlot.start), "HH:mm")
                  : selectedEvent
                  ? format(new Date(selectedEvent.start), "HH:mm")
                  : ""
              }
              className="mt-1 block w-full rounded-md bg-slate-300 border-2 border-blue-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
              required
            />
            {selectedSlot &&
              selectedSlot.start &&
              console.log(format(new Date(selectedSlot.start), "HH:mm"), view)}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Time:
            </label>
            <input
              name="end_time"
              type="time"
              defaultValue={
                selectedEvent
                  ? format(new Date(selectedEvent.end), "HH:mm")
                  : ""
              }
              className="mt-1 block w-full rounded-md bg-slate-300 border-2 border-blue-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Recurrence:
            </label>
            <select
              name="recurrence"
              defaultValue={selectedEvent?.recurrence || "none"}
              className="mt-1 block w-full rounded-md bg-slate-300 border-2 border-blue-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            >
              <option value="none">None</option>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            {selectedEvent ? "Update Event" : "Create Event"}
          </button>
        </form>
        {selectedEvent && (
          <button
            onClick={handleDeleteEvent}
            className="mt-4 w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
          >
            Delete Event
          </button>
        )}
      </Modal>

      {/* Custom Type Modal */}
      <Modal
        isOpen={isCustomTypeModalOpen}
        onRequestClose={() => setIsCustomTypeModalOpen(false)}
        style={modalStyles}
        className="bg-white p-8 rounded-lg max-w-md mx-auto mt-20"
      >
        <h2 className="text-2xl font-bold mb-4">Create Custom Type</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setCustomTypes([
              ...customTypes,
              { name: newType, color: newColor },
            ]);
            setIsCustomTypeModalOpen(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Type Name:
            </label>
            <input
              value={newType}
              onChange={(e) => setNewType(e.target.value)}
              required
              className="mt-1 block w-full rounded-md bg-slate-300 border-2 border-blue-600 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Color:
            </label>
            <input
              type="color"
              value={newColor}
              onChange={(e) => setNewColor(e.target.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
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
    <div className="flex flex-col items-center justify-center border-2 border-white bg-white bg-opacity-10 backdrop-filter backdrop-blur-lg shadow-lg p-6 rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-blue-400">
            Email:
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="flex mt-1 items-center justify-center  rounded-md border-2 border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
          />
        </div>
        <button
          type="submit"
          className="flex items-center justify-center  bg-blue-500 text-white py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
        >
          Login
        </button>
      </form>
    </div>
  );
};

const App = () => {
  const [userEmail, setUserEmail] = useState(null);

  const handleLogin = (email) => {
    setUserEmail(email);
  };

  return (
    <div className="flex flex-col items-center justify-center container mx-auto px-4 py-8 overflow-hidden">
      {!userEmail ? (
        <LoginComponent onLogin={handleLogin} />
      ) : (
        <>
          <p className="flex-row mb-4">Logged in as: {userEmail}</p>
          <CalendarComponent userEmail={userEmail} />
        </>
      )}
    </div>
  );
};

export default App;
