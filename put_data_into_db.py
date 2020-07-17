
import psycopg2
from psycopg2.extensions import AsIs

import json
import datetime

grade_translation_dict = {
	'A+': 11,
	'A': 11,
	'A-': 10,
	'B+': 9,
	'B': 8,
	'B-': 7,
	'C+': 6,
	'C': 5,
	'C-': 4,
	'D+': 3,
	'D': 2,
	'D-': 1,
	'F': 0
}

def format_raw_date(raw_datetime):
	try:
		int(raw_datetime[5:7]) + int(raw_datetime[8:10]) + int(raw_datetime[:4])
		return '{}/{}/{}'.format(raw_datetime[5:7], raw_datetime[8:10], raw_datetime[:4])
	except:
		return None


def safe_insert_handling(cur, sql_statement, values):
	try:
		cur = conn.cursor()

		try:
			cur.execute(sql_statement, values)
		except psycopg2.IntegrityError:
			conn.rollback()
		else:
			conn.commit()

	except Exception as e:
		print('ERROR:', e)

	return


def dictionary_insert(cur, insert_data, table_name):
	columns = insert_data.keys()
	values = [insert_data[column] for column in columns]

	insert_statement = "INSERT INTO {} (%s) VALUES%s".format(table_name)
	sql_statement = cur.mogrify(insert_statement, (AsIs(','.join(columns)), tuple(values)))
	# print(sql_statement)

	try:
		cur.execute(sql_statement)
	except psycopg2.IntegrityError:
		conn.rollback()
	else:
		conn.commit()


def number_check(insert_data, field_name, field_value):
	try:
		insert_data[field_name] = int(field_value)
	except ValueError:
		pass

	return insert_data


def process_omdb_data(omdb_data, insert_data, episode=False):
	if episode == True or 'Year' not in omdb_data.keys():
		pass
	elif '–' not in omdb_data['Year']:
		insert_data['premiere_year'] = insert_data['end_year'] = int(omdb_data['Year'])
	elif len( omdb_data['Year']) == 5:
		insert_data['premiere_year'] = int(omdb_data['Year'].split('–')[0])
		insert_data['end_year'] = int(omdb_data['Year'].split('–')[0])
	else:
		insert_data['premiere_year'] = int(omdb_data['Year'].split('–')[0])
		insert_data['end_year'] = int(omdb_data['Year'].split('–')[1])
		

	for easy_column in ['Country', 'Actors', 'Director', 'Writer', 'Genre', 'Awards', 'Year', 'Plot', 'Poster', 'Rated']:
		if easy_column in omdb_data.keys():
			insert_data[easy_column.lower()] = omdb_data[easy_column]

	if 'totalSeasons' in omdb_data.keys():
		insert_data = number_check(insert_data, 'total_seasons', omdb_data['totalSeasons'])

	if 'imdbVotes' in omdb_data.keys():
		insert_data = number_check(insert_data, 'imdb_votes', omdb_data['imdbVotes'].replace(',', ''))

	if 'imdbRating' in omdb_data.keys():
		try:
			insert_data['imdb_rating'] = float(omdb_data['imdbRating'])
		except ValueError:
			pass

	if 'Ratings' in omdb_data.keys():
		for rating in omdb_data['Ratings']:
			if rating['Source'] == 'Rotten Tomatoes':
				insert_data['rotten_tomatoes_rating'] = int(rating['Value'].replace('%', ''))

	if 'Genre' in omdb_data.keys():
		for genre in omdb_data['Genre'].split(', '):
			if genre == 'N/A':
				continue
			insert_data[('is_genre_' + genre.lower().replace(' ', '_').replace('-', '_'))] = True

	if 'Runtime' in omdb_data.keys():
		run_time_value = omdb_data['Runtime']
		if run_time_value == 'N/A':
			pass
		else:
			minutes = 0

			if 'h' in run_time_value:
				minutes += 60*(int(run_time_value.split(' h')[0]))

			if 'm' in run_time_value:
				minutes += int(run_time_value.split(' m')[0].split(' ')[-1])

			insert_data['runtime_minutes'] = minutes

	if 'Released' in omdb_data.keys() and omdb_data['Released'] != 'N/A':
		insert_data['release_date'] = str(datetime.datetime.strptime(omdb_data['Released'], "%d %b %Y"))

	return insert_data


with open('data/full_data.json', 'r') as f:
	data = json.load(f)

# Connect to Database
local_db = False

if local_db:
	from data.local_db_options import db_options
else:
	from data.remote_db_options import db_options

