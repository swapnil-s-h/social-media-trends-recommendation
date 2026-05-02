const express = require("express");

const app = express();
const port = 4000;

app.use(express.json());

let users = {};
let posts = [];
let nextPostId = 1;

const DEFAULT_FEED_LIMIT = 8;
const MAX_FEED_HOPS = 3;
const STOP_WORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "have",
  "in",
  "is",
  "it",
  "of",
  "on",
  "or",
  "that",
  "the",
  "their",
  "this",
  "to",
  "was",
  "were",
  "with",
  "your",
]);

class DSU {
  constructor() {
    this.parent = {};
    this.size = {};
  }

  addUser(name) {
    if (!this.parent[name]) {
      this.parent[name] = name;
      this.size[name] = 1;
    }
  }

  find(name) {
    if (!this.parent[name]) {
      this.addUser(name);
    }

    if (this.parent[name] === name) {
      return name;
    }

    this.parent[name] = this.find(this.parent[name]);
    return this.parent[name];
  }

  union(name1, name2) {
    let root1 = this.find(name1);
    let root2 = this.find(name2);

    if (root1 !== root2) {
      if (this.size[root1] < this.size[root2]) {
        [root1, root2] = [root2, root1];
      }

      this.parent[root2] = root1;
      this.size[root1] += this.size[root2];
    }
  }

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

const friendGroups = new DSU();

function normalizeStringList(values) {
  const rawValues = Array.isArray(values)
    ? values
    : typeof values === "string"
    ? values.split(",")
    : [];

  const seen = new Set();
  const normalizedValues = [];

  for (const value of rawValues) {
    const normalized = String(value || "")
      .trim()
      .toLowerCase();

    if (normalized && !seen.has(normalized)) {
      seen.add(normalized);
      normalizedValues.push(normalized);
    }
  }

  return normalizedValues;
}

function extractTopicTokens(text) {
  if (typeof text !== "string") {
    return [];
  }

  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));

  return [...new Set(tokens)];
}

function buildTopicTokens(content, tags) {
  return [...new Set([...normalizeStringList(tags), ...extractTopicTokens(content)])];
}

function sanitizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function sanitizeCounter(value) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return 0;
  }
  return Math.floor(numericValue);
}

function sanitizeTimestamp(value) {
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? new Date().toISOString() : new Date(parsed).toISOString();
}

function serializeUser(user) {
  return {
    ...user,
    friends: Array.from(user.friends),
    postCount: user.posts.length,
  };
}

function isNeighbor(name1, name2) {
  if (!users[name1] || !users[name2]) {
    return false;
  }

  return users[name1].friends.has(name2);
}

function getDegree(name) {
  return users[name]?.friends.size || 0;
}

function getPostsByAuthor(author) {
  return posts.filter((post) => post.author === author);
}

function getAgeInHours(timestamp) {
  const parsed = Date.parse(timestamp);
  if (Number.isNaN(parsed)) {
    return 0;
  }

  return Math.max(0, (Date.now() - parsed) / 3600000);
}

function getRecencyWeight(timestamp, halfLifeHours = 36) {
  return Math.exp(-getAgeInHours(timestamp) / halfLifeHours);
}

function getEngagementScore(post) {
  const weightedInteractions = post.likes + post.comments * 2 + post.shares * 3;
  return Math.log1p(weightedInteractions);
}

function addWeightedTokens(scoreMap, tokens, weight) {
  for (const token of tokens) {
    scoreMap[token] = (scoreMap[token] || 0) + weight;
  }
}

function averageTokenScore(scoreMap, tokens) {
  if (!tokens.length) {
    return 0;
  }

  const total = tokens.reduce((sum, token) => sum + (scoreMap[token] || 0), 0);
  return total / tokens.length;
}

function countMutualFriends(name1, name2) {
  const friends1 = users[name1]?.friends || new Set();
  const friends2 = users[name2]?.friends || new Set();
  const smaller = friends1.size <= friends2.size ? friends1 : friends2;
  const larger = smaller === friends1 ? friends2 : friends1;

  let count = 0;
  for (const friendName of smaller) {
    if (larger.has(friendName)) {
      count++;
    }
  }

  return count;
}

