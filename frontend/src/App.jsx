import React, { useState, useEffect } from "react";

import api from "./api.js";

import "./App.css";

import VisGraph from "./VisGraph.jsx";

const initialOptions = {
  layout: {
    hierarchical: false,
  },

  edges: {
    color: "#888888",
  },

  nodes: {
    shape: "icon",

    icon: {
      face: '"Font Awesome 6 Free"',
      weight: "900",
      code: "\uf007", // 'fa-user' icon
      color: "#333333", // Adding a dark gray color for the icon
    },

    font: {
      color: "#333333",

      size: 14,
    },

    borderWidth: 2,
  },

  height: "600px",
};

const colorPalette = [
  "#E63946",

  "#457B9D",

  "#A8DADC",

  "#1D3557",

  "#F1FAEE",

  "#F4A261",

  "#2A9D8F",

  "#E9C46A",

  "#264653",

  "#E76F51",
];

function App() {
  const [userName, setUserName] = useState("");

  const [location, setLocation] = useState("");

  const [education, setEducation] = useState("");

  const [interests, setInterests] = useState(""); // <-- *** FIX 1: ADDED THIS LINE ***

  const [friend1, setFriend1] = useState("");

  const [friend2, setFriend2] = useState("");

  const [recName, setRecName] = useState("");

  // Data from backend

  const [graph, setGraph] = useState({ nodes: [], edges: [] });

  const [graphOptions, setGraphOptions] = useState(initialOptions);

  const [recommendations, setRecommendations] = useState(null); // Will hold recs object

  const [error, setError] = useState(""); // For showing errors

  const fetchGraph = async () => {
    try {
      const response = await api.get("/graph");

      const nodes = response.data?.nodes ?? [];

      const edges = response.data?.edges ?? [];

      const formattedNodes = nodes.map((node) => {
        const titleElement = document.createElement("div");

        titleElement.innerHTML = node.title;

        return {
          ...node,

          title: titleElement,
        };
      });

      const groupNames = [...new Set(nodes.map((n) => n.group))];

      // C. Build a 'groups' config object

      const groupsConfig = {};

      groupNames.forEach((groupName, index) => {
        const color = colorPalette[index % colorPalette.length];

        groupsConfig[groupName] = {
          color: {
            background: color, // The icon's background circle

            border: color, // The border

            highlight: { background: color, border: color },
          },

          icon: {
            color: "#088ab2ff", // Make the user icon itself white
          },
        };
      });

      // D. Update our graph options state

      setGraphOptions({
        ...initialOptions,

        groups: groupsConfig, // Add the new dynamic groups
      });

      setGraph({
        nodes: formattedNodes,

        edges: edges,
      });
    } catch (err) {
      console.error("Error fetching graph:", err);

      setError("Could not fetch graph data.");
    }
  };

  // Run this on the first page load

  useEffect(() => {
    fetchGraph();
  }, []);

  // Handler for adding a new user

  const handleAddUser = async (e) => {
    e.preventDefault();

    if (!userName) return;

    try {
      const interestsArray = interests

        .split(",")

        .map((s) => s.trim())

        .filter((s) => s);

      // *** FIX 4: Added leading slash "/" ***

      await api.post("/user", {
        name: userName,

        location: location,

        education: education,

        interests: interestsArray,
      });

      setUserName("");

      setLocation("");

      setEducation("");

      setInterests("");

      setError("");

      fetchGraph();
    } catch (err) {
      console.error("Error adding user:", err);

      setError(err.response?.data?.error || "Error adding user.");
    }
  };

  const handleAddFriendship = async (e) => {
    e.preventDefault();

    if (!friend1 || !friend2) return;

    try {
      // *** FIX 5: Added leading slash "/" ***

      await api.post("/friendship", { name1: friend1, name2: friend2 });

      setFriend1("");

      setFriend2("");

      setError("");

      fetchGraph(); // Refresh the graph
    } catch (err) {
      console.error("Error adding friendship:", err);

      setError(err.response?.data?.error || "Error adding friendship.");
    }
  };

  // Handler for getting recommendations

  const handleGetRecs = async (e) => {
    e.preventDefault();

    if (!recName) return;

    try {
      // *** FIX 6: Added leading slash "/" ***

      const response = await api.get(`/recommendations/${recName}`);

      setRecommendations(response.data);

      setError("");
    } catch (err) {
      console.error("Error getting recommendations:", err);

      setRecommendations(null);

      setError(err.response?.data?.error || "Error getting recommendations.");
    }
  };

  const renderRecs = (recs) => (
    <ul>
      {recs.length === 0 ? (
        <li>No recommendations found.</li>
      ) : (
        recs.map((rec) => (
          <li key={rec.name}>
            <strong>{rec.name}</strong> (Score: {rec.score.toFixed(2)})
            {rec.reasons && <div className="reasons">Why: {rec.reasons}</div>}
          </li>
        ))
      )}
    </ul>
  );

  // --- 3. Graph Options ---

  // (Your options are perfect, no changes needed)

  const options = {
    layout: {
      hierarchical: false,
    },

    edges: {
      color: "#888888",
    },

    nodes: {
      shape: "icon",

      icon: {
        face: '"Font Awesome 5 Free"',

        weight: "900",

        code: "\uf007",
      },

      font: {
        color: "#333333",

        size: 14,
      },

      borderWidth: 2,
    },

    height: "600px",
  };

  // ... (renderRecs and the rest of your JSX is perfect) ...

  // ... (I've omitted it for brevity) ...

  // --- 4. Render (HTML-like JSX) ---

  return (
    <div className="App">
      <header>
        <h1>Social Network Simulator</h1>
      </header>

      <div className="container">
        {/* Left Column: Controls */}

        <div className="controls">
          <form onSubmit={handleAddUser} className="form-card">
            <h2>Add User</h2>

            <input
              type="text"
              placeholder="User Name"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
            />

            <input
              type="text"
              placeholder="Location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />

            <input
              type="text"
              placeholder="Education"
              value={education}
              onChange={(e) => setEducation(e.target.value)}
            />

            <input
              type="text"
              placeholder="Interests (comma-separated)"
              value={interests}
              onChange={(e) => setInterests(e.target.value)}
            />

            <button type="submit">Add User</button>
          </form>

          <form onSubmit={handleAddFriendship} className="form-card">
            <h2>Add Friendship</h2>

            <input
              type="text"
              placeholder="User 1"
              value={friend1}
              onChange={(e) => setFriend1(e.target.value)}
            />

            <input
              type="text"
              placeholder="User 2"
              value={friend2}
              onChange={(e) => setFriend2(e.target.value)}
            />

            <button type="submit">Add Friendship</button>
          </form>

          <form onSubmit={handleGetRecs} className="form-card">
            <h2>Get Recommendations</h2>

            <input
              type="text"
              placeholder="Get Recs for..."
              value={recName}
              onChange={(e) => setRecName(e.target.value)}
            />

            <button type="submit">Find Friends</button>
          </form>

          {error && <div className="error-box">{error}</div>}

          {/* Recommendations Area */}

          {recommendations && (
            <div className="recs-container">
              <h3>Recommendations for {recName}</h3>

              <h4>BFS (Advanced Recommendations)</h4>

              {renderRecs(recommendations.advancedProfile)}

              <h4>BFS (On Normal Profile)</h4>

              {renderRecs(recommendations.bfsProfile)}

              <h4>Algorithmic (Mutual Friends)</h4>

              <div className="algo-grid">
                <div>
                  <strong>Common Neighbors</strong>

                  {renderRecs(recommendations.commonNeighbors)}
                </div>

                <div>
                  <strong>Jaccard</strong>

                  {renderRecs(recommendations.jaccard)}
                </div>

                <div>
                  <strong>Adamic-Adar</strong>

                  {renderRecs(recommendations.adamicAdar)}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Graph Visualization */}

        <div className="graph-container">
          <h2>Network Graph</h2>

          <VisGraph graph={graph} options={graphOptions} />
        </div>
      </div>
    </div>
  );
}

export default App;
