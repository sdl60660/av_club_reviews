from flask import Flask, render_template, request, jsonify
from database import Database, CursorFromConnectionFromPool
from psycopg2.extensions import AsIs

import json
import datetime


def convert_date_values(db_result):
	for key, val in db_result.items():
		if type(val) == datetime.date:
			db_result[key] = datetime.datetime.strftime(val, '%Y-%m-%d')
	return db_result



Database.initialize(host="localhost", port=5433, database="tv_reviews", user="samlearner", password="postgres")
# con = Database.get_connection()

app = Flask(__name__)
app.secret_key = '1234'

@app.route('/')
def homepage():
	with CursorFromConnectionFromPool(dict_cursor=True) as cur:
		sql_statement = "SELECT show_name, id FROM \
						(SELECT show_id FROM reviews LEFT JOIN  \
						(SELECT show_id, id FROM episodes \
	 					WHERE (episode_number IS NOT NULL AND season_number IS NOT NULL) \
	 					GROUP BY show_id, id) \
						AS grouped_episodes ON grouped_episodes.id=reviews.episode_id \
						WHERE letter_grade IS NOT NULL \
						GROUP BY show_id) non_empty_show_ids \
						LEFT JOIN shows ON shows.id = non_empty_show_ids.show_id \
						ORDER BY show_name"
		cur.execute(sql_statement)
		show_ids = cur.fetchall()

	return render_template('index.html', show_ids=show_ids)

@app.route('/get_show')
def get_show():
	show_id = request.args['show_id']
	with CursorFromConnectionFromPool(dict_cursor=True) as cur:
		
		columns = ['show_name','av_club_stub','premiere_year','end_year','imdb_votes','imdb_rating','genre','plot','poster','imdb_series_id','writer','director','year','actors','release_date']
		sql_statement = "SELECT {} FROM shows WHERE id='{}'".format(str(','.join(columns)), show_id)
		cur.execute(sql_statement)
		show_result = cur.fetchone()
		show_result = convert_date_values(show_result)

		sql_statement = "SELECT * FROM episodes LEFT JOIN reviews ON episodes.id=reviews.episode_id WHERE show_id='{}' AND episodes.season_number IS NOT NULL AND episodes.episode_number IS NOT NULL".format(show_id)
		cur.execute(sql_statement)
		episodes_result = cur.fetchall()

		for i, result in enumerate(episodes_result):
			episodes_result[i] = convert_date_values(result)

	output_data = {
		'show': show_result,
		'episodes': episodes_result
	}

	return(json.dumps(output_data))


if __name__ == "__main__":
    app.run(port=5453, debug=True)