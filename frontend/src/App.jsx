import React, { useEffect, useState } from "react";

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
      code: "\uf007",
      color: "#333333",
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

const emptyUserForm = {
  name: "",
  location: "",
  education: "",
  interests: "",
};

const emptyFriendshipForm = {
  name1: "",
  name2: "",
};

const emptyPostForm = {
  author: "",
  content: "",
  tags: "",
  likes: "0",
  comments: "0",
  shares: "0",
};

function App() {
  const [userForm, setUserForm] = useState(emptyUserForm);
  const [friendshipForm, setFriendshipForm] = useState(emptyFriendshipForm);
  const [postForm, setPostForm] = useState(emptyPostForm);
  const [recName, setRecName] = useState("");
  const [activeRecommendationUser, setActiveRecommendationUser] = useState("");
  const [graph, setGraph] = useState({ nodes: [], edges: [] });
  const [graphOptions, setGraphOptions] = useState(initialOptions);
  const [posts, setPosts] = useState([]);
  const [recommendations, setRecommendations] = useState(null);
  const [error, setError] = useState("");

  const parseCsv = (value) =>
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

  const formatDate = (value) => {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "Unknown time" : parsed.toLocaleString();
  };

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

      const groupNames = [...new Set(nodes.map((node) => node.group))];
      const groupsConfig = {};

      groupNames.forEach((groupName, index) => {
        const color = colorPalette[index % colorPalette.length];
        groupsConfig[groupName] = {
          color: {
            background: color,
            border: color,
            highlight: {
              background: color,
              border: color,
            },
          },
          icon: {
            color: "#ffffff",
          },
        };
      });

      setGraphOptions({
        ...initialOptions,
        groups: groupsConfig,
      });

      setGraph({
        nodes: formattedNodes,
        edges,
      });
    } catch (err) {
      console.error("Error fetching graph:", err);
      setError("Could not fetch graph data.");
    }
  };

  const fetchPosts = async () => {
    try {
      const response = await api.get("/posts");
      setPosts(response.data ?? []);
    } catch (err) {
      console.error("Error fetching posts:", err);
      setError("Could not fetch feed posts.");
    }
  };

  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([fetchGraph(), fetchPosts()]);
    };

    loadInitialData();
  }, []);

  const handleUserFieldChange = (event) => {
    const { name, value } = event.target;
    setUserForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleFriendshipFieldChange = (event) => {
    const { name, value } = event.target;
    setFriendshipForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handlePostFieldChange = (event) => {
    const { name, value } = event.target;
    setPostForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleAddUser = async (event) => {
    event.preventDefault();

    if (!userForm.name.trim()) {
      return;
    }

    try {
      await api.post("/user", {
        name: userForm.name.trim(),
        location: userForm.location,
        education: userForm.education,
        interests: parseCsv(userForm.interests),
      });

      setUserForm(emptyUserForm);
      setError("");
      await fetchGraph();
    } catch (err) {
      console.error("Error adding user:", err);
      setError(err.response?.data?.error || "Error adding user.");
    }
  };

  const handleAddFriendship = async (event) => {
    event.preventDefault();

    if (!friendshipForm.name1.trim() || !friendshipForm.name2.trim()) {
      return;
    }

    try {
      await api.post("/friendship", {
        name1: friendshipForm.name1.trim(),
        name2: friendshipForm.name2.trim(),
      });

      setFriendshipForm(emptyFriendshipForm);
      setError("");
      await fetchGraph();
    } catch (err) {
      console.error("Error adding friendship:", err);
      setError(err.response?.data?.error || "Error adding friendship.");
    }
  };

  const handleAddPost = async (event) => {
    event.preventDefault();

    if (!postForm.author.trim()) {
      return;
    }

    try {
      await api.post("/post", {
        author: postForm.author.trim(),
        content: postForm.content,
        tags: parseCsv(postForm.tags),
        likes: Number(postForm.likes) || 0,
        comments: Number(postForm.comments) || 0,
        shares: Number(postForm.shares) || 0,
      });

      setPostForm(emptyPostForm);
      setError("");
      await Promise.all([fetchPosts(), fetchGraph()]);
    } catch (err) {
      console.error("Error adding post:", err);
      setError(err.response?.data?.error || "Error adding post.");
    }
  };

  const handleGetRecommendations = async (event) => {
    event.preventDefault();

    const targetUser = recName.trim();
    if (!targetUser) {
      return;
    }

    try {
      const response = await api.get(`/recommendations/${targetUser}`);
      setRecommendations(response.data);
      setActiveRecommendationUser(targetUser);
      setError("");
    } catch (err) {
      console.error("Error getting recommendations:", err);
      setRecommendations(null);
      setActiveRecommendationUser("");
      setError(err.response?.data?.error || "Error getting recommendations.");
    }
  };

  const renderFriendRecommendations = (recs) => (
    <ul className="plain-list">
      {recs.length === 0 ? (
        <li>No recommendations found.</li>
      ) : (
        recs.map((rec) => (
          <li key={rec.name} className="rec-item">
            <strong>{rec.name}</strong> <span>(Score: {rec.score.toFixed(2)})</span>
            {rec.reasons && <div className="reasons">Why: {rec.reasons}</div>}
          </li>
        ))
      )}
    </ul>
  );

  const renderTrendFeed = (feedItems) => {
    if (!feedItems || feedItems.length === 0) {
      return <p className="empty-state">No feed items found for this user yet.</p>;
    }

    return (
      <div className="feed-grid">
        {feedItems.map((item) => (
          <article key={item.id} className="feed-card">
            <div className="feed-card-header">
              <div>
                <h5>{item.author}</h5>
                <span className="subtle-text">
                  {item.hopDistance === 1
                    ? "Direct friend source"
                    : `${item.hopDistance}-hop social source`}
                </span>
              </div>
              <span className="score-pill">{item.score}</span>
            </div>

            <p className="feed-content">
              {item.content || "Topic-only trend item. Tags are driving this recommendation."}
            </p>

            <div className="tag-row">
              {item.tags.map((tag) => (
                <span key={`${item.id}-${tag}`} className="tag-pill">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="metrics-row">
              <span>Likes: {item.likes}</span>
              <span>Comments: {item.comments}</span>
              <span>Shares: {item.shares}</span>
            </div>

            <div className="reasons">Why: {item.reasons}</div>
            <div className="subtle-text">{formatDate(item.createdAt)}</div>
          </article>
        ))}
      </div>
    );
  };

  const renderTopTrends = (trends) => {
    if (!trends || trends.length === 0) {
      return <p className="empty-state">No trend signals detected yet.</p>;
    }

    return (
      <div className="tag-row">
        {trends.map((trend) => (
          <span key={trend.tag} className="tag-pill trend-pill">
            #{trend.tag} <strong>{trend.score}</strong>
          </span>
        ))}
      </div>
    );
  };

  const renderRecentPosts = () => {
    if (posts.length === 0) {
      return <p className="empty-state">No feed posts yet. Publish a few posts to drive trend recommendations.</p>;
    }

    return (
      <div className="recent-posts">
        {posts.slice(0, 8).map((post) => (
          <article key={post.id} className="recent-post">
            <div className="feed-card-header">
              <div>
                <h5>{post.author}</h5>
                <span className="subtle-text">{formatDate(post.createdAt)}</span>
              </div>
              <span className="score-pill small-pill">Post #{post.id}</span>
            </div>

            <p className="feed-content">
              {post.content || "Topic-only post"}
            </p>

            <div className="tag-row">
              {(post.tags?.length ? post.tags : post.topicTokens || []).map((tag) => (
                <span key={`${post.id}-${tag}`} className="tag-pill">
                  #{tag}
                </span>
              ))}
            </div>

            <div className="metrics-row">
              <span>Likes: {post.likes}</span>
              <span>Comments: {post.comments}</span>
              <span>Shares: {post.shares}</span>
            </div>
          </article>
        ))}
      </div>
    );
  };

  return (
    <div className="App">
      <header>
        <h1>Social Graph And Trend Recommender</h1>
        <p>Friend recommendation algorithms plus graph-aware trend/feed personalization.</p>
      </header>

      <div className="container">
        <div className="controls">
          <form onSubmit={handleAddUser} className="form-card">
            <h2>Add User</h2>

            <input
              type="text"
              name="name"
              placeholder="User Name"
              value={userForm.name}
              onChange={handleUserFieldChange}
            />
            <input
              type="text"
              name="location"
              placeholder="Location"
              value={userForm.location}
              onChange={handleUserFieldChange}
            />
            <input
              type="text"
              name="education"
              placeholder="Education"
              value={userForm.education}
              onChange={handleUserFieldChange}
            />
            <input
              type="text"
              name="interests"
              placeholder="Interests (comma-separated)"
              value={userForm.interests}
              onChange={handleUserFieldChange}
            />

            <button type="submit">Add User</button>
          </form>

          <form onSubmit={handleAddFriendship} className="form-card">
            <h2>Add Friendship</h2>

            <input
              type="text"
              name="name1"
              placeholder="User 1"
              value={friendshipForm.name1}
              onChange={handleFriendshipFieldChange}
            />
            <input
              type="text"
              name="name2"
              placeholder="User 2"
              value={friendshipForm.name2}
              onChange={handleFriendshipFieldChange}
            />

            <button type="submit">Add Friendship</button>
          </form>

          <form onSubmit={handleAddPost} className="form-card">
            <h2>Publish Feed Item</h2>

            <input
              type="text"
              name="author"
              placeholder="Author"
              value={postForm.author}
              onChange={handlePostFieldChange}
            />
            <textarea
              name="content"
              placeholder="Post content"
              value={postForm.content}
              onChange={handlePostFieldChange}
              rows="4"
            />
            <input
              type="text"
              name="tags"
              placeholder="Tags (comma-separated)"
              value={postForm.tags}
              onChange={handlePostFieldChange}
            />

            <div className="inline-inputs">
              <input
                type="number"
                min="0"
                name="likes"
                placeholder="Likes"
                value={postForm.likes}
                onChange={handlePostFieldChange}
              />
              <input
                type="number"
                min="0"
                name="comments"
                placeholder="Comments"
                value={postForm.comments}
                onChange={handlePostFieldChange}
              />
              <input
                type="number"
                min="0"
                name="shares"
                placeholder="Shares"
                value={postForm.shares}
                onChange={handlePostFieldChange}
              />
            </div>

            <button type="submit">Publish Post</button>
          </form>

          <form onSubmit={handleGetRecommendations} className="form-card">
            <h2>Get Recommendations</h2>

            <input
              type="text"
              placeholder="Generate for user..."
              value={recName}
              onChange={(event) => setRecName(event.target.value)}
            />

            <button type="submit">Find Friends And Feed</button>
          </form>

          {error && <div className="error-box">{error}</div>}

          {recommendations && (
            <section className="recs-container">
              <h3>Recommendations For {activeRecommendationUser}</h3>

              <h4>Personalized Trend Feed</h4>
              {renderTrendFeed(recommendations.trendFeed)}

              <h4>Top Community Trend Signals</h4>
              {renderTopTrends(recommendations.topTrends)}

              <h4>Advanced Profile Matching</h4>
              {renderFriendRecommendations(recommendations.advancedProfile)}

              <h4>BFS And Profile Hybrid</h4>
              {renderFriendRecommendations(recommendations.bfsProfile)}

              <h4>Graph Similarity Algorithms</h4>
              <div className="algo-grid">
                <div>
                  <strong>Common Neighbors</strong>
                  {renderFriendRecommendations(recommendations.commonNeighbors)}
                </div>
                <div>
                  <strong>Jaccard</strong>
                  {renderFriendRecommendations(recommendations.jaccard)}
                </div>
                <div>
                  <strong>Adamic-Adar</strong>
                  {renderFriendRecommendations(recommendations.adamicAdar)}
                </div>
              </div>
            </section>
          )}
        </div>

        <div className="graph-container">
          <h2>Network Graph</h2>
          <VisGraph graph={graph} options={graphOptions} />

          <section className="community-feed-card">
            <div className="section-head">
              <h3>Recent Community Feed</h3>
              <span className="subtle-text">{posts.length} total posts</span>
            </div>
            {renderRecentPosts()}
          </section>
        </div>
      </div>
    </div>
  );
}

export default App;
