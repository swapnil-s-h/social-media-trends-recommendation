# Social Graph and Trend Recommender System

## Project Overview

**Social Graph and Trend Recommender** is a comprehensive social media recommendation system that combines graph-based algorithms with content analysis to provide intelligent friend suggestions and personalized trend feeds. The system uses advanced data structures and algorithms from the domain of graph theory to recommend relevant connections and trending content to users.

### Core Purpose

This project demonstrates the application of **Algorithms and Data Structures (DAA)** concepts to solve real-world social media problems:

- **Friend Discovery**: Identifying potential friends based on mutual connections, interests, and social proximity
- **Trend Personalization**: Recommending trending posts tailored to user interests and social graph proximity
- **Social Network Analysis**: Analyzing community structures using union-find (DSU) algorithms

---

## Features

### Friend Recommendation

- **Multiple recommendation algorithms** for diverse friend suggestions
- **Network visualization** showing user connections and social groups
- **Interest-based matching** considering education, location, and hobbies
- **Community detection** identifying disconnected social groups

### Trend & Feed Recommendation

- **Personalized feed** based on social proximity and topic interests
- **Multi-factor scoring** incorporating social influence, topic relevance, engagement, and freshness
- **Diversity optimization** using Maximal Marginal Relevance (MMR)
- **Trend analytics** showing top trending topics in your network

### User Management

- **Create users** with profiles (name, location, education, interests)
- **Build friendships** between users
- **Create posts** with content, tags, and engagement metrics
- **Update profiles** with additional information

---

## Technical Architecture

### Frontend

- **Framework**: React 19.1.1 with Vite
- **Visualization**: vis-network for interactive social graph
- **HTTP Client**: Axios for API communication
- **Styling**: CSS with responsive design
- **Icons**: Font Awesome 6

### Backend

- **Framework**: Express.js
- **Language**: Node.js
- **Port**: 4000
- **Data Storage**: In-memory (JavaScript objects and arrays)
- **Architecture**: RESTful API

### Key Technologies

- **Graph Visualization**: vis-network for real-time graph rendering
- **State Management**: React hooks (useState, useEffect)
- **Network Communication**: CORS-enabled REST APIs
- **Data Structures**: Disjoint Set Union (DSU), Sets, Maps

---

## Algorithms and Technical Details

### 1. **Disjoint Set Union (DSU) - Union-Find Data Structure**

Used for **community/group detection** in the social network.

**Algorithm**:

```
class DSU:
  - parent[]: Maps each user to their representative
  - size[]: Tracks component sizes for union-by-size optimization

  find(x): Returns the root representative of x's component
    - Uses path compression: parent[x] = find(parent[x])
    - Time Complexity: O(α(n)) amortized (α is inverse Ackermann)

  union(x, y): Merges components containing x and y
    - Uses union-by-size to minimize tree height
    - Attaches smaller tree to larger tree
```

**Purpose**: Identifies disconnected friend groups and can recommend users from different groups for network expansion.

---

### 2. **Friend Recommendation Algorithms**

#### A. **Adamic-Adar Algorithm**

Predicts link formation based on shared neighbors, weighted by their inverse log-degree.

**Formula**:
$$\text{Adamic-Adar}(u, v) = \sum_{w \in N(u) \cap N(v)} \frac{1}{\log|N(w)|}$$

**Where**:

- $N(u)$ = friends of user u
- $|N(w)|$ = degree (number of friends) of user w

**Intuition**: Common neighbors with lower degrees are more indicative of a potential connection.

**Implementation Details**:

- Iterates through direct friends of the source user
- For each friend, checks their friends (friends-of-friends)
- Adds weighted contribution: 1/log(degree of mutual connection)
- Candidates with higher scores appear first

**Use Case**: Best for predicting links when users share many acquaintances.

---

#### B. **Jaccard Similarity**

Measures overlap between two users' friend lists.

**Formula**:
$$\text{Jaccard}(u, v) = \frac{|N(u) \cap N(v)|}{|N(u) \cup N(v)|}$$

**Intuition**: Higher overlap in friend networks indicates similar social circles.

**Implementation Details**:

