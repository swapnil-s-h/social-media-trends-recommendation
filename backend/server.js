// --- 1. Imports ---
// We import Express to run the server.
const express = require("express");
const app = express();
const port = 4000; // The port our server will run on

// --- 2. Middleware ---
// This allows our server to understand JSON data sent from the frontend.
app.use(express.json());

// --- 3. In-Memory "Database" (Replaces C structs/arrays) ---
// Instead of an array of users, we'll use an Object (a "map" or "dictionary").
// This is much faster. Finding a user is O(1) instead of O(n).
let users = {
  // Example:
  // "Suraj": {
  //     name: "Suraj",
  //     location: "Pune",
  //     education: "Engineering",
  //     interests: ["coding", "music"],
  //     friends: new Set(["Mithil"]) // A Set is O(1) for friend checks
  // }
};

// --- 4. Disjoint Set Union (DSU) Class (Ported from C) ---
// This class manages our friend groups.
class DSU {
  constructor() {
    this.parent = {}; // Replaces int parent[MAX_USERS]
    this.size = {}; // Replaces int size[MAX_USERS]
  }

  // Add a new user to the DSU
  addUser(name) {
    if (!this.parent[name]) {
      this.parent[name] = name;
      this.size[name] = 1;
    }
  }

  // Find the root parent of a user (with path compression)
  find(name) {
    if (!this.parent[name]) {
      // This user doesn't exist in DSU, add them.
      this.addUser(name);
    }

    if (this.parent[name] === name) {
      return name;
    }
    this.parent[name] = this.find(this.parent[name]); // Path compression
    return this.parent[name];
  }

  // Merge two user groups (union by size)
  union(name1, name2) {
    let root1 = this.find(name1);
    let root2 = this.find(name2);

    if (root1 !== root2) {
      if (this.size[root1] < this.size[root2]) {
        [root1, root2] = [root2, root1]; // Swap
      }
      this.parent[root2] = root1;
      this.size[root1] += this.size[root2];
    }
  }

  // Get all distinct friend groups
  getAllGroups() {
    const groups = {};
    for (const name in users) {
      const root = this.find(name);
      if (!groups[root]) {
        groups[root] = [];
      }
      groups[root].push(name);
    }
    return Object.values(groups);
  }
}

// Create one global DSU instance
const friendGroups = new DSU();

// --- 5. Helper Functions ---

// Replaces your is_neighbor() function.
// Using a Set makes this an O(1) check, which is extremely fast.
function isNeighbor(name1, name2) {
  if (!users[name1] || !users[name2]) return false;
  return users[name1].friends.has(name2);
}

// Replaces your getUserDegree() function.
// A Set's .size property is O(1).
function getDegree(name) {
  return users[name]?.friends.size || 0;
}

// --- 6. API: Data Management (Ported from C) ---
//
// This diagram shows the API routes we're building and what they do.

/**
 * @route   POST /api/user
 * @desc    Adds a new user (replaces addUser)
 * @body    { "name": "Suraj" }
 */
app.post("/api/user", (req, res) => {
  // We can now accept interests right at creation
  const { name, location, education, interests } = req.body;
  if (!name) {
    return res.status(400).send({ error: "Name is required" });
  }
  if (users[name]) {
    return res.status(400).send({ error: "User already exists" });
  }

  users[name] = {
    name: name,
    location: location || "", // Add on creation
    education: education || "", // Add on creation
    interests: interests || [], // Add on creation
    friends: new Set(),
  };

  friendGroups.addUser(name);
  console.log(`Added user: ${name}`);
  res.status(201).send(users[name]);
});

/**
 * @route   PUT /api/user/:name
 * @desc    Updates a user's profile (replaces updateUserProfile)
 * @body    { "location": "Pune", "education": "VIT", "interests": ["C", "React"] }
 */
app.put("/api/user/:name", (req, res) => {
  const { name } = req.params;
  const { location, education, interests } = req.body;

  if (!users[name]) {
    return res.status(404).send({ error: "User not found" });
  }

  // Update profile data
  if (location) users[name].location = location;
  if (education) users[name].education = education;
  if (interests) users[name].interests = interests;

  console.log(`Updated profile for: ${name}`);
  res.send(users[name]);
});

