from flask import Flask, render_template, request, jsonify, redirect
from classes.database import Database, CursorFromConnectionFromPool
from psycopg2.extensions import AsIs
from urllib.parse import urlparse, urlunparse

import json
import datetime
import os

from data.genres import genres


def convert_date_values(db_result):
	for key, val in db_result.items():
		if type(val) == datetime.date:
			db_result[key] = datetime.datetime.strftime(val, '%Y-%m-%d')
	return db_result


def create_genre_summary_data(genre, genre_results):
	return {
		'genre': genre,
		'reviewed_episode_count': sum([x['reviewed_episode_count'] for x in genre_results]),
		'average_av_rating': sum([x['reviewed_episode_count']*x['average_av_rating'] for x in genre_results]) / sum([x['reviewed_episode_count'] for x in genre_results]),
		'average_imdb_rating': sum([x['reviewed_episode_count']*x['average_imdb_rating'] for x in genre_results]) / sum([x['reviewed_episode_count'] for x in genre_results]),
		'category_value': genre,
		'unique_id': genre
	}


try:
	# This will run on heroku deployment for heroku postgres database
	DATABASE_URL = os.environ['DATABASE_URL']
	result = urlparse(DATABASE_URL)

	db_options = {
		'username': result.username,
		'password': result.password,
		'database': result.path[1:],
		'hostname': result.hostname,
		'port': result.port,
		'ssl_mode': 'require'
	}

except KeyError:
	# This will run on local machine for local database (hidden from Github)
	from data.local_db_options import db_options


Database.initialize(host=db_options['hostname'], port=db_options['port'], database=db_options['database'], user=db_options['username'], password=db_options['password'], sslmode=db_options['ssl_mode'])
# con = Database.get_connection()

# Get secret key from environment, or fallback on default value (won't happen on live app)
SECRET_KEY = os.getenv('SECRET_KEY', '1234')
app = Flask(__name__)
app.secret_key = SECRET_KEY

FROM_DOMAIN = "av-club.herokuapp.com"
TO_DOMAIN = "http://av-club.samlearner.com"

@app.before_request
def redirect_to_new_domain():
    urlparts = urlparse(request.url)
    if urlparts.netloc == FROM_DOMAIN:
        urlparts_list = list(urlparts)
        urlparts_list[1] = TO_DOMAIN
        return redirect(urlunparse(urlparts_list), code=301)

@app.route('/')
def homepage():
	with CursorFromConnectionFromPool(dict_cursor=True) as cur:
		sql_statement = """SELECT show_name, id FROM
						(SELECT show_id FROM reviews LEFT JOIN
						(SELECT show_id, id FROM episodes
	 					WHERE (episode_number IS NOT NULL AND season_number IS NOT NULL)
	 					GROUP BY show_id, id)
						AS grouped_episodes ON grouped_episodes.id=reviews.episode_id
						WHERE letter_grade IS NOT NULL
						GROUP BY show_id) non_empty_show_ids
						LEFT JOIN shows ON shows.id = non_empty_show_ids.show_id
						ORDER BY show_name"""
		cur.execute(sql_statement)
		show_ids = [{'id': x['id'], 'show_name': x['show_name']} for x in cur.fetchall()]

	genre_list = sorted([x for x in genres if x != 'N/A'])

	return render_template('index.html', show_ids=show_ids, genre_names=genre_list)

@app.route('/get_show')
def get_show():
	show_id = request.args['show_id']
	with CursorFromConnectionFromPool(dict_cursor=True) as cur:
		
		columns = ['show_name','av_club_stub','premiere_year','end_year','imdb_votes','imdb_rating','genre','plot','poster','imdb_series_id','writer','director','year','actors','release_date']
		sql_statement = "SELECT {} FROM shows WHERE id='{}'".format(str(','.join(columns)), show_id)
		cur.execute(sql_statement)
		show_result = cur.fetchone()
		show_result = convert_date_values(show_result)

		sql_statement = """SELECT * FROM episodes
						LEFT JOIN reviews ON episodes.id=reviews.episode_id
						LEFT JOIN reviewers ON reviewers.id = reviews.reviewer_id
		 				WHERE show_id='{}' AND episodes.season_number IS NOT NULL AND episodes.episode_number IS NOT NULL""".format(show_id)
		cur.execute(sql_statement)
		episodes_result = cur.fetchall()

		for i, result in enumerate(episodes_result):
			episodes_result[i] = convert_date_values(result)

	output_data = {
		'show': show_result,
		'episodes': episodes_result
	}

	return(json.dumps(output_data))


