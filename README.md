# AV Club Grades

Visualization and Analysis of AV Club TV grades. Scraped data from the AV Club TV Review site, then enriched it with IMDB data for show content and ratings to benchmark (using OMDB API).

Used:
* Python (Selenium/Requests/BeautifulSoup) for scraping/enriching data and for analysis.
* PostgreSQL/Python (psycopg2) for moving data into database
* HTML/CSS/Javascript/jQuery for front-end
* D3.js for visualizations
* Flask for web server/interaction between page and Postgres database
* Heroku for hosting

In-progress project site lives here: https://bit.ly/av-club-reviews