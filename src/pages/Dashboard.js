import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Helmet } from "react-helmet";
import styles from "../styles/pages/Dashboard.module.css";

const categories = ["Tesla", "Technology", "Sports", "Business", "Health"];

const Dashboard = () => {
  const { user } = useOutletContext();
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("Tesla");

  // Fetch News based on Category
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
        data.articles.slice(0, 5).map(async (article) => {
          const sentiment = await fetchSentiment(article);
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

  // Fetch Sentiment Analysis for Each News
  const fetchSentiment = async (article) => {
    try {
      const response = await fetch(
        "https://n8n-dev.subspace.money/webhook-test/b4e4afa9-0778-4c3c-a3c5-286724e505ce",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: article.title,
            description: article.description,
            interested: category.toLowerCase(),
          }),
        }
      );
      if (!response.ok) throw new Error("Failed to analyze sentiment");
      const data = await response.json();
      return data.sentiment;
    } catch (err) {
      console.log(err)
      return "neutral";
    }
  };

  // Share function
  const handleShare = (title, url) => {
    navigator.clipboard.writeText(`Check out this news: ${title} ${url}`);
    alert("News link copied to clipboard!");
  };

  // Fetch news when category changes
  useEffect(() => {
    fetchNews(category);
  }, [category]);

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

        {/* Category Selector */}
        <div className={styles.categoryContainer}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={category === cat ? styles.activeCategory : ""}
            >
              {cat}
            </button>
          ))}
        </div>

        {loading && <p>Loading news...</p>}
        {error && <p className={styles.error}>Error: {error}</p>}

        {/* News List */}
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
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              <p>
                Sentiment: <strong>{item.sentiment}</strong>
              </p>
              <button onClick={() => handleShare(item.title, item.url)}>
                Share
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default Dashboard;
