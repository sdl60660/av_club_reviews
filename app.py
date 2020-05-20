from flask import Flask, render_template, request, jsonify
from database import Database, CursorFromConnectionFromPool
from psycopg2.extensions import AsIs
from urllib.parse import urlparse

from data.genres import genres

import json
import datetime
import os


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

			# all_data[genre] = {
			# 	'show_data': genre_results,
			# 	'summary_data': create_genre_summary_data(genre, genre_results)
			# }

		# all_show_data = {}
		# for genre, genre_data in all_data.items():
		# 	for show in genre_data['show_data']:
		# 		all_show_data[show['category_value']] = show

		# all_results = list(all_show_data.values())
		# all_data['all'] = {
		# 	'show_data': all_results,
		# 	'summary_data': create_genre_summary_data('all_genres', all_results)
		# }

		return(json.dumps(all_data))



if __name__ == "__main__":
    app.run(port=5453, debug=True)