- Calculates intersection of friend sets
- Calculates union of friend sets
- Returns proportion of overlap
- Ranges from 0 to 1

**Use Case**: Simple, effective metric for fundamental similarity.

---

#### C. **Common Neighbors**

Counts the number of shared friends between two users.

**Formula**:
$$\text{Common Neighbors}(u, v) = |N(u) \cap N(v)|$$

**Intuition**: More common friends = stronger indication of connection likelihood.

**Implementation Details**:

- Straightforward counting of mutual friends
- No weighting or normalization
- Simple but effective baseline

**Use Case**: Useful for immediate friend-of-friend recommendations.

---

#### D. **BFS Profile (Friend-of-Friends with Attributes)**

Extends BFS with profile attributes (location, education, interests).

**Algorithm Steps**:

1. Find all friends-of-friends using BFS
2. Score each candidate with:
   - **Mutual friends count**: Each mutual friend = +10 points
   - **Common interests**: Each shared interest = +3 points
   - **Location match**: Same location = +3 points
   - **Education match**: Same education = +5 points
   - **Community bonus**: Different social group = +8 points (for expansion)

**Time Complexity**: O(|E| + |V|) where E = edges, V = vertices

---

#### E. **Advanced Profile Recommendation**

Comprehensive scoring combining multiple factors.

**Scoring Components**:

1. **Mutual Friends**: mutualCount × 2
2. **Location Proximity**: +5 if same location
3. **Education Background**: +8 if same education
4. **Common Interests**: count × 3
5. **Community Diversity**: +10 if in different social group

**Feature Normalization**: Prevents any single factor from dominating

**Top Results**: Returns top 5 recommendations sorted by total score

---

### 3. **Trend and Feed Recommendation Algorithms**

#### A. **Personalized PageRank**

Measures influence of each user in the network from a specific user's perspective.

**Algorithm**:

```
function runPersonalizedPageRank(sourceName, alpha=0.2, maxIterations=30):
  Initialize: scores[sourceName] = 1, scores[others] = 0

  For each iteration:
    For each user u:
      nextScores[u] = alpha (source bias)
      For each friend v of u:
        Each neighbor shares: (1-alpha) × scores[u] / degree(u)

    If convergence (delta < 1e-6): break

  Return scores (influence from perspective of source)
```

**Parameters**:

- **alpha = 0.2**: 20% probability of jumping back to source (damping factor)
- **maxIterations = 30**: Maximum iterations before forced termination

**Intuition**: Models random walk on social graph, biased toward source user's friends.

**Use Case**: Identifies influential users in your extended network.

---

#### B. **Topic Affinity Scoring**

Measures how well a post's topics match a user's profile.

**User Profile Building**:

```
topicProfile[user] = weighted token scores from:
  1. User interests (weight: 4)
  2. User's own posts (weight: 2.5 × recency × engagement)
  3. Friends' posts (weight: 0.75 × recency)
```

**Affinity Calculation**:
$$\text{Affinity} = \frac{\sum_{token \in post} \text{profile}[token]}{\sqrt{|\text{post tokens}|}}$$

**Normalization**: Divides by sqrt of token count to prevent bias toward longer posts

---

#### C. **Recency Weighting**

Prioritizes fresh content using exponential decay.

**Formula**:
$$w(t) = e^{-\frac{\text{age in hours}}{\text{half-life}}}$$

**Default Half-Lives**:

- User interests: 120 hours (5 days)
- Own posts: 120 hours
- Direct friends' posts: 72 hours (3 days)
- Recent posts in feed: 36 hours (1.5 days)
- Trend vector: 48 hours

**Intuition**: Posts lose relevance exponentially over time, but at different rates.

---

#### D. **Engagement Scoring**

Combines likes, comments, and shares into single metric.

**Formula**:
$$\text{EngagementScore} = \log(1 + \text{likes} + 2 \times \text{comments} + 3 \times \text{shares})$$

**Weighting**:

- Shares = 3× weight (highest user commitment)
- Comments = 2× weight (moderate engagement)
- Likes = 1× weight (basic engagement)

**Logarithmic Scale**: Prevents extremely popular posts from dominating recommendations

---