/**
 * @route   POST /api/friendship
 * @desc    Adds a new friendship (replaces addFriendship)
 * @body    { "name1": "Suraj", "name2": "Mithil" }
 */
app.post("/api/friendship", (req, res) => {
  const { name1, name2 } = req.body;

  if (!users[name1] || !users[name2]) {
    return res.status(404).send({ error: "One or both users not found" });
  }
  if (isNeighbor(name1, name2)) {
    return res.status(400).send({ error: "Users are already friends" });
  }

  // Add friendship bidirectionally
  users[name1].friends.add(name2);
  users[name2].friends.add(name1);

  // Merge their friend groups in the DSU
  friendGroups.union(name1, name2);

  console.log(`Added friendship: ${name1} <-> ${name2}`);
  res.status(201).send({ message: "Friendship added" });
});

// --- 7. API: Recommendation Engine (Ported from C) ---

/**
 * @route   GET /api/recommendations/:name
 * @desc    Runs ALL recommendation algorithms for a user
 */
app.get("/api/recommendations/:name", (req, res) => {
  const { name } = req.params;
  if (!users[name]) {
    return res.status(404).send({ error: "User not found" });
  }

  // Run all algorithms
  const results = {
    advancedProfile: runAdvancedRecommendation(name),
    bfsProfile: runRecommendFriends(name),
    commonNeighbors: runCommonNeighbors(name),
    jaccard: runJaccard(name),
    adamicAdar: runAdamicAdar(name),
  };

  res.send(results);
});

// --- 8. Recommendation Algorithm Implementations ---

// Replaces advancedRecommendation (Profile + DSU)
function runAdvancedRecommendation(name) {
  const recs = [];
  const currentUser = users[name];
  const userRoot = friendGroups.find(name);

  for (const otherName in users) {
    if (otherName === name || isNeighbor(name, otherName)) {
      continue; // Skip self and direct friends
    }

    const otherUser = users[otherName];
    let score = 0;
    let reasons = [];

    // 1. Mutual friends
    let mutualCount = 0;
    for (const friendName of currentUser.friends) {
      if (isNeighbor(friendName, otherName)) {
        mutualCount++;
      }
    }
    if (mutualCount > 0) {
      score += mutualCount * 2.0;
      reasons.push(`${mutualCount} mutual friend(s)`);
    }

    // 2. Same location
    if (
      currentUser.location &&
      otherUser.location &&
      currentUser.location === otherUser.location
    ) {
      score += 5.0;
      reasons.push("Same location");
    }

    // 3. Same education
    if (
      currentUser.education &&
      otherUser.education &&
      currentUser.education === otherUser.education
    ) {
      score += 8.0;
      reasons.push("Same education");
    }

    // 4. Common interests
    const commonInterests = currentUser.interests.filter((i) =>
      otherUser.interests.includes(i)
    );
    if (commonInterests.length > 0) {
      score += commonInterests.length * 3.0;
      reasons.push(`${commonInterests.length} common interest(s)`);
    }

    // 5. DSU bonus
    if (friendGroups.find(otherName) !== userRoot) {
      score += 10.0;
      reasons.push("Connects to new friend group");
    }

    if (score > 0) {
      recs.push({ name: otherName, score, reasons: reasons.join(", ") });
    }
  }
  return recs.sort((a, b) => b.score - a.score).slice(0, 5);
}

// Replaces recommendFriends (BFS + Profile)
function runRecommendFriends(name) {
  const scores = {}; // Use an object as a score map
  const currentUser = users[name];
  const userRoot = friendGroups.find(name);

  // Find friends-of-friends (FoFs)
  for (const friendName of currentUser.friends) {
    for (const fofName of users[friendName].friends) {
      if (fofName !== name && !isNeighbor(name, fofName)) {
        scores[fofName] = (scores[fofName] || 0) + 10; // Base + mutual score
      }
    }
  }

  const recs = [];
  for (const recName in scores) {
    let score = scores[recName];
    const otherUser = users[recName];

    // Add profile scores
    const commonInterests = currentUser.interests.filter((i) =>
      otherUser.interests.includes(i)
    );
    score += commonInterests.length * 3.0;

    if (
      currentUser.location &&
      otherUser.location &&
      currentUser.location === otherUser.location
    )
      score += 3;
    if (
      currentUser.education &&
      otherUser.education &&
      currentUser.education === otherUser.education
    )
      score += 5;
    if (friendGroups.find(recName) !== userRoot) score += 8;

    recs.push({ name: recName, score });
  }
  return recs.sort((a, b) => b.score - a.score).slice(0, 5);
}

