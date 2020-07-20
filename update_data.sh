python av_club_crawler.py 	# Selenium/BS crawl of AV Club site. This still takes a very long time to run if doing a full crawl.
python imdb_crawler.py 		# Selenium/BS crawl of IMDB site to find IMDB IDs for episodes. This may take a couple hours to run.
python async_omdb_data.py 	# Use IMDB IDs to enrich data using the OMDB API. Only takes a few minutes to run.

python put_data_into_db.py 	# Clears out local or remote (Heroku) database and adds new data. Takes a few minutes to run for local db, takes a while longer to run for remote db.