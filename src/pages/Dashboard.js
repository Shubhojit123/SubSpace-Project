import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Helmet } from "react-helmet";
import styles from "../styles/pages/Dashboard.module.css";

const categories = [
  "Car", "Technology", "Sports", "Business", "Health", "Entertainment", 
  "Politics", "Travel", "Education", "Food", "Gaming"
];

// Extracts sentiment safely from the API response
const extractSentiment = (data) => {
  try {
    if (!data || !data[0]?.output) throw new Error("Invalid response format");

    // Clean up JSON from unwanted Markdown formatting
    let cleanOutput = data[0].output.replace(/```json\n?|```/g, "").trim();

    const parsedOutput = JSON.parse(cleanOutput);

    return parsedOutput.sentiment || "Loading...";
  } catch (err) {
    console.error("Error extracting sentiment:", err);
    return "Loading...";
  }
};

const Dashboard = () => {
  const { user } = useOutletContext();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("Technology");
  const [lockedCategory, setLockedCategory] = useState(null);

  // Fetches news from the NewsAPI
  const fetchNews = async (selectedCategory) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `https://newsapi.org/v2/everything?q=${selectedCategory}&apiKey=4f34f7a5a49e4046af266a60d5473b6b`
      );
      if (!response.ok) throw new Error("Failed to fetch news");
      const data = await response.json();

      const newsWithSentiment = await Promise.all(
        data.articles.slice(0, 3).map(async (article) => {
          const sentiment = await fetchSentiment(article, selectedCategory);
          return { ...article, sentiment };
        })
      );
      setNews(newsWithSentiment);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetches sentiment analysis from the webhook
  const fetchSentiment = async (article, selectedCategory) => {
    try {
      const response = await fetch(
        "https://n8n-dev.subspace.money/webhook/3f0b246e-3292-4ccb-a776-af85e69c9445",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: article.title,
            description: article.description,
            interested: selectedCategory.toLowerCase(),
          }),
        }
      );

      if (!response.ok) throw new Error(`Server responded with status ${response.status}`);

      const text = await response.text();
      if (!text) {
        console.error("Empty response from sentiment API.");
        return "Loading...";
      }

      console.log("Raw Sentiment API Response:", text);

      let data;
      try {
        data = JSON.parse(text.replace(/```json\n?|```/g, "").trim());
      } catch (jsonError) {
        console.error("Invalid JSON response:", text);
        return "Loading...";
      }

      return extractSentiment([{ output: text }]);
    } catch (err) {
      console.error("Sentiment Fetch Error:", err);
      return "Loading...";
    }
  };

  // Fetch news on category change
  useEffect(() => {
    fetchNews(category);
  }, [category]);

  // Handles category selection and locks it
  const handleCategoryClick = (selectedCategory) => {
    if (lockedCategory === null) {
      setCategory(selectedCategory);
      setLockedCategory(selectedCategory); // Locking the selected category
    }
  };

  return (
    <>
      <Helmet>
        <title>Dashboard - News Sentiment</title>
      </Helmet>

      <div>
        <h2 className={styles.title}>Dashboard</h2>
        <p className={styles.welcomeText}>
          Welcome, {user?.metadata?.firstName || "stranger"} 👋
        </p>

        {/* Category Selection (Locks after first click) */}
        <div className={styles.categoryContainer}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={category === cat ? styles.activeCategory : ""}
              disabled={lockedCategory !== null} // Disable if locked
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && <p>Loading news...</p>}
        {error && <p className={styles.error}>Error: {error}</p>}

        {/* News Cards */}
        <div className={styles.newsContainer}>
          {news.map((item, index) => (
            <div
              key={index}
              className={`${styles.newsCard} ${
                item.sentiment === "positive"
                  ? styles.positive
                  : item.sentiment === "neutral"
                  ? styles.neutral
                  : styles.negative
              }`}
            >
              {item.urlToImage && (
                <img src={item.urlToImage} alt="News" className={styles.newsImage} />
              )}
              <h3>{item.title}</h3>
              <p>{item.description}</p>

              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.readMore}
              >
                Show article
              </a>

              <p className={styles.sentimentText}>
                Sentiment: <strong>{item.sentiment}</strong>
              </p>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