function getHopDistances(sourceName) {
  const distances = { [sourceName]: 0 };
  const queue = [sourceName];

  for (let index = 0; index < queue.length; index++) {
    const currentName = queue[index];

    for (const neighborName of users[currentName].friends) {
      if (distances[neighborName] !== undefined) {
        continue;
      }

      distances[neighborName] = distances[currentName] + 1;
      queue.push(neighborName);
    }
  }

  return distances;
}

function runPersonalizedPageRank(sourceName, alpha = 0.2, maxIterations = 30) {
  const names = Object.keys(users);
  let currentScores = {};

  for (const name of names) {
    currentScores[name] = name === sourceName ? 1 : 0;
  }

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const nextScores = {};
    let delta = 0;

    for (const name of names) {
      nextScores[name] = name === sourceName ? alpha : 0;
    }

    for (const name of names) {
      const neighbors = Array.from(users[name].friends);
      const walkMass = (1 - alpha) * currentScores[name];

      if (neighbors.length === 0) {
        nextScores[sourceName] += walkMass;
        continue;
      }

      const share = walkMass / neighbors.length;
      for (const neighborName of neighbors) {
        nextScores[neighborName] += share;
      }
    }

    for (const name of names) {
      delta += Math.abs(nextScores[name] - currentScores[name]);
    }

    currentScores = nextScores;

    if (delta < 1e-6) {
      break;
    }
  }

  return currentScores;
}

function buildUserTopicProfile(name) {
  const profile = {};
  const currentUser = users[name];

  addWeightedTokens(profile, currentUser.interests, 4);

  for (const post of getPostsByAuthor(name)) {
    const weight =
      2.5 * getRecencyWeight(post.createdAt, 120) * (1 + getEngagementScore(post) * 0.25);
    addWeightedTokens(profile, post.topicTokens, weight);
  }

  for (const friendName of currentUser.friends) {
    for (const post of getPostsByAuthor(friendName)) {
      const weight = 0.75 * getRecencyWeight(post.createdAt, 72);
      addWeightedTokens(profile, post.topicTokens, weight);
    }
  }

  return profile;
}

function computeTopicAffinity(profile, topicTokens) {
  if (!topicTokens.length) {
    return 0;
  }

  let score = 0;
  for (const token of topicTokens) {
    score += profile[token] || 0;
  }

  return score / Math.sqrt(topicTokens.length);
}

function buildNetworkTrendVector(targetName, influenceScores, hopDistances) {
  const trendVector = {};
  const userRoot = friendGroups.find(targetName);

  for (const post of posts) {
    if (post.author === targetName) {
      continue;
    }

    const hopDistance = hopDistances[post.author];
    if (hopDistance === undefined || hopDistance > MAX_FEED_HOPS) {
      continue;
    }

    if (friendGroups.find(post.author) !== userRoot) {
      continue;
    }

    const influenceScore = influenceScores[post.author] || 0;
    const weight =
      (0.35 + influenceScore * 10) *
      getRecencyWeight(post.createdAt, 48) *
      (1 + getEngagementScore(post) * 0.2);

    addWeightedTokens(trendVector, post.topicTokens, weight);
  }

  return trendVector;
}

function countDirectFriendTagSupport(targetName, topicTokens) {
  if (!topicTokens.length) {
    return 0;
  }

  const topicSet = new Set(topicTokens);
  let supportCount = 0;

  for (const friendName of users[targetName].friends) {
    const hasMatchingRecentPost = getPostsByAuthor(friendName).some((post) => {
      if (getAgeInHours(post.createdAt) > 96) {
        return false;
      }

      return post.topicTokens.some((token) => topicSet.has(token));
    });

    if (hasMatchingRecentPost) {
      supportCount++;
    }
  }

  return supportCount;
}

function normalizeFeature(value, maxValue) {
  if (maxValue <= 0) {
    return 0;
  }

  return value / maxValue;
}