@app.route('/get_directors')
def get_directors():
	with CursorFromConnectionFromPool(dict_cursor=True) as cur:

		sql_statement = """SELECT
							episodes_with_reviews.director
							, STRING_AGG(episodes_with_reviews.show_name, ',') AS "shows_directed"
							, COUNT(episodes_with_reviews.director) AS "reviewed_episode_count"
							, COUNT(DISTINCT show_id) AS "num_shows"
							, AVG(numeric_score) AS "average_av_rating"
							, 10*AVG(imdb_rating) AS "average_imdb_rating"
							, AVG(numeric_score) - 10*AVG(imdb_rating) AS "rating_difference"
						FROM
						(
							SELECT
								episodes.*
								, reviews.numeric_score
								, shows.show_name
							FROM episodes
							LEFT JOIN reviews ON reviews.episode_id = episodes.id
							RIGHT JOIN shows ON shows.id = episodes.show_id
							WHERE reviews.numeric_score IS NOT NULL AND episodes.imdb_rating IS NOT NULL
						) AS episodes_with_reviews
						WHERE director != 'N/A'
						GROUP BY director
						HAVING COUNT(director) >= 25 AND COUNT(DISTINCT show_id) >= 2
						ORDER BY AVG(numeric_score) - 10*AVG(imdb_rating) DESC;"""

		cur.execute(sql_statement)
		director_results = cur.fetchall()
		for result in director_results:
			result['shows_directed'] = list(set(result['shows_directed'].split(',')))
			result['average_av_rating'] = float(result['average_av_rating'])
			result['category_value'] = result['director']
			result['unique_id'] = result['director']

		return(json.dumps(director_results))


@app.route('/genre_list')
def get_genre_list():
	return_genres = sorted([x for x in genres if x != 'N/A'])
	return(json.dumps(return_genres))

@app.route('/get_genre')
def get_genre():
	genre = request.args['genre_name']

	with CursorFromConnectionFromPool(dict_cursor=True) as cur:
		genre = genre.lower().replace('-', '_')

		if genre == 'all':
			filter_string = ''
		else:
			filter_string = "WHERE is_genre_{} = True".format(genre)

		sql_statement = """
		SELECT
			genre_shows.*
			, shows.genre AS "all_genres"
		FROM
			(SELECT
				show_name
				, COUNT(episodes_with_reviews.show_name) AS "reviewed_episode_count"
				, AVG(numeric_score) AS "average_av_rating"
				, 10*AVG(imdb_rating) AS "average_imdb_rating"
				, AVG(numeric_score) - 10*AVG(imdb_rating) AS "rating_difference"
				, '{genre_column}' AS "genre"
			FROM 
			(
				SELECT
					episodes.*
					, reviews.numeric_score
					, shows.show_name
				FROM episodes
				LEFT JOIN reviews ON reviews.episode_id = episodes.id
				RIGHT JOIN shows ON shows.id = episodes.show_id
				WHERE reviews.numeric_score IS NOT NULL AND episodes.imdb_rating IS NOT NULL
			) AS episodes_with_reviews
			{filter_string}
			GROUP BY show_name
			ORDER BY AVG(numeric_score) - 10*AVG(imdb_rating) DESC) genre_shows
		LEFT JOIN shows ON genre_shows.show_name = shows.show_name;
		""".format(genre_column=genre, filter_string=filter_string)

		cur.execute(sql_statement)
		genre_results = cur.fetchall()

		for result in genre_results:
			result['average_av_rating'] = float(result['average_av_rating'])
			result['category_value'] = result['show_name']
			result['unique_id'] = result['show_name']

		out_data = {
			'show_data': genre_results,
			'summary_data': create_genre_summary_data(genre, genre_results)
		}

		return(json.dumps(out_data))


@app.route('/get_genres')
def get_genres():
	with CursorFromConnectionFromPool(dict_cursor=True) as cur:

		all_data = []
		for genre in genres:
			genre = genre.lower()
			if genre == 'n/a':
				continue
			else:
				genre = genre.replace('-', '_')

			sql_statement = """
			SELECT
				show_name
				, genre AS "all_genres"
				, COUNT(episodes_with_reviews.show_name) AS "reviewed_episode_count"
				, AVG(numeric_score) AS "average_av_rating"
				, 10*AVG(imdb_rating) AS "average_imdb_rating"
				, AVG(numeric_score) - 10*AVG(imdb_rating) AS "rating_difference"
				, '{genre_column}' AS "genre"
			FROM 
			(
				SELECT
					episodes.*
					, reviews.numeric_score
					, shows.show_name
				FROM episodes
				LEFT JOIN reviews ON reviews.episode_id = episodes.id
				RIGHT JOIN shows ON shows.id = episodes.show_id
				WHERE reviews.numeric_score IS NOT NULL AND episodes.imdb_rating IS NOT NULL
			) AS episodes_with_reviews
			WHERE is_genre_{genre_column} = True
			GROUP BY show_name, genre
			ORDER BY AVG(numeric_score) - 10*AVG(imdb_rating) DESC;
			""".format(genre_column=genre.replace('-', '_').lower())

			cur.execute(sql_statement)
			genre_results = cur.fetchall()

			for result in genre_results:
				result['average_av_rating'] = float(result['average_av_rating'])
				result['category_value'] = result['show_name']
				result['unique_id'] = result['show_name']

			all_data.append(create_genre_summary_data(genre, genre_results))

		return(json.dumps(all_data))