// Replaces common_neighbors_recommend
function runCommonNeighbors(name) {
  const scores = {};
  const currentUser = users[name];

  for (const friendName of currentUser.friends) {
    for (const fofName of users[friendName].friends) {
      if (fofName !== name && !isNeighbor(name, fofName)) {
        scores[fofName] = (scores[fofName] || 0) + 1;
      }
    }
  }

  const recs = Object.entries(scores).map(([name, score]) => ({ name, score }));
  return recs.sort((a, b) => b.score - a.score).slice(0, 5);
}

// Replaces adamic_adar_recommend
function runAdamicAdar(name) {
  const scores = {};
  const currentUser = users[name];

  for (const friendName of currentUser.friends) {
    const friendDegree = getDegree(friendName);
    if (friendDegree <= 1) continue; // Skip if friend has no other friends

    const scoreContribution = 1 / Math.log(friendDegree);

    for (const fofName of users[friendName].friends) {
      if (fofName !== name && !isNeighbor(name, fofName)) {
        scores[fofName] = (scores[fofName] || 0) + scoreContribution;
      }
    }
  }

  const recs = Object.entries(scores).map(([name, score]) => ({ name, score }));
  return recs.sort((a, b) => b.score - a.score).slice(0, 5);
}

// Replaces jaccard_recommend
function runJaccard(name) {
  const recs = [];
  const currentUser = users[name];
  const friends1 = currentUser.friends;
  const degree1 = friends1.size;

  for (const otherName in users) {
    if (otherName === name || isNeighbor(name, otherName)) continue;

    const friends2 = users[otherName].friends;
    const degree2 = friends2.size;

    let intersection = 0;
    for (const friendName of friends1) {
      if (friends2.has(friendName)) {
        intersection++;
      }
    }

    if (intersection > 0) {
      const union = degree1 + degree2 - intersection;
      const score = union === 0 ? 0 : intersection / union;
      recs.push({ name: otherName, score });
    }
  }
  return recs.sort((a, b) => b.score - a.score).slice(0, 5);
}

// --- 9. API: Helper Endpoints (for debugging/visualization) ---

/**
 * @route   GET /api/users
 * @desc    Gets all users and their profile data
 */
app.get("/api/users", (req, res) => {
  // Convert Sets to Arrays for clean JSON output
  const cleanUsers = Object.values(users).map((user) => ({
    ...user,
    friends: Array.from(user.friends),
  }));
  res.send(cleanUsers);
});

/**
 * @route   GET /api/groups
 * @desc    Gets all friend groups from the DSU
 */
app.get("/api/groups", (req, res) => {
  res.send(friendGroups.getAllGroups());
});

/**
 * @route   GET /api/graph
 * @desc    Gets all data formatted for the frontend visualization
 */
app.get("/api/graph", (req, res) => {
  const nodes = Object.values(users).map((user) => {
    let title = `<b>${user.name}</b><br>`;
    if (user.location) {
      title += `Location: ${user.location}<br>`;
    }
    if (user.education) {
      title += `Education: ${user.education}<br>`;
    }
    if (user.interests && user.interests.length > 0) {
      title += `Interests: ${user.interests.join(", ")}`;
    }

    return {
      id: user.name,
      label: user.name,
      title: title,
      group: friendGroups.find(user.name),
    };
  });

  // Format edges for the graph
  const edges = [];
  const addedEdges = new Set(); // To prevent duplicate A->B, B->A
  for (const name in users) {
    for (const friendName of users[name].friends) {
      const edgeId1 = `${name}--${friendName}`;
      const edgeId2 = `${friendName}--${name}`;

      if (!addedEdges.has(edgeId1) && !addedEdges.has(edgeId2)) {
        edges.push({
          from: name,
          to: friendName,
        });
        addedEdges.add(edgeId1);
      }
    }
  }
  res.send({ nodes, edges });
});

// --- 10. Start the Server ---
app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
  console.log("Ready to receive requests!");
});