function computeJaccardSimilarity(tokens1, tokens2) {
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);

  if (set1.size === 0 && set2.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of set1) {
    if (set2.has(token)) {
      intersection++;
    }
  }

  const union = set1.size + set2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function computePostSimilarity(postA, postB) {
  const topicSimilarity = computeJaccardSimilarity(postA.topicTokens, postB.topicTokens);
  const authorPenalty = postA.author === postB.author ? 0.35 : 0;
  return Math.min(1, topicSimilarity + authorPenalty);
}

function summarizeTrendVector(trendVector, limit = 5) {
  return Object.entries(trendVector)
    .sort(([, scoreA], [, scoreB]) => scoreB - scoreA)
    .slice(0, limit)
    .map(([tag, score]) => ({
      tag,
      score: Number(score.toFixed(2)),
    }));
}

function buildFeedRecommendationContext(name) {
  const hopDistances = getHopDistances(name);
  const influenceScores = runPersonalizedPageRank(name);
  const topicProfile = buildUserTopicProfile(name);
  const trendVector = buildNetworkTrendVector(name, influenceScores, hopDistances);

  return {
    hopDistances,
    influenceScores,
    topicProfile,
    trendVector,
    userRoot: friendGroups.find(name),
  };
}

function buildFeedReasons(candidate, topicProfile) {
  const reasons = [];
  const matchingTopics = candidate.topicTokens
    .filter((token) => topicProfile[token])
    .sort((left, right) => (topicProfile[right] || 0) - (topicProfile[left] || 0))
    .slice(0, 3);

  if (candidate.hopDistance === 1) {
    reasons.push(`Direct friend signal from ${candidate.author}`);
  } else {
    reasons.push(`${candidate.hopDistance}-hop social influence from ${candidate.author}`);
  }

  if (matchingTopics.length > 0) {
    reasons.push(`Matches topics: ${matchingTopics.join(", ")}`);
  }

  if (candidate.friendSupport > 0) {
    reasons.push(`Trending across ${candidate.friendSupport} friend feed(s)`);
  }

  if (candidate.engagementScore >= 1.5) {
    reasons.push("Strong engagement");
  }

  if (candidate.freshnessScore >= 0.7) {
    reasons.push("Fresh post");
  }

  return reasons.join(", ");
}

function scoreTrendFeedCandidates(name, context) {
  const candidates = [];

  for (const post of posts) {
    if (post.author === name) {
      continue;
    }

    const hopDistance = context.hopDistances[post.author];
    if (hopDistance === undefined || hopDistance > MAX_FEED_HOPS) {
      continue;
    }

    if (friendGroups.find(post.author) !== context.userRoot) {
      continue;
    }

    const mutualFriends = countMutualFriends(name, post.author);
    const friendSupport = countDirectFriendTagSupport(name, post.topicTokens);
    const socialScore =
      (context.influenceScores[post.author] || 0) * (isNeighbor(name, post.author) ? 1.25 : 1);
    const affinityScore = computeTopicAffinity(context.topicProfile, post.topicTokens);
    const trendScore = averageTokenScore(context.trendVector, post.topicTokens);
    const engagementScore = getEngagementScore(post);
    const freshnessScore = getRecencyWeight(post.createdAt, 36);

    candidates.push({
      ...post,
      hopDistance,
      mutualFriends,
      friendSupport,
      socialScore,
      affinityScore,
      trendScore,
      engagementScore,
      freshnessScore,
    });
  }

  if (candidates.length === 0) {
    return [];
  }

  const maxima = candidates.reduce(
    (maxValues, candidate) => ({
      social: Math.max(maxValues.social, candidate.socialScore),
      affinity: Math.max(maxValues.affinity, candidate.affinityScore),
      trend: Math.max(maxValues.trend, candidate.trendScore),
      engagement: Math.max(maxValues.engagement, candidate.engagementScore),
      freshness: Math.max(maxValues.freshness, candidate.freshnessScore),
      support: Math.max(maxValues.support, candidate.friendSupport + candidate.mutualFriends),
    }),
    {
      social: 0,
      affinity: 0,
      trend: 0,
      engagement: 0,
      freshness: 0,
      support: 0,
    }
  );

  return candidates
    .map((candidate) => {
      const normalizedSocial = normalizeFeature(candidate.socialScore, maxima.social);
      const normalizedAffinity = normalizeFeature(candidate.affinityScore, maxima.affinity);
      const normalizedTrend = normalizeFeature(candidate.trendScore, maxima.trend);
      const normalizedEngagement = normalizeFeature(
        candidate.engagementScore,
        maxima.engagement
      );
      const normalizedFreshness = normalizeFeature(candidate.freshnessScore, maxima.freshness);
      const normalizedSupport = normalizeFeature(
        candidate.friendSupport + candidate.mutualFriends,
        maxima.support
      );

      const hopBonus = candidate.hopDistance === 1 ? 0.06 : candidate.hopDistance === 2 ? 0.03 : 0;
      const baseScore =
        normalizedSocial * 0.32 +
        normalizedAffinity * 0.24 +
        normalizedTrend * 0.17 +
        normalizedEngagement * 0.12 +
        normalizedFreshness * 0.1 +
        normalizedSupport * 0.05 +
        hopBonus;

      return {
        ...candidate,
        baseScore,
        reasons: buildFeedReasons(candidate, context.topicProfile),
      };
    })
    .sort((left, right) => right.baseScore - left.baseScore);
}

