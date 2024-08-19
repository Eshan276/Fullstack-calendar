import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US"; // Import the locale directly
import "react-big-calendar/lib/css/react-big-calendar.css";
import axios from "axios";

const locales = {
  "en-US": enUS, // Use the imported locale
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const CalendarComponent = () => {
  const [events, setEvents] = useState([]);
  const [view, setView] = useState("month");
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchEvents();
  }, [view]);

  const fetchEvents = async () => {
    try {
      const response = await axios.get("http://localhost:8000/events/", {
        params: {
          start_date: new Date().toISOString(),
          end_date: new Date(
            new Date().setMonth(new Date().getMonth() + 1)
          ).toISOString(),
        },
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
      //setError("Failed to fetch events. Please check your backend connection.");
    }
  };

  const handleSelect = ({ start, end }) => {
    const title = window.prompt("New Event Title:");
    if (title) {
      const newEvent = {
        title,
        description: "",
        start_time: start.toISOString(),
        end_time: end.toISOString(),
      };
      axios
        .post("http://localhost:8000/events/", newEvent)
        .then(() => fetchEvents())
        .catch((error) => {
          console.error("Error creating event:", error);
          setError("Failed to create event. Please try again.");
        });
    }
  };

  if (error) {
    return <div>Error: {error}</div>;
  }

  return (
    <div style={{ height: "500px" }}>
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        selectable
        onSelectSlot={handleSelect}
        view={view}
        onView={setView}
      />
    </div>
  );
};

export default CalendarComponent;