#### E. **Multi-Factor Feed Scoring**

Combines multiple dimensions for final recommendation ranking.

**Scoring Factors**:

1. **Social Score** (32%): User's PageRank influence × neighbor bonus
2. **Topic Affinity** (24%): How well post matches user interests
3. **Trend Score** (17%): How trending are the post's topics
4. **Engagement Score** (12%): Popularity of the post
5. **Freshness Score** (10%): How recent the post is
6. **Friend Support** (5%): How many friends have posted on topic
7. **Hop Bonus**: +6% for direct friends, +3% for 2-hop connections

**Calculation**:

```
baseScore = 0.32×norm(socialScore)
          + 0.24×norm(affinityScore)
          + 0.17×norm(trendScore)
          + 0.12×norm(engagementScore)
          + 0.10×norm(freshnessScore)
          + 0.05×norm(friendSupport)
          + hopBonus
```

**Normalization**: Each factor normalized by max value across all candidates to 0-1 range

---

#### F. **Maximal Marginal Relevance (MMR) Diversification**

Balances relevance with diversity to avoid repetitive feeds.

**Algorithm**:

```
function diversifyFeedCandidates(candidates, limit=8):
  selected = []
  remaining = candidates

  While len(selected) < limit:
    For each candidate in remaining:
      If selected is empty:
        mmrScore = 0.78 × baseScore
      Else:
        maxSimilarity = max Jaccard similarity to selected posts
        mmrScore = 0.78 × baseScore - 0.22 × maxSimilarity

    Select candidate with highest mmrScore
    Remove from remaining

  Return selected
```

**Parameters**:

- **0.78 relevance weight**: Prioritizes relevant content
- **0.22 diversity weight**: Penalizes similar posts
- **Limit = 8**: Default feed size

**Intuition**: Greedy algorithm that maximizes marginal contribution (relevance - redundancy)

---

#### G. **Jaccard Similarity for Posts**

Measures topical overlap between posts.

**Topic-based Similarity**:
$$\text{PostSimilarity}(p1, p2) = \min(1, \text{Jaccard}(tokens_1, tokens_2) + 0.35 \times \text{samAuthor})$$

**Features**:

- Authors rarely post same content → 0.35 author penalty
- Different authors similar content → higher diversity value
- Capped at 1.0 to prevent score explosion

---

### 4. **Token Processing and Text Analysis**

#### Stop Word Removal

Common English words filtered out: "a", "an", "and", "the", "is", "etc.

#### Topic Token Extraction

```
function extractTopicTokens(text):
  tokens = lowercase text split by non-alphanumeric
  Filter: length ≥ 3 AND not in stop words
  Return unique tokens
```

#### Tag Normalization

```
function normalizeStringList(values):
  Split by commas if string
  Trim and lowercase each value
  Remove duplicates
  Filter empty values
```

---

### 5. **Network Scope Management**

#### Hop Distance Calculation

**BFS-based distance computation**:

```
function getHopDistances(sourceName):
  distances[source] = 0
  queue = [source]

  While queue not empty:
    For each friend of current user:
      If not visited:
        distances[friend] = distances[current] + 1
        queue.push(friend)

  Return distances
```

**Constants**:

- **MAX_FEED_HOPS = 3**: Only include users within 3 hops
- **Direct friends = 1 hop**: Highest influence
- **2-3 hops**: Lower influence but community expansion

#### Community Validation

```
Feed includes posts only from:
  1. Same connected component (DSU)
  2. Within MAX_FEED_HOPS distance
  3. From users with max 3-hop distance
```

---

## How Recommendations Work

### Friend Recommendation Flow

**Step 1: User Input**

- Request recommendations for user "Alice"

**Step 2: Algorithm Execution**
Multiple algorithms run independently:

- Adamic-Adar: Weighs mutual friends by their influence
- Jaccard: Calculates friend list overlap
- Common Neighbors: Simple mutual friend count
- BFS Profile: Includes education, location, interests
- Advanced Profile: Comprehensive multi-factor scoring

**Step 3: Result Combination**

- All algorithms return top 5 candidates
- Each algorithm provides a score
- Results are returned separately for user comparison