conn = psycopg2.connect(host=db_options['hostname'], port=db_options['port'], database=db_options['database'], user=db_options['username'], password=db_options['password'])
cur = conn.cursor()

cur.execute("DELETE FROM reviews")
cur.execute("DELETE FROM episodes")
cur.execute("DELETE FROM reviewers")
cur.execute("DELETE FROM shows")

# ====Reviewers====
print('Reviewers')

reviewers = {}

review_count = 0

for show, show_data in data.items():
	for review in show_data['episodes']:
		review_count += 1
		reviewers[review['reviewer']['kinja_link']] = review['reviewer']

for reviewer in reviewers.values():
	safe_insert_handling(cur, """INSERT INTO reviewers (kinja_link, reviewer_name) VALUES (%s, %s)""", (reviewer['kinja_link'], reviewer['reviewer_name']))

# print(len(reviewers.keys()))

# ====Shows====
print('Shows')

for show_data in data.values():
	if len(show_data) == 0:
		continue

	try:
		sample_show = show_data['episodes'][0]
	except IndexError:
		continue

	insert_data = {
		'show_name': sample_show['show'],
		'av_club_stub': sample_show['show_stub'],
	}

	if 'imdb_show_id' in sample_show.keys():
		insert_data['imdb_series_id'] = sample_show['imdb_show_id']

	# print(type(show_data))

	if 'omdb_data' in show_data.keys() and show_data['omdb_data']:
		omdb_data = show_data['omdb_data']
		insert_data = process_omdb_data(omdb_data, insert_data)

	dictionary_insert(cur, insert_data, 'shows')
	# safe_insert_handling(cur, , (sample_show['show'], sample_show['show_stub']))


# ====Episodes====
print('Episodes')

for show, show_data in data.items():
	cur.execute("""SELECT id FROM shows WHERE show_name='%s'""" % show.replace("'", "''"))
	result = cur.fetchone()
	if result:
		show_id = result[0]
	
	for episode in show_data['episodes']:
		if 'episode_title' in episode.keys():
			episode_title = episode['episode_title']
		else:
			episode_title = None

		insert_data = {
			'episode_title': episode_title,
			'show_id': show_id,
			'season_number': episode['season'],
			'episode_number': episode['episode']
		}

		if 'imdb_episode_id' in episode.keys():
			insert_data['imdb_episode_id'] = episode['imdb_episode_id']

		if 'omdb_data' in episode.keys() and episode['omdb_data']:
			insert_data = process_omdb_data(episode['omdb_data'], insert_data, episode=True)

		dictionary_insert(cur, insert_data, 'episodes')
		# safe_insert_handling(cur, "INSERT INTO episodes (show_id, season_number, episode_number, episode_title) VALUES(%s, %s, %s, %s), (show_id, episode['season'], episode['episode'], episode_title))

# ====Reviews====
print('Reviews')

reviews = []
for show, show_data in data.items():
	reviews += show_data['episodes']

for review in reviews:

	cur.execute("SELECT id FROM shows WHERE show_name='{}'".format(review['show'].replace("'", "''")))
	show_id = cur.fetchone()[0]

	cur.execute("SELECT id FROM reviewers WHERE kinja_link='{}'".format(review['reviewer']['kinja_link'].replace("'", "''")))
	reviewer_id = cur.fetchone()[0]

	if review['episode'] and review['season']:
		cur.execute("SELECT id FROM episodes WHERE show_id='{}' AND season_number={} AND episode_number={}".format(show_id, review['season'], review['episode']))
	else:
		# May need to revisit this, but it's hard to know which episode to tie them to if episode titles aren't unique
		continue

	episode_id = cur.fetchone()[0]

	if review['grade'] == None or len(review['grade']) > 2:
		grade = None
		numeric_grade = None
		# cur.execute("INSERT INTO reviews (review_date, letter_grade, numeric_score, review_link, reviewer_id, episode_id) VALUES('{}', {}, {}, '{}', {}, {})".format(
			# format_raw_date(review['date']), grade, numeric_grade, review['review_link'], reviewer_id, episode_id))
		continue
	else:
		grade = review['grade']
		numeric_grade = grade_translation_dict[review['grade']]

		safe_insert_handling(cur, "INSERT INTO reviews (review_date, letter_grade, numeric_score, review_link, reviewer_id, episode_id) VALUES(%s, %s, %s, %s, %s, %s)", (
			format_raw_date(review['date']), grade, 100*(numeric_grade/11.0), review['review_link'], reviewer_id, episode_id))



