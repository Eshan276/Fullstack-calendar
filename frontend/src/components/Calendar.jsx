import React, { useState, useEffect } from "react";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import format from "date-fns/format";
import parse from "date-fns/parse";
import startOfWeek from "date-fns/startOfWeek";
import getDay from "date-fns/getDay";
import enUS from "date-fns/locale/en-US";
import "react-big-calendar/lib/css/react-big-calendar.css";
import axios from "axios";
import Modal from "react-modal";
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

const LoginComponent = ({ onLogin }) => {
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post("http://localhost:8000/users/", { email });
      onLogin(email);
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Enter your email"
        required
      />
      <button type="submit">Login/Create User</button>
    </form>
  );
};

// const CalendarComponent = ({ userEmail }) => {
//   const [events, setEvents] = useState([]);
//   const [view, setView] = useState("month");
//   const [error, setError] = useState(null);

//   useEffect(() => {
//     fetchEvents();
//   }, [view, userEmail]);

//   const fetchEvents = async () => {
//     try {
//       const response = await axios.get("http://localhost:8000/user/events/", {
//         params: {
//           email: userEmail,
//         },
//       });
//       setEvents(
//         response.data.map((event) => ({
//           ...event,
//           start: new Date(event.start_time),
//           end: new Date(event.end_time),
//         }))
//       );
//     } catch (error) {
//       console.error("Error fetching events:", error);
//       setError("Failed to fetch events. Please check your backend connection.");
//     }
//   };

//   // const handleSelect = ({ start, end }) => {
//   //   const title = window.prompt("New Event Title:");
//   //   if (title) {
//   //     const newEvent = {
//   //       title,
//   //       description: "",
//   //       start_time: start.toISOString(),
//   //       end_time: end.toISOString(),
//   //     };
//   //     axios
//   //       .post("http://localhost:8000/events/", newEvent, {
//   //         params: { email: userEmail },
//   //       })
//   //       .then(() => fetchEvents())
//   //       .catch((error) => {
//   //         console.error("Error creating event:", error);
//   //         setError("Failed to create event. Please try again.");
//   //       });
//   //   }
//   // };

//   if (error) {
//     return <div>Error: {error}</div>;
//   }

//   return (
//     <div style={{ height: "500px" }}>
//       <Calendar
//         localizer={localizer}
//         events={events}
//         startAccessor="start"
//         endAccessor="end"
//         selectable
//         onSelectSlot={handleSelect}
//         view={view}
//         onView={setView}
//       />
//     </div>
//   );
// };

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

    const newEvent = {
      title: formData.get("title"),
      description: formData.get("description"),
      start_time: selectedSlot.start.toISOString(),
      end_time: selectedSlot.end.toISOString(),
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

  if (error) {
    return <div style={{ color: "#FF0000" }}>Error: {error}</div>;
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
        style={{ color: "#000", backgroundColor: "#f5f5f5" }}
      />

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
          },
          overlay: { backgroundColor: "rgba(0, 0, 0, 0.5)" },
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
          <button
            type="submit"
            style={{
              color: "#fff",
              backgroundColor: "#007BFF",
              padding: "10px",
              border: "none",
              borderRadius: "5px",
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
            }}
          >
            Cancel
          </button>
        </form>
      </Modal>
    </div>
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