**Example Output**:

```json
{
  "adamicAdar": [
    { "name": "Bob", "score": 0.45 },
    { "name": "Charlie", "score": 0.32 }
  ],
  "jaccard": [
    { "name": "Bob", "score": 0.65 },
    { "name": "David", "score": 0.55 }
  ]
}
```

### Trend Feed Recommendation Flow

**Step 1: Build User Context**

- Calculate hop distances to all users (BFS)
- Compute personalized PageRank scores
- Build topic profile from interests + posts

**Step 2: Generate Feed Candidates**

- Iterate through all posts in network
- Filter by: same community + within 3 hops + not by user
- Score each post:
  - Social score: Author's PageRank influence
  - Topic affinity: Match to user profile
  - Trend score: Topic popularity in network
  - Engagement: Post popularity metrics
  - Freshness: How recent the post is
  - Friend support: How many friends posted on topic

**Step 3: Diversify Results**

- Use MMR algorithm to balance relevance + diversity
- Start with highest-scoring posts
- Gradually add lower-scoring posts if they introduce new topics
- Return top 8 items

**Step 4: Extract Insights**

- Top trending topics in user's network
- Reasons for each recommendation

**Example Output**:

```json
{
  "items": [
    {
      "id": 1,
      "author": "Bob",
      "content": "Just published my machine learning article!",
      "tags": ["machine learning", "AI"],
      "hopDistance": 1,
      "score": 87.5,
      "reasons": "Direct friend signal from Bob, Matches topics: machine learning, Strong engagement"
    }
  ],
  "topTrends": [
    { "tag": "machine learning", "score": 45.2 },
    { "tag": "AI", "score": 32.1 }
  ]
}
```

---

## Project Structure

```
daa_cp/
├── README.md                          # This file
├── backend/
│   ├── package.json                  # Backend dependencies
│   ├── server.js                     # Express server with all algorithms
│   └── (No database - in-memory storage)
│
└── frontend/
    ├── package.json                  # Frontend dependencies & build config
    ├── vite.config.js                # Vite configuration
    ├── eslint.config.js              # Linting rules
    ├── index.html                    # HTML entry point
    ├── src/
    │   ├── main.jsx                 # React app entry
    │   ├── App.jsx                  # Main React component
    │   ├── App.css                  # Styling
    │   ├── api.js                   # Axios API client
    │   ├── VisGraph.jsx             # Graph visualization component
    │   ├── index.css                # Global styles
    │   └── assets/                  # Static assets
    └── public/                      # Public static files
```

---

## Setup and Installation

### Prerequisites

- **Node.js** (v14 or higher)
- **npm** (comes with Node.js)
- **Git** (optional)

### Installation Steps

#### 1. Clone or Extract the Project

```bash
cd daa_cp
```

#### 2. Install Backend Dependencies

```bash
cd backend
npm install
```

This will install:

- `express@^5.1.0` - Web framework
- `nodemon@^3.1.10` - Development auto-reload

#### 3. Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

This will install:

- `react@^19.1.1` - UI framework
- `react-dom@^19.1.1` - React DOM binding
- `axios@^1.13.2` - HTTP client
- `vis-network@^10.0.2` - Graph visualization
- `@fortawesome/fontawesome-free@^7.1.0` - Icons
- `vite@^7.1.7` - Build tool
- Dev dependencies for ESLint and TypeScript types

---

## Running the Project

### Run Backend and Frontend Separately

#### Terminal 1 - Start Backend Server

```bash
cd backend
node server.js
```

**Expected Output**:

```
Backend server running at http://localhost:4000
Ready to receive requests!
```

#### Terminal 2 - Start Frontend Dev Server

```bash
cd frontend
npm run dev
```

**Expected Output**:

```
VITE v7.1.7  ready in 245 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

#### Access the Application

Open your browser and navigate to:

```
http://localhost:5173
```

---

## API Endpoints

### User Management

#### Create User

```
POST /api/user
Content-Type: application/json

{
  "name": "Alice",
  "location": "San Francisco",
  "education": "Stanford University",
  "interests": ["machine learning", "AI", "web development"]
}