function diversifyFeedCandidates(candidates, limit = DEFAULT_FEED_LIMIT) {
  const remaining = [...candidates];
  const selected = [];

  while (selected.length < limit && remaining.length > 0) {
    let bestIndex = 0;
    let bestScore = -Infinity;

    for (let index = 0; index < remaining.length; index++) {
      const candidate = remaining[index];
      const maxSimilarity =
        selected.length === 0
          ? 0
          : Math.max(...selected.map((picked) => computePostSimilarity(candidate, picked)));
      const mmrScore = 0.78 * candidate.baseScore - 0.22 * maxSimilarity;

      if (mmrScore > bestScore) {
        bestScore = mmrScore;
        bestIndex = index;
      }
    }

    selected.push(remaining.splice(bestIndex, 1)[0]);
  }

  return selected.map((candidate) => ({
    id: candidate.id,
    author: candidate.author,
    content: candidate.content,
    tags: candidate.tags.length > 0 ? candidate.tags : candidate.topicTokens,
    createdAt: candidate.createdAt,
    likes: candidate.likes,
    comments: candidate.comments,
    shares: candidate.shares,
    hopDistance: candidate.hopDistance,
    score: Number((candidate.baseScore * 100).toFixed(2)),
    reasons: candidate.reasons,
  }));
}

function buildTrendFeedPackage(name, limit = DEFAULT_FEED_LIMIT) {
  const context = buildFeedRecommendationContext(name);
  const rankedCandidates = scoreTrendFeedCandidates(name, context);

  return {
    items: diversifyFeedCandidates(rankedCandidates, limit),
    topTrends: summarizeTrendVector(context.trendVector),
  };
}

function runAdvancedRecommendation(name) {
  const recs = [];
  const currentUser = users[name];
  const userRoot = friendGroups.find(name);

  for (const otherName in users) {
    if (otherName === name || isNeighbor(name, otherName)) {
      continue;
    }

    const otherUser = users[otherName];
    let score = 0;
    const reasons = [];

    let mutualCount = 0;
    for (const friendName of currentUser.friends) {
      if (isNeighbor(friendName, otherName)) {
        mutualCount++;
      }
    }

    if (mutualCount > 0) {
      score += mutualCount * 2;
      reasons.push(`${mutualCount} mutual friend(s)`);
    }

    if (
      currentUser.location &&
      otherUser.location &&
      currentUser.location === otherUser.location
    ) {
      score += 5;
      reasons.push("Same location");
    }

    if (
      currentUser.education &&
      otherUser.education &&
      currentUser.education === otherUser.education
    ) {
      score += 8;
      reasons.push("Same education");
    }

    const commonInterests = currentUser.interests.filter((interest) =>
      otherUser.interests.includes(interest)
    );
    if (commonInterests.length > 0) {
      score += commonInterests.length * 3;
      reasons.push(`${commonInterests.length} common interest(s)`);
    }

    if (friendGroups.find(otherName) !== userRoot) {
      score += 10;
      reasons.push("Connects to new friend group");
    }

    if (score > 0) {
      recs.push({ name: otherName, score, reasons: reasons.join(", ") });
    }
  }

  return recs.sort((left, right) => right.score - left.score).slice(0, 5);
}