@app.route('/get_reviewer_bias')
def get_reviewer_bias():

	sql_statement = """
	WITH

	"multi_reviewer_seasons" AS
	(SELECT
		CONCAT(show_name, '-', season_number) AS "show_season"
		, show_name
		, COUNT(episodes.id) AS "num_episodes"
		, COUNT(DISTINCT reviewers.reviewer_name) AS "num_reviewers"
		, AVG(numeric_score) as "average_score"
	FROM episodes
	LEFT JOIN shows ON episodes.show_id = shows.id
	LEFT JOIN reviews ON episodes.id = reviews.episode_id
	LEFT JOIN reviewers ON reviews.reviewer_id = reviewers.id
	GROUP BY show_name, season_number
	HAVING COUNT(DISTINCT reviewers.reviewer_name) > 1
	ORDER BY show_name, season_number ASC),

	"reviewer_shows_seasons" AS
	(SELECT
		 CONCAT(show_name, '-', season_number) AS "show_season"
		 , reviewer_name
		 , COUNT(episodes.id) AS "num_reviewed_episodes"
		 , AVG(numeric_score) AS "average_reviewer_score"
	 FROM
	 reviews
	 LEFT JOIN reviewers ON reviewers.id = reviews.reviewer_id
	 LEFT JOIN episodes ON reviews.episode_id = episodes.id
	 LEFT JOIN shows ON episodes.show_id = shows.id
	 GROUP BY show_name, season_number, reviewer_name
	 HAVING COUNT(episodes.id) > 1 -- Threshold for number of episodes they need to have reviewed in the shared season
	)

	SELECT
		reviewer_name
		, SUM(weighted_z_score) / SUM(num_reviewed_episodes) AS "mean_bias"
		, COUNT(reviewer_name) AS "shared_reviewed_seasons_count"
		, COUNT(DISTINCT show_name) AS "shared_reviewed_shows_count"
	FROM
		(SELECT
			reviewer_shows_seasons.*
			, multi_reviewer_seasons.*
			, average_reviewer_score - average_score AS "z-score"
			, num_reviewed_episodes*(average_reviewer_score - average_score) AS "weighted_z_score"
		FROM reviewer_shows_seasons
		LEFT JOIN multi_reviewer_seasons ON reviewer_shows_seasons.show_season = multi_reviewer_seasons.show_season
		WHERE multi_reviewer_seasons.num_reviewers >= 2) "show_season_biases"
	GROUP BY reviewer_name
	HAVING COUNT(reviewer_name) > 2 -- Threshold for number of shared season reviews they've done
	AND COUNT(DISTINCT show_name) > 2 -- Threshold for number of shared show reviews they've done
	ORDER BY SUM(weighted_z_score) / SUM(num_reviewed_episodes) DESC"""

	with CursorFromConnectionFromPool(dict_cursor=True) as cur:
		cur.execute(sql_statement)
		data = cur.fetchall()

		for i, x in enumerate(data):
			data[i] = dict(x)
			data[i]['mean_bias'] = float(x['mean_bias'])

		return(json.dumps(data))

@app.route('/get_raw_reviewer_scores')
def get_raw_reviewer_scores():
	sql_statement = """
	SELECT
		reviewer_name
		, AVG(numeric_score) AS "mean_score"
		, COUNT(DISTINCT show_id) AS "total_shows"
		, COUNT(DISTINCT episode_id) AS "total_reviews"
	FROM reviews
	LEFT JOIN reviewers ON reviewers.id = reviews.reviewer_id
	LEFT JOIN episodes ON episodes.id = reviews.episode_id
	GROUP BY reviewer_name
	HAVING COUNT(DISTINCT show_id) > 10
	ORDER BY AVG(numeric_score) DESC"""

	with CursorFromConnectionFromPool(dict_cursor=True) as cur:
		cur.execute(sql_statement)
		data = cur.fetchall()

		for i, x in enumerate(data):
			data[i] = dict(x)
			data[i]['mean_score'] = float(x['mean_score'])

		return(json.dumps(data))



if __name__ == "__main__":
    app.run(port=5453, debug=True)