Response (201):
{
  "name": "Alice",
  "location": "San Francisco",
  "education": "Stanford University",
  "interests": ["machine learning", "ai", "web development"],
  "friends": [],
  "postCount": 0
}
```

#### Update User Profile

```
PUT /api/user/:name
Content-Type: application/json

{
  "location": "New York",
  "interests": ["data science", "Python"]
}

Response (200): Updated user object
```

#### Get All Users

```
GET /api/users

Response (200):
[
  {"name": "Alice", "friends": ["Bob"], ...},
  {"name": "Bob", "friends": ["Alice", "Charlie"], ...}
]
```

---

### Friendship Management

#### Add Friendship

```
POST /api/friendship
Content-Type: application/json

{
  "name1": "Alice",
  "name2": "Bob"
}

Response (201):
{"message": "Friendship added"}
```

#### Get Friend Groups

```
GET /api/groups

Response (200):
[
  ["Alice", "Bob", "Charlie"],
  ["David", "Eve"]
]
```

---

### Posts and Feed

#### Create Post

```
POST /api/post
Content-Type: application/json

{
  "author": "Alice",
  "content": "Just learned about PageRank algorithm!",
  "tags": ["algorithms", "machine learning"],
  "likes": 5,
  "comments": 2,
  "shares": 1
}

Response (201):
{
  "id": 1,
  "author": "Alice",
  "content": "Just learned about PageRank algorithm!",
  "tags": ["algorithms", "machine learning"],
  "topicTokens": ["algorithms", "machine learning", "learned", "pagerank"],
  "createdAt": "2024-05-02T10:30:00.000Z",
  "likes": 5,
  "comments": 2,
  "shares": 1
}
```

#### Get All Posts

```
GET /api/posts

Response (200):
[Array of posts sorted by recency]
```

---

### Recommendations

#### Get All Recommendations

```
GET /api/recommendations/:name

Response (200):
{
  "advancedProfile": [
    {"name": "Charlie", "score": 15, "reasons": "2 mutual friends, Same location"},
    {"name": "David", "score": 10, "reasons": "1 mutual friend"}
  ],

  "bfsProfile": [
    {"name": "Eve", "score": 16}
  ],

  "commonNeighbors": [
    {"name": "Charlie", "score": 2}
  ],

  "jaccard": [
    {"name": "Charlie", "score": 0.667}
  ],

  "adamicAdar": [
    {"name": "David", "score": 0.445}
  ],

  "trendFeed": [
    {
      "id": 3,
      "author": "Bob",
      "content": "Article on algorithms",
      "tags": ["algorithms"],
      "hopDistance": 1,
      "score": 78.45,
      "reasons": "Direct friend signal from Bob, Matches topics: algorithms"
    }
  ],

  "topTrends": [
    {"tag": "algorithms", "score": 45.2},
    {"tag": "machine learning", "score": 32.1}
  ]
}
```

#### Get Trend Feed Only

```
GET /api/feed/:name

Response (200):
{
  "items": [Array of feed posts],
  "topTrends": [Array of trending topics]
}
```

---

### Graph Visualization

#### Get Network Graph

```
GET /api/graph

Response (200):
{
  "nodes": [
    {
      "id": "Alice",
      "label": "Alice",
      "title": "<b>Alice</b><br>Location: San Francisco<br>...",
      "group": "Alice"
    }
  ],

  "edges": [
    {"from": "Alice", "to": "Bob"},
    {"from": "Bob", "to": "Charlie"}
  ]
}
```

---

## Time Complexity Analysis

| Operation              | Algorithm            | Complexity        |
| ---------------------- | -------------------- | ----------------- |
| Friend Recommendations | Adamic-Adar          | O(\|E\|)          |
| Friend Recommendations | Jaccard              | O(\|V\|²)         |
| PageRank Computation   | PPR                  | O(\|V\| × \|E\|)  |
| Topic Affinity         | Dot Product          | O(\|tokens\|)     |
| MMR Diversification    | Greedy               | O(n² × k)         |
| DSU Operations         | Union-Find           | O(α(n)) amortized |
| BFS Hop Distance       | Breadth-First Search | O(\|V\| + \|E\|)  |

---