function runRecommendFriends(name) {
  const scores = {};
  const currentUser = users[name];
  const userRoot = friendGroups.find(name);

  for (const friendName of currentUser.friends) {
    for (const fofName of users[friendName].friends) {
      if (fofName !== name && !isNeighbor(name, fofName)) {
        scores[fofName] = (scores[fofName] || 0) + 10;
      }
    }
  }

  const recs = [];
  for (const recName in scores) {
    let score = scores[recName];
    const otherUser = users[recName];

    const commonInterests = currentUser.interests.filter((interest) =>
      otherUser.interests.includes(interest)
    );
    score += commonInterests.length * 3;

    if (
      currentUser.location &&
      otherUser.location &&
      currentUser.location === otherUser.location
    ) {
      score += 3;
    }

    if (
      currentUser.education &&
      otherUser.education &&
      currentUser.education === otherUser.education
    ) {
      score += 5;
    }

    if (friendGroups.find(recName) !== userRoot) {
      score += 8;
    }

    recs.push({ name: recName, score });
  }

  return recs.sort((left, right) => right.score - left.score).slice(0, 5);
}

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

  return Object.entries(scores)
    .map(([candidateName, score]) => ({ name: candidateName, score }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

function runAdamicAdar(name) {
  const scores = {};
  const currentUser = users[name];

  for (const friendName of currentUser.friends) {
    const friendDegree = getDegree(friendName);
    if (friendDegree <= 1) {
      continue;
    }

    const scoreContribution = 1 / Math.log(friendDegree);

    for (const fofName of users[friendName].friends) {
      if (fofName !== name && !isNeighbor(name, fofName)) {
        scores[fofName] = (scores[fofName] || 0) + scoreContribution;
      }
    }
  }

  return Object.entries(scores)
    .map(([candidateName, score]) => ({ name: candidateName, score }))
    .sort((left, right) => right.score - left.score)
    .slice(0, 5);
}

function runJaccard(name) {
  const recs = [];
  const currentUser = users[name];
  const friends1 = currentUser.friends;
  const degree1 = friends1.size;

  for (const otherName in users) {
    if (otherName === name || isNeighbor(name, otherName)) {
      continue;
    }

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
      recs.push({
        name: otherName,
        score: union === 0 ? 0 : intersection / union,
      });
    }
  }

  return recs.sort((left, right) => right.score - left.score).slice(0, 5);
}

app.post("/api/user", (req, res) => {
  const { name, location, education, interests } = req.body;
  const cleanedName = sanitizeText(name);

  if (!cleanedName) {
    return res.status(400).send({ error: "Name is required" });
  }

  if (users[cleanedName]) {
    return res.status(400).send({ error: "User already exists" });
  }

  users[cleanedName] = {
    name: cleanedName,
    location: sanitizeText(location),
    education: sanitizeText(education),
    interests: normalizeStringList(interests),
    friends: new Set(),
    posts: [],
  };

  friendGroups.addUser(cleanedName);
  console.log(`Added user: ${cleanedName}`);

  return res.status(201).send(serializeUser(users[cleanedName]));
});

app.put("/api/user/:name", (req, res) => {
  const { name } = req.params;
  const { location, education, interests } = req.body;

  if (!users[name]) {
    return res.status(404).send({ error: "User not found" });
  }

  if (location !== undefined) {
    users[name].location = sanitizeText(location);
  }

  if (education !== undefined) {
    users[name].education = sanitizeText(education);
  }

  if (interests !== undefined) {
    users[name].interests = normalizeStringList(interests);
  }

  console.log(`Updated profile for: ${name}`);
  return res.send(serializeUser(users[name]));
});

app.post("/api/friendship", (req, res) => {
  const name1 = sanitizeText(req.body.name1);
  const name2 = sanitizeText(req.body.name2);

  if (!users[name1] || !users[name2]) {
    return res.status(404).send({ error: "One or both users not found" });
  }

  if (name1 === name2) {
    return res.status(400).send({ error: "A user cannot befriend themselves" });
  }

  if (isNeighbor(name1, name2)) {
    return res.status(400).send({ error: "Users are already friends" });
  }

  users[name1].friends.add(name2);
  users[name2].friends.add(name1);
  friendGroups.union(name1, name2);

  console.log(`Added friendship: ${name1} <-> ${name2}`);
  return res.status(201).send({ message: "Friendship added" });
});

app.post("/api/post", (req, res) => {
  const author = sanitizeText(req.body.author);
  const content = sanitizeText(req.body.content);
  const tags = normalizeStringList(req.body.tags);

  if (!users[author]) {
    return res.status(404).send({ error: "Author not found" });
  }

  const topicTokens = buildTopicTokens(content, tags);
  if (!content && topicTokens.length === 0) {
    return res.status(400).send({ error: "Post content or tags are required" });
  }

  const post = {
    id: nextPostId++,
    author,
    content,
    tags,
    topicTokens,
    createdAt: sanitizeTimestamp(req.body.createdAt),
    likes: sanitizeCounter(req.body.likes),
    comments: sanitizeCounter(req.body.comments),
    shares: sanitizeCounter(req.body.shares),
  };

  posts.push(post);
  users[author].posts.push(post.id);

  console.log(`Added post ${post.id} by ${author}`);
  return res.status(201).send(post);
});

app.get("/api/recommendations/:name", (req, res) => {
  const { name } = req.params;

  if (!users[name]) {
    return res.status(404).send({ error: "User not found" });
  }

  const trendFeed = buildTrendFeedPackage(name);

  return res.send({
    advancedProfile: runAdvancedRecommendation(name),
    bfsProfile: runRecommendFriends(name),
    commonNeighbors: runCommonNeighbors(name),
    jaccard: runJaccard(name),
    adamicAdar: runAdamicAdar(name),
    trendFeed: trendFeed.items,
    topTrends: trendFeed.topTrends,
  });
});

app.get("/api/feed/:name", (req, res) => {
  const { name } = req.params;

  if (!users[name]) {
    return res.status(404).send({ error: "User not found" });
  }

  return res.send(buildTrendFeedPackage(name));
});

app.get("/api/users", (req, res) => {
  return res.send(Object.values(users).map(serializeUser));
});

app.get("/api/posts", (req, res) => {
  const recentPosts = [...posts].sort(
    (left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt)
  );
  return res.send(recentPosts);
});

app.get("/api/groups", (req, res) => {
  return res.send(friendGroups.getAllGroups());
});

app.get("/api/graph", (req, res) => {
  const nodes = Object.values(users).map((user) => {
    let title = `<b>${user.name}</b><br>`;

    if (user.location) {
      title += `Location: ${user.location}<br>`;
    }

    if (user.education) {
      title += `Education: ${user.education}<br>`;
    }

    if (user.interests.length > 0) {
      title += `Interests: ${user.interests.join(", ")}<br>`;
    }

    title += `Posts: ${user.posts.length}`;

    return {
      id: user.name,
      label: user.name,
      title,
      group: friendGroups.find(user.name),
    };
  });

  const edges = [];
  const addedEdges = new Set();

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

  return res.send({ nodes, edges });
});

app.listen(port, () => {
  console.log(`Backend server running at http://localhost:${port}`);
  console.log("Ready to receive requests!");
